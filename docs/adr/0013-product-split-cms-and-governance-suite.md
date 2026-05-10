# ADR 0013 — Product split: CMS (v1) and Governance Suite (Phase 2); modular monorepo readiness

**Status:** Accepted
**Date:** 2026-05

## Context

The original requirements describe the CMS as "ZEWO-airtight by design," which conflates two distinct concerns:

1. **Operational compliance** — the system tracks donations, expenses, and refunds in a way that an auditor can verify. This is what the CMS does.
2. **Organisational compliance** — the association holds an AGA, publishes an annual report, files a ZEWO application, archives board minutes, undergoes an independent financial audit. These are governance obligations of the organisation, not properties of any software.

A small NPO genuinely needs help with both. The strategic decision is whether to build one platform that does both, or two coordinated products.

Building everything in v1 is not viable: the governance scope (AGA management, audit dossier prep, ZEWO application workflow, public annual report generation, board minutes archive) is at least the size of the CMS again. Attempting to ship both in one release pushes v1 from 2026 into 2027 and produces a half-built governance module that distracts from a working CMS.

At the same time, splitting them too aggressively (separate repos, separate deployments, separate databases) burdens small NPOs with managing two installations.

## Decision

### Two products, one ecosystem

The platform consists of two products:

**Product 1 — CMS (v1, this scope).** Day-to-day operational platform. Donations, donor/member/volunteer CRM, expense register, receipts, RPC 21 export, comms. What we have been designing.

**Product 2 — Governance Suite (Phase 2, deferred).** Annual cycle platform. Includes:
- AGA (Annual General Assembly) management — agenda, voting register, attendance, minutes
- Audit dossier preparation — pre-packaged export bundle for the registered auditor
- Public annual report generator — combines RPC 21 figures + project narrative + ZEWO disclosures into a publishable PDF
- ZEWO application and renewal workflow — guided form, document checklist, submission tracking
- Board minutes archive — versioned, searchable, accessible to current and former board members
- Statutes versioning — historical record of statutes changes with effective dates

The Governance Suite is **explicitly out of scope for v1**. It will be built as a separate workstream once the CMS is stable in production.

### Architecture: modular monorepo, optional Governance module

Both products live in the **same repository** and share **one Postgres database** and **one Docker Compose deployment**. The Governance Suite is a feature-flagged module within the CMS codebase:

```
src/
├── core/                  # Shared identity, persons, audit log, auth
├── cms/                   # Product 1 (v1)
│   ├── donations/
│   ├── members/
│   ├── volunteers/
│   ├── expenses/
│   └── receipts/
├── governance/            # Product 2 (Phase 2) — feature-flagged
│   ├── aga/
│   ├── audit-dossier/
│   ├── annual-report/
│   ├── zewo-application/
│   └── board-minutes/
└── pages/admin/
    ├── (cms routes)/
    └── governance/        # Mounted only when ENABLE_GOVERNANCE=true
```

Activation:
```env
# .env
ENABLE_GOVERNANCE=true   # default: false
```

When `false`, the `governance/` routes are not registered, navigation entries are hidden, and the module is tree-shaken from the production bundle. The Postgres schema includes governance tables only after the corresponding migrations have been run (`pnpm db:migrate --module governance`).

### Why this architecture

- **One deployment for adopters.** A small NPO sets up one Docker Compose, one Postgres, one backup, one domain. Whether they activate the Governance module is a flag, not a separate installation.
- **Shared identity backbone.** Persons, members, audit log, expense categories — all primitives the Governance module needs are already in the CMS. No duplicate identity systems.
- **Independent release cycles within shared infrastructure.** Governance features can ship without bumping CMS versions. Migrations are namespaced.
- **Strict module boundary.** The `governance/` module imports from `core/` only. No imports from `cms/`. No imports from `governance/` into `cms/`. Enforced via lint rule.
- **Tree-shakeable.** Adopters who don't enable Governance never pay its bundle size or memory cost.

### What the CMS does vs what the organisation must do

The CMS automates operational compliance. Governance compliance remains with the organisation — until and unless they activate the Governance Suite (Phase 2).

**Operational compliance (CMS automates):**

| Requirement | CMS handles |
|---|---|
| Audit trail of all donations | Hash-chained audit log (ADR 0010) |
| Donation ≠ membership fee in books | Separate records, separate PDFs |
| Tax receipt fields per Swiss law | Receipt template with required fields |
| Cancellation of Tax Receipt on refund | Automated (ADR 0005) |
| Churn reason tracked for ZEWO | `cancellation_reason` field |
| Admin cost ratio computation | RPC 21 export (ADR 0007) |
| Stripe fee tracking | Auto-booked to Expense Register |
| 10-year data retention | Backup strategy (ADR 0008) |
| nDSG right-to-delete | Person anonymisation (ADR 0006) |

**Organisational compliance (organisation handles externally — until Governance Suite Phase 2):**

| Requirement | v1 CMS | Phase 2 Governance Suite |
|---|---|---|
| Independent annual financial audit | Org hires registered auditor; CMS provides RPC 21 export | Same, plus audit dossier auto-bundled |
| AGA management (agenda, register, minutes) | Manual outside CMS | AGA module |
| Public annual report | Manual outside CMS | Annual report generator |
| ZEWO application / renewal | Manual outside CMS | ZEWO workflow module |
| Board minutes archive | Manual outside CMS | Minutes module |
| Statutes versioning | Manual outside CMS | Statutes module |
| Governance disclosures on public site | Manual outside CMS | Auto-published from CMS data |

This matrix appears in the README and the adopter setup wizard so no NPO mistakenly believes that installing the CMS alone makes them ZEWO-certifiable.

### Marketing language correction

The phrase **"ZEWO-airtight by design"** is replaced throughout the documentation with **"ZEWO-ready operational compliance"** — accurately describing that the CMS automates the operational tracking that ZEWO audits, while organisational compliance is the association's responsibility (and Phase 2's roadmap).

## Consequences

- v1 ships as the CMS only, in its current scope. No governance features creep in.
- The repository folder structure is set from day one to accept the Governance module without refactoring.
- A lint rule (`eslint-plugin-import` with `import/no-restricted-paths`) enforces the module boundary: `cms/` cannot import from `governance/`, and `governance/` cannot import from `cms/`. Both can import from `core/`.
- The README and adopter setup wizard make the operational vs organisational compliance distinction explicit.
- Phase 2 roadmap is documented in this ADR; building it does not require any v1 refactor.
- The "ZEWO-airtight" framing is removed from current docs and replaced with the more precise "ZEWO-ready operational compliance."

## Alternatives considered

- **Single monolithic product covering both CMS and Governance from v1** — rejected. Doubles v1 scope, delays the CMS into 2027, produces a half-built governance module.
- **Separate repositories and separate deployments for CMS and Governance** — rejected. Burdens adopters with two installations, two databases, two backups, two domains. Fragments the user experience for a small NPO that wants one tool.
- **Defer the architectural readiness to Phase 2** — rejected. Without folder boundaries and lint rules from day one, governance concerns will leak into CMS modules and the eventual split will require a costly refactor. The boundary costs nothing to enforce now.
