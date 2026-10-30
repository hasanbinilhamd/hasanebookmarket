# The Reading Room

A single-scene, interactive 3D library prototype built with React, React Three Fiber and Three.js. All publications are **sample content**, not real products, and no commerce functionality is implemented.

## Run locally

```sh
npm install
npm run dev
```

## Editing the collection

Edit `src/catalog.js`. Each object has a stable `id`, its information panel fields, cover colors and an illustration `motif`. The order of the array determines shelf placement. To use your own cover art, set `coverImage` to an image URL or a path to an image in Vite's `public` directory (e.g. `/covers/title.jpg`). Images should ideally have a 2:3 portrait aspect ratio. Remote images must allow cross-origin access. Change `topics`, `outcomes`, `pages`, `language`, `updated`, and `price` as actual catalog information becomes available.

The environment, book geometry, animation and inspection behavior live in `src/main.jsx`; interface styles and responsive layouts live in `src/style.css`. Desktop displays the six sample volumes on one shelf; mobile lays them out over two shelves. The current composition is tuned for six volumes, and can be expanded by adjusting the placement logic in `Book` and shelf geometry in `Library`.

## Interactions

Select a book, drag it to inspect, use Reset View to restore its angle, or return with the back control or Escape. Keyboard users can Tab into a list of book buttons. The experience respects the operating system's reduced-motion preference and displays a message when WebGL is unavailable.
