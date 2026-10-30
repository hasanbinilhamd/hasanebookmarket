# Hasan Ebook Market — Phase 2 foundation

A single repository with independent React/Vite 3D web and Cloudflare Workers API workspaces. All catalog books remain samples. No functional authentication, checkout, payment, reader or admin exists. Phase 2 has local foundations; it is **not a deployed production system**.

## Prerequisites and commands

Node.js **22+** and npm are required (current Wrangler requires Node 22). From repository root:

```sh
npm ci
npm run dev                         # web on 5173, or: npm run dev -- --port 5174 --strictPort
npm run dev:api                     # separate terminal; Worker on 8787
npm test                            # API and web unit tests
npm run build                       # Worker dry-run bundle and web production build
```

Web: `apps/web`, Vite output `apps/web/dist`; API: `apps/api`, Wrangler development uses locally simulated R2. Test `/api/health`; `/api/health/db` is deliberately protected by a server-only health token. A local or remote Neon connection is not configured by default. The web still uses mock catalog data and does not call the API. No secret should be entered into the frontend.

An optional browser smoke test requires separately installed Playwright and Chromium; see [deployment and testing](docs/DEPLOYMENT.md). The Phase 1 smoke test expects the web on port 5174 and writes ignored screenshots to `.audit-local/`.

## Project structure

```
apps/web/                     existing 3D storefront, routes and mock catalog
apps/api/                     Worker, health checks, server-only storage/auth interfaces
infrastructure/database/      versioned SQL migration
infrastructure/storage/       storage policy notes
docs/                         audit, roadmap, architecture and Phase 2 setup
scripts/                      optional browser smoke test
```

The npm workspace patterns also reserve `packages/*`, but no shared package is created: no meaningful contract is currently consumed by both applications. The rendering worker is a future independent application. There is one root lockfile. `apps/web/vercel.json` contains the SPA rewrite; set Vercel Root Directory to `apps/web` as described in [deployment](docs/DEPLOYMENT.md).

Read [architecture](docs/ARCHITECTURE.md), [environment setup](docs/ENVIRONMENT_SETUP.md), [database](docs/DATABASE.md), [storage](docs/STORAGE.md), [authentication](docs/AUTHENTICATION.md), [baseline](docs/PHASE_2_BASELINE.md) and [change log](docs/PHASE_2_CHANGELOG.md) before deploying. The migration has been checked on a disposable local PostgreSQL database, not Neon. Actual Neon, private R2 resources, domains and authentication are still pending owner setup and verification.

## Security

Never put database URLs, OAuth secrets, provider credentials or health tokens in `VITE_*`, Git, browser code, issue trackers, logs, screenshots, or chat. `.env.example` is informational only. Keep `apps/api/.dev.vars` and actual environment files uncommitted; configure Cloudflare secrets separately for each environment. Original PDFs must remain private and must never be served to browsers. Supabase is prohibited and is not used.
