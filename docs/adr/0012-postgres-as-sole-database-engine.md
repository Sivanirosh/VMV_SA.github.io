# ADR 0012 — Postgres as the sole database engine across all environments

**Status:** Accepted
**Date:** 2026-05
**Supersedes:** the SQLite choice in the original tech stack; impacts ADR 0008 (backup) and ADR 0009 (timestamps)

## Context

The original design chose SQLite on the grounds of simplicity: single file, zero infrastructure, one-command setup. As the design evolved, every SQLite advantage was progressively negated:

- **"Zero infrastructure"** — Litestream was added as a sidecar (ADR 0008), introducing a second process and object storage credentials anyway.
- **"Backup is a file copy"** — rejected; Litestream was required precisely because file copy is insufficient.
- **"Single writer is fine"** — SQLITE_BUSY contention required its own migration-trigger analysis.
- **"Integer timestamps"** — ADR 0009 invented a workaround (`UTC integer milliseconds`) because SQLite has no native `timestamptz`. Postgres renders this moot.
- **"Drizzle schema is identical for both"** — not true: SQLite has no native `uuid`, `boolean`, `timestamptz`, or array types. Type coercions would be required throughout the schema.

Additionally, using SQLite in tests while targeting Postgres in production is an anti-pattern: SQLite's permissive type system allows queries and constraints that Postgres rejects, giving a false-green CI and deferring real bugs to production.

## Decision

**Postgres 16 is the sole database engine in all environments: local development, CI, staging, and production.** SQLite is not used anywhere in the CMS.

### Local development

`docker compose up` starts both the `app` and `db` services. The `db` service is `postgres:16-alpine`. No external database is required; the compose file is self-contained.

### CI (GitHub Actions)

The test job declares a Postgres service container:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_DB: cms_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

Vitest runs against this real Postgres instance via Drizzle. No mocking of the database layer.

### Production

Two options, both first-class:

**Option A — Self-hosted Postgres (default):**
`docker compose up` with a persistent `pgdata` volume. The admin is responsible for backups (see Backup section below).

**Option B — Infomaniak Managed Postgres (recommended for Swiss adopters):**
Infomaniak offers managed Postgres as part of their Cloud suite. Backups, updates, and HA are handled by Infomaniak. The app container connects via `DATABASE_URL`. No DB container in the compose file. This is the recommended option for adopters who prioritise operational simplicity over cost.

### Drizzle ORM configuration

A single Drizzle config targets Postgres in all environments. The `drizzle.config.ts` reads `DATABASE_URL` from environment variables. No conditional dialect switching.

```typescript
// drizzle.config.ts
export default {
  schema: './src/db/schema.ts',
  driver: 'pg',
  dbCredentials: { connectionString: process.env.DATABASE_URL! },
} satisfies Config;
```

### Schema improvements enabled by Postgres

| Concept | SQLite workaround (removed) | Postgres native |
|---|---|---|
| Timestamps | `integer` (UTC ms) | `timestamptz` (UTC, native) |
| UUIDs | `text` | `uuid` |
| Booleans | `integer` (0/1) | `boolean` |
| Soft-delete flags | `integer` | `boolean` |

ADR 0009's integer-millisecond convention is superseded — see updated timestamp section below.

### Timestamp convention (updated from ADR 0009)

All timestamp columns use Postgres `timestamptz`, which stores in UTC and returns UTC. The `Europe/Zurich` fiscal year boundary logic in `src/lib/time.ts` is unchanged — the conversion layer still converts UTC to `Europe/Zurich` for all fiscal year calculations and date labels. The difference is that Postgres handles UTC storage natively; no integer conversion is needed in application code.

```typescript
// src/lib/time.ts — unchanged public API, simplified internals
export const FISCAL_TZ = 'Europe/Zurich';
export function toFiscalYear(date: Date): number
export function fiscalYearStart(year: number): Date
export function fiscalYearEnd(year: number): Date
export function formatReceiptDate(date: Date): string
```

### Backup (replaces Litestream from ADR 0008)

Litestream is SQLite-specific and is removed.

**Self-hosted Postgres backup strategy:**

A nightly `pg_dump` job runs inside the app container (or a dedicated backup container) and uploads the compressed dump to Infomaniak Object Storage:

```bash
pg_dump $DATABASE_URL | gzip | \
  aws s3 cp - s3://${BACKUP_BUCKET}/postgres/$(date +%Y-%m-%d).sql.gz \
    --endpoint-url https://s3.pub1.infomaniak.cloud
```

Retention: 30 daily dumps + 12 monthly dumps. RPO: 24 hours. RTO: < 30 minutes (download + `pg_restore`).

For sub-24h RPO on self-hosted Postgres, `wal-g` with continuous WAL archiving to object storage achieves seconds-level RPO — but this is optional and adds operational complexity. Most small NGOs are well-served by nightly `pg_dump`.

**Infomaniak Managed Postgres:** automatic daily backups with point-in-time recovery are included in the service. No additional backup configuration required.

**PDF and file storage:** unchanged from ADR 0008 — all PDFs stored in S3-compatible object storage, not on the VPS filesystem.

## Consequences

- All environments use the same database engine — tests prove production behaviour.
- The integer-timestamp workaround from ADR 0009 is removed; `timestamptz` is used throughout.
- Litestream is removed from the Docker Compose setup.
- The SQLite → Postgres migration trigger analysis is moot — there is no migration.
- Local dev requires Docker to run the Postgres service. This is standard for any Node.js project with a relational database.
- Infomaniak Managed Postgres is the recommended production option for adopters who want zero DB maintenance.

## Alternatives considered

- **SQLite for tests, Postgres for production** — rejected. SQLite's permissive type system produces false-green CI. Constraint violations, type errors, and Postgres-specific SQL that would fail in production pass silently in SQLite tests. The test suite must prove production behaviour.
- **SQLite everywhere** — rejected. Write contention, no native `timestamptz`, no native `uuid`, Litestream dependency, and a painful future migration all outweigh the "zero infrastructure" benefit that Docker Compose already negates.
