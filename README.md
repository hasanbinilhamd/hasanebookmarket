# Hasan Ebook Market — Phase 1

A single-scene interactive 3D bookstore prototype using React, Vite, Three.js and React Three Fiber. The six books are sample content, not actual products. Authentication, checkout, payments, APIs and a reader are **not implemented**.

## Run, build and test

Requires Node.js 20+ and npm.

```sh
npm ci
npm run dev
npm run build
npm test
```

The dev server normally starts on port 5173; use `npm run dev -- --port 5174 --strictPort` to choose the preview port. The production output is `dist/`. `vercel.json` provides SPA rewrites for deep links on Vercel; other hosts must serve `index.html` for client routes while still serving static files normally. Configure Vercel's build command as `npm run build` and output directory as `dist`.

## Current architecture

The repository stays a single npm-based monorepo. The existing Vite frontend is still at the root to avoid a risky move. npm workspace patterns for future `apps/*` and `packages/*` are configured, but no empty services or packages are created. The planned independently deployable apps and the future migration are documented in [architecture](docs/ARCHITECTURE.md).

- `src/components/library/LibraryScene.jsx` — existing WebGL architecture, books, lights, textures and animation.
- `src/components/storefront/` — existing UI, selection state and details.
- `src/catalog.js` — editable sample catalog and art direction.
- `src/services/books.js` — mock-backed catalog model and retrieval interface.
- `src/routing/` — home route and explicitly nonfunctional placeholders.
- `src/style.css` — preserved storefront styling.
- `tests/` — Node tests for catalog and route resolution.
- `docs/` — audit, architecture, roadmap and change log.

`/` is the 3D bookstore. `/book/:slug`, `/login`, `/checkout`, `/my-library`, `/reader/:bookId` and `/admin` are **placeholder pages only**. They perform no authentication, purchases, reading or administration. Unknown routes display a not-found message. They do not change the in-scene selection flow.

## Editing sample books

Edit `src/catalog.js`. Each sample has a stable `id`, content, cover colors and a `motif`. Array order determines shelf placement; the current composition is tuned for six books. To use a cover, set `coverImage` to a public image URL or `/covers/title.jpg` in Vite's `public` directory. Images should be 2:3 portrait; remote images require CORS. `src/services/books.js` maps existing fields into a consistent model including `slug`, `cover_image`, `preview_images`, `page_count`, `publication_status`, `created_at`, and `updated_at`. Prices, currency, page count and dates unknown for samples are `null`; `price_label` preserves the existing sample display. The service is synchronous and mock-backed, not an API; asynchronous loading and error handling will need explicit design when the backend exists.

Select a book and drag to inspect. Use Reset View, Back or Escape to return. Tab reveals keyboard-accessible book buttons. The original reduced-motion handling, mobile layout, loading state and WebGL fallback remain in place.

## Configuration and security

`.env.example` contains only a public Vite variable placeholder; it is not connected to an API. Never place database URLs, storage secrets, payment server keys, OAuth client secrets or access tokens in Vite variables. Future backend services are planned, not implemented. Supabase is not part of the architecture.

## Optional browser smoke check

The initial Phase 1 browser check used Playwright and headless Chromium with software WebGL; these are optional test tooling and are not project dependencies. With the dev server running on port 5174:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
# Depending on your OS, Chromium system libraries may also be required.
node scripts/browser-smoke.cjs
```

The script checks route placeholders, six desktop selections, mobile selection, mouse/touch gestures, reset and return; screenshots go to ignored `.audit-local/`. Gesture appearance was also manually compared. Real-device performance, browser compatibility and frame rate remain to be tested separately.
