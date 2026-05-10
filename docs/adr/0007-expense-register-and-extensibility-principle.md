# ADR 0007 — Expense Register with configurable categories; user-facing concepts as database tables

**Status:** Accepted
**Date:** 2026-05

## Context

Two related problems surfaced together:

**Problem 1 — Fee transparency for ZEWO compliance.**
Stripe fees are a fundraising cost that must appear in the RPC 21 admin-cost ratio. Without tracking them in the CMS, the treasurer must manually aggregate fees from the Stripe dashboard each year — exactly the kind of recurring admin overhead that defeats the automation goal. An `expenses` table restricted to payment processing fees (Option C) was proposed, but it leaves other operational costs (hosting, bank charges, travel) still in a spreadsheet.

**Problem 2 — Extensibility.**
A small NPO's expense categories, membership tiers, and other user-facing configurations will grow over time. Hardcoding these as TypeScript enums means every configuration change requires a code change, a PR, and a release — inaccessible to a volunteer treasurer with no technical background.

## Decision

### Expense Register

The CMS includes a lightweight Expense Register. It is not a general ledger — there is no double-entry bookkeeping, no chart of accounts, no trial balance. It is a structured log of financial outflows with two entry types:

**Auto-entries (system-generated):**
- Stripe payment processing fees: created automatically at webhook time from `balance_transaction.fee`, linked to the originating Donation via `linked_donation_id`. Zero treasurer action required.
- IBAN bank charges: auto-created from CAMT.053 in Phase 2.

**Manual entries (treasurer-entered):**
- All other operational costs (hosting, domain, travel, printing, insurance, etc.) entered via `/admin/expenses/new`.
- Form fields: amount (CHF), date, category, description (optional for non-`other` categories, required for `other`), receipt file upload (optional).

**`expenses` table schema:**

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `expense_category_id` | FK → expense_categories | |
| `amount_chf` | integer | rappen |
| `date` | date | Transaction date, not entry date |
| `description` | string \| null | Required when category is `other` |
| `receipt_file_id` | FK → files \| null | Uploaded receipt scan |
| `linked_donation_id` | FK → donations \| null | Non-null for auto-booked Stripe fees |
| `entered_by` | `"system" \| "admin"` | |
| `created_at` | timestamp | |

### Configurable expense categories

Expense categories are stored in an `expense_categories` table, not defined as a TypeScript enum. This allows instance admins to add custom categories via the settings UI without touching code.

**`expense_categories` table:**

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `key` | string | Machine key (e.g. `payment_processing`) |
| `label` | string | Display name (e.g. "Payment processing fees") |
| `rpc21_mapping` | `"fundraising_costs" \| "admin_costs" \| "project_costs"` | RPC 21 cost classification |
| `auto_populated` | boolean | true = system-only; hidden from manual entry form |
| `is_system` | boolean | true = cannot be deleted by admin |
| `sort_order` | integer | Display order in UI and reports |

Default categories seeded at first run:

| Key | Label | RPC 21 | Auto |
|---|---|---|---|
| `payment_processing` | Payment processing fees | `fundraising_costs` | ✅ |
| `bank_charges` | Bank charges | `admin_costs` | Phase 2 |
| `hosting_it` | Hosting & IT | `admin_costs` | — |
| `administration` | Administration | `admin_costs` | — |
| `fundraising` | Fundraising | `fundraising_costs` | — |
| `field_operations` | Field operations | `project_costs` | — |
| `other` | Other (describe below) | `admin_costs` | — |

Custom categories added by admins are assigned `rpc21_mapping` at creation time. Until assigned, they are excluded from the RPC 21 annual statement with a warning surfaced in the report UI.

### Extensibility principle

This ADR establishes a general rule for the CMS schema:

> **User-configurable concepts live in the database. Technical constants live in code.**

Applied across the data model:

| Concept | Shape | Rationale |
|---|---|---|
| Expense categories | `expense_categories` table | ✅ — this ADR |
| Funds | `funds` table | ✅ — ADR 0001 |
| Membership tiers | `membership_tiers` table | Individual, Organisation seeded; admin adds Student, Lifetime, etc. |
| Email templates | `email_templates` table | Adopters customise subject/body via admin UI; system owns the trigger |
| Campaign custom fields | `campaign_fields` table | Adopters add "In memory of…" or "Dedication" fields per campaign |
| Payment channels | TypeScript enum | Technical concept; adopters do not define new payment rails |
| Donation status (derived) | Not stored | Computed from `refunds` aggregate; not user-configurable |

### RPC 21 annual statement

The combination of Donation records and the Expense Register provides all inputs for the RPC 21 annual statement. The statement is generated automatically and includes:

- Total gross donations (unrestricted / restricted by fund)
- Total membership fees (separate line — not donations)
- Total expenses by RPC 21 category
- Admin-cost ratio (fundraising + admin costs / total income)
- Net available for projects

The treasurer reviews the statement, corrects any miscategorised expenses, and exports as PDF for the auditor.

## Consequences

- The treasurer never manually aggregates Stripe fees — they are auto-booked.
- Adding a new expense category requires no code change or deployment — it is a settings UI action.
- Adding a new membership tier (e.g. Student) requires no code change.
- The RPC 21 annual statement is generated automatically from CMS data.
- The `expense_categories` table must be seeded on first run (part of the migration/init script).
- Auto-populated categories (`is_system: true`) cannot be deleted but their labels can be relabelled per instance.
- The Expense Register is explicitly not an accounting system — it does not replace Banana Accounting or any external accounting tool. It covers only the outflows the CMS has data for (payment fees) plus simple manual entries. Complex accounting (depreciation, accruals, multi-entity consolidation) remains out of scope.

## Alternatives considered

- **Hardcoded expense category enum** — rejected because adding a category requires a code change, PR, and release; inaccessible to non-technical volunteer treasurers.
- **Full general ledger with double-entry bookkeeping** — rejected as out of scope; the target user is a volunteer with no accounting background, not a trained accountant. A general ledger would add significant complexity without proportionate value for small NPOs with simple, stable cost structures.
- **No expense tracking (fees as metadata only)** — rejected because it leaves the treasurer manually summing fees from the Stripe dashboard for each year-end report, which defeats the automation goal.
