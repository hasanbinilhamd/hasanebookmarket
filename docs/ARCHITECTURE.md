# Architecture

## Implemented in Phase 1

The root React 18/Vite 6 app uses Three.js and React Three Fiber for the single persistent library scene. `LibraryScene` owns the procedural room, book geometry, materials, camera and 3D interaction; `Storefront` owns selection and responsive UI state; `BookDetail` and `StorefrontChrome` own presentational markup. Book content flows from the mock-backed `services/books.js` into the scene and panel. Client routes resolve locally; all non-home routes are visibly nonfunctional placeholders. Vite compiles the frontend; Vercel SPA rewrites support direct links. `.env.example` defines only a public, currently unused placeholder.

The repository is one monorepo. npm `workspaces` recognizes `apps/*` and `packages/*` without creating empty services. The current web app intentionally remains at the root; when separately deployable apps are actually introduced, migrate the web app to `apps/web` only with verified path, lockfile, build, route and Vercel deployment changes. Add `apps/api`, `apps/rendering-worker`, `packages/shared`, and `infrastructure` when needed, not as empty implementations. Each actual app should have its own build/deploy configuration and lifecycle; one repository does not imply one deployment.

## Planned, not implemented

- React/Vite/Three.js web frontend deployed on Vercel.
- Cloudflare Workers backend API for authentication, authorization, order management, reader access and webhooks. Google OAuth and email authentication are planned; no authentication exists today.
- Neon PostgreSQL for users, books, orders, payments, licenses, reading progress and security records.
- Cloudflare R2 private buckets for original PDFs and rendered pages; public covers may be separately hosted. Originals are never delivered to browsers.
- Dedicated independently deployed rendering worker/container validates PDFs and converts pages to private raster images. The reader API verifies identity and license and applies personalized watermarking server-side before returning individual pages.
- Midtrans Snap processes payments; backend verifies notifications/status and issues licenses idempotently, not based on browser redirects.
- Custom raster reader supports authorized reading; screenshot deterrents are imperfect and cannot prevent recording or photography. Per-page access, rate limiting and monitoring mitigate rather than eliminate copying.

Only public configuration belongs in frontend `VITE_` variables. Neon credentials, R2 secrets, Midtrans server keys, OAuth client secrets and signing keys belong exclusively in appropriately managed backend secrets. No secrets in frontend bundles or source control. The project does not use Supabase.
