# ADR 0009 — UTC timestamp storage; Europe/Zurich for fiscal year boundaries

**Status:** Accepted
**Date:** 2026-05

## Context

The CMS issues Tax Receipts that assign each donation to a specific fiscal year. Donors include their receipts in annual Swiss tax declarations. If the CMS and the donor disagree about which year a near-midnight December 31 donation belongs to, the donor's tax declaration is incorrect.

Two independent decisions interact:

1. **What time zone do database timestamps use?**
2. **What time zone defines the fiscal year boundary (midnight January 1 / December 31)?**

A donation made at 23:45 CET on December 31 is 22:45 UTC the same day. If fiscal year logic runs against raw UTC, the donation falls in the correct year. But if the server clock is UTC and fiscal year boundaries are naively computed as `year = timestamp.getFullYear()` without time zone conversion, the result depends on whether the JavaScript runtime is in UTC or CET — an invisible, environment-dependent bug.

Additionally, during the CET→CEST daylight-saving transition in late March and the CEST→CET transition in late October, local-time-stored timestamps become ambiguous (the same wall-clock hour occurs twice in October). UTC storage avoids this entirely.

## Decision

### Timestamps: UTC storage

All `created_at`, `updated_at`, `applied_at`, `transfer_date`, and other datetime fields are stored as **UTC Unix epoch milliseconds** in SQLite integer columns. SQLite has no native datetime type; integer milliseconds are unambiguous, sortable, and portable.

No timestamp is ever stored as a local time or as a formatted string.

### Fiscal year boundaries: Europe/Zurich

All business logic that assigns a donation to a fiscal year, generates a year-end receipt batch, or labels a report with a calendar year converts UTC milliseconds to `Europe/Zurich` time before evaluation.

Concretely:

- The fiscal year 2026 spans `Europe/Zurich` midnight January 1 2026 to `Europe/Zurich` midnight January 1 2027 — which in UTC is `2025-12-31T23:00:00Z` to `2026-12-31T23:00:00Z` (CET, UTC+1) for most of the year.
- The year-end `node-cron` job uses the `timezone: 'Europe/Zurich'` option so "January 15 at 02:00" means 02:00 CET, not 02:00 UTC.
- Receipt PDFs display the donation date as `Europe/Zurich` local date (e.g. "31. Dezember 2026"), never as a UTC date.
- Report filter inputs (date pickers in the admin UI) produce `Europe/Zurich` midnight boundaries before converting to UTC for SQL queries.

### Centralised conversion layer

A single utility module (`src/lib/time.ts`) owns all UTC ↔ `Europe/Zurich` conversions. No other file may hardcode UTC offsets or perform raw `Date` arithmetic against timestamp fields. This makes any future fiscal year configuration (if an adopter has a non-calendar fiscal year) a one-file change.

```typescript
// src/lib/time.ts — public API
export const FISCAL_TZ = 'Europe/Zurich';

export function toFiscalYear(utcMs: number): number
export function fiscalYearStart(year: number): number  // returns UTC ms
export function fiscalYearEnd(year: number): number    // returns UTC ms
export function formatReceiptDate(utcMs: number): string  // e.g. "31. Dezember 2026"
```

## Consequences

- A donation at 23:45 CET December 31 is correctly assigned to the closing fiscal year; a donation at 00:05 CET January 1 is correctly assigned to the new year — regardless of server time zone.
- No daylight-saving-time ambiguity in stored timestamps.
- The `src/lib/time.ts` module is a hard dependency for any code that reasons about dates — contributors must use it, not raw `Date` methods.
- Adopters in other time zones (future) override `FISCAL_TZ` in instance settings; `src/lib/time.ts` reads from config, not from a hardcoded constant.

## Alternatives considered

- **Store timestamps in Europe/Zurich local time** — rejected because the CET→CEST transition in October creates a one-hour window where the same wall-clock time occurs twice, making stored local times ambiguous without a UTC offset stored alongside them. UTC storage is unambiguous.
- **Use `getFullYear()` on raw Date objects without time zone conversion** — rejected because it produces environment-dependent results: correct when the Node.js process runs in CET, wrong when it runs in UTC (the default on most Linux VPS). An invisible bug that surfaces only at year-end.
