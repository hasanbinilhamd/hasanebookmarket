# Project audit — baseline before Phase 1 changes

## Repository and Git baseline

Inspection: local `main` and GitHub `main` both pointed to `8d7f90b` (`Add interactive 3D library prototype`). No tracked modifications were present. `reading-room-project.zip` and `uploads/` were untracked and are preserved, not included in project changes. Repository was an npm/Vite app at root: `index.html`, `vite.config.js`, `package.json`, `package-lock.json`, `src/main.jsx`, `src/catalog.js`, `src/style.css`, and `README.md`. There was no routing, test suite, backend, static asset directory, or workspace configuration.

## Entry points and scene

`index.html` mounts `/src/main.jsx`, which imports the stylesheet and static `catalog`. One compressed source file contained canvas texture generators, primitive `Box`, procedural bookshelf `Library`, `Book`, `CameraRig`, `Scene`, WebGL capability check and React `App`. Canvas uses React Three Fiber; Three.js handles meshes, materials, canvas textures, fog, lighting and damped movement. There are no external 3D models. Book cover art is canvas-generated; optional `coverImage` is loaded cross-origin.

The room is a dark wooden wall, shelf planks, pilasters, brass-colored edges, two rows of procedural decorative spines, ambient/hemisphere/directional/point lights. Six front-facing books consist of page blocks, boards, page-edge strips and front/spine textures. Scene camera uses a perspective camera; books and camera interpolate on selection. Original position depends on array index and the 700px mobile breakpoint. A selected book receives pointer drag with clamped rotation, inertia and reset. Esc and back restore the collection. Selection is held in React state; a keyboard-accessible button list selects books. The existing detail panel, decorative header, collection copy, loading indicator and WebGL fallback are in the same file. `style.css` contains desktop/mobile styling and reduced-motion CSS. Scene uses a damped faster movement when reduced-motion is requested.

## Routing and content

There is no client router or route-specific page; the single app renders regardless of pathname when served by Vite's SPA fallback. `src/catalog.js` exports six explicitly sample items with IDs, title, subtitle, author, category, description, topics, outcomes, audience, placeholder price/pages/update, language, colors, motif and optional `coverImage`. Scene and UI import this array directly. No real transactions, reader, authentication, database or API exist.

## Dependencies and commands

`npm install` / `npm ci`; `npm run dev` starts Vite. Dependencies: React 18, React DOM 18, Vite 6, `@vitejs/plugin-react`, Three.js, React Three Fiber and Drei (declared but not imported in the existing source). No build, test or lint scripts were defined in `package.json`; `npx vite build` works as a Vite command. External Google Fonts are requested by `index.html`, with CSS serif/sans fallbacks.

## Risks and preservation requirements

- Preserve geometry, lights, positions, texture generation, input logic, CSS, copy and the collection-to-detail interaction; no visual redesign.
- Rendering, scene, data and all UI are coupled in `main.jsx`; catalog directly imported in both scene and UI. Splitting along current boundaries without altering internals reduces risk.
- No automated interaction tests; actual visual behavior and mobile drag need a browser/WebGL check, not just a build.
- The scene and visible counters assume six sample books; layout expansion needs deliberate redesign in a future phase.
- Existing original uses a single long component, no route foundation, no test/lint command, no formal canonical book model, and no API interface.
- Third-party web font availability, WebGL hardware support, canvas texture performance and runtime accessibility require real-device validation. The optional remote cover relies on CORS.
- `.gitignore` excludes `node_modules`, `dist` and private env files; do not stage the user's untracked files.

## Minimum safe refactoring plan

Keep the app at repository root and npm lockfile for now; document a future monorepo migration rather than perform an unverified move. Extract the unchanged scene/texture code and existing UI into small modules, pass catalog in as a prop, introduce a mock-backed catalog service with a normalized model, and add honest route placeholders without affecting `/`. Add only public env example and documentation. Build and test routes and interactions, and explicitly report any checks unavailable in this environment. No API, database, authentication, payments or reader implementation in Phase 1.
