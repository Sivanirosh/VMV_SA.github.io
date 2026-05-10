# ADR 0010 — Hash-chained audit log

**Status:** Accepted
**Date:** 2026-05

## Context

The CMS issues legally binding Tax Receipts and is designed for ZEWO certification. ZEWO auditors expect a trustworthy audit trail: every create, update, and delete on financial records must be traceable, and the trail itself must be tamper-evident.

Calling a regular SQLite table "immutable" because the application code never deletes from it is not sufficient:
- Any admin with shell access can run `DELETE FROM audit_log`.
- A bug, a migration script, or a future contributor unaware of the convention can silently erase entries.
- An auditor has no way to verify that the trail they are reading is complete and unmodified.

A hash-chained audit log turns "immutable by convention" into "immutable by mathematics." Tampering with any entry breaks the chain from that point forward — detectable by anyone who runs the verification function.

## Decision

### Schema

```
audit_log
  id              uuid        PK
  sequence        integer     UNIQUE, monotonically increasing (1, 2, 3, …)
  entity_type     string      e.g. "donation", "donor", "refund", "dispute", "member", "expense"
  entity_id       uuid        ID of the affected record
  action          enum        "created" | "updated" | "deleted"
  actor           string      Admin user ID, or "system" for automated pipeline actions
  before          text|null   JSON snapshot of the record before the change (null on "created")
  after           text|null   JSON snapshot of the record after the change (null on "deleted")
  created_at_utc  integer     UTC milliseconds
  prev_hash       text|null   SHA-256 of the previous entry's `entry_hash` (null for sequence = 1)
  entry_hash      text        SHA-256 of this entry's canonical fields (see below)
```

### Hash computation

`entry_hash` is computed as:

```
SHA-256(
  sequence
  + entity_type
  + entity_id
  + action
  + actor
  + (before ?? "null")
  + (after ?? "null")
  + created_at_utc
  + (prev_hash ?? "null")
)
```

All fields are concatenated as UTF-8 strings with a `|` separator before hashing, ensuring field boundaries are unambiguous. The `entry_hash` field itself is excluded from its own computation.

### Chain invariants

1. `sequence` values are gapless integers starting at 1. A gap indicates a deleted row.
2. `audit_log[n].prev_hash === audit_log[n-1].entry_hash` for all n > 1.
3. `audit_log[n].entry_hash` is the SHA-256 of `audit_log[n]`'s canonical fields as defined above.

Violating any invariant is evidence of tampering or data loss.

### Verification endpoint

The admin UI exposes a **"Verify audit chain"** action at `/admin/audit/verify`. It:

1. Reads all audit log entries in `sequence` order.
2. Recomputes each `entry_hash` from stored fields.
3. Verifies each `prev_hash` matches the previous entry's stored `entry_hash`.
4. Returns: `{ status: "ok", entries: N, verified_at: timestamp }` or `{ status: "broken", first_broken_sequence: N }`.

The verification function is exposed as a standalone CLI command (`pnpm cms audit:verify`) so an auditor can run it independently without the web UI.

### What is audited

Every write operation on financial and identity records is logged:

| Entity | Actions audited |
|---|---|
| `persons` | created, updated, anonymised |
| `person_emails` | created, deleted |
| `person_addresses` | created, updated, deleted |
| `donors` | created (role assigned) |
| `members` | created, status updated |
| `volunteers` | created, status updated |
| `donations` | created |
| `refunds` | created, status updated |
| `disputes` | created, status updated |
| `expenses` | created, updated, deleted |
| `funds` | created, updated |
| `membership_tiers` | created, updated |
| `expense_categories` | created, updated |
| `audit_log` | — (never audits itself) |
| Admin user login / logout | system event |
| Receipt PDF generated | system event |
| Year-end batch triggered | system event |

Soft-deletes only — no hard `DELETE` is ever issued on financial records. The audit entry for a "deleted" action records the final state in `before` with `after: null`.

### Application-layer write path

All writes to audited entities go through a single `auditedWrite(tx, action, entity)` helper in `src/lib/audit.ts`. This helper:

1. Executes the write inside the same SQLite transaction.
2. Computes the next `sequence` (SELECT MAX(sequence) + 1, inside the same transaction for atomicity).
3. Fetches `prev_hash` from the current tail entry.
4. Computes `entry_hash`.
5. Inserts the audit row.

The write and its audit entry are committed atomically. There is no window where a write exists without an audit entry.

### Off-host verification via Litestream

The Litestream replica on Infomaniak Object Storage (ADR 0008) provides an independent copy of the audit log. If the primary database is tampered with, the replica retains the original chain. An auditor can restore the replica and run `audit:verify` against it independently.

## Consequences

- Every write to financial records is ~2× slower due to the extra hash computation and audit insert. At the transaction volumes of a small NGO this is imperceptible (microseconds).
- `auditedWrite` is the only permitted write path for audited entities. Direct Drizzle calls bypassing it are forbidden.
- The `sequence` gap check catches accidental hard-deletes during development; CI tests verify chain integrity against a seeded test database.
- A ZEWO auditor can verify chain integrity themselves with a single CLI command — no trust in the association's infrastructure required.

## Alternatives considered

- **Application-only constraint (Option A)** — rejected. Zero protection against shell access or migration scripts. "Immutable by convention" is not an audit guarantee.
- **Append-only table + periodic off-host checksum (Option B)** — rejected. A nightly checksum only proves the chain was intact at that point; tampering within the 24-hour window is undetectable until the next checksum. Hash-chaining provides continuous, entry-level tamper evidence at negligible cost.
