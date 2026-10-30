# Guest checkout v3 — audit and implementation status

Baseline: `7e880c2`. The product brief dated 2026-10-30 supersedes the previous customer-account and raster-reader plans: the target is guest checkout with email OTP and time-limited PDF downloads. Historical phase documents describe earlier decisions and are not the current product specification.

## Audit

- Preserve: React/Vite/Three.js 3D storefront and existing deployment, Neon PostgreSQL, private R2, original schema/migration history and Worker health foundation. The frontend catalog is still mock data.
- Change: add a separate Next.js API workspace for Vercel and a reviewed Prisma model, transactional guest checkout and OTP, Midtrans webhook verification/idempotency, private R2 download, transactional email and protected admin. Current root Vercel configuration deploys only Vite; the new backend needs its own Vercel project/root and exact public API origin, which have not yet been configured.
- Previous customer login, customer sessions, customer library and raster reader are no longer planned for this brief. Do not remove legacy `users`, `user_auth_accounts` or `entitlements`; the current `orders.user_id` requirement must be relaxed safely for guest orders.
- Risks: migrations against any owner's existing database require target verification, backup and approval. A signed webhook, not a browser redirect, controls payment. Download bearer links can be shared; temporary R2 URLs cannot be revoked after issuance until their own expiry. Admin authentication, OTP abuse controls, delivery retries and email-change ownership verification must be fully tested before exposure. No actual external integration is assumed active merely because a binding or account exists.

## Implemented so far

`0002_guest_checkout.sql` adds a guest draft, keyed-OTP digest storage, payment-event fingerprints, hashed download-token records, delivery jobs, shared rate counters and admin audit records; adds guest contact fields to orders while keeping legacy account-linked orders valid; and adds order-item quantity. It does not send email, accept payment, deliver files or implement admin authentication. The old `0001_initial.sql` remains unchanged. The application remains fail-closed where no feature is implemented.

## Pending

Next.js/Prisma API, checkout UI, OTP validation and atomic rate limits, Midtrans, verified payment processing, private R2 download, email delivery/retries, secure admin, production domains/credentials and end-to-end browser tests. Do not regard the migration alone as a finished checkout or production-ready deployment. The actual owner's Neon and R2 configuration is unverified in this environment.

## Initial foundation update

- Added `apps/backend/`: a separately deployable Next.js 16.4.3 API workspace, with only `GET /api/health` implemented. It does not provide checkout, payment, customer authentication or admin routes. `prisma/schema.prisma` maps the new guest tables using Prisma 6.19.3; it is deliberately **not** a complete mirror of legacy tables. SQL migrations remain authoritative: do not run `prisma migrate` or `db push` on a real database using this partial schema.
- The existing root Vercel/Vite deployment and the Cloudflare Worker are unchanged. The Next backend has not been deployed or connected to the frontend. Its deployment requires a separate Vercel project rooted at `apps/backend`, the root workspace files available during build, and an owner-approved API hostname/origin.
- Test-only Neon: a fresh disposable database was prepared with `0001_initial.sql`, a legacy paid order, and the matching migration ledger. The runner applied `0002_guest_checkout.sql`, skipped it on rerun, and the original order/user remained. Constraint tests passed in a rolled-back transaction; Prisma successfully queried the new draft model. No owner database was used. This is not proof that the production database is compatible or already migrated.
- The optional database integration test uses `TEST_DATABASE_URL` only when `DISPOSABLE_TEST_DATABASE=1`; never point it at an owner or production database. With no test database configured the test is explicitly skipped.
- `apps/backend/.env.example` lists future backend variables with blank values. `MIDTRANS_CLIENT_KEY` is intended to be public when deliberately exposed to the browser; all server credentials remain server-only. Most variables are placeholders and do not activate integrations. Do not copy production secrets into the repository or chat.
- Added tested, server-only checkout OTP generation and keyed-HMAC comparison primitives. These are **not** a usable OTP flow: no endpoint, delivery, capability validation, database lock, expiry check, resend handling or attempt/rate enforcement exists yet. The 32-character minimum pepper length is only a configuration guard; the owner will need a randomly generated high-entropy secret.
- The root npm override pins `deepmerge-ts` 8.0.1 to address GHSA-ggr8-5vv4-36mx in Prisma's CLI dependency chain. Prisma client generation and backend build passed with the override, and `npm audit --omit=dev` reported zero vulnerabilities; a future Prisma upgrade should remove and re-evaluate the override. This is not a general security certification.
