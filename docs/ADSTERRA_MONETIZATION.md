# FRYZAR Adsterra Monetization Architecture

**Last updated:** 7 November 2026  
**Branch:** `feature/fryzar-master-transformation`  
**Default state:** `masterEnabled = false` (Safely Disabled until real verified Adsterra publisher zone IDs are supplied by the Owner)

## 1. Design Principles

FRYZAR integrates Adsterra publisher monetization as an optional, secondary revenue channel alongside primary food and grocery ordering. Ordering conversion, layout stability, customer privacy, and brand safety take precedence over ad impressions at all times.

1. **Zero Fake Zone IDs or Fabricated Revenue:** All ad slots ship disabled (`is_enabled = 0`, empty `publisher_zone_id`, empty `script_origin`). The Admin Monetization Control Center never simulates revenue or displays placeholder ad networks.
2. **Async Non-Blocking Isolation:** Ad scripts load asynchronously inside bounded containers (`apps/storefront/src/ads/adLoader.ts`) with a configurable timeout (`loadTimeoutMs`, default `4500ms`) so slow or blocked ad networks never delay catalogue rendering or React hydration.
3. **Zero CLS (Cumulative Layout Shift):** Slots reserve bounded dimensions only when active and cleanly collapse (`collapseOnEmpty: true`) when disabled, unconfigured, timed out, or blocked by browser content blockers.
4. **Owner-Only Governance + Instant Emergency Kill Switch:** Only the authenticated `owner` role can modify monetization settings or activate zones. `POST /api/v1/admin/advertising/kill-switch` atomically disables `masterEnabled`, `previewEnabled`, and every row in `ad_zones` in a single D1 batch.

## 2. Modular Frontend Architecture (`apps/storefront/src/ads/`)

| File | Responsibility |
|---|---|
| `adConfig.ts` | Canonical TypeScript interfaces (`MonetizationConfig`, `AdZonePublic`), safe disabled default config, and payload normalization between `/api/v1/monetization-config` and UI components. |
| `adRules.ts` | Route, device, frequency-cap, consent, and page-category eligibility evaluator (`canRenderPlacement`). Hard-blocks restricted transactional and legal routes. |
| `adPlacementMap.ts` | Declarative registry of the 6 approved brand-safe slots (`home_below_fold`, `categories_inline`, `products_grid_break`, `product_detail_below`, `promotions_sponsor_card`, `editorial_in_article`, `editorial_footer`). |
| `adSafety.ts` | Validates HTTPS script origins against approved publisher domains, blocks `javascript:` / `data:` URIs, strips `document.write`, and enforces `sandbox` / `referrerPolicy="no-referrer-when-downgrade"` boundaries. |
| `adConsent.ts` | Region-aware consent state manager (`fryzar-ad-consent` in `localStorage`) supporting EEA/UK consent gating before loading third-party ad tags. |
| `adLoader.ts` | Asynchronous script injector with deterministic timeout cleanup and error capture. |
| `adPerformance.ts` | Lightweight, PII-free telemetry dispatcher (`POST /api/v1/monetization/events` / `/api/v1/ad-events`) recording slot load latency, timeouts, and script failures. |
| `AdSlot.tsx` | Core accessible wrapper rendering bilingual `"Sponsored" / "اشتہار"` disclosure badges, enforcing rules, and collapsing cleanly when inactive. |
| `BannerAd.tsx` | Responsive standard display banner (`728x90` desktop / `320x50` mobile) wrapper. |
| `NativeBannerAd.tsx` | Editorial and catalogue feed native card wrapper styled to match FRYZAR typography while clearly labelled as sponsored. |
| `SocialBarController.tsx` | Strictly opt-in non-blocking floating notification controller, disabled by default and permanently suppressed on basket/checkout/tracking routes. |
| `SmartlinkButton.tsx` | Explicit user-initiated outbound sponsor button (`rel="sponsored noopener noreferrer"`), disabled by default. |

## 3. Backend Schema & API Endpoints

Defined in `apps/api/migrations/0009_platform_completion.sql` and `apps/api/src/platform-modules.ts`:

- **Tables:** `ad_zones`, `ad_performance_daily`, `ad_events`
- **Public Endpoints:**
  - `GET /api/v1/monetization-config` — Returns sanitized public config and enabled zones only.
  - `POST /api/v1/monetization/events` (alias `/api/v1/ad-events`) — Records anonymous slot health telemetry; strictly rejects payloads containing `phone`, `email`, `address`, `name`, `token`, or `cookie` keys (`HTTP 400 pii_rejected_in_telemetry`).
- **Owner Admin Endpoints (`owner` role + exact `Origin` required for writes):**
  - `GET /api/v1/admin/advertising/overview` — Full 12-control configuration, format registry, restricted-page list, blocked categories, zones, imported performance reports, telemetry summary, and audit log history.
  - `PATCH /api/v1/admin/advertising/config` — Updates master switch, preview toggle, consent regions, frequency cap, timeout, device toggles, page toggles, and safety flags. Rejects prohibited intrusive formats (`popunder`, `interstitial`, `auto_redirect`).
  - `PUT /api/v1/admin/advertising/zones` — Creates or updates an ad zone; refuses `is_enabled = true` unless both a genuine `publisher_zone_id` and valid `https://` `script_origin` are supplied.
  - `POST /api/v1/admin/advertising/kill-switch` — Atomic one-click emergency shutoff.
  - `POST /api/v1/admin/advertising/reports` — Manual owner import of verified daily Adsterra publisher report totals (`impressions`, `clicks`, `revenue_usd_micros`, `estimated_pkr_paisa`).

## 4. Owner Activation Checklist (Post-Launch)

1. Register and verify `fryzar.com` in the official Adsterra Publisher Dashboard.
2. In Adsterra zone settings, disable Adult, Gambling, Dating, Malware/Fake-Download, Crypto-Scam, Political, and Sound-On video categories.
3. Copy the verified HTTPS script host and numeric/alphanumeric `publisher_zone_id` for `Banner` or `Native Banner` units only.
4. Sign in to FRYZAR Admin -> **22. Advertising & Monetization**, configure each slot, test in `previewEnabled` mode first, verify zero layout shift on mobile, and only then enable `productionApproved` + `masterEnabled`.
