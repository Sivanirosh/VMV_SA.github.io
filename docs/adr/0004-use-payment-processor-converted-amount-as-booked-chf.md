# ADR 0004 — Use payment-processor converted amount as the Booked CHF Amount

**Status:** Accepted
**Date:** 2026-05

## Context

Donations can arrive in CHF, EUR, USD, or any Stripe-supported currency. ZEWO certification and Swiss GAAP RPC 21 require donations to be valued in CHF. The receipt PDF must show a CHF amount. Multiple FX rate sources exist (Stripe internal rate, ESTV daily reference rate, ECB rate) and they differ slightly. The choice has direct ZEWO audit implications because auditors reconcile receipts against bank deposits.

## Decision

The CHF amount on every donation receipt is the **converted amount actually credited by the payment processor**:

- For Stripe payments (card, Twint via Stripe): use the value of `balance_transaction.amount` reported by Stripe in CHF, which represents the CHF gross amount that arrived in the association's Stripe balance (before Stripe fees are deducted at payout).
- For IBAN wire transfers: use the CHF amount Postfinance credited to the association's account, as recorded on the bank statement / CAMT.053 entry.

The Booked CHF Amount is stored on the `donation` record **at the moment of intake and is never recomputed.**

### Retrieval protocol for Stripe payments

`balance_transaction` is not embedded in webhook payloads. It is fetched explicitly in the synchronous webhook phase:

```
charge = stripe.charges.retrieve(charge_id, { expand: ['balance_transaction'] })
```

If `charge.balance_transaction` is `null` (Stripe has not yet settled the FX), the handler retries up to 3 times with 1-second intervals. If still null after 3 retries, the handler returns HTTP 500 — Stripe will redeliver the webhook, and the idempotency check on the next delivery prevents duplicate records. This ensures `booked_chf_amount` on the Donation record is always a concrete, settled figure at the moment of creation.

### Receipt PDF fields

- Original donated amount in the donor's currency (e.g. EUR 100)
- Booked CHF Amount (e.g. CHF 95.20) — labelled as the gross CHF figure credited by the payment processor
- Footer note: "The CHF figure reflects the amount received by the association after currency conversion on the transaction date. Donors should consult their local tax authority for any rate to use in their own declaration."

### Note on Stripe fees and the Booked CHF Amount

`balance_transaction.amount` is the **gross** CHF credited — Stripe fees are deducted separately at the time of payout, not per-transaction in the balance transaction amount. The Donation record stores this gross figure. Stripe fees are tracked separately as a payment processing expense in the accounting books and reported in the admin-cost ratio for RPC 21 / ZEWO purposes. They are never deducted from the receipt amount shown to the donor.

The `donation` record carries two additional fields to support this:
- `stripe_fee_chf: integer | null` — Stripe fee in CHF-rappen, taken from `balance_transaction.fee`
- `net_chf_amount: integer | null` — `booked_chf_amount - stripe_fee_chf`, the amount that will actually reach the bank account at payout

These fields are used for internal reporting only and never appear on donor-facing receipts or tax documents.

## Consequences

- Receipts always reconcile against Stripe balance reports using the gross figure per transaction.
- ZEWO auditors can match receipt totals to Stripe payouts by summing net amounts, with fee totals as a separate reconciling line.
- The system never needs to fetch external FX rates.
- Donors in foreign currencies see a slightly different CHF figure than the ESTV reference rate would produce. The footer explains this.
- The rate is locked at transaction time and is never recomputed even if Stripe later issues a correction (handled as a separate adjustment record).
- Persistent `balance_transaction` null (after 3 retries) causes a Stripe webhook redeliver rather than silently storing null — prevents incomplete Donation records.

## Alternatives considered

- **ESTV daily reference rate at transaction date** — rejected because it creates a phantom CHF figure that does not match the association's bank or Stripe records, requiring reconciliation notes for every cross-currency donation during ZEWO audits.
- **ECB rate at transaction date** — rejected for the same reason.
- **Receipt only in original currency** — rejected because RPC 21 requires donations to be valued in CHF in the books, and receipts are derived from the books.
