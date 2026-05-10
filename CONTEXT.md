# Domain Glossary — VMV SA CMS

> Captures resolved terms. Only meaningful to domain experts — no implementation details.
> Updated inline during design sessions.

---

## Person

The canonical identity record for any human or organisation the CMS has interacted with. A Person is identified by a stable internal `person_id` (UUID). They may hold one or more roles simultaneously: Donor, Member, Volunteer — or none yet.

A Person carries only identity attributes: name, type (`individual | organisation`), tags, notes. Contact details (emails, addresses) are stored in separate relations keyed to `person_id` so they can change without breaking identity. Intake paths (Stripe checkout, IBAN form, volunteer application) match on email to find or create a Person — but email is a lookup key, not the identity anchor.

The `persons` table is the sole identity backbone. No other entity stores a canonical name or email; all person-facing outputs look up those fields via `person_emails` and `person_addresses`.

## Donor

A role attached to a Person who has made at least one financial contribution (any channel: card, IBAN, Twint, cash) to the association. Represented as a `donors` row with a `person_id` FK. Being a Donor does not imply being a Member or Volunteer.

There is exactly one `donors` row per Person (once they donate, the Donor role exists permanently on their profile — even if they later lapse). Donation records reference `person_id` directly, not `donor_id`, so financial history is tied to the Person identity, not to the role.

## Member

A role attached to a Person who has been **approved for membership by the board or AGA** and has paid the annual membership fee. Membership is not self-service — there is no public enrolment flow. The admin creates the Member record in the CMS following approval, then triggers payment collection. Represented as a `members` row with a `person_id` FK. Governed by the association's statutes (Art. 60 CC).

- Membership tiers are configurable (e.g. Individual CHF 30/year, Organisation CHF 100/year — confirm in statutes)
- Annual renewal is admin-initiated: the admin triggers the renewal cycle, the CMS sends payment links to active members
- A Member has a right to vote at the Annual General Assembly (AGA). This is a statutory concept, distinct from donor or volunteer status.
- The entire membership module is feature-flaggable (`ENABLE_MEMBERSHIP`). Foundations and non-membership NGOs disable it entirely.

## Volunteer

A role attached to a Person who has applied to contribute time and skills to the association's field operations or organisational activities. Represented as a `volunteers` row with a `person_id` FK. A Volunteer may or may not also be a Donor or Member. At intake, if the volunteer's email matches an existing `person_emails` row, the system auto-proposes linking to the existing Person — one admin click to confirm.

## Donation

A voluntary financial contribution to the association with no quid-pro-quo. Potentially tax-deductible for the donor (subject to cantonal rules). Recorded in the `donations` table.

## Membership Fee

An annual fee paid in exchange for membership status. **Not a donation.** Not tax-deductible under Swiss law (it is consideration for a benefit — the right to membership and AGA voting). Recorded in the `members` table separately from the `donations` table.

## Combined Checkout

The UX pattern where a donor can add a membership to a donation in a single Stripe charge. Results in two Stripe line items and two separate database records (one Donation, one Membership Fee). The tax receipt must clearly separate the two amounts.

Only available when `ENABLE_MEMBERSHIP=true` and at least one active membership tier is configured. Membership in a Combined Checkout is still subject to the same admin-approval policy — the admin only exposes the Combined Checkout option to Persons who have already been approved for membership by the AGA.

## Tax Receipt (Spendenbestätigung / Attestation de don)

A PDF document issued to a donor for the **donation portion only**. The membership fee must never appear on this document. Required fields under Swiss law: association name, RC number (if registered), legal address, donor name and address, donation amount in CHF (or CHF-equivalent), date, "no goods or services received in exchange" clause.

When a Combined Checkout occurs, two separate PDFs are generated and attached to one email: (1) the Tax Receipt for the donation, (2) a Membership Confirmation for the fee.

## Membership Confirmation

A separate PDF issued when a membership fee is paid. Confirms membership status, year of validity, and fee amount. Explicitly states the fee is **not tax-deductible**. Never combined with a Tax Receipt on the same PDF.

## Receipt Opt-In

A per-transaction flag (`receipt_opted_in: boolean`) on every Donation record. Determines whether the donor wants a Tax Receipt for that specific donation.

- `receipt_opted_in: true` → name + address are required at checkout; an Immediate Tax Receipt PDF is generated and emailed.
- `receipt_opted_in: false` → only the email Stripe collects by default is stored on the Donor profile; no Tax Receipt is generated; no email is sent (the donor chose a fast checkout, the system respects it).

A Person record is created (or matched) on every transaction where an email is known, regardless of receipt opt-in. The same Person may opt in on one transaction and opt out on another — both are recorded on their respective Donation records. Cumulative totals for ZEWO reporting include all Donations regardless of opt-in status.

## Offline Anonymous Donation

The rare case of a genuinely anonymous offline contribution (cash dropped in a box at an event, anonymous Twint with no metadata). Recorded by the treasurer via the manual donation form against a single system-owned placeholder Person record. No PII is collected because none is available. Treated as a routine data-entry edge case, not a distinct identity category.

## Immediate Receipt

A Tax Receipt PDF generated and emailed automatically within minutes of every successful donation charge (one-time or recurring renewal) where `receipt_opted_in: true`. Serves two purposes: payment confirmation and tax documentation. Donations with `receipt_opted_in: false` produce no Immediate Receipt and no email.

## Year-End Consolidated Receipt

A single Tax Receipt PDF covering all `receipt_opted_in: true` donations made by a Donor (or Member) in a given fiscal year. Used for annual tax declaration. Generated automatically on January 15, held in a 48-hour admin review queue, then emailed automatically. Supersedes the sum of all Immediate Receipts for that year — both exist, the consolidated one is the canonical tax document.

## Fund

An accounting category for donations. Every donation is assigned to exactly one Fund at the time of payment. Currently only one Fund exists: the **General Fund** (unrestricted). The data model supports additional Funds (restricted, earmarked) without schema change — the selector is simply not exposed in the UI until the board decides to activate it.

## General Fund

The sole active Fund. All donations flow here by default. The board may allocate General Fund money freely across projects and operating costs. No donor earmarking, no restricted-fund accounting obligation at this stage.

## Restricted Fund (future)

A Fund tied to a specific project or purpose, activated only when the board decides earmarking is strategically useful. Not available in the MVP. When activated, donations to a Restricted Fund must be accounted for separately under Swiss GAAP RPC 21 and cannot be spent on operating costs without donor consent.

## Reconciliation

The process by which an external payment (IBAN wire transfer landing in the Postfinance account) is matched to a donor and converted into a Donation record in the CMS. Triggered by either: (a) admin manual entry via the IBAN intake form, or (b) automated CAMT.053 bank file ingestion (Phase 2). Both paths terminate at the same internal interface that triggers the standard post-donation automation pipeline (profile upsert → records → email → PDFs).

## CAMT.053 (future)

The ISO 20022 XML banking standard for end-of-day account statements. Postfinance and all Swiss banks export CAMT.053 files. Phase 2 of the CMS will parse these files weekly, match donor references, and feed matched entries into the Reconciliation interface automatically. Unmatched entries surface in an admin review queue.

## Payment Reference

A short string the donor includes when wiring an IBAN transfer (e.g. `Smith 2026`). The CMS uses it to match the bank entry to a donor record. Format is configurable per association but recommended to include `donor_name + year` to support both manual and CAMT.053 reconciliation.

## Recurring Donation

A Stripe subscription tied to a Donor. Charges on a fixed interval (monthly or annual). Each successful charge creates a new Donation record and triggers an Immediate Receipt. Failed charges do not create Donation records and are excluded from receipts and reports.

## Dunning

The notification sequence triggered when a recurring payment fails. Two emails sent: (1) on first failure — actionable warning to the donor with a Stripe Customer Portal self-serve link to update payment details; (2) on final cancellation after all Stripe retries exhausted — factual cancellation notice. Intermediate retries are silent.

## Subscription Cancellation Reason

An attribute on a cancelled Subscription record. Possible values: `payment_failed` (Stripe exhausted all retries) or `voluntary` (donor explicitly cancelled or admin cancelled on request). Must be tracked separately for ZEWO churn reporting — the two represent fundamentally different donor behaviour.

## Refund

An admin- or donor-initiated reversal of a previously-recorded Donation. Triggered by a Stripe webhook (`charge.refunded`) for card/Twint donations, or by admin manual entry for IBAN donations. A Refund is a first-class entity (not a status flag on the Donation) and may be partial. The sum of applied Refunds against a Donation determines whether that Donation is `confirmed`, `partially_refunded`, or `refunded`. A Refund triggers the immediate generation of a Cancellation of Tax Receipt. Distinct from a Dispute, which is initiated by the donor's bank, not by the association or the donor directly.

## Dispute

A chargeback opened by the donor's bank against a card or Twint donation, independent of any action by the association or the donor. When a Dispute is created, Stripe immediately withdraws the charged amount from the association's balance. The outcome is determined by the card network (Visa/Mastercard), not by Stripe or the association.

A Dispute is a first-class entity with three lifecycle states:
- `open` — dispute filed; funds withdrawn; treasurer must respond in Stripe before `stripe_due_by`
- `won` — card network ruled in the association's favour; funds returned; Donation restored to `confirmed`
- `lost` — card network ruled against; funds not recovered; a Refund record is created and the Cancellation of Tax Receipt pipeline is triggered

A Dispute is **not** a Refund. No Cancellation of Tax Receipt is issued while a Dispute is `open` — the outcome is unknown. The Cancellation is only issued if the Dispute is `lost`.

## Cancellation of Tax Receipt

A PDF document generated automatically and immediately when a Refund occurs (including when a Dispute is `lost`). References the original Tax Receipt number, the original donation date, the refund or dispute-lost date, and the cancelled amount. Emailed to the donor.

A Donation with an applied Refund is excluded from the Year-End Consolidated Receipt and from all RPC 21 reports for the fiscal year. A Donation with an `open` Dispute is also excluded from reports until the Dispute is resolved.

## Booked CHF Amount

The CHF figure that enters the association's accounting books for a given donation. Defined as: **the amount received by the association after currency conversion by the payment processor (Stripe) or the bank (Postfinance for IBAN)**. This is the canonical figure for: receipt PDFs, year-end consolidated receipts, RPC 21 reporting, ZEWO audits, and bank reconciliation. No internally-computed FX rates are used.

For a donation made in a non-CHF currency, the receipt shows both: the original donated amount in the donor's currency, and the Booked CHF Amount with a footer note explaining that the CHF figure reflects what the association received after conversion.

## Fiscal Year

January 1 – December 31 (standard Swiss association fiscal year unless statutes specify otherwise — confirm).

Fiscal year boundaries are evaluated in the **`Europe/Zurich` time zone**, regardless of where the donor or the server is located. A donation timestamped 23:45 CET on December 31 belongs to the closing fiscal year; a donation timestamped 00:05 CET on January 1 belongs to the new one. All database timestamps are stored in UTC; all fiscal year boundary calculations convert `Europe/Zurich` midnight to UTC before querying. All date labels on receipts, reports, and PDFs are rendered in `Europe/Zurich` time.

---

## Expense Register

A lightweight log of all financial outflows for the association. Not a general ledger — no double-entry bookkeeping, no chart of accounts. Contains two classes of entries:

1. **Auto-entries** — created by the system without treasurer action. Stripe payment processing fees are auto-logged from `balance_transaction.fee` on every successful charge.
2. **Manual entries** — entered by the treasurer via a simple form (amount, date, category, optional receipt upload). Covers stable recurring costs the system has no visibility into: hosting, bank charges, travel, printing, registration fees.

Every entry belongs to one **Expense Category**. Categories are stored in the database (not hardcoded as enums), so an instance administrator can add custom categories via the settings UI without a code change. Each category carries a `rpc21_mapping` field that assigns it to an RPC 21 cost type (`fundraising_costs`, `admin_costs`, or `project_costs`). Custom categories default to `admin_costs` until explicitly assigned.

The Expense Register, combined with the Donation records, provides all inputs needed to auto-generate the RPC 21 annual statement and compute the ZEWO admin-cost ratio.

## Expense Category

A user-configurable classification for Expense Register entries. Stored as a database table, not a code enum. Default categories shipped with every instance:

| Category key | RPC 21 mapping | Auto-populated |
|---|---|---|
| `payment_processing` | `fundraising_costs` | ✅ (Stripe fees) |
| `bank_charges` | `admin_costs` | Phase 2 (CAMT.053) |
| `hosting_it` | `admin_costs` | — |
| `administration` | `admin_costs` | — |
| `fundraising` | `fundraising_costs` | — |
| `field_operations` | `project_costs` | — |
| `other` | `admin_costs` | — |

Instance admins may add custom categories. Each custom category must be assigned an `rpc21_mapping` before it appears in the RPC 21 annual statement.

## Receipt Template Version

A version identifier pinned to each `donation` record at the moment its Tax Receipt PDF is generated. When an admin re-issues a receipt in a later year, the CMS uses the template (layout, legal text, logo) that was active at the original generation time — not the current template. This ensures re-issued documents are identical to what the donor originally received, which matters for donor trust and ZEWO audit traceability.

## Extensibility Principle

User-configurable concepts live in the database; technical constants live in code. An instance administrator must be able to adapt the CMS to their NPO's reality through the settings UI without forking the repository. Wherever a concept is user-facing and plausibly variable across adopters, it is modelled as a database table (e.g. Expense Categories, Membership Tiers, Funds, Email Templates, Campaign Custom Fields) rather than a hardcoded enum.

## Membership Tier

A configurable membership SKU. Stored as a database table (`membership_tiers`), not hardcoded. Each tier has a name, annual fee amount, and description. Default tiers: Individual and Organisation. Instance admins may add tiers (e.g. Student, Family, Lifetime) via settings without a code change.

## Audit Log

An append-only, hash-chained record of every write operation on financial and identity records in the CMS. Each entry stores the before and after state of the affected record, the actor (admin user or system), and a SHA-256 hash computed over the entry's fields and the previous entry's hash. This chain structure means any tampering with, insertion into, or deletion from the log is mathematically detectable by anyone who runs the verification function — including an independent ZEWO auditor.

The Audit Log is never modified after an entry is written. Soft-deletes only — no financial record is ever hard-deleted from the database.

## Timestamp Convention

All timestamp columns use Postgres `timestamptz`, which stores values in UTC and returns UTC. All business logic that requires a human-meaningful date — fiscal year boundaries, receipt date labels, year-end cron scheduling, report filters — converts to `Europe/Zurich` time before evaluation or display via `src/lib/time.ts`. The `node-cron` expression for the January 15 year-end job is expressed in `Europe/Zurich` time using the `timezone` option. No code outside of the time-zone conversion layer may hardcode UTC offset values or perform raw `Date` arithmetic against timestamp fields.

## Self-Service Token

A short-lived, single-use token included in every receipt email footer that allows a Person to update their own contact details (name, address) without a password or account. Implemented as a tokenised link (`/self-service/update?token=xxx`) that expires after 7 days and is invalidated on first use.

The same token mechanism handles email unsubscribes (`/self-service/unsubscribe?token=xxx`). Tokens are stored as `SHA-256(random_32_bytes)` in a `self_service_tokens` table keyed to `person_id`, with a `purpose` field (`address_update | unsubscribe`) and an `expires_at` timestamp.

This pattern eliminates the need for donors to contact the treasurer every time they move, keeping receipt addresses accurate for long-running recurring donors without any admin overhead.

## Internationalisation (i18n)

The CMS ships in **English only** for v1. All donor-facing strings — receipt PDFs, email subject lines, email bodies, membership confirmations, cancellation documents — must be sourced from a central i18n dictionary (`src/i18n/en.ts`), never hardcoded in PDF generation or email template code. Adding DE/FR/IT in a future version must require only adding a translation file and a `donor.preferred_language` field on the Donor record — no changes to PDF or email rendering logic.

## Implementation Language

**TypeScript** (strict mode via `astro/tsconfigs/strict`). All source files — pages, components, API routes, Drizzle schema, i18n strings — are `.ts` / `.astro` with full type coverage. Plain `.js` files are not permitted in the CMS codebase.

## Test Stack

**Vitest** for unit and integration tests (pairs natively with Vite/Astro, zero-config TypeScript + ESM). **Playwright** for end-to-end flows (webhook pipeline, Stripe checkout redirect, year-end receipt queue). No Jest.

## Product Structure

The platform consists of two products in a single repository (see ADR 0013):

- **CMS (v1, current scope)** — operational platform. Donations, donor/member/volunteer CRM, expense register, receipts, RPC 21 export, comms.
- **Governance Suite (Phase 2, deferred)** — annual cycle platform. AGA, audit dossier, public annual report, ZEWO application, board minutes, statutes versioning. Activated via `ENABLE_GOVERNANCE=true` once available.

Feature flags (`.env`):
- `ENABLE_MEMBERSHIP=true` (default) — disable for foundations or non-membership NGOs
- `ENABLE_GOVERNANCE=false` (default) — enable when Phase 2 ships
- `ENABLE_VAT=false` (default) — enable for VAT-registered associations (turnover > CHF 100k)

Both products share one Postgres database, one Docker Compose deployment, one identity backbone (`persons`). The Governance module under `src/governance/` is feature-flagged and tree-shaken from production bundles when disabled.

The CMS is a **standalone open-source admin panel** covering `/admin/*` routes. It exposes a small versioned public read API (`GET /api/public/*`) for live campaign data. Private donor data never leaves the server without cookie-auth.

The VMV SA public Astro site is a consumer of that public API — it is not bundled with the CMS. Any NGO adopter brings their own public website and calls the same API.

An embeddable widget (`<script>` snippet) is explicitly **out of scope for v1** — deferred to v1.1 to avoid versioning contract complexity during the core build.

## CMS Repository

The CMS lives in its **own dedicated repository**, separate from `VMV_SA.github.io`. The `VMV_SA.github.io` repo remains the VMV SA public site prototype only. When VMV SA goes to production, they self-host the CMS from the dedicated repo and point their public site's API calls at it.

## Code Quality Toolchain

**ESLint + Prettier.** ESLint with `@typescript-eslint` + `eslint-plugin-astro` for linting; Prettier with `prettier-plugin-astro` for formatting. Covers all file types in the project (`.ts`, `.astro`). Biome deferred until it ships `.astro` linting support.

## CI/CD Pipeline

GitHub Actions on the CMS repo:

| Job | Trigger | Command |
|---|---|---|
| `typecheck` | every push / PR | `pnpm tsc --noEmit` |
| `lint` | every push / PR | `pnpm eslint && pnpm prettier --check` |
| `test` | every push / PR | `pnpm vitest run` |
| `e2e` | `main` branch only | `pnpm playwright test` |
| `docker-publish` | merge to `main` | build + push to `ghcr.io` |

No automated deployment to VPS — manual by design (`docker compose pull && docker compose up -d`). Adopters own their deployment cadence.

## Package Manager

**pnpm.** Strict dependency resolution (only declared dependencies are importable), faster installs, leaner Docker layer caching. Used in the CMS repo from day one.

## Job Queue Worker

**Single app container.** The cron worker runs inside the same Node.js process as the web server using `node-cron`, polling the Postgres `jobs` table every 30 seconds. Docker Compose runs two services: the app container and a `postgres:16-alpine` container. The worker is a plain async function callable directly in Vitest against a real Postgres test instance.

**Event loop discipline for batch jobs:** CPU-intensive jobs (PDF generation, year-end batch) use two techniques to avoid blocking the event loop for admin HTTP request handlers:

1. **`setImmediate` yield between jobs** — `await new Promise(resolve => setImmediate(resolve))` is inserted between each job in a batch run. This allows pending I/O callbacks and HTTP handlers to execute between PDFs.
2. **Streaming `pdfkit`** — PDFs are generated using `pdfkit`'s streaming API (`doc.pipe(passThrough)`), naturally interleaving event loop turns with stream buffer flushes rather than one monolithic synchronous block.

Worker threads are explicitly not used — they break the "worker as plain async function" Vitest guarantee and are not justified by the CPU load profile of a small NGO receipt batch (~50–150ms per PDF).

## Production Domain Topology

Subdomain split:
- Public site → `vmv-sa.org` (static, GitHub Pages or Infomaniak static hosting)
- CMS admin + API → `app.vmv-sa.org` (Node.js container on VPS)
- Public API consumed by the public site → `app.vmv-sa.org/api/public/*` (CORS allowlist: `vmv-sa.org`)
- Cookie scope → `Domain=app.vmv-sa.org` (isolated to the CMS subdomain)
