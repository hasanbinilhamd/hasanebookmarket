# Phase 2 baseline and migration plan (before changes)

Inspected `main` at commit `8d4632f`; GitHub `main` resolves to the same commit. `origin/main` is a stale local tracking reference because the prior push used a URL. No tracked changes. Preserve untracked `uploads/` and `reading-room-project.zip`, plus ignored local caches; do not commit them. No reset or force push.

Root frontend: `npm ci`, `npm run dev` (Vite), `npm run build` (Vite), `npm test` (two Node tests). React 18/Vite 6/Three/R3F/Drei; WebGL scene is procedural and sample catalog is local. Phase 1 reports visual desktop/mobile checks, 2 passing tests and a Vite bundle-size warning. No actual API, auth, database, object storage, reader or e-commerce existed. See `PROJECT_AUDIT.md` and `PHASE_1_CHANGELOG.md` for existing behaviors.

Migration plan, before moving files:
1. Move tracked `src/`, `index.html`, `vite.config.js`, frontend `tests/`, and `vercel.json` into `apps/web/` using normal git-tracked moves; preserve contents, relative imports, and style. No `public/` currently exists. Browser script stays at root with its existing localhost port convention. Root `.env.example` is public placeholder; put frontend-specific example alongside web while updating root examples as needed.
2. Move frontend dependencies/scripts into web workspace manifest, root workspace delegates `dev`, `build`, `test`; update npm lock. Keep docs, README, browser script, package lock and `.gitignore` at root. Set Vercel root directory to `apps/web` and keep its SPA rewrite there; document build from workspace.
3. Capture desktop/mobile browser baseline if Chromium is available; compare after moving. Run frontend tests and build before adding backend.
4. Create separate Workers API, health routes and private R2 binding with no public object route; DB health must fail closed and not expose secrets. Add Neon driver and versioned transactional migration runner. Keep provider-specific auth schema provisional until owner agrees to provider; do not invent credentials.
5. Validate locally, and explicitly report all external integration and real-device checks that could not be performed.
