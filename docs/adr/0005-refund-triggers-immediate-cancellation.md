# ADR 0005 — Refund is a first-class entity; triggers immediate cancellation document

**Status:** Accepted
**Date:** 2026-05

## Context

When a Donation is refunded, any Tax Receipt already issued to the donor becomes invalid — the donor may have included it in a tax declaration. ZEWO auditors expect a documented trail showing that refunded amounts are not counted toward the association's donation receipts.

Two design questions arose:

1. **Should a refund flip a status field on the Donation, or be its own entity?**
2. **Should there be a grace period before issuing the cancellation document?**

## Decision

### Refund as a first-class entity

A `Refund` is a separate database record, not a status transition on the `Donation`. This is necessary because:

- Stripe can issue **partial refunds** (`charge.refunded` fires with `amount_refunded < amount`). A CHF 500 donation refunded CHF 200 is not fully refunded — the remaining CHF 300 is still a valid donation.
- A **Combined Checkout** can have the membership-fee line refunded independently of the donation line.
- A refund can be **reversed** (`charge.refund.updated`) — without a dedicated refund record there is no object to transition back to `reversed`.

**`refunds` table schema:**

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `donation_id` | FK → donations | |
| `stripe_refund_id` | string \| null | null for IBAN manual refunds |
| `amount_chf` | integer | rappen; may be < donation.booked_chf_amount |
| `amount_original_currency` | integer | in the donation's original currency |
| `currency` | string | ISO 4217 |
| `reason` | enum | `"duplicate" \| "fraudulent" \| "requested_by_donor" \| "admin_correction"` |
| `status` | enum | `"pending" \| "applied" \| "reversed"` |
| `applied_at` | timestamp \| null | |
| `reversed_at` | timestamp \| null | |
| `cancellation_doc_id` | FK → documents \| null | |

**`donation.status` is a derived read-only view, never stored:**

| Condition | Derived status |
|---|---|
| Sum of `applied` refunds = 0 | `confirmed` |
| 0 < sum < `booked_chf_amount` | `partially_refunded` |
| Sum = `booked_chf_amount` | `refunded` |

Queries that need donation status always compute it from the `refunds` table. No status column is stored on `donations` — removing the risk of the stored value diverging from the refund aggregate.

### Cancellation document pipeline

A Stripe `charge.refunded` webhook (or admin IBAN refund entry) triggers an immediate pipeline — no grace period:

1. Insert `Refund` record with `status: "pending"`
2. Determine refund scope:
   - If `amount_refunded == charge.amount` → full refund; Cancellation of Tax Receipt covers the full original receipt amount
   - If `amount_refunded < charge.amount` → partial refund; Cancellation document references the specific refunded amount; original receipt is annotated as partially cancelled
3. Set `refund.status = "applied"`
4. Cancellation of Tax Receipt PDF generated and emailed to the donor
5. Refunded amount excluded from year-end consolidated receipts and RPC 21 reports
6. Audit log records: donation confirmed → receipt issued → refund applied → cancellation document issued

No grace period. No admin approval step.

### Refund reversal

On `charge.refund.updated` (Stripe reverses a refund):

1. Look up `Refund` by `stripe_refund_id`
2. Set `refund.status = "reversed"`, `reversed_at = now()`
3. Re-include the donation amount in year-end receipts and RPC 21 reports
4. Notify donor that their original receipt is reinstated

### IBAN manual refunds

The admin enters the refund via `/admin/donations/:id/refund`. The form accepts `amount_chf`, `reason`, and `date`. This creates a `Refund` record with `stripe_refund_id: null` and feeds the same pipeline from step 2 above.

### Disputes (chargebacks)

Disputes are modelled as a separate first-class entity — not as Refunds — because their outcome is uncertain at creation and because the CMS must prompt treasurer action before the card network's response deadline.

**`disputes` table schema:**

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `donation_id` | FK → donations | |
| `stripe_dispute_id` | string | UNIQUE |
| `amount_chf` | integer | rappen; always the full charge amount (Stripe disputes are always full) |
| `reason` | string | Stripe dispute reason code (e.g. `fraudulent`, `product_not_received`) |
| `status` | enum | `"open" \| "won" \| "lost"` |
| `stripe_due_by` | timestamp | Card network response deadline; used in the treasurer alert email |
| `opened_at` | timestamp | |
| `closed_at` | timestamp \| null | |

**On `charge.dispute.created`:**
1. Insert `Dispute` record with `status: "open"`
2. Alert treasurer immediately via email: donor name, amount, dispute reason, Stripe dispute URL, `stripe_due_by` deadline. This email bypasses the normal async job queue — it is sent synchronously before returning 200, because every hour lost narrows the response window.
3. Disputed amount is excluded from RPC 21 reports while the dispute is `open`.

**On `charge.dispute.closed` (won):**
1. Set `dispute.status = "won"`, `closed_at = now()`
2. Donation returns to normal inclusion in receipts and reports.
3. Notify treasurer: dispute won, no further action.

**On `charge.dispute.closed` (lost):**
1. Set `dispute.status = "lost"`, `closed_at = now()`
2. Insert a `Refund` record linked to the donation (`reason: "dispute_lost"`, `stripe_refund_id: null`)
3. Trigger the standard Cancellation of Tax Receipt pipeline.

### `donation.status` — derived view (updated)

`donation.status` is never stored. It is computed on query from both `refunds` and `disputes`, with dispute taking priority:

| Condition | Derived status |
|---|---|
| Active `Dispute` with `status: "open"` | `disputed` |
| Sum of `applied` Refunds = `booked_chf_amount` | `refunded` |
| 0 < sum of `applied` Refunds < `booked_chf_amount` | `partially_refunded` |
| No Refunds, no open Dispute | `confirmed` |

## Rationale for rejecting a grace period

- An accidental Stripe refund is a Stripe-level error. Stripe allows refund reversals within its own window. The CMS should not build compensating delay logic on top of Stripe's existing error-handling.
- A grace period creates a window where the system is in an inconsistent state: the donation is refunded in Stripe (and in the bank), but the Tax Receipt is still "valid" in the CMS. This is the worst possible state for a ZEWO audit.
- The `charge.refund.updated` reversal path handles the accidental-refund case cleanly without any pre-emptive delay.

## Consequences

- Partial refunds are fully supported without schema changes.
- Combined Checkout refunds (membership only, donation only, or both) are handled by creating separate `Refund` records per line.
- Refund reversals are handled by transitioning the `Refund` record, not by re-creating donation records.
- `donation.status` is always consistent with the refund aggregate — there is no stored flag to become stale.
- The CMS must handle three webhook events for the refund lifecycle: `charge.refunded`, `charge.refund.updated`, and the admin IBAN form.
- ZEWO auditors can trace every donation from creation through receipt issuance to any partial or full refund or reversal in a single audit log query.
