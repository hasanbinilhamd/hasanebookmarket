# Deployment and validation

## Vercel frontend

The repository supports two explicit Vercel project root settings. Choose **one**, not a mixture:

### A. Repository root (current deployment reported by the owner)

- Set Project Settings → Root Directory to `.` (repository root). Root `vercel.json` builds **only** `@hasan/web`, publishes `apps/web/dist`, and rewrites SPA routes to `/index.html`. Its `buildCommand` and `outputDirectory` override corresponding dashboard settings for this project root. No Worker deployment or database operation runs during the Vercel build.
- Framework preset: Vite. The root `package.json` pins Node 22.x to avoid automatic major-version upgrades. npm installs from the root lockfile. A bundle-size warning may still appear; it is not the missing-directory error.

### B. Web workspace root

- Set Root Directory to `apps/web`; `apps/web/vercel.json` provides the SPA rewrite, `npm run build` builds Vite, and output directory is `dist` relative to `apps/web`. Vercel must include files outside the project root for npm workspace lockfile/dependencies if your project settings require that permission.

Deploy the latest commit and inspect the Vercel deployment log and URL; local build verification is not proof that the hosted deployment succeeds. Test `/`, a deep link such as `/login`, and a generated `/assets/...` file; the deep link should return the placeholder page and assets must not be rewritten to HTML. Only public `VITE_*` values may go to Vercel; `VITE_API_BASE_URL` is presently unused. The Worker is a separate Cloudflare deployment and has no secret values in the frontend build. See [Vercel monorepos](https://vercel.com/docs/monorepos) and [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json).

## Cloudflare Worker (not deployed by this work)

1. Enable Cloudflare Workers and R2, authenticate Wrangler locally, create separate private buckets, update `apps/api/wrangler.jsonc` names and production `ALLOWED_ORIGINS`, and review resource permissions. See [Cloudflare bindings](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/).
2. Create Neon dev/prod projects and least-privilege roles. Apply reviewed migrations using a secure direct connection to an intended target after backup; see [database](DATABASE.md).
3. Add `DATABASE_URL` and `DB_HEALTH_TOKEN` using Wrangler secrets for the relevant environment, not `vars`; no frontend exposure. From `apps/api`: `npx wrangler deploy --env production`. Confirm account/environment and resource names before deploying.
4. Verify health through an operator-controlled channel, enforce network restrictions and rate limiting, confirm real R2 private settings, and verify logs do not leak secrets. Database success and real R2 access have not yet been tested. No production deploy was performed.

## Local browser smoke

Run web at port 5174 (`npm run dev -- --port 5174 --strictPort`). To install optional browser tooling without changing the project lockfile, use an isolated tool directory and set `NODE_PATH` to its `node_modules`, or temporarily install Playwright without saving. Install Chromium and OS libraries per Playwright, then `node scripts/browser-smoke.cjs`. Tests use software WebGL, cover selection, mouse/touch gestures, reset, back, Escape, routes and unsupported-WebGL fallback. Real device GPU, touch, frame-rate and production network testing remain outstanding.

## Root-output fix verification

For the reported `STATIC_BUILD_NO_OUT_DIR` error, root `vercel.json` now overrides the build and output paths. Validation used `npm ci`, workspace unit tests, and Vercel CLI 65.4.0 `vercel build --prod` in an isolated local project with simulated Vercel settings and already-installed dependencies. The generated `.vercel/output/static` contained `index.html` and Vite assets, and the generated routing config handled filesystem paths before the SPA fallback. This does not verify the owner's actual Vercel project settings or hosted deployment; check the next deployment log.

## V3 Next.js backend foundation (not deployed)

`apps/backend` is a separate Next.js API workspace; it does not replace the existing Vite Vercel project or the Worker yet. A future deployment needs a separate Vercel project with Root Directory `apps/backend` and permission to use the root npm workspace files. Set the owner-approved API hostname and server-only secrets in that project's environment; see `apps/backend/.env.example`. This setup has not been tested on hosted Vercel. Only `/api/health` exists: no checkout, payment, email, download or admin routes are active. Do not use this as a production checkout.

For local health testing: `npm run dev:backend`, then request `/api/health` on port 3001. The frontend is not connected. Prisma schema is partial and SQL migrations remain authoritative; never run Prisma schema sync on a database with real data.
