# Authentication evaluation — recommendation, not deployed

**Status:** no login/register, auth package, session validation, OAuth callback, email sender, or provider-specific schema is implemented. `apps/api/src/auth.js` fails closed. `/login` is a nonfunctional placeholder. Owner approval, domain, database, email delivery and credentials are needed before integration.

## Phase 2B compatibility investigation (incomplete)

A local Wrangler proof connected Better Auth 1.7.14 to a disposable real Neon database and exercised the core email/session flows. A repeatable idle WebSocket pool error remains unresolved, and a pre-existing unverified legacy identity retained its independent bridge row when a magic link verified that email. These results do **not** prove a production-safe adapter or identity migration. Authentication remains fail-closed in the application. See [Phase 2B changelog](PHASE_2B_CHANGELOG.md) for exact scope, limitations and next steps. No production Cloudflare deployment, sender or domain has been validated.

## Comparison (official documentation checked 2026-10-30)

| Topic | Better Auth (self-hosted library) | Clerk (managed) |
| --- | --- | --- |
| Workers / Neon | Cloudflare Node compatibility support documented; PostgreSQL supported, but exact Neon Worker adapter and session/transaction behavior need an integration proof. Worker runtime has `nodejs_compat` on this compatibility date. | Backend request authentication uses Clerk SDK; [Neon integration](https://clerk.com/docs/guides/development/integrations/databases/neon) exists. Exact Workers + cross-origin deployment needs proof; identity is external. |
| Google | [Google OAuth and callback configuration](https://better-auth.com/docs/reference/options); owner supplies Google app credentials and registered callback. | [Google connection](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google); dev shared credentials differ from production, which needs own OAuth application. |
| Email | [Verification and reset](https://better-auth.com/docs/concepts/email) supported but requires configured transactional email sender and policies; email/password, magic link or OTP require product choice. | Managed flows include [email reset](https://clerk.com/docs/guides/development/custom-flows/authentication/forgot-password); delivery/configuration and quotas depend on plan. |
| Sessions | [Cookie options](https://better-auth.com/docs/reference/options) support HttpOnly and Secure; configure SameSite, origin/CSRF and OAuth state. Real cross-origin setup must be tested. | Clerk's FAPI `__client` is HttpOnly, but the app's short-lived `__session` is **not HttpOnly** ([official explanation](https://clerk.com/docs/guides/how-clerk-works/overview)). This conflicts with the brief's strict application-session requirement without an additional architecture change. |
| Cost / lock-in | [Framework is free/open source](https://better-auth.com/pricing); hosting, DB, email, security operations and optional managed services may cost money. Data and ops stay with project. | [Free plan currently lists 50,000 monthly retained users](https://clerk.com/pricing); limits, billing and terms can change. Provider controls identity/session lifecycle; migration/export must be planned. |

**Recommendation:** Better Auth, conditional on a successful Worker/Neon proof, because it can meet the HttpOnly requirement and keeps identity storage under project control. This is not a production-ready implementation or a guarantee that its default schema matches ours. Clerk is easier to operate but its documented app session cookie conflicts with the strict HttpOnly requirement as normally deployed. Recheck pricing/plan limits before purchase.

## Phase 2 checklist (historical; Phase 2B choices above supersede provider and method decisions)

1. Owner approves provider, login method (password or passwordless email), production web/API domains, email provider and operational budget. Prefer same-site `web` and `api` subdomains or a same-origin proxy; do not rely on third-party cross-site cookies. Confirm domain and callback URLs first.
2. Create separate dev/prod Neon databases, Google OAuth apps with exact callback URLs, and verified sender/domain at chosen email provider. Store secrets only as Worker secrets; **do not paste them into chat**.
3. Prototype Better Auth with a supported Worker-compatible Neon adapter; verify cookie `HttpOnly`, production `Secure`, appropriate `SameSite`, `Origin` allowlist, CSRF protections, OAuth state/PKCE, callback allowlists, email verification and password reset/session revocation. Do not implement custom crypto or OAuth.
4. Generate and review provider-specific tables and migration, reconcile Better Auth identity with internal UUID `users` and `user_auth_accounts`, handle verified-email linking safely, and test idempotency/concurrency. Current identity bridge is not the Better Auth schema; choice may require additional migration or a redesign before production data exists.
5. Implement secure server-side session/authorization, never trust client-provided user IDs or store access/refresh tokens in localStorage, and test login/logout, account recovery, session expiry and cross-origin/CSRF threats. No route should use the disabled adapter as a substitute for verification.
