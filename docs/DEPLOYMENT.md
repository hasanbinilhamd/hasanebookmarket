# Deployment and validation

## Vercel frontend (not deployed by this work)

1. Import the GitHub repository in Vercel. Set the project's **Root Directory to `apps/web`**; Vercel recognizes npm workspaces and root lockfile. Set Node.js to a compatible supported 22.x release. See [Vercel monorepos](https://vercel.com/docs/monorepos).
2. Select Vite framework; build `npm run build`, output `dist` relative to `apps/web`. `apps/web/vercel.json` retains SPA deep-link rewrite. Install from workspace root using the root lockfile if Vercel detects the monorepo; check deployment logs. Vercel setup has not been exercised here.
3. Only public `VITE_*` values may go to Vercel; `VITE_API_BASE_URL` is presently unused. Keep placeholder routes visibly nonfunctional. Set exact production origin in API config separately before any future browser-to-API integration.

## Cloudflare Worker (not deployed by this work)

1. Enable Cloudflare Workers and R2, authenticate Wrangler locally, create separate private buckets, update `apps/api/wrangler.jsonc` names and production `ALLOWED_ORIGINS`, and review resource permissions. See [Cloudflare bindings](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/).
2. Create Neon dev/prod projects and least-privilege roles. Apply reviewed migrations using a secure direct connection to an intended target after backup; see [database](DATABASE.md).
3. Add `DATABASE_URL` and `DB_HEALTH_TOKEN` using Wrangler secrets for the relevant environment, not `vars`; no frontend exposure. From `apps/api`: `npx wrangler deploy --env production`. Confirm account/environment and resource names before deploying.
4. Verify health through an operator-controlled channel, enforce network restrictions and rate limiting, confirm real R2 private settings, and verify logs do not leak secrets. Database success and real R2 access have not yet been tested. No production deploy was performed.

## Local browser smoke

Run web at port 5174 (`npm run dev -- --port 5174 --strictPort`). To install optional browser tooling without changing the project lockfile, use an isolated tool directory and set `NODE_PATH` to its `node_modules`, or temporarily install Playwright without saving. Install Chromium and OS libraries per Playwright, then `node scripts/browser-smoke.cjs`. Tests use software WebGL, cover selection, mouse/touch gestures, reset, back, Escape, routes and unsupported-WebGL fallback. Real device GPU, touch, frame-rate and production network testing remain outstanding.
