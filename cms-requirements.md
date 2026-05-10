# CMS Requirements

> Open-source, self-hosted donor & operations CMS for small NGOs
> Scoped to: MVP + Volunteer Ops + Membership
> Last updated: 2026-05
> See also: CONTEXT.md (domain glossary), docs/adr/ (architectural decisions)

---

## Vision

A fully open-source CMS that any small nonprofit can self-host at near-zero cost. No platform fees, no vendor lock-in, no data leaving your own server. Feature parity with Zeffy's core — donation management, donor CRM, automated receipts, comms, volunteer ops, and membership — with a Swiss compliance layer on top.

**Hard constraint:** every decision in this document must be compatible with ZEWO certification (Qualitätssicherung für gemeinnützige Organisationen) and Swiss GAAP RPC 21 from day one — at the operational level. Organisational compliance (audit, AGA, governance disclosures) is the association's responsibility and is the scope of the Phase 2 Governance Suite (see ADR 0013).

---

## Core principles

| # | Principle |
|---|---|
| 1 | **Zero dependency** — no SaaS backend, no proprietary SDK required to run |
| 2 | **Self-owned data** — all records in your database, on your server, in your jurisdiction |
| 3 | **Stripe as infrastructure only** — payment processor, not a platform; abstracted behind a swappable interface |
| 4 | **One-command setup** — `docker compose up` gets a new instance running |
| 5 | **Cheap to run** — a CHF 8/month VPS must be sufficient for a small NGO |
| 6 | **Automation-first** — every post-payment action (profiles, receipts, emails) is automated; admin should only need to intervene for exceptions |
| 7 | **ZEWO-ready operational compliance** — every data model and automation decision is made with ZEWO audit traceability in mind. Organisational compliance (annual audit, AGA, public reporting) remains with the association and is the scope of the Phase 2 Governance Suite |

---

## Identity and role model

### Person as the identity backbone

The CMS uses a **Person/Role** model (see ADR 0006). Every human or organisation is a `Person`. Roles — Donor, Member, Volunteer — are satellite tables keyed to `person_id`. A Person can hold any combination of roles simultaneously.

This means:
- A volunteer who later donates does not create a new profile — the Volunteer role and Donor role share the same `person_id`.
- Financial records (`donations`) reference `person_id` directly, not the Donor role row.
- nDSG right-to-delete anonymises the Person and all their contact details atomically; role rows are retained for legal financial retention with PII removed.
- Future entity types (board members, beneficiaries, partner contacts) attach to `persons.id` without any structural changes.

All intake paths resolve identity via a single function: `resolveOrCreatePerson(email)`.

### Per-transaction receipt opt-in

The only meaningful per-transaction privacy decision is whether the Person wants a **Tax Receipt** for that specific donation. This is captured on each Donation record as `receipt_opted_in: boolean`:

| `receipt_opted_in` | Triggered by | Data collected at checkout | Receipt generated |
|---|---|---|---|
| `false` (default for fast checkout) | Person proceeds without ticking "I want a tax receipt" | Email only (Stripe minimum) | None |
| `true` | Person ticks "I want a tax receipt" | Email + full name + address | Tax Receipt PDF |

A Member additionally requires full name + address for the statutory membership register, regardless of per-donation opt-in.

The same Person may opt in on one transaction and opt out on another. Cumulative totals for ZEWO reporting include all donations regardless of opt-in status.

For genuinely offline anonymous contributions, see the **Offline Anonymous Donation** entry in CONTEXT.md — recorded against a system-owned placeholder Person via the manual donation form.

### Membership vs Donation

Membership is a separate concept from donating (see ADR 0001):

- A **Donation** is a voluntary gift with no quid-pro-quo. Potentially tax-deductible.
- A **Membership Fee** is annual consideration for membership status (AGA voting rights). **Not tax-deductible** under Swiss law.

Both can be paid in a single Stripe charge (Combined Checkout = two line items, two SQLite records). They must never appear on the same PDF: the Tax Receipt covers the donation only; a separate Membership Confirmation covers the fee.

---

## Post-payment automation pipeline

Every successful charge — card, Twint, or admin-entered IBAN — passes through the same pipeline (see ADR 0002 and ADR 0003):

```
1. Donor submits /donate or /join form
2. Browser → Stripe Checkout
3. Stripe charges card / Twint
4. Stripe fires: checkout.session.completed
5. Webhook handler (synchronous, must return 200 in < 1s):
   a. Idempotency check on Stripe event ID — duplicate? return 200, stop
   b. Upsert Donor profile (create if new email, update if known)
   c. Create Donation record (fund_id = General Fund, receipt_opted_in flag, Booked CHF Amount)
   d. If membership selected → create Member record
   e. Return HTTP 200 to Stripe  ← Stripe's retry window ends here
6. Async job queue (fully decoupled from Stripe):
   f. Queue confirmation email immediately (plain-text body guaranteed, no PDF dependency)
   g. Attempt Tax Receipt PDF generation (if receipt_opted_in)
   h. Attempt Membership Confirmation PDF (if membership)
   i. If PDFs succeed → attach to confirmation email, send via SMTP
   j. If PDFs fail → retry 3× with backoff → on final failure: alert treasurer via email with donor details for manual issue
7. Donor receives email within ~2 minutes
8. Treasurer receives alert email for any failed jobs
```

For IBAN wire transfers: the treasurer uses the admin intake form (`/admin/donations/new-iban`) which calls the same `BankTransferIntake` interface as point 5b–5e above. Automation is identical from that point on. Phase 2 adds CAMT.053 automated bank file parsing to replace the manual form (see ADR 0003).

---

## Feature scope

### Donations

- [ ] One-time + recurring (monthly/annual) via Stripe
- [ ] Multi-currency (CHF / EUR / USD); receipt always shows both the original currency amount and the **Booked CHF Amount** (Stripe-converted, see ADR 0004)
- [ ] Optional receipt opt-in at checkout (name + address fields appear only when checked)
- [ ] Disclaimer on IBAN block: *"Your receipt will be sent within 3 business days once your transfer is reconciled"*
- [ ] Donor list display (opt-in public list on campaign page)
- [ ] Admin manual donation entry (cash, IBAN, cheque, in-kind) via `BankTransferIntake` form
- [ ] All donations assigned to the **General Fund** (single fund at MVP; `fund_id` FK present in schema from day one — see ADR 0001)
- [ ] Combined Checkout: add membership to a donation in one Stripe charge (two line items, two records, two separate PDFs)

### Donor CRM

- [ ] Unified donor profile: all channels (card, IBAN, Twint, manual) linked by email
- [ ] Per-transaction `receipt_opted_in` flag
- [ ] Search, filter, segment (recurring / lapsed / major / first-time / by campaign)
- [ ] Notes and tags per donor
- [ ] Merge duplicate Person records (same human, two accounts) — reassigns all roles and financial records to surviving `person_id` atomically
- [ ] CSV import for initial migration
- [ ] CSV export for accountant, auditor, ZEWO
- [ ] nDSG compliance: right-to-access and right-to-delete actions in UI; deletion anonymises the profile, retains donation aggregates for financial reporting

### Receipts

- [ ] **Immediate Tax Receipt PDF** generated and emailed automatically on every successful donation charge (not on membership fees — separate document)
- [ ] Immediate receipt only for `receipt_opted_in: true` transactions
- [ ] **Year-end consolidated Tax Receipt PDF**: generated automatically on January 15 for every Donor (or Member) with at least one `receipt_opted_in: true` donation in the prior fiscal year; held in 48-hour admin review queue, then emailed automatically if admin does nothing
- [ ] Receipt covers **donation amounts only** — membership fees never appear on a Tax Receipt PDF
- [ ] **Membership Confirmation PDF**: separate document generated on join and on renewal; states fee amount and explicitly notes *"not tax-deductible"*
- [ ] **Cancellation of Tax Receipt PDF**: generated and emailed immediately when a Donation is refunded (see ADR 0005); refunded donations excluded from year-end consolidated receipts and RPC 21 reports
- [ ] All receipt PDFs: association name, RC number, legal address, donor name, donor address, amount in donor currency + Booked CHF Amount, date, *"no goods or services received in exchange"* clause (Swiss legal requirement)
- [ ] Custom letterhead (logo, configurable in instance settings)
- [ ] All PDFs stored server-side; re-issuable from admin UI

### Recurring donation lifecycle

- [ ] Monthly and annual Stripe subscriptions
- [ ] On successful renewal charge: Immediate Tax Receipt emailed (same pipeline as one-time)
- [ ] **Dunning** (failed payment): email donor on first failure only (Stripe-hosted self-serve payment update link); subsequent retries silent; cancellation email on final failure after all Stripe retries exhausted
- [ ] Subscription cancellation records `cancellation_reason`: `payment_failed` or `voluntary` (for ZEWO churn reporting)
- [ ] Failed charges: never create a Donation record, never count toward receipts or reports

### Refund handling

- [ ] Stripe `charge.refunded` webhook → insert Refund record → Cancellation of Tax Receipt generated and emailed **immediately**, no grace period (see ADR 0005)
- [ ] Partial refunds supported: Cancellation covers the refunded amount only; remaining balance stays on the original receipt
- [ ] Stripe `charge.refund.updated` (reversal) → Refund status set to `reversed` → Donation restored to `confirmed` → treasurer notified
- [ ] Refunded (or partially refunded) amount excluded from year-end consolidated receipt and all RPC 21 reports
- [ ] Admin manual refund entry for IBAN donations at `/admin/donations/:id/refund` (same downstream pipeline)
- [ ] Audit log records: donation confirmed → receipt issued → refund applied → cancellation document issued

### Dispute (chargeback) handling

- [ ] Stripe `charge.dispute.created` → insert Dispute record (`status: open`) → alert treasurer immediately (email with Stripe dispute URL + response deadline) → disputed amount excluded from RPC 21 reports
- [ ] Stripe `charge.dispute.closed` (won) → Dispute `status: won` → Donation restored to `confirmed` → treasurer notified
- [ ] Stripe `charge.dispute.closed` (lost) → Dispute `status: lost` → insert Refund record → Cancellation of Tax Receipt generated and emailed (same pipeline as voluntary refund)
- [ ] Disputed donations are excluded from year-end consolidated receipt and RPC 21 reports while `open`; reinstated if `won`, permanently excluded if `lost`
- [ ] Audit log records full dispute lifecycle: opened → treasurer alerted → won/lost → cancellation issued (if lost)

### Communications

- [ ] Transactional emails (all automated): donation confirmation, immediate receipt, year-end receipt, membership join, membership renewal, membership lapsed reminder (30 days before expiry), dunning first-failure, dunning cancellation, volunteer application acknowledgement
- [ ] Bulk email to a named segment (e.g. "active monthly donors", "2024 lapsed")
- [ ] Markdown editor for bulk email body with preview and test-send
- [ ] Unsubscribe handling — auto-suppression list; nDSG-compliant; handled via self-service token link (see below)
- [ ] **Self-service contact update:** every receipt email footer contains a tokenised "Update your contact details" link (`/self-service/update?token=xxx`); allows the Person to update name and address without a password; token is single-use, expires in 7 days; same token mechanism handles unsubscribe (`/self-service/unsubscribe?token=xxx`)
- [ ] Email open/click tracking: optional, off by default for privacy

### Campaigns

- [ ] Multiple concurrent campaigns with goal, deadline, cover image, description, fund assignment (General Fund at MVP)
- [ ] Campaign thermometer (live progress bar embeddable on public site)
- [ ] Embeddable donation widget (`<script>` tag) for the public Astro site
- [ ] Per-campaign reporting: raised, donors, conversion rate
- [ ] Link campaign to a project entry in the public site content collection

### IBAN reconciliation (MVP)

- [ ] Admin intake form at `/admin/donations/new-iban`: donor name, email, address (optional), amount, currency, transfer date, bank reference, payment reference, receipt opt-in
- [ ] On submit: same automation pipeline as Stripe webhook (profile upsert, Donation record, email + PDF queue)
- [ ] `bank_reference` field stored from day one (deduplication key for future CAMT.053 ingestion)
- [ ] `BankTransferIntake` interface defined and used — Phase 2 `Camt053BankTransferIntake` plugs in without modifying the pipeline (see ADR 0003)

### Volunteer ops

- [ ] Volunteer database (separate from donor CRM; linkable if the same person also donates)
- [ ] Application intake from public `/volunteer` form → admin review queue (approve / reject / hold)
- [ ] Volunteer status lifecycle: applicant → active → alumni
- [ ] Mission / trip assignment (start date, end date, location, role)
- [ ] Hours logged per volunteer per mission
- [ ] Notes per volunteer; CSV export of full roster
- [ ] Automated acknowledgement email on application receipt
- [ ] Testimonials: admin marks a volunteer record as `publishable` → surfaces to public site Stories section via API read

### Membership

> **Feature flag:** `ENABLE_MEMBERSHIP=true` (default). Set `false` for foundations or non-membership NGOs — all membership routes, UI sections, and Stripe flows are disabled.

**Membership is admin-managed, not self-service.** The board/AGA decides who becomes a member by policy. There is no public `/join` page or self-enrolment flow. The admin creates member records and triggers payment collection.

- [ ] Configurable membership tiers stored in `membership_tiers` table (see ADR 0007): individual, organisation; amounts configurable in instance settings
- [ ] **Admin-managed enrolment:** admin creates a Member record for a Person via `/admin/members/new`; system generates a Stripe payment link (or records a cash/IBAN payment directly); Membership Confirmation PDF emailed on payment confirmation
- [ ] Combined Checkout available only when both `ENABLE_MEMBERSHIP=true` and admin has configured at least one active tier — allows a donor to add a membership to a donation in one Stripe session
- [ ] **Annual renewal:** admin triggers renewal cycle from `/admin/members`; system sends payment link to each active member; Membership Confirmation PDF emailed on payment; no Stripe subscription auto-billing (renewal is admin-initiated, not automatic)
- [ ] Lapsed reminder email 30 days before expiry (automated, based on `members.lapses_at`)
- [ ] Member-only email segment for newsletter targeting
- [ ] Membership register exportable as CSV for AGA — includes member name, tier, join date, last renewal date, status
- [ ] VAT-ready schema: `membership_tiers.vat_rate` field (default 0%); `vat_amount_chf` stored on each membership fee record; Membership Confirmation PDF shows VAT line when rate > 0%. VAT rate configuration exposed in instance settings only when `ENABLE_VAT=true` (default: false)

### Reporting

All reports exportable as CSV and PDF.

- [ ] Dashboard KPIs: total raised (YTD), active recurring donors, MRR, new donors this month, active members, volunteer count
- [ ] Donation report: filter by period, campaign, channel, currency, fund
- [ ] Recurring donor report: active, paused, `payment_failed`, `voluntary` cancellations, churn rate
- [ ] Year-end RPC 21 statement: total unrestricted donations, total membership fees (separate line), admin cost ratio
- [ ] Volunteer report: total active, hours by mission
- [ ] Membership report: active, lapsed, renewal rate
- [ ] Refund report: total refunded, cancellation documents issued

### Admin & access

- [ ] Email + password login; passwords hashed with Argon2id (memory-hard; OWASP 2024 parameters — see ADR 0011)
- [ ] Two roles: `admin` (full access), `treasurer` (financial views + exports, no edit)
- [ ] TOTP two-factor authentication (RFC 6238, `otplib`); 8 single-use recovery codes; replay prevention via used-token tracking
- [ ] Session tokens: 32-byte random, `HttpOnly; Secure; SameSite=Strict`, SHA-256 stored in DB; 8h absolute / 2h idle timeout; one active session per admin
- [ ] Rate limiting on all auth endpoints (10 login attempts / 15 min per IP; 5 TOTP attempts / 15 min per admin)
- [ ] Stripe webhook signature verified via `stripe.webhooks.constructEvent` on every inbound request before any processing (see ADR 0011)
- [ ] Hash-chained audit log: every create / update / delete on financial and identity records stores before + after state, actor, timestamp, and a SHA-256 hash chained to the previous entry (see ADR 0010); tamper-evident by design
- [ ] Audit chain verification available as admin UI action (`/admin/audit/verify`) and CLI command (`pnpm cms audit:verify`) — runnable independently by an auditor
- [ ] Refund report: total refunded, cancellation documents issued
- [ ] Instance settings: org name, RC number, legal address, logo, currency defaults, email sender, SMTP config, membership tier amounts

---

## Out of scope (this version)

- ❌ Events & ticketing (future)
- ❌ Peer-to-peer fundraising (future)
- ❌ Raffle / auction / online store (future)
- ❌ CAMT.053 bank file ingestion (Phase 2 — interface ready, parser not built)
- ❌ Multi-tenant / multi-org in one instance
- ❌ Mobile native app (responsive web only)
- ❌ In-house card processing (Stripe handles all PCI scope)
- ❌ Real-time admin dashboard WebSocket (plain-text email to treasurer for job failures at MVP)
- ❌ Restricted / earmarked funds in checkout UI (fund_id schema present; selector not exposed until board activates)
- ❌ In-honour / in-memory donations with honouree notification (deferred — nDSG third-party PII handling required; not a current VMV SA use case)

---

## Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Astro 4 `output: 'hybrid'` | SSR for admin routes; same stack as public site |
| Language | TypeScript (strict) | `astro/tsconfigs/strict`; all `.ts` / `.astro` files; no plain `.js` |
| Admin UI interactivity | Alpine.js | ~15KB, no build step; fits Astro idiom |
| Auth | Hand-rolled cookie sessions + `otplib` for TOTP | Zero external auth dependency; single-org install |
| Database | **Postgres 16** via Drizzle ORM (all environments) | Concurrent writes, native `timestamptz`/`uuid`/`boolean`, same engine in CI and prod (see ADR 0012) |
| Job queue | Postgres `jobs` table + `node-cron` worker (same process) | No Redis, no RabbitMQ; single container; worker callable in Vitest against real Postgres |
| Payments | Stripe via `PaymentProvider` interface | Abstracted — swappable to SumUp or PostFinance |
| Email | Nodemailer over SMTP (bring your own) | One config field; tested with Infomaniak, Brevo, Sendgrid |
| PDF | `pdfkit` (pure Node.js) | Server-side generation; no headless browser; low memory footprint |
| File storage | S3-compatible object storage (required for production) | PDFs, exports, uploads — local filesystem not permitted in production (see ADR 0008) |
| Package manager | pnpm | Strict dependency resolution; faster installs; leaner Docker layers |
| Linting | ESLint + `@typescript-eslint` + `eslint-plugin-astro` | Covers `.ts` and `.astro`; Biome deferred (no `.astro` support yet) |
| Formatting | Prettier + `prettier-plugin-astro` | Unified formatting across all file types |
| Unit / integration tests | Vitest | Native ESM + TypeScript; zero-config with Astro/Vite |
| End-to-end tests | Playwright | Webhook pipeline, Stripe redirect, year-end receipt queue |
| Deployment | Docker Compose (app + postgres + optional nginx sidecar) | One-command install; worker runs in same process as web server |
| Container registry | GitHub Container Registry (`ghcr.io`) | Published on every merge to `main`; adopters `docker pull` to upgrade |
| CI/CD | GitHub Actions | typecheck + lint + test on every push/PR; e2e on `main`; Docker publish on merge |
| Config | `.env` file | All secrets; never committed to git |

---

## Hardware requirements

### Minimum — sufficient for most small NGOs

| Resource | Spec | Notes |
|---|---|---|
| CPU | 1 vCPU | Handles < 500 concurrent sessions |
| RAM | 512 MB | Astro SSR + Postgres + pdfkit peak ~350MB |
| Storage | 5 GB | OS + app + Postgres data dir (PDFs and exports go to object storage) |
| OS | Ubuntu 22.04 LTS or Debian 12 | Node.js 22 must be installable |
| Node.js | v22+ | Required by Astro 4 |

**Estimated cost:** CHF 4–8/month (Infomaniak VPS S or equivalent).

### Comfortable — recommended for > 200 donors or regular bulk email

| Resource | Spec | Notes |
|---|---|---|
| CPU | 2 vCPU | PDF batch generation + bulk email without blocking |
| RAM | 1 GB | Headroom for concurrent admin sessions + cron jobs |
| Storage | 20 GB | Years of receipts, exports, uploads |

**Estimated cost:** CHF 8–15/month.

---

## Required external services

### Strictly required

| Service | Purpose | Cost |
|---|---|---|
| **Stripe** | Card + Twint payment processing | CHF 0 base; ~1.5% + CHF 0.10 per Swiss card transaction |
| **VPS / hosting** | Run the application | CHF 4–15/month |

### Optional but strongly recommended

| Service | Purpose | Recommended default |
|---|---|---|
| SMTP provider | All outbound email | **Infomaniak Mail** (Swiss, 1,440/day on paid plans); Brevo/Sendgrid for > 1,440 donors |
| S3-compatible storage | PDFs, exports, uploads (required for production — see ADR 0008) | **Infomaniak Object Storage** (Swiss); Cloudflare R2 as alternative |
| SSL certificate | HTTPS | Let's Encrypt via nginx |
| Domain name | Custom URL | CHF 10–20/year |

The year-end consolidated receipt batch respects a configurable `smtp_daily_limit` instance setting (default: 1,200). If the recipient count exceeds the daily limit, the batch is spread across consecutive nights starting January 15. The admin UI shows batch progress and estimated completion date. A setup-time warning is displayed if the prior year's opt-in donor count approaches the configured limit.

### Explicitly not required

- ❌ Auth0, Clerk, or any external auth SaaS
- ❌ Vercel, Netlify, or serverless platform
- ❌ Redis or any message queue
- ❌ Elasticsearch or external search

---

## Total estimated running cost

| Scenario | Monthly |
|---|---|
| Minimal (VPS + Stripe fees only, self-hosted SMTP) | CHF 4–8 + ~1.5%/donation |
| Comfortable (VPS + Brevo free + R2 free + domain) | CHF 8–15 + ~1.5%/donation |
| At scale (1k+ donors, Postgres, paid SMTP) | CHF 20–40 + ~1.5%/donation |

Compare to Zeffy: CHF 0 platform fee but donor pays a voluntary tip; data on US servers. This CMS: CHF 4–40/month fixed, no tips, Swiss jurisdiction.

---

## Swiss compliance

The CMS automates **operational compliance**. Organisational compliance (annual audit, AGA, governance disclosures, ZEWO application) is the association's responsibility and is the scope of the Phase 2 Governance Suite (see ADR 0013).

### Operational compliance (CMS automates)

| Requirement | Implementation |
|---|---|
| **nDSG (revFADP)** | Data on Swiss infrastructure; right-to-delete via Person anonymisation; data processing agreement with Stripe |
| **Swiss GAAP RPC 21** | `fund_id` on every donation from day one; unrestricted / restricted fund accounting ready; annual statement auto-generated from donations + Expense Register |
| **ZEWO operational tracking** | Hash-chained audit log; donation ≠ membership fee in data model and on receipts; `cancellation_reason` tracked; churn rate reportable; admin-cost ratio computed automatically |
| **Tax receipts** | Legally required fields: association name, RC number, legal address, donor name + address, amount in donor currency + Booked CHF Amount, date, *"no goods or services received in exchange"* |
| **Refund and dispute compliance** | Cancellation of Tax Receipt issued immediately on refund or lost dispute; refunded amounts excluded from year-end consolidated receipts |
| **10-year data retention** | Postgres `pg_dump` to Infomaniak Object Storage; PDF receipts in versioned object storage; receipt template version pinned per donation |

### Organisational compliance (the association handles externally — Phase 2 will automate)

| Requirement | v1 — manual outside CMS | Phase 2 — Governance Suite |
|---|---|---|
| Independent annual financial audit | Org hires registered auditor; CMS provides RPC 21 export | Audit dossier auto-bundled |
| AGA (Annual General Assembly) management | Manual | AGA module |
| Public annual report | Manual | Annual report generator |
| ZEWO application / renewal | Manual | ZEWO workflow module |
| Board minutes archive | Manual | Minutes module |
| Statutes versioning | Manual | Statutes module |

---

## Architectural decisions (ADRs)

| ADR | Title |
|---|---|
| 0001 | `fund_id` on donation record from day one |
| 0002 | Webhook handler returns HTTP 200 before async PDF/email work |
| 0003 | Bank transfer intake as a pluggable interface |
| 0004 | Use payment-processor converted amount as the Booked CHF Amount |
| 0005 | Refund triggers immediate cancellation of receipt (no grace period) |
| 0006 | Person/Role identity model (`persons` as identity backbone; Donor, Member, Volunteer as roles) |
| 0007 | Expense Register with configurable categories; extensibility principle |
| 0008 | Backup, restore, and 10-year data retention |
| 0009 | UTC timestamp storage; Europe/Zurich for fiscal year boundaries |
| 0010 | Hash-chained audit log |
| 0011 | Authentication model and webhook signature verification |
| 0012 | Postgres as the sole database engine across all environments |
| 0013 | Product split: CMS (v1) and Governance Suite (Phase 2); modular monorepo |
| 0014 | Job queue worker runs in the same container as the web server |
