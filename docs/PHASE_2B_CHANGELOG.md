# Phase 2B — audit and compatibility gate (incomplete)

Date: 2026-10-30. Repository baseline: `3bbaf31`. **Phase 2B is not complete.** No auth or identity migration has been added to the application. The fail-closed auth adapter and placeholder UI remain in place. No changes were made to the 3D scene.

## Baseline — Tested

- Node 22: clean `npm ci`; root `npm test`, 6/6 passed; root `npm run build`, Worker dry run and web build passed. The web build still warns that the main JS chunk exceeds 500 kB.
- Reviewed Worker auth/DB/handler/Wrangler, schema, environment examples, existing tests and documentation. The initial migration is unchanged. Wrangler compatibility date is `2026-10-30`: Cloudflare documents that Node compatibility is enabled by default on compatibility dates from 2026-08-04 onward; no explicit `nodejs_compat` flag is necessary for that date ([Cloudflare](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)).
- R2 is configured only as a binding/helper in source. No real bucket or its privacy configuration was verified and no new file endpoint was added.

## Disposable compatibility investigation — Tested, not production configured

A new unclaimed, isolated Neon database with no user data was provisioned solely for this experiment. It expires automatically; it is not the project owner's database. The experiment used **one direct `DATABASE_URL`**, not two. The existing `pg` migration runner applied `0001_initial.sql` and skipped it correctly on the second run. A local Wrangler Worker used the same direct URL with the Neon serverless driver: an HTTP `SELECT 1` succeeded and a WebSocket `Pool` was used for Better Auth. This does not establish that all Neon URL types work: the current runner rejects pooled Neon URLs because of its session advisory lock.

The isolated proof used Better Auth **1.7.14** and its official magic-link plugin, Neon serverless driver, a local Wrangler/workerd runtime and a mock mail sink. It was not deployed to Cloudflare and is not application code. The following individual flows returned success: signup and mock verification message; verify email; password login; read and revoke session; reset password and log in with the new password; request and consume a magic link. A sequential replay of that magic link produced an error redirect. This was an exploratory proof, not the full mandatory security test suite: it did not establish concurrency safety, expiry behavior, rate limiting, cookie behavior on real domains, enumeration resistance, actual email delivery or end-to-end production reliability.

**Unresolved Worker/driver lifecycle issue:** the local Worker reported `Unhandled error ... Network connection lost` from the Neon WebSocket pool while running the proof. A second run without hot reload reproduced an error. Adding a pool error listener in the proof converted the unhandled error into a handled idle-pool error, which was observed while the process was still running; it did not establish its cause or a safe fix. Although the individual flow assertions passed, the cause, request isolation, connection lifecycle and behavior under failure/concurrency have not been sufficiently proven. Do not treat the listener or successful responses as a production fix. Follow the requested stage-2 gate and investigate using a minimal repeatable Worker test, driver/Better Auth documentation and, when available, a deployed isolated Cloudflare development Worker.

## Identity investigation — Tested only in disposable schema

An experimental mapping used Better Auth's `users` model mapping and UUID generation; auth `account` and `session` FKs pointed to the existing `users.id` UUID. Signup/login/reset/magic flow worked in this *disposable* schema, and a verification timestamp synchronization trigger was trialled. This is not a reviewed production migration or a complete identity design.

A critical legacy case remains unresolved: an unverified legacy `users` row with a `user_auth_accounts` link was promoted to verified after consuming a valid magic link, while the legacy bridge row remained. Better Auth 1.7.14's cleanup concerns its own accounts and sessions; it does not know this project's independent legacy table. The test establishes retention, **not an actual exploit or that a legacy login route exists**. It shows that ownership and handling of old links and business records need an explicit, tested policy, rather than silently treating them as trusted. Any design must also resolve consistency between `email_verified_at` and the library's boolean without trusting browser input.

Possible approaches to evaluate: (1) fail migration closed when legacy users/links needing reconciliation exist, only enabling auth for an independently verified empty target; or (2) quarantine and reconcile old links through a reviewed verified-ownership procedure, retaining auditability and business UUIDs. Neither is implemented or approved here. Do not auto-link unverified identities and do not alter an existing database without authorization and backup.

## Status and next steps

- **Implemented:** no Phase 2B application authentication, UI, role, or migration; existing fail-closed behavior remains.
- **Tested:** baseline, disposable Neon direct connection and exploratory flows above; not a complete integration/security validation.
- **Configured:** only the short-lived experimental database and local proof; no owner's Neon, R2, Cloudflare Worker, sender or domain is configured by this work.
- **Pending:** resolve the observed pool error and prove lifecycle/Node compatibility; finalize and test legacy identity mapping; then implement and test all required auth features, CSRF/CORS, shared atomic rate limits, anti-enumeration, roles, UI and reviewed migrations. Owner-operated Neon dev, private R2, sender domain, deployment domain and actual browser cookie tests remain pending. Never put credentials in chat, source, logs or commits. Production readiness is not claimed.

Reproduction materials without credentials are retained locally under ignored `.audit-local/phase2b-proof/`; they include destructive test SQL and an intentionally unprotected mock-mail endpoint and must **never** be deployed or run against real data. Temporary local credential files were removed. This changelog and the status notes in `AUTHENTICATION.md` and `DATABASE.md` are the only repository documentation changes for this incomplete phase.
