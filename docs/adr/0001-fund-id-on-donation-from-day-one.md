# ADR 0001 — Include `fund_id` on the `donation` record from day one

**Status:** Accepted  
**Date:** 2026-05

## Context

The association has decided to use a single General Fund for all donations at launch. No donor earmarking, no restricted fund accounting. However, Swiss GAAP RPC 21 and the future ZEWO certification path require the ability to track restricted vs unrestricted funds at the donation level.

## Decision

Every `donation` record carries a non-nullable `fund_id` foreign key referencing a `funds` table. At launch, exactly one Fund record exists ("General Fund", unrestricted). The checkout form does not expose a fund selector.

## Consequences

- Adding restricted funds later requires: inserting a new `funds` row + surfacing the selector in the donation form UI. No schema migration, no backfill.
- A `donation` record without a fund is invalid by constraint — forces explicit assignment at every entry point (Stripe webhook, manual entry, CSV import).
- The `funds` table is the single source of truth for Swiss GAAP RPC 21 fund classification.

## Alternatives considered

- **No `fund_id` until needed** — rejected because retrofitting a FK onto a large donations table is a painful migration and breaks year-end reporting queries.
- **`fund_type` enum on donation** — rejected because it cannot be extended without a schema change and loses the ability to attach metadata (name, description, project link) to a fund.
