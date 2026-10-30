# Phase 2B.1 — Authentication compatibility spike

**Date:** 2026-10-30
**Baseline:** `7e2f509`
**Decision: C — do not proceed with application authentication yet.**

This spike is complete as an investigation, not as a production implementation. Better Auth + Drizzle + Neon HTTP worked for the basic flows and the limited concurrency checks, but a failure after consuming a magic link left a verified user without a session and without the consumed token. The legacy identity case also remains unresolved. The WebSocket Pool and local Hyperdrive-style `pg.Pool` experiments emitted connection errors. Neither a successful basic flow nor an error listener proves production safety.

No application source, existing migration, frontend, 3D scene, owner's database, or production service was modified. No Worker or proof was deployed. The only tracked change in this phase is this report. The application auth adapter remains fail-closed.

## 1. Test environment and versions

| Item | Version / configuration actually tested |
| --- | --- |
| Node | 22.23.4 |
| Better Auth, Drizzle adapter, Kysely adapter | 1.7.14 |
| better-call | 1.4.4 |
| Drizzle ORM | 0.45.4 |
| `@neondatabase/serverless` | 1.2.0 |
| `pg` | 8.16.3 |
| Wrangler | 4.156.0 |
| workerd / Miniflare | 1.20261023.1 / 5.20261023.3-beta |
| Worker compatibility date | 2026-10-30, no explicit flags. Node compatibility is enabled by default for dates from 2026-08-04 ([Cloudflare](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)). |

All Worker tests used **local Wrangler/workerd**, not Cloudflare's deployed runtime. Dedicated unclaimed Neon databases were provisioned for the tests with no owner data. The main test database expires automatically; its temporary session, verification and mock-mail rows were deleted and local credential files removed after testing. Scratch source and sanitized test results are under ignored `.audit-local/phase2b1/`; they are **not** deployable and include destructive test-only SQL. The mock mail sink stored synthetic URLs in the disposable database, never sent email, and had no public HTTP mailbox endpoint.

## 2. Architectures and transaction behavior

1. **Neon HTTP:** request-scoped `neon(DATABASE_URL)` → `drizzle-orm/neon-http` → official Better Auth Drizzle adapter, `provider: 'pg'`, `transaction: false`. Mail callbacks used the disposable mock sink. No WebSocket Pool was used by auth in this experiment. PostgreSQL `DELETE ... RETURNING` in this adapter version is used for `consumeOne`; the five-pair test below gives limited empirical evidence for this configuration, not a proof under all schedules or outages.
2. **Neon WebSocket Pool:** request-scoped `new Pool({connectionString: DATABASE_URL})` → Better Auth's PostgreSQL/Kysely adapter. The Pool was created within each request and `pool.end()` was awaited in `finally`; no module-scope pool was used.
3. **Hyperdrive-style local binding:** request-scoped `pg.Pool(max: 1)` using a Wrangler local Hyperdrive binding and Better Auth/Kysely. The *mock email sink only* used Neon HTTP so it did not contend for the single `pg` connection. A local-only environment variable supplied the same disposable database connection to the binding. **This was a direct local connection, not the real Hyperdrive service:** Cloudflare states local development bypasses Hyperdrive caching/pooling. No actual binding, Cloudflare account resource, or production configuration was created.

The Neon HTTP driver supports single queries and predeclared non-interactive batched transactions, but Drizzle `neon-http` 0.45.4 does not support callback/interactive `db.transaction()`: a test returned `No transactions support in neon-http driver`. Better Auth's Drizzle adapter defaults to `transaction: false`; separate writes can therefore commit independently. Setting `transaction: true` would not make this HTTP driver support interactive transactions. See [Neon driver](https://neon.com/docs/serverless/serverless-driver), [Drizzle Neon](https://orm.drizzle.team/docs/connect-neon), [Better Auth Drizzle](https://better-auth.com/docs/adapters/drizzle), and [Better Auth database](https://better-auth.com/docs/concepts/database). Built-in Better Auth programmatic migrations do not migrate a Drizzle adapter; the test schema was created separately and is not an application migration.

## 3. Neon HTTP + Drizzle + Better Auth — actual results

| Scenario | Result |
| --- | --- |
| Signup, mixed-case email | HTTP 200; one normalized lowercase user row. A submitted `admin` role was ignored and the proof default remained `customer`. |
| Password storage | The stored value was not the test plaintext; no independent cryptographic audit was performed. |
| Unverified password login | 403; verification link returned 302 and the proof boolean and timestamp were set. |
| Password login | Correct password 200; wrong password 401; `get-session` returned the server identity. |
| Logout / expiry | Logout 200 and the old cookie returned no session. A session expired by changing its disposable DB timestamp was rejected. |
| Password reset | Reset 200; sequential token replay 400; login with the new password 200. |
| Magic request / consume | 200 request and 302 successful consume. A new email produced one new user; an existing email stayed at one user. |
| Invalid / expired / replay | Invalid and manually expired links redirected without a successful session; sequential replay was rejected. |
| Concurrent magic consume | Five independent rounds, each with two simultaneous requests using the same token: **one session-bearing success per round**, and replay rejected. This finite test is not proof for all loads or fault conditions. |
| Email binding | Adding a different email query parameter to a valid link still yielded the original token's user, not the other email. |
| Session isolation | Two different sessions read in parallel returned their respective users; this does not establish all possible cross-isolate isolation properties. |
| Basic enumeration checks | For tested existing/absent emails, magic and reset response statuses and bodies matched; wrong-password and absent-user login both returned 401 with matching bodies. Existing/new signup both returned 200 with the same top-level/user keys and ID length. Timing, all fields and all edge cases were not exhaustively tested. |

### Critical injected failure after token consumption

On the disposable schema, a test trigger rejected session insertion for a new magic-link user. The Worker returned 500. Afterward the token was gone, the new user existed with `emailVerified = true`, and no session existed. Replaying the same link was rejected. This demonstrates **partial committed state** and loss of rollback, not an observed unauthorized session or proven account takeover. It fails the requested all-or-nothing failure criterion. A user could request a new link, but that does not establish safe recovery for all multi-step operations or legacy data. Do not solve this by writing a custom magic-token system or silently retrying non-idempotent writes.

The same kind of injected failure in the local Hyperdrive-style `pg.Pool` proof returned 503 and also left a verified user, zero sessions and a consumed token. Thus the availability of an interactive `pg` transaction alone does **not** prove the complete Better Auth magic-link handler is one atomic transaction.

## 4. Security observations

- **Cookies:** the local response's session cookie had `HttpOnly` and `SameSite=Lax`. With the proof's simulated production flag it also had `Secure`. This was a header check over localhost, **not** a real production browser/domain/cross-site cookie test. No production cookie-domain decision has been made.
- **Origin, CSRF and redirects:** an untrusted Origin produced 403; a cross-site fetch-metadata request without Origin produced 403; a malicious callback URL at request and a manipulated magic callback were rejected with 403 in the tested cases. This is not a complete CSRF or redirect audit.
- **Rate limiting:** Better Auth database-backed rate limiting was enabled in the proof. For login, signup, magic request, verification email and reset, sequential requests produced 429 after the configured threshold. A 12-request parallel login burst allowed 2 and rejected 10 for the configured limit of 2. This is a single local Worker backed by one database, not a multi-region/load/abuse proof; do not claim globally adequate limits or trust arbitrary forwarded-IP headers in production.
- **Roles:** a browser-supplied role did not alter the disposable default. No application role middleware or admin route was implemented or tested.
- **Important test-log incident:** during the deliberately injected database failure, Better Auth/`better-call` logged the failed Drizzle SQL and its parameters despite the proof setting `logger.disabled: true`. The output included a **synthetic test session-token value** and synthetic test identifiers. The insert had been rejected; no real user or production credential was involved. Test session/token/mail rows were subsequently removed. A second isolated test with `onAPIError.throw: true`, an outer generic catch and filtered local process output did not show the same `SERVER_ERROR`/SQL-parameter marker; this is not proof that every path is redacted. Logging must be independently audited and fail closed before production. Do not log raw error objects, query parameters, credentials, password or token values.

## 5. Worker lifecycle and connection failure

### Neon WebSocket Pool

A minimal request-scoped Pool-only Worker ran 8 sequential and 10 parallel `SELECT 1` requests successfully, then a request after 12 seconds idle succeeded. Terminating its **own disposable backend** caused the affected request to return 503; a fresh request then returned 200. No idle-pool event was observed in that minimal run. No write retry was performed.

Adding Better Auth reproduced the earlier connection error while signup, verification, password login and session read individually returned success. Instrumentation observed the Pool error **after the request's awaited `pool.end()` had completed** (`phase=closed`), while Wrangler was still running. Sanitized previous stack path: `pg-pool idleListener → _handleErrorEvent → reportStreamError → WebSocket`; message `Network connection lost`. The root cause and any work continuing beyond request/pool lifetime remain unproven. During a live source reload, one signup returned 503; a later retry after reload succeeded. No conclusion about real deployed behavior follows from this local reload.

### Neon HTTP

A probe returned 200 for 12 sequential requests, 20 concurrent requests and a request after 15 seconds idle. An intentionally unresolvable test hostname produced 503, and the next independent request to the real disposable endpoint returned 200. This models an unavailable endpoint, not a mid-write network failure. After restarting the local Worker, probe, login and session read succeeded. No automatic write retries were enabled. Other HTTP concurrency and fault results are in sections 3–4.

### Hyperdrive-style local binding

`pg` connected to Neon through the local binding; an explicit `BEGIN`/insert/`ROLLBACK` probe confirmed the probe row was rolled back. Basic signup, verification, login and session read succeeded; three concurrent magic-link pairs had one winner each and a burst of ten probe requests returned 200. However, the request-scoped `pg.Pool` error handler repeatedly observed pool error events during the auth/concurrency proof. A handler is not a fix. The local binding does not exercise actual Hyperdrive pooling, caching or production request isolation; real Hyperdrive remains **not tested**. The mock-mail database write used a separate HTTP connection only in this experiment.

## 6. User identity and legacy data

A disposable proof mapped Better Auth's user model to the existing `users` UUID and used distinct auth `account`, `session`, and `verification` tables; auth account/session FKs pointed to `users.id`. No second user table was needed in the proof. A test-only boolean `auth_email_verified` and one-way trigger synchronized `users.email_verified_at`; this is **not** a reviewed migration, does not resolve all existing data or write paths, and must not be applied to an owner database as-is.

- **Empty case:** a new signup and magic-link signup created one internal UUID user; repeated magic login for an existing verified email did not create a duplicate.
- **Legacy case:** a synthetic unverified `users` row with a legacy `user_auth_accounts` row, an order and an entitlement was exercised. After consuming a valid magic link, the user became verified and received a session; its UUID, order and entitlement references were unchanged, and the legacy bridge remained. This proves retention and the absence of automatic cleanup for the project's independent bridge; it does **not** prove a currently exploitable legacy login route.
- **Required design:** do not auto-link merely because an email matches. Fail closed for ambiguous legacy/unverified rows; quarantine or exclude legacy bridges from all future auth decisions without deleting them or business records; establish an explicit account-owner verification and reconciliation procedure before granting access. A new migration should refuse unsafe or unexpected existing data and preserve all business UUID/FK references. The exact policy, trigger/source of truth, concurrency behavior and recovery need review and disposable tests before implementation.

## 7. Options and recommendation

| Option | Evidence | Decision |
| --- | --- | --- |
| A: Better Auth + Neon HTTP/Drizzle | Core flows and limited one-time concurrency succeeded, but interactive transactions are unavailable and injected failure committed partial state. Logging and legacy mapping also need work. | **Do not proceed yet.** |
| B: Better Auth + Hyperdrive/pg | Local direct-connection emulation supports an explicit rollback and several basic flows, but produced Pool errors and partial magic-link state. Real Hyperdrive was not tested. | **Not proven.** Requires separate approval for an actual Hyperdrive binding; this is not the same as inventing a second migration/runtime URL. |
| C: Stop pending safe design | The required failure atomicity, lifecycle and legacy ownership handling are not proven. | **Recommended.** |

A practical next spike should identify and resolve request-scoped client/background lifetimes, establish an auditable failure/recovery contract for each multi-step operation, resolve the legacy ownership policy without automatic email-only linking, and retest simultaneous consumption, injected failures, redaction, and real-domain cookies. Only consider an isolated actual Cloudflare Hyperdrive test after the owner approves the binding and a safe test environment; no request to configure production is made here.

## 8. One `DATABASE_URL` decision

The single-variable decision remains viable for the tested direct endpoint: a second disposable Neon database used **the same direct `DATABASE_URL`** for `pg` migration runner (initial apply and second-run skip) and a Neon HTTP ledger query. WebSocket and Drizzle HTTP proofs also used direct Neon URLs in their own disposable environment. This does not establish that every URL type is interchangeable: the existing runner deliberately rejects Neon transaction-pooler URLs because it uses a session advisory lock. No second migration/runtime URL was added. A real Hyperdrive binding would be a separate resource/architecture decision and needs prior approval.

## 9. Commands and verification performed

- Root baseline and final: `npm ci`, `npm test` (6/6), `npm run build` (Worker dry run and Vite success; existing >500 kB chunk warning).
- `npm run db:migrate` twice on a separate disposable Neon direct URL: applied, then already applied; Neon HTTP query of the ledger using the same URL succeeded.
- Isolated local proof commands: `node setup.mjs`, `wrangler dev --config wrangler.pool.jsonc --local`, `node pool-test.mjs`, `wrangler dev --config wrangler.ws.jsonc --local`, `node ws-test.mjs`, `wrangler dev --config wrangler.http.jsonc --local`, `node http-test.mjs`, `node http-rate-test.mjs`, `node http-security-extra.mjs`, `node http-lifecycle.mjs`, `node http-isolation.mjs`, `node http-failure-safe.mjs`, `node legacy-business.mjs`, `node http-enumeration.mjs`, `node http-extra-final.mjs`; local binding proof: `wrangler dev --config wrangler.hd.jsonc --local`, `node hd-test.mjs`, `node hd-concurrency.mjs`, `node hd-failure.mjs`.
- These were one-off research scripts, not a clean automated CI suite. They require a newly provisioned disposable database and setup and must not target a real database; credentials must be supplied securely, not in command history or logs. No owner credentials were used.

**Status:** tested as described; not production-ready. Pending: production-domain/browser tests, real sender delivery, real Hyperdrive service, multi-isolate/global rate-limit behavior, thorough fault/concurrency testing, complete auth/identity design, and owner approval before any application implementation.
