# ADR 0002 — Webhook handler returns HTTP 200 before async PDF/email work

**Status:** Accepted
**Date:** 2026-05

## Context

Stripe webhooks must receive a 2xx response within 30 seconds, otherwise Stripe retries the entire webhook. PDF generation (receipts, membership confirmations) and SMTP email delivery can take several seconds and may fail intermittently. Letting these run in the synchronous response path creates two problems: webhook timeouts trigger retries, and retries duplicate downstream records unless the idempotency check is watertight.

A second concern: a donor who paid must always receive at minimum a plain-text confirmation email within ~2 minutes, regardless of any failure in PDF generation or attachment.

## Decision

### Stripe events subscribed

The webhook endpoint handles exactly six Stripe event types:

| Event | Fired when | Action |
|---|---|---|
| `checkout.session.completed` | One-time payment charged **or** subscription created (first charge) | Normalise session metadata → store on Subscription object (if sub) → create Donation record (if one-time only) |
| `invoice.payment_succeeded` | Every subscription charge, including the first | Retrieve Subscription metadata → create Donation record |
| `charge.refunded` | Any full or partial refund (admin- or donor-initiated) | Insert Refund record → trigger cancellation document pipeline (see ADR 0005) |
| `charge.refund.updated` | A previously issued refund is reversed by Stripe | Set Refund status to `reversed` → restore Donation to `confirmed` → notify treasurer |
| `charge.dispute.created` | Donor's bank opens a chargeback; funds withdrawn by Stripe | Insert Dispute record → set Donation to `disputed` → alert treasurer immediately with Stripe dispute URL and response deadline |
| `charge.dispute.closed` | Dispute resolved by card network | If `won`: set Dispute to `won` → restore Donation to `confirmed` → notify treasurer. If `lost`: set Dispute to `lost` → insert Refund record → trigger cancellation document pipeline |

**Why separate `checkout.session.completed` from `invoice.payment_succeeded` for subscriptions:**
Stripe fires both events for the first subscription charge. `checkout.session.completed` carries checkout-only metadata (campaign, fund selector, custom fields, receipt opt-in, anonymity flag). `invoice.payment_succeeded` does not. To preserve this metadata for all future renewal receipts, the `checkout.session.completed` handler stores it as structured metadata on the Stripe Subscription object (via `stripe.subscriptions.update`) and returns 200 without creating a Donation record. The Donation record is created exclusively by the `invoice.payment_succeeded` handler, which retrieves the metadata from the Subscription. This means one event creates the record for all subscription charges (first + renewals), and the idempotency check on `stripe_invoice_id` prevents any duplicate.

For one-time payments there is no Subscription and no invoice; `checkout.session.completed` creates the Donation record directly.

### Synchronous phase (must complete in < 1s for all events)

**On `checkout.session.completed`:**
- Signature verification (`stripe.webhooks.constructEvent`) — reject unsigned requests immediately
- Idempotency check on `session.id` — duplicate? return 200, stop
- Upsert Donor profile
- If `session.mode === "subscription"`: call `stripe.subscriptions.update` to copy session metadata (fund_id, campaign_id, receipt_opted_in, donor address snapshot) onto the Subscription object; do NOT create Donation record
- If `session.mode === "payment"` (one-time): create Donation record (fund_id, payment_channel, receipt_opted_in, stripe_charge_id, booked_chf_amount)
- If membership line item present → create Member record
- Return HTTP 200

**On `invoice.payment_succeeded`:**
- Signature verification
- Idempotency check on `invoice.id` — duplicate? return 200, stop
- Retrieve Subscription metadata from `invoice.subscription`
- Upsert Donor profile
- Create Donation record (fund_id from subscription metadata, payment_channel, stripe_charge_id, stripe_invoice_id, booked_chf_amount, is_renewal flag)
- Return HTTP 200

**On `charge.refunded`:**
- Signature verification
- Idempotency check on `charge.id + refund.id`
- Look up Donation record by `stripe_charge_id`
- Update Donation status (see ADR 0005)
- Return HTTP 200

### Asynchronous phase (runs in job queue, decoupled from Stripe)

Triggered by all three synchronous paths, after the 200 is returned:

- Queue confirmation email immediately (plain-text body guaranteed, no PDF dependency)
- Generate Tax Receipt PDF (if `receipt_opted_in`)
- Generate Membership Confirmation PDF (if membership)
- Attach PDFs to email and send via SMTP
- On PDF failure: retry 3× with exponential backoff; on final failure alert treasurer

### Donation record fields introduced by this ADR

| Field | Type | Purpose |
|---|---|---|
| `payment_channel` | `"card" \| "twint" \| "bank_transfer" \| "cash" \| "cheque" \| "in_kind"` | Reporting and audit |
| `stripe_charge_id` | `string \| null` | Refund lookup; bank reconciliation |
| `stripe_invoice_id` | `string \| null` | Idempotency key for subscription charges |
| `stripe_subscription_id` | `string \| null` | Non-null = part of a recurring donation |
| `is_renewal` | `boolean` | Differentiates first-charge from subsequent in reporting |

## Consequences

- Stripe never retries due to slow PDF/email work.
- A PDF or SMTP outage cannot duplicate donation records.
- Donor always receives a confirmation email even if PDFs fail (plain-text fallback).
- Subscription metadata is preserved for the full lifetime of the subscription, including after the checkout session expires.
- Idempotency is enforced at the charge/invoice level, not the event level — more robust because Stripe can emit the same event ID more than once in rare replay scenarios.
- Requires a job queue mechanism — for SQLite-based MVP, this is a simple `jobs` table polled by a cron-driven worker. No Redis, no RabbitMQ.
- Stripe API version must be pinned in `.env` (`STRIPE_API_VERSION`) to prevent breaking changes to payload shapes.

## Alternatives considered

- **Subscribe to `checkout.session.completed` only** — rejected because it does not fire on subscription renewals, so recurring donations would silently never create Donation records after the first charge.
- **Subscribe to `charge.succeeded` only** — rejected because it does not carry checkout session metadata (custom fields, fund selector, receipt opt-in), which would be lost for renewals.
- **Subscribe to `invoice.payment_succeeded` for everything** — rejected because it requires enabling invoice mode on one-time Stripe Checkout sessions, a non-trivial config change that affects all adopters.
- **Fully synchronous webhook handler** — rejected because PDF generation latency and SMTP delivery variability would routinely trigger Stripe retry behavior, leading to duplicate records or constant idempotency churn.
- **Stripe Workflows / Stripe-hosted automations** — rejected because it creates a Stripe-platform dependency and breaks the principle that Stripe is infrastructure, not a platform.
