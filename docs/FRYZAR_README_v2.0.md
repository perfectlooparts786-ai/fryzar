# FRYZAR

A bilingual Urdu/English single-store food-ordering platform built on Cloudflare Workers and Cloudflare D1.

## Project control

- GitHub repository: `perfectlooparts786-ai/fryzar` (private, default branch `main`).
- GitHub is the canonical source-control home for application source, migrations, tests, documentation, CI, and releases.
- Cloudflare is the deployment/runtime platform for Workers, D1, DNS, and any later approved services.
- All durable project source, documentation, tasks, and release evidence are maintained in GitHub. Automated execution environments are temporary and generated from GitHub.

## Verified Cloudflare baseline (1 November 2026)

- Customer Worker: `fryzar-app` (currently bound to D1 `fryzar-production`).
- Admin Worker: `fryzar-admin` (currently bound to D1 `fryzar-production`).
- API Worker: `fryzar-api` (currently bound to D1 `fryzar-core`).
- Both `fryzar-production` and `fryzar-core` contain application schemas; they are not identical and must be reconciled before cutover.
- `fryzar.com` is an active Cloudflare zone, but the audit found only an Apple verification TXT record and no Fryzar Worker routes. Do not claim the custom domain is live until DNS and routing are verified.
- No Cloudflare Pages project named Fryzar was found. R2 was not enabled and no account KV namespaces were returned during the audit.

## Repository status

At the audit time, this repository contained the README and the original `FRYZAR_Master_PRD_v1.0.docx`, but not the recovered deployed Worker source, migration files, automated tests, or a reproducible Fryzar deployment workflow. The exact deployed source must be recovered from Cloudflare and committed to GitHub before further production changes.

## Critical safeguards

1. Back up both D1 databases before migration or production data changes.
2. Do not delete either database or repoint a production Worker until schemas and data are reconciled, migration is tested, and rollback is verified.
3. Never commit API tokens, passwords, session secrets, bootstrap tokens, payment credentials, customer data, payment proofs, or production database exports.
4. Re-test prior findings around manual-transfer payment records, stock restoration, idempotency, admin authorization, login throttling, hard-coded delivery fees, product images, WhatsApp contact, and domain routing.
5. The newer API Worker is annotated as adding idempotent checkout, stock reservation, and private tracking. Treat these as unverified until end-to-end tests pass.
6. Review the API Worker `APP_ENV`/allowed origins and customer Worker CORS before production traffic.
7. Do not enable manual bank transfer or any other payment method until its complete checkout, record, proof, verification, and reconciliation workflow passes.

## Documentation

- `docs/FRYZAR_Master_PRD_v2.0.md` — current product and technical requirements.
- `docs/FRYZAR_Master_Development_Prompt_v2.0.md` — instructions for the authorized development agent.

The v2.0 documents supersede the original v1.0 planning baseline. They distinguish verified current infrastructure from target architecture and future work.
