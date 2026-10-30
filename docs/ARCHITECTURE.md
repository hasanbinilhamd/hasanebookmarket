# Architecture — Phase 2

```
Browser -> Vercel: apps/web (React + Vite + Three.js, currently mock catalog)
                  |
                  | future API calls (not connected yet)
                  v
        Cloudflare Workers: apps/api
           |                    |
     Neon over HTTP       R2 Worker binding
     (DB health only)     (no public object route)

Future: independently deployed PDF rendering worker; Google/email auth;
Midtrans; license-authorized raster reader with server-side watermark.
```

## Implemented locally

- npm workspaces: web at `apps/web`, API at `apps/api`; root lockfile and orchestration. Web's original procedural scene, assets, style and interactions were moved intact. Routes except `/` remain honest placeholders.
- Worker `GET /api/health`; `GET /api/health/db` requires a separate secret operator bearer token, at least 32 characters, before issuing a Neon HTTP `SELECT 1`. Error output is generic; no credentials or SQL are returned. Configure rate limits and network restrictions externally before production. Neither endpoint verifies user sessions.
- Exact-origin CORS allowlist for browser requests, closed by default; origin check is not authentication. Unknown routes and unsafe methods are denied. There are no object upload/download routes.
- Neon serverless driver for a single HTTP query, used only by Worker. Direct Postgres connection (`pg`, Node only) runs SQL migrations under a session advisory lock; use a **direct, not pooled** connection for migrations. Initial domain schema is provider-independent, provisional, and not a finished authentication schema.
- R2 `BOOKS_PRIVATE` binding is configured with development/production names; these names are placeholders until owner creates and verifies buckets. Server helpers are not exposed via HTTP. Local Wrangler uses a simulator; no real R2 bucket has been provisioned or verified.
- `requireVerifiedSession` deliberately throws: no auth provider, sessions, Google OAuth or email flow are active. Better Auth is recommended subject to owner decisions; an auth migration and identity linkage are not complete.

See [database](DATABASE.md), [storage](STORAGE.md), [authentication](AUTHENTICATION.md), and [deployment](DEPLOYMENT.md). A shared package is intentionally deferred until there is a real contract used by both workspaces; a rendering worker is likewise not yet created.

## Planned and not implemented

Cloudflare Workers will eventually provide authenticated catalog/admin/reader APIs. Neon stores structured data; private Cloudflare R2 stores originals and rendered pages. A dedicated, separately deployed worker/container will validate and rasterize PDFs and burn personalized watermarks server-side. A custom reader must check entitlements per page and rate-limit access. Browser-based protections cannot prevent all screenshots or recording. Midtrans payment verification and idempotent license issuance remain later-phase work; frontend callbacks alone never grant access. Original PDFs must never be public or sent to browsers. A non-expiring entitlement is subject to service availability and account policy, not an absolute promise of perpetual operation.

Frontend `VITE_*` values are public. Database URLs, health tokens, OAuth client secrets and email keys belong only in backend secrets. No Supabase integration is permitted.
