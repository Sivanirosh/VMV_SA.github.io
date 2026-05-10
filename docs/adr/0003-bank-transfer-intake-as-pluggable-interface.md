# ADR 0003 — Bank transfer intake as a pluggable interface

**Status:** Accepted
**Date:** 2026-05

## Context

IBAN wire transfers are a major Swiss donation channel (typically 20–40% of total donations) but do not flow through Stripe. The MVP cannot afford CAMT.053 bank file parsing — it requires reference-matching logic, a review queue UI, and ongoing maintenance. The MVP also cannot drop IBAN support entirely without losing a substantial donor segment.

The decision is to ship a manual admin entry form for the MVP while ensuring the CAMT.053 automation can be added later without refactoring the post-intake automation pipeline.

## Decision

Define a single internal interface, `BankTransferIntake`, that accepts a normalised `BankTransfer` payload:

```
BankTransfer {
  payment_reference: string
  donor_name: string
  donor_email: string
  donor_address?: Address          # optional, required only if receipt opted-in
  amount: number
  currency: string
  transfer_date: Date
  bank_reference: string           # the bank's own transaction ID
  receipt_opted_in: boolean
  fund_id: string                  # always General Fund at MVP
}
```

The interface's `intake(transfer)` method triggers the same post-donation automation pipeline used by the Stripe webhook (steps 5b–5h in ADR 0002): profile upsert, Donation record creation, async email + PDF queue.

Two implementations:

- **MVP — `ManualBankTransferIntake`:** an admin form at `/admin/donations/new-iban` that validates input and calls `intake()`.
- **Phase 2 — `Camt053BankTransferIntake`:** a weekly cron job that downloads the latest CAMT.053 file from Postfinance (or its filesystem drop-off), parses it, attempts to match each entry against existing donor records by `payment_reference`, and calls `intake()` for matches. Unmatched entries land in an admin review queue.

Both implementations call the exact same `intake()` method. The downstream pipeline does not know — and must not know — which intake path was used.

## Consequences

- IBAN donations and Stripe donations result in identical Donation records, identical receipts, identical year-end reporting.
- Adding CAMT.053 parsing in Phase 2 requires no changes to the donation pipeline, the receipt generator, or the email queue. Only the parser and reference-matching engine are new.
- The `intake()` interface is one of the few internal contracts that must remain stable across versions.
- Manual entry must include a `bank_reference` field even at MVP — when CAMT.053 ingestion is added later, this field becomes the deduplication key against bank entries already entered manually.

## Alternatives considered

- **Build the manual form as a one-off without an intake interface** — rejected because the manual form's data flow would diverge from the CAMT.053 path, requiring duplicate validation, duplicate normalisation, and duplicate pipeline triggers when Phase 2 lands.
- **Skip IBAN automation entirely, treat all IBAN donations as out-of-system records** — rejected because year-end consolidated receipts and ZEWO reporting require all donations in one canonical store.
- **Build CAMT.053 in MVP** — rejected as over-scoped; reference matching, edge case handling, and the review UI together represent ~30% of the entire MVP effort.
