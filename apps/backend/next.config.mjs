import {fileURLToPath} from 'node:url';
/** Separate Vercel project: do not change the Vite storefront's deploy. */
const nextConfig = {
  poweredByHeader: false,
  // npm workspace dependencies and the lockfile live at the repository root.
  turbopack: {root: fileURLToPath(new URL('../..', import.meta.url))},
};
export default nextConfig;
