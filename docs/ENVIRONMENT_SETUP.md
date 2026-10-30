# Environment setup and secrets

Node 22+ and npm are required. Run `npm ci` at repository root. Root `.env.example` documents names but is **not automatically loaded**. Never paste credentials into chat, commits, screenshots or logs. Use separate development and production accounts/resources, least-privilege database roles and rotated secrets.

| Name | Where | State / meaning |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `apps/web/.env.local`, or Vercel environment | Public only; currently **unused**. Never store a secret under `VITE_`. |
| `DATABASE_URL` | `apps/api/.dev.vars` locally; Cloudflare Worker secret per environment; environment of migration process | Neon PostgreSQL connection from Neon Console → project → Connect. Worker uses Neon HTTP driver; migration requires **direct** connection, not the `-pooler` host, because session advisory locking requires one connection. Preserve SSL settings recommended by Neon. |
| `DB_HEALTH_TOKEN` | `apps/api/.dev.vars`; Cloudflare Worker secret per environment | Owner-generated random secret of at least 32 characters; operator only, never frontend. Protect health endpoint and apply network controls/rate limits. |
| `ALLOWED_ORIGINS` | `apps/api/wrangler.jsonc` `vars` per environment | Comma-separated exact trusted frontend origins, including scheme and port if present; default empty denies all Origin-bearing browser requests. Never use `*` or arbitrary preview origins. It is not a credential. |
| `BOOKS_PRIVATE` | Wrangler R2 binding | Not an environment string or access key. Bucket names in `wrangler.jsonc` are example resource names, not proof buckets exist or are private. |

For local Worker create `apps/api/.dev.vars` from `.dev.vars.example` and set real dev values **outside source control**. For the deployed production Worker, from `apps/api` run `npx wrangler secret put DATABASE_URL --env production` and `npx wrangler secret put DB_HEALTH_TOKEN --env production`; enter values interactively without shell history. Follow Cloudflare's secret tooling for the development environment separately. Avoid production secrets on local machines. Verify `git status` and `git check-ignore apps/api/.dev.vars` before commit.

Auth variables such as the Better Auth secret, Google client ID/secret and email-provider key are **future configuration**, not read by current code. Their names and secure setup will be finalized only after provider/domain decisions. Do not create fake credentials. Cloudflare R2 bindings need no S3 access key in the Worker.
