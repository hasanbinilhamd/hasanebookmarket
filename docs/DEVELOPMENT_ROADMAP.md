# Roadmap and dependencies

Each phase requires review and approval before the next begins. Status refers to implementation, not a guarantee of future dates.

1. **Foundation & frontend refactoring** — audit and preserve the 3D storefront; modular UI, mock catalog service, route placeholders, workspace direction, documentation and validation. Current phase; awaiting review.
2. **Backend infrastructure & authentication** — after Phase 1 approval, establish Cloudflare Workers API, Neon and private R2; design schema/migrations and implement Google OAuth + email authentication and authorization. Requires infrastructure accounts and security decisions; do not expose secrets to the browser.
3. **Book management** — depends on Phase 2 data, storage and admin authorization. Implement dynamic catalog and authorized book management with private PDF uploads.
4. **Secure reader** — depends on Phase 2 auth/licenses and Phase 3 books/assets. Dedicated rendering worker, rasterized private pages, server-side personal watermark, license checks and reading interface. A controlled test entitlement may be needed before real payments; do not fake purchases.
5. **E-commerce & Midtrans** — depends on authenticated users, books, pricing and the licensing model. Backend creates orders, verifies gateway notifications/status, handles idempotency and issues licenses; checkout UI must not pretend to be functional earlier.
6. **My Library & admin dashboard** — depends on authenticated users, reader and verified purchases. Add owned books, progress and operational admin views.
7. **Security hardening** — builds on implemented flows: authorization tests, anti-scraping controls, rate limits, security logging, webhook abuse and fraud testing. Security applies throughout development, not only at this phase.
8. **Production launch** — depends on prior acceptance, deployment and rollback plans, backups, monitoring, legal/operational policies, performance and security review.

Access is non-expiring while the service operates and the account remains eligible, not an unconditional promise of permanent service. Original PDFs must not be publicly accessible or sent to the browser.
