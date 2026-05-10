# ADR 0008 — Backup, restore, and 10-year data retention

**Status:** Accepted
**Date:** 2026-05

## Context

The CMS issues legally binding Tax Receipts. Swiss law (OR Art. 962) requires tax-relevant records to be retained for **10 years**. If the VPS is lost without a backup, donation records, audit logs, and PDF receipts are unrecoverable — a legal and operational disaster.

This is not optional infrastructure. A CMS that issues tax receipts must have a documented, tested, and automated backup strategy before any production data is written.

Two independent failure modes must be covered:

1. **Database loss** — SQLite file corrupted, deleted, or VPS disk failed.
2. **PDF loss** — Tax receipt PDFs stored on local filesystem are gone; donor asks for a re-issue 7 years later.

## Decision

### Layer 1 — Real-time database replication: Litestream → Infomaniak Object Storage (primary)

[Litestream](https://litestream.io) is an open-source sidecar process that streams SQLite WAL frames to an S3-compatible target in near-real-time.

**Why this is the primary solution:**
- RPO: **seconds**. Every committed transaction is replicated as it happens.
- Zero application changes. Litestream runs alongside the Node.js process and tails the SQLite WAL file directly.
- Infomaniak Object Storage is S3-compatible and Swiss-hosted — nDSG compliant.
- Cost: ~CHF 0–2/month for the data volumes involved (donor records + job queue; PDF receipts are stored separately — see Layer 2).

**Configuration:**

Litestream runs as a second process inside the same Docker container (not a separate service), managed by a minimal process supervisor (e.g. `s6-overlay` or a shell wrapper). The `docker-compose.yml` mounts the SQLite file and injects Object Storage credentials via environment variables.

```yaml
# litestream.yml (mounted into container)
dbs:
  - path: /data/cms.db
    replicas:
      - type: s3
        bucket: ${LITESTREAM_BUCKET}
        path: cms-db
        endpoint: s3.pub1.infomaniak.cloud
        access-key-id: ${LITESTREAM_ACCESS_KEY}
        secret-access-key: ${LITESTREAM_SECRET_KEY}
        force-path-style: true
        region: us-east-1          # compatibility parameter; data is physically in Switzerland
```

**Restore procedure:**
```bash
litestream restore -o /data/cms.db s3://bucket/cms-db
docker compose up
```

Recovery time objective (RTO): **< 15 minutes** on a fresh VPS.

**Adopter note:** Any S3-compatible storage works as the Litestream target (Cloudflare R2, AWS S3, Scaleway, etc.). Infomaniak Object Storage is the recommended default for Swiss adopters (data sovereignty, no egress fees within Switzerland).

---

### Layer 2 — PDF and file storage: Infomaniak Object Storage (or any S3-compatible bucket)

Tax Receipt PDFs, Membership Confirmation PDFs, Cancellation of Tax Receipt PDFs, and uploaded receipt scans must be stored durably for 10 years. Local VPS filesystem is not 10-year-durable.

**Decision:** All generated PDFs and uploaded files are written to an S3-compatible object storage bucket, not to the local filesystem. The `LOCAL_FILESYSTEM` storage option from the original requirements spec is removed — S3-compatible object storage is **required**, not optional, for production deployments.

At MVP, PDFs are also re-generatable from the CMS on demand (see Layer 3), so object storage is belt-and-suspenders. But object storage is still required for:
- Year-end bulk batch: 1000+ PDFs generated in one job should not fill the VPS disk.
- 10-year retention: object storage with versioning enabled survives VPS replacement.
- Offload: serving PDFs from object storage reduces VPS load.

**Default bucket layout:**
```
receipts/
  {fiscal_year}/
    {donor_id}/
      {donation_id}-receipt.pdf
      {donation_id}-cancellation.pdf
membership/
  {year}/
    {member_id}-confirmation.pdf
exports/
  {year}/
    rpc21-{year}.pdf
    donations-{year}.csv
uploads/
  expenses/
    {expense_id}-receipt.{ext}
```

---

### Layer 3 — Re-generation from canonical records (defence in depth)

If a PDF is lost from object storage (bucket accidentally deleted, storage provider outage), the CMS must be able to re-generate it from the database record.

**Decision:** The database record is the canonical source of truth. PDFs are derived artefacts. Every field that appears on a Tax Receipt PDF is stored on the `donation` record or linked `donor_emails`/`donors` records — including the **receipt template version** used at generation time.

A `receipt_template_version` field is added to the `donations` table. This pins the template (layout, legal text, logo) used for the original PDF. Re-generation in 2031 uses the 2026 template, not the current one — ensuring the re-issued document matches what the donor originally received.

The admin UI exposes a "Re-issue receipt" action for any donation, which re-generates from the stored record using the pinned template version.

---

### Layer 4 — Whole-server backup: Infomaniak Swiss Backup / Acronis (recommended add-on)

**Infomaniak Swiss Backup** (Acronis Linux Server licence, ~CHF 12.83/month) provides whole-server image backups. This covers failure modes not addressed by Litestream: OS-level corruption, ransomware encrypting the VPS disk, accidental `rm -rf`, or needing to restore the full application environment alongside the data.

This layer is **recommended but not mandatory** — the Litestream + object storage layers already cover data loss. Swiss Backup adds operational resilience (full environment recovery, not just data recovery).

**Setup:** The Acronis agent is installed on the VPS and configured to back up daily to Infomaniak Swiss Backup. Schedule: nightly at 02:00 CET. Retention: 30 daily snapshots + 12 monthly.

---

### Retention policy

| Data type | Retention | Basis |
|---|---|---|
| Donation records (database) | 10 years | OR Art. 962 |
| Tax Receipt PDFs | 10 years | Swiss tax law |
| Audit log | 10 years | ZEWO audit requirement |
| Donor PII (post right-to-delete) | Anonymised immediately; aggregate retained indefinitely | nDSG + OR Art. 962 |
| Expense records | 10 years | OR Art. 962 |
| Job queue (`jobs` table) | 90 days after completion | Operational; no legal basis for longer |
| Litestream WAL snapshots in object storage | 30 days rolling (configurable) | Operational; beyond 30 days cost increases without benefit |

### Backup testing

Untested backups are not backups. The CI/CD pipeline includes a monthly scheduled job that:
1. Restores the Litestream replica to a throwaway SQLite file.
2. Runs `vitest run --reporter=verbose` against the restored database (schema integrity check).
3. Alerts the admin via email if the restore fails.

---

## Consequences

- Local filesystem PDF storage is removed from scope — object storage is required in production.
- `receipt_template_version` is added to the `donations` table from day one.
- The Docker Compose setup includes Litestream configuration out of the box.
- Adopters must provide object storage credentials at setup (covered in the instance configuration wizard).
- Whole-server backup (Infomaniak Swiss Backup) is documented as a recommended add-on; cost is borne by the adopter.
- Monthly automated restore test is part of the GitHub Actions schedule.

## Alternatives considered

- **Nightly `sqlite3 .backup` to remote storage** — rejected as primary strategy. RPO of 24 hours means up to a full day of tax-receipted donations could be lost. Acceptable only as a secondary layer behind Litestream.
- **Local filesystem for PDFs** — rejected for production. A CHF 8/month VPS disk is not 10-year-durable. Object storage with versioning is.
- **No backup strategy documented** — rejected. A CMS issuing tax receipts without a documented, automated backup is legally and ethically indefensible.
