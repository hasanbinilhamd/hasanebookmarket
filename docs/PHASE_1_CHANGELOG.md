# Phase 1 change log

## Added

- `src/components/library/LibraryScene.jsx`: extracted existing scene, procedural textures, library, book, camera and animations. Receives books via props; geometry and interaction logic unchanged.
- `src/components/storefront/Storefront.jsx`, `StorefrontChrome.jsx`, `BookDetail.jsx`: extracted existing app state and UI without redesign; presentation uses the service's `price_label` to preserve the original sample price text.
- `src/services/books.js`: mock-backed normalized book service, with unknown price, currency, page count and dates represented by null instead of invented product facts.
- `src/routing/routes.js`, `AppRouter.jsx`, `placeholder.css`: routes for later features and clearly nonfunctional placeholders; the original bookstore stays at `/`.
- `tests/books.test.js`, `tests/routes.test.js`: dependency-free Node tests for catalog contract and route resolution.
- `scripts/browser-smoke.cjs`: optional Playwright browser smoke checks; Playwright is not a project dependency.
- `.env.example`: unused public frontend API URL placeholder only.
- `vercel.json`: SPA rewrite for direct route refresh on Vercel.
- `docs/PROJECT_AUDIT.md`, `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT_ROADMAP.md`, `docs/PHASE_1_CHANGELOG.md`: baseline, architecture, phases and changes.

## Changed

- `src/main.jsx`: minimal React entry point; rendering moved to extracted components.
- `package.json`, `package-lock.json`: add build/test scripts and npm workspace patterns; no application dependency added, removed or intentionally upgraded.
- `.gitignore`: exclude locally generated browser audit screenshots and tool caches.
- `README.md`: current structure, commands, deployment, placeholder limitations and security boundaries.

## Removed

No project files removed. Original `src/catalog.js`, `src/style.css`, `index.html`, and `vite.config.js` remain unchanged. User-provided `uploads/` and `reading-room-project.zip` were preserved and not committed.

## Validation and limitations

- `npm ci`: successful using the lockfile. Existing transitive `three-mesh-bvh` deprecation warning.
- `npm test`: 2 tests passed, 0 failed (catalog contract and routes).
- `npm run build`: successful; Vite reports a >500 kB chunk warning (JS approximately 989 kB / 274 kB gzip). No lint script existed; none was claimed or added.
- Browser: headless Chromium + software WebGL at 1440×900 and 390×844. Before/after collection screenshots are pixel-identical under this environment. Selected state screenshots are visually consistent; minor differences (mean ~1.0–1.6/255) reflect capture timing/animation. Six desktop book selections, two mobile selections, mouse drag, simulated touch drag, reset, back, Escape, unsupported-WebGL fallback and route placeholders were exercised. Visual drag changes were inspected in screenshots; no browser page or console errors recorded. Real-device testing, hardware GPU performance, frame rate and broader browser testing are still needed.
- Static package/config scan found no Supabase dependency or backend secrets in project files. A secret shared previously in chat should still be revoked and rotated; none was committed to this project.
- No backend, login, payments, reader or database work was performed. Route pages are not access-control boundaries. Moving the frontend into `apps/web` and independent deployments are deferred.
