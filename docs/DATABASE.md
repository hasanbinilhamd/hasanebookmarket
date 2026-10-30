> **V3 update:** `0002_guest_checkout.sql` adds a guest-checkout foundation without removing old account-linked data. It was tested only against a disposable database. Review, obtain approval and back up before running against an owner database; see [v3 audit](GUEST_CHECKOUT_V3_AUDIT.md).

# Neon / database

## Implemented vs pending

`apps/api/src/db.js` uses `@neondatabase/serverless` over HTTP for one request-scoped `SELECT 1`. [Neon recommends its serverless driver for Workers; HTTP is suitable for independent queries and WebSockets for interactive transactions](https://neon.com/docs/connect/choose-connection). [Cloudflare also documents the driver and Hyperdrive](https://developers.cloudflare.com/workers/databases/third-party-integrations/neon/); Hyperdrive can be evaluated later, it is not configured here. No database connection is made from React. The project owner's Neon database has **not been connected or tested**; a separate disposable Neon test is described below.

`GET /api/health/db` requires `Authorization: Bearer <operator-token>` with `DB_HEALTH_TOKEN` configured and at least 32 characters. On success returns only `{"status":"ok"}`; missing/invalid authorization -> 401; connection errors -> 503 with generic response. No DB query happens before authorization. The token is not a user session; keep it out of browsers, add rate-limiting/network controls, and do not put it in shell history.

## Phase 2B disposable Neon proof

A separate disposable Neon database was used to test the existing migration runner twice with a direct URL and to test Worker Neon HTTP and WebSocket Pool with the same URL. The owner's database has not been connected. An unresolved Worker pool lifecycle error and legacy-identity reconciliation concern prevent treating the exploratory auth mapping as production-ready. See [Phase 2B changelog](PHASE_2B_CHANGELOG.md). No new application migration was created.

## Schema (initial, provisional)

`infrastructure/database/migrations/0001_initial.sql` creates:
- `users`: UUID, normalized lowercased trimmed unique email, status, timestamps. This is a simple DB rule, not complete internationalized-email canonicalization.
- `user_auth_accounts`: provider + subject unique, indexed user FK; identity bridge only, not a password/session store. Auth provider schema/mapping is **not finalized**. A future Better Auth migration may add its own users/accounts/sessions/verifications or require a mapping/migration; review before any real accounts exist.
- `books`: UUID, unique slug, integer minor-unit price, ISO-style three-letter currency, constrained publication status.
- `book_assets`: book FK, private object key, controlled original/page kind, positive page numbers; partial unique original and page indexes. PostgreSQL stores references, not PDF bytes.
- `orders`, `order_items`: user/book foreign keys, constrained statuses, monetary snapshots as integers, uniqueness and indexes. Payment verification, taxes, currency consistency and order-total enforcement are future application responsibilities.
- `entitlements`: user/book unique, optional order-item FK, active/revoked status and timestamps. Authorization, ownership consistency across order/item/user, refunds and entitlement issuance are **not implemented**; the schema alone is not a license system.

FK delete policies are explicitly RESTRICT for commercial records and CASCADE for user identity/book assets. Updates to `updated_at` are application responsibilities; no trigger exists. No fixture data or admin account is seeded. Auth provider confirmation can materially change schema: do not treat this migration as the final auth design or apply to production without review.

## Migration runner

Only on an explicitly chosen empty development/test database or a reviewed and backed-up target; `DATABASE_URL` in the migration process must use Neon's **direct/non-pooler** connection. Use the provider's TLS connection settings. Never echo a URL or put it in source. From root in a secure terminal/environment:

```sh
# Set DATABASE_URL through a secure environment mechanism first, without logging it.
npm run db:migrate
```

The Node `pg` client obtains a session advisory lock on one connection, makes a `schema_migrations` ledger, hashes each ordered file, and runs each unapplied migration plus ledger insert inside one transaction. A second run skips already applied versions; missing/changed history or out-of-order files fail rather than silently reapply. Applied SQL files must never be edited; add a new version. Runner emits generic failures to avoid leaking credentials or data. Do not run against transaction-pooling endpoints; Neon `-pooler` URLs are rejected. Backup and manual review remain necessary, especially for destructive changes. Restrict DB account privileges and concurrency.

The initial SQL and repeated run were also tested against a disposable Neon database as described above. Checksum mismatch and key constraints were tested against disposable local PostgreSQL 17; they have not been retested on Neon. Optional `npm run test:db --workspace @hasan/api` requires `TEST_DATABASE_URL` pointing to a disposable already-migrated database; test data is rolled back. It must never target production.
