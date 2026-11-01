# Exact Cloudflare Worker source snapshots

Captured: 1 November 2026
Repository: `perfectlooparts786-ai/fryzar`
Source branch: `recovery/cloudflare-worker-source-2026-11-01`
Cloudflare account ID: `234b20e49261c7a002f63b129e985563`

## Purpose and preservation rule

These files are the module bodies returned by the Cloudflare Workers script-download endpoint for the exact named scripts below. They are **archival snapshots of the deployed Workers at capture time**, not a replacement implementation and not a claim that these snapshots match `foundation/fresh-build`.

Each endpoint response contained one module. The multipart boundary and MIME headers were transport framing; the module body was extracted without editing its source text. SHA-256 values below are computed over the UTF-8 module body, excluding multipart framing. No application logic was changed.

## Source inventory and deployment provenance

| Worker | Module path in this archive | Bytes | SHA-256 | Active deployment ID | Active version ID | Compatibility date |
| --- | --- | ---: | --- | --- | --- | --- |
| `fryzar-app` | `fryzar-app/worker.js` | 35815 | `9f8f5942ae7faf6465a9c47fdc3eaa453cea789139e51ea76ff1cb0bc6518b62` | `5d0bd0ca-ac43-4e05-90cc-80b3a47c2369` | `91fdf9ab-ae00-4928-b5be-a1a356cc0f19` | `2026-10-31` |
| `fryzar-admin` | `fryzar-admin/worker.js` | 32446 | `8001452a83f3e75fc410be8e496e86dfbf9cbde53c925ff545fc9bd3b4e1765b` | `584319a5-154d-4b82-80f4-f8ec0da520e5` | `80b357d6-e6ea-49a7-a6bb-0802f7b88084` | `2026-10-31` |
| `fryzar-api` | `fryzar-api/index.js` | 22511 | `58a4162ee81a221acf478e170b68a15d4e6342182ee9f68de0e23718546ac51b` | `9faa976e-e399-46c3-9cd6-e01190d101e7` | `c0f0ecf8-97ef-4768-a947-f3f56be0df8e` | `2026-11-01` |

The inventory at capture time showed the latest deployment for each named Worker serving 100% of traffic. These are Cloudflare deployment/version identifiers; the original Workers had no Git commit provenance in the prior repository.

## Runtime bindings and settings

Secret values are intentionally excluded. Only binding names and non-secret values are recorded.

| Worker | Binding / setting | Observed type and target |
| --- | --- | --- |
| `fryzar-app` | `DB` | D1 → `fryzar-production` |
| `fryzar-admin` | `DB` | D1 → `fryzar-production` |
| `fryzar-admin` | `ADMIN_BOOTSTRAP_TOKEN` | secret_text binding; value not retrieved |
| `fryzar-admin` | `SESSION_SECRET` | secret_text binding; value not retrieved |
| `fryzar-api` | `DB` | D1 → `fryzar-core` |
| `fryzar-api` | `TRACKING_SECRET` | secret_text binding; value not retrieved |
| `fryzar-api` | `APP_ENV` | plain_text = `development` |
| `fryzar-api` | `ALLOWED_ORIGINS` | plain_text = `http://localhost:5173,http://127.0.0.1:5173` |

All three Workers had their `workers.dev` subdomain enabled and previews disabled. The `fryzar.com` zone had one apex TXT record and no Worker routes or Worker custom domains were returned. No DNS or route changes were made.

## Static source scan

A lightweight pattern scan was run against all three extracted module bodies before committing:

- No private-key markers, common provider-token patterns, credential-bearing URLs, or secret/password/token-like hardcoded string declarations were detected.
- No sensitive-context `console.*` logging pattern was detected.
- `fryzar-app/worker.js` contains wildcard CORS at line 2 (`Access-Control-Allow-Origin: *`). This requires source-level review and a controlled origin policy before public production use.
- No wildcard-CORS pattern was detected in the extracted admin or API modules.

This is a targeted static pattern scan, not a full security review or proof that credentials cannot be hidden/obfuscated. Cloudflare secret values were never retrieved.

## Verification and restrictions

1. The extracted files were committed as immutable recovery snapshots. They must not be edited in place.
2. Do not deploy these snapshots as a new release without a separate source review, environment/binding review, test plan, preview verification, and approval for production-impacting changes.
3. Compare these snapshots with `foundation/fresh-build` separately. Development source must not be assumed to be byte-for-byte equivalent.
4. The current runtime has a split D1 arrangement: customer/admin use `fryzar-production`; API uses `fryzar-core`. Do not rebind or migrate either database based only on these source files.
5. No Worker, D1 schema/data, DNS, route, or secret was changed during source retrieval.
6. External HTTP smoke tests remain unverified: the available web reader and network execution environment could not open/resolve the workers.dev hostnames. That limitation is not evidence that the endpoints are down.
