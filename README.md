# FRYZAR

A bilingual Urdu and English food-ordering platform built on Cloudflare Workers and Cloudflare D1.

## Project status

This repository is the source-control home for the FRYZAR project. The existing customer and admin Workers and the production D1 database were audited before source recovery began.

**Important:** This repository currently contains project documentation only. It does not yet contain the recovered deployed Worker source, original application source files, or a verified deployment configuration.

The production system is **not launch-ready**. Do not enable public ordering or manual bank-transfer payments until the outstanding payment, inventory, access-control, domain, and end-to-end testing issues are resolved.

## Existing architecture

- Customer-facing Cloudflare Worker: `fryzar-app`
- Admin-facing Cloudflare Worker: `fryzar-admin`
- Cloudflare D1 database: `fryzar-production`
- D1 binding used by both Workers: `DB`
- Intended languages: Urdu and English
- Intended currency: PKR

## Repository layout

The source-recovery work will organize the project into these areas:

```text
fryzar/
├── apps/
│   ├── customer-worker/
│   └── admin-worker/
├── database/
│   ├── migrations/
│   └── docs/
├── docs/
│   ├── architecture/
│   ├── audits/
│   ├── operations/
│   └── recovery/
├── tests/
├── .gitignore
└── README.md
```

This is the planned layout, not a claim that those source files have already been recovered.

## Critical known issues from the initial audit

1. Manual-transfer checkout does not create the payment record required by the admin verification workflow. Keep manual transfer disabled until the end-to-end workflow is implemented and tested.
2. Cancelling an order does not restore reserved stock.
3. The backend idempotency key is optional, allowing duplicate orders on retries without a key.
4. Admin order-list access lacks the required role-specific restriction for sensitive customer order data.
5. Admin login has no demonstrated failed-login throttling.
6. Customer delivery-fee display uses a hard-coded value rather than the database setting.
7. Product image URLs and the store WhatsApp number are not populated.
8. The production zone has not yet been configured with verified Worker custom-domain routes.
9. The Android application source and build status have not yet been established.

See the audit notes as they are added under `docs/audits/`.

## Security rules

- Never commit API tokens, passwords, session secrets, bootstrap tokens, private keys, customer personal data, payment proofs, or production database exports.
- Use Cloudflare secrets or an approved secret manager for runtime credentials.
- Keep this repository private.
- Review every recovered file for embedded credentials and sensitive data before committing it.

## Recovery and development principles

1. Preserve the existing production deployment and database while source recovery is in progress.
2. Recover source files and database schema/migrations before making application changes.
3. Keep a sanitized, reproducible record of the deployed configuration. Do not store secret values.
4. Make fixes in version control and validate them in a non-production environment before production deployment.
5. Do not claim production readiness until customer, admin, inventory, payment, security, localization, and domain tests pass.

## License

No open-source license has been selected. All rights remain reserved by the project owner unless a license is added.
