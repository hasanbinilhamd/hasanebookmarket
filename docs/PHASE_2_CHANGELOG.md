# Phase 2 change log and status

## Moves and additions

- `src/`, `index.html`, `vite.config.js`, frontend tests, `.env.example`, `vercel.json` moved unchanged under `apps/web/`; a web workspace manifest added. No deliberate change to geometry, material, camera, animation or CSS.
- Root npm package/lock reorganized into workspaces; `dev`, `dev:api`, `build`, `test`, `db:migrate` scripts. Node 22 required for current Wrangler. Existing root browser smoke script retained.
- `apps/api/`: official Wrangler Worker configuration, local dev/build/test scripts; minimal health router, strict origin handling and generic errors, Neon HTTP health adapter, private R2 binding/helper, fail-closed auth interface. Development and production bucket names are examples, not provisioned resources. No sensitive object HTTP routes.
- `infrastructure/database/migrations/0001_initial.sql`: initial provider-neutral domain schema; `apps/api/scripts/migrate.mjs`: direct PostgreSQL runner with advisory lock, transaction and checksummed ledger; `check-schema.mjs` optional isolated DB constraint checks. This does not finalize provider auth schema.
- Root `.env.example`, API `.dev.vars.example`, `.gitignore`: example variable names and local secret exclusions; no secret values. `infrastructure/storage/README.md`: policy location.
- Docs: `PHASE_2_BASELINE.md`, `ENVIRONMENT_SETUP.md`, `DATABASE.md`, `STORAGE.md`, `AUTHENTICATION.md`, `DEPLOYMENT.md`, this changelog; updated README and architecture. The `packages/shared` folder is deferred: no shared contract is consumed by both workspaces.

## Verification performed

- Baseline Fase 1: 2 Node tests pass, Vite build passes; before/after Chromium software-WebGL smoke on desktop 1440×900 and mobile 390×844 tests selection, mouse/touch gesture, reset, return, Escape, route placeholders and fallback. Collection screenshots are identical per pixel under this environment; selected-state differences are small (mean about 0.25 desktop / 1.20 mobile per 255 channel), capturing animation at different instants. No console/page errors reported. Real-device and GPU performance tests remain pending.
- Local Worker launched under Wrangler; `/api/health` returns 200, DB health without token 401, unknown object route 404, disallowed Origin 403 and unsupported method 405. Unit tests also cover authorized DB success/failure using a mock, generic errors, CORS, storage helper and fail-closed auth.
- Initial migration applied on an empty **local PostgreSQL 17** database, second run skipped it, tampered migration checksum was rejected, then ledger restored. Constraint checks passed within a rolled-back transaction. No Neon database was connected.
- API dry-run bundle and web production build pass. No lint script exists; lint was not run. Exact final test/build output is included in the delivery report. Existing web chunk-size warning remains. `npm audit --omit=dev --audit-level=moderate` found 0 vulnerabilities in the installed production dependency tree.

## Not completed externally

Neon account/credentials and real Worker→Neon connection, Cloudflare deployment and real/private R2 verification, Vercel deployment, OAuth/email provider selection and credentials, auth migration/session flows and real-device testing remain pending. No checkout, payment, reader, rendering or admin implementation was added. See corresponding docs for manual steps.
