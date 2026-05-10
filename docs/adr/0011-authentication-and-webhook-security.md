# ADR 0011 — Authentication model and webhook signature verification

**Status:** Accepted
**Date:** 2026-05

## Context

Two security surfaces were left unspecified in the initial design:

1. **Stripe webhook endpoint** — any HTTP client that discovers the endpoint URL can POST fabricated events, creating fraudulent donation records or exhausting the job queue. Stripe provides a signature mechanism to prevent this; it must be enforced explicitly.

2. **Admin session model** — "hand-rolled cookie sessions + otplib" was stated without specifying: password hashing algorithm, session token properties, rotation policy, timeout values, or CSRF posture. A system storing donor PII and issuing legally binding tax receipts requires these to be specified precisely, not left to implementer discretion.

## Decision

### Webhook signature verification

Every inbound request to the Stripe webhook endpoint is verified with `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)` before any processing occurs. Requests that fail verification receive HTTP 400 immediately — no idempotency check, no database access. `STRIPE_WEBHOOK_SECRET` is an environment variable set from the Stripe dashboard webhook signing secret. It is never committed to the repository.

The raw request body must be read as a `Buffer` (not parsed JSON) before signature verification, because the HMAC is computed over the raw bytes.

### Password hashing: Argon2id

Admin passwords are hashed with **Argon2id** (via the `argon2` npm package, which wraps the reference C implementation).

Parameters (OWASP 2024 minimum for interactive login):
- Memory: 64 MB (`memoryCost: 65536`)
- Iterations: 3 (`timeCost: 3`)
- Parallelism: 4 (`parallelism: 4`)
- Output length: 32 bytes

Argon2id is chosen over bcrypt because it is memory-hard — an attacker who obtains the database and attempts offline cracking must provision substantial RAM per guess, not just CPU. This is materially relevant if the VPS is ever compromised. The `argon2` package ships a pre-built native binary for common Linux targets; on unsupported targets it compiles from source via node-gyp.

### Session tokens

On successful login + TOTP verification:

1. Generate a 32-byte cryptographically random token via `crypto.getRandomValues`.
2. Store `SHA-256(token)` in the `sessions` table (never the raw token — prevents database read = session hijack).
3. Set a `HttpOnly; Secure; SameSite=Strict; Path=/admin` cookie containing the raw token.

**`sessions` table:**

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `token_hash` | string | SHA-256 of the raw cookie token; UNIQUE |
| `admin_id` | FK → admins | |
| `created_at` | integer | UTC ms |
| `last_seen_at` | integer | UTC ms; updated on every authenticated request |
| `expires_at` | integer | UTC ms; absolute expiry |
| `ip_address` | string | Recorded at login for audit purposes |
| `user_agent` | string | Recorded at login for audit purposes |

**Timeout policy:**
- Absolute timeout: 8 hours from `created_at`. Session is invalid regardless of activity.
- Idle timeout: 2 hours. If `now - last_seen_at > 2h`, session is rejected and deleted.
- On every authenticated request: update `last_seen_at` inside the same database transaction as the response work.

**Session rotation:**
- A new session token is issued on every login (replaces any existing sessions for that admin, invalidating concurrent sessions by default — one active session per admin).
- The session token is rotated after TOTP verification succeeds (pre-TOTP token is single-use and short-lived: 5-minute expiry, used only to carry the "password verified, awaiting TOTP" state).

### CSRF posture

The session cookie is `SameSite=Strict`. All state-mutating admin routes accept only `Content-Type: application/x-www-form-urlencoded` or `application/json` from the same origin. Cross-origin form submissions and `fetch` with credentialed cookies are blocked by `SameSite=Strict` on all modern browsers. No separate CSRF token is required given this combination, but all mutation endpoints must reject `Content-Type: text/plain` and `multipart/form-data` from cross-origin requests as an additional defence.

### TOTP

- Library: `otplib` with `authenticator` (RFC 6238, TOTP).
- Window tolerance: ±1 period (30 seconds each side) to accommodate clock skew.
- Used token list: the CMS stores the last-used TOTP token per admin in the `admins` table (`last_totp_token`, `last_totp_at`). A token that matches `last_totp_token` for the same window is rejected — prevents replay within the same 30-second window.
- Secret storage: TOTP secrets are stored encrypted in the database using `AES-256-GCM` with a key derived from `TOTP_ENCRYPTION_KEY` (environment variable). The plaintext secret is never logged.
- Recovery codes: 8 single-use recovery codes generated at TOTP setup, shown once, stored as individual `bcrypt` hashes in a `totp_recovery_codes` table.

### Rate limiting

All auth endpoints are rate-limited at the application layer:

| Endpoint | Limit | Window |
|---|---|---|
| `POST /admin/login` | 10 attempts | per IP per 15 minutes |
| `POST /admin/totp` | 5 attempts | per admin per 15 minutes |
| `POST /admin/login` (by username) | 20 attempts | per username per hour |

Limits are enforced via a `rate_limit_buckets` table in SQLite (no Redis required). On limit breach: HTTP 429, 15-minute lockout, optional email alert to admin.

## Consequences

- Stripe webhook endpoint rejects unauthenticated requests at the first line of the handler — no fabricated donations possible.
- Admin passwords are resistant to offline cracking even if the database is stolen.
- A compromised session cookie cannot be used to derive the token stored in the database (SHA-256 stored, raw token in cookie).
- One active session per admin simplifies session management and prevents credential sharing.
- The `argon2` native dependency requires a Linux build environment in Docker — already satisfied by the Node.js Alpine base image with `build-base` installed.
- TOTP recovery codes allow admin account recovery without a full database reset.

## Alternatives considered

- **bcrypt for password hashing** — rejected. bcrypt is CPU-bound only; Argon2id's memory-hardness provides meaningfully stronger offline cracking resistance at equivalent interactive latency. The native dependency cost is acceptable.
- **Separate CSRF token** — rejected given `SameSite=Strict` cookie policy. Adding a CSRF token would provide defence-in-depth against future browser bugs but adds implementation complexity without proportionate benefit for an admin-only internal tool.
- **Multiple concurrent sessions per admin** — rejected. For a two-person treasurer/admin team, concurrent sessions provide no usability benefit and increase the attack surface (a stolen token remains valid even after the legitimate user logs out of another session).
