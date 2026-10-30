> **V3 update:** private paid PDF downloads through time-limited, authorized links are now the product target. They are not implemented yet; the earlier reader-only statements below are historical. See [v3 status](GUEST_CHECKOUT_V3_AUDIT.md).

# Private Cloudflare R2

## Actual status

`apps/api/wrangler.jsonc` declares `BOOKS_PRIVATE` with separate development and production example bucket names. `apps/api/src/storage.js` provides internal UUID-based object-key generation and a server-only read helper. No public HTTP route calls the helper; there is no upload UI, PDF download, or reader. Unit tests exercise the helper with an in-memory mock. Wrangler's local binding is simulated. **No real bucket was created, connected, or verified private.**

The server-side helper is not itself an authorization layer. Any future caller must check a server-verified identity, object ownership/licence and rate limits before touching R2. Random keys reduce guessability but are not security boundaries.

## Owner setup (after reviewing names/costs)

1. In Cloudflare, enable R2 and create separate dev and prod buckets, for example via dashboard or `npx wrangler r2 bucket create <bucket-name>` from `apps/api`. Replace config example names with actual chosen names; `env.production` is separate.
2. Keep the buckets private: do not connect a public custom domain, enable `r2.dev`, or publish unrestricted presigned URLs. Audit Cloudflare settings and access policies. Worker binding access bypasses the need for exposing R2 credentials to the browser.
3. No bucket CORS rule is needed when the browser never accesses R2 directly. If requirements change, review narrowly scoped CORS and authorization first; CORS is not access control.
4. Test isolation and access controls in real dev R2 before production. Do not store originals publicly or return them to browsers. Rendering/reader services must store and access private pages and originals through authorized server-side operations.

[Cloudflare R2 Worker bindings and local simulation](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/). Local `wrangler dev` uses simulated storage unless remote bindings are explicitly configured. A binding does not make an application safe if routes expose it without authorization.
