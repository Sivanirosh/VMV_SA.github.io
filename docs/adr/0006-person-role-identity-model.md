# ADR 0006 — Person/Role identity model

**Status:** Accepted
**Date:** 2026-05
**Supersedes:** the original donor-centric identity model (stable donor_id + donor_emails)

## Context

The CMS manages relationships with three types of people: Donors, Members, and Volunteers. The same human can hold any combination of these roles simultaneously or across time. A volunteer who later donates, a member who also volunteers, a donor who joins the board — these are all the same person wearing different hats, not three separate people.

The naive approach (a `donors` table that is also used as the identity anchor for volunteers and members via FK columns) breaks down as the system grows:

- A volunteer who has not yet donated cannot be linked to a donor record — they don't have one. Their identity is homeless until they first donate.
- Each new entity type (board members, beneficiaries, partner contacts, press contacts) that "is sometimes also a donor" needs its own `entity.donor_id` FK back to `donors`. The `donors` table becomes the accidental identity system for the entire CMS, even though "has donated" is a role, not an identity.
- nDSG right-to-delete: anonymising a Donor must cascade to their Volunteer record, their Member record, and any other role they hold. With a donor-centric model, every delete path must know about every role table — a maintenance liability that grows with each new entity.
- "Send a thank-you to everyone who contributed in 2025 — by donation, volunteer hours, or membership" requires a cross-role query that is fragile without a shared identity key.
- Identity merges (same person, two accounts) must be coordinated across every role table separately. With a shared Person, merging two Persons atomically reassigns all roles in one transaction.

The root cause: **Donor, Member, and Volunteer are roles, not identities.** The CMS needs a role-neutral identity primitive.

## Decision

### `persons` is the identity backbone

Every human or organisation the CMS interacts with is a `Person`. Roles (`donors`, `members`, `volunteers`) are satellite tables keyed to `person_id`. Financial records (`donations`) reference `person_id` directly.

### Schema

**`persons`**

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK — stable forever |
| `display_name` | text \| null | Best-known name for admin display |
| `type` | enum | `"individual" \| "organisation"` |
| `notes` | text \| null | Free-text admin notes |
| `tags` | text[] | Segment labels |
| `anonymised_at` | timestamptz \| null | nDSG soft-delete marker; set on right-to-delete |
| `created_at` | timestamptz | |

**`person_emails`**

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `person_id` | uuid FK → persons | |
| `email` | citext | UNIQUE across table (case-insensitive) |
| `verified` | boolean | false until confirmed via link or admin mark |
| `is_primary` | boolean | one true per person_id |
| `source` | enum | `"checkout" \| "manual" \| "csv_import" \| "camt053" \| "volunteer_form"` |
| `added_at` | timestamptz | |

**`person_addresses`**

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `person_id` | uuid FK → persons | |
| `street` | text | |
| `postal_code` | text | |
| `city` | text | |
| `country` | text | ISO 3166-1 alpha-2 |
| `is_primary` | boolean | one true per person_id |
| `valid_from` | timestamptz | |
| `valid_to` | timestamptz \| null | null = current address |
| `source` | enum | `"checkout" \| "manual" \| "csv_import"` |

**`donors`** (role table)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `person_id` | uuid FK → persons | UNIQUE — one Donor role per Person |
| `first_donation_at` | timestamptz | denormalised for fast CRM queries |
| `created_at` | timestamptz | |

**`members`** (role table)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `person_id` | uuid FK → persons | UNIQUE — one Member role per Person |
| `membership_tier_id` | uuid FK → membership_tiers | |
| `joined_at` | timestamptz | |
| `lapses_at` | timestamptz | |
| `status` | enum | `"active" \| "lapsed" \| "cancelled"` |

**`volunteers`** (role table)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `person_id` | uuid FK → persons | UNIQUE — one Volunteer role per Person |
| `status` | enum | `"applicant" \| "active" \| "alumni"` |
| `applied_at` | timestamptz | |
| `publishable` | boolean | true = testimonial surfaced on public site |

**`donations`** (financial record — references Person, not Donor role)

```
donations.person_id → persons.id
```

Donations reference `person_id` directly. The `donors` role row is a CRM convenience (aggregates, segmentation), not the identity anchor for financial records. This means a Person accumulates donation history correctly from their first donation forward, regardless of when the `donors` role row is created.

### Intake behaviour

All intake paths (Stripe webhook, IBAN form, volunteer application, CSV import) use the same identity resolution function:

```typescript
// src/lib/persons.ts
async function resolveOrCreatePerson(email: string, source: EmailSource): Promise<Person>
```

1. Query `person_emails` for a matching email (case-insensitive via `citext`).
2. If found → return the linked `Person`.
3. If not found → create a new `persons` row + `person_emails` row.
4. If collision detected (email already linked to a different Person in the same transaction) → surface "link to existing Person?" prompt for admin resolution.

Role creation is separate from identity resolution. The webhook creates the Donor role if it does not exist; the volunteer form creates the Volunteer role; they share the same `person_id`.

### Cross-role queries

```sql
-- Everyone who contributed in 2025 (donation OR volunteer hours OR membership)
SELECT DISTINCT p.id, p.display_name
FROM persons p
WHERE p.id IN (
  SELECT person_id FROM donations WHERE extract(year from created_at AT TIME ZONE 'Europe/Zurich') = 2025
  UNION
  SELECT person_id FROM volunteer_hours WHERE extract(year from logged_at AT TIME ZONE 'Europe/Zurich') = 2025
  UNION
  SELECT person_id FROM members WHERE joined_at <= '2025-12-31' AND (lapses_at IS NULL OR lapses_at >= '2025-01-01')
)
```

### nDSG right-to-delete

Anonymising a Person:
1. Set `persons.anonymised_at = now()`, clear `persons.display_name`.
2. Delete all `person_emails` rows.
3. Delete all `person_addresses` rows (or set `valid_to = now()`).
4. Role rows (`donors`, `members`, `volunteers`) are retained with their `person_id` FK intact — financial and operational records are preserved for legal retention, but PII is gone.
5. Donation `receipt_opted_in: true` records retain their `booked_chf_amount` and dates (required for RPC 21 aggregates) but the name/address fields used for receipt rendering become empty.

### Merge

Merging two Person records (same human, two accounts):
1. Choose the surviving `person_id`.
2. Reassign all `person_emails`, `person_addresses`, `donations`, `members`, `volunteers`, `expenses` rows from the tombstoned `person_id` to the surviving one.
3. If both have a `donors` row, merge stats (keep earliest `first_donation_at`), delete the duplicate.
4. Soft-delete the tombstoned `persons` row (`anonymised_at = now()`).
5. All operations in a single database transaction.

## Consequences

- `persons` is the identity anchor for all current and future entities that represent a human or organisation. New entities (board members, beneficiaries, press contacts) attach to `persons.id` without touching existing tables.
- Donors, Members, and Volunteers share identity — same email, same address, same merge, same nDSG delete path.
- Donation history accumulates on `person_id`, not on a role row — no history gap when the role didn't exist yet.
- The identity resolution function `resolveOrCreatePerson` is the single entry point for all intake paths.
- `person_emails.email` is `citext` (case-insensitive UNIQUE) — prevents `John@example.com` and `john@example.com` creating two Persons.
- The `donors` role table is a CRM convenience layer, not the financial source of truth.

## Alternatives considered

- **Email as PK on `donors`** — rejected; cannot survive email changes.
- **`donors` as identity anchor with FK columns per role** — rejected; promotes a role to identity backbone, breaks as new entity types are added, requires all delete paths to know all role tables.
- **Option B: optional `volunteers.donor_id` FK** — rejected; leaves volunteers without identity until they donate; does not generalise to Members, board members, or other future roles; accumulates one FK per entity type rather than one shared backbone.
- **Unified `persons` table (Option C)** — accepted; the only model that cleanly handles all current and future roles without structural refactoring.
