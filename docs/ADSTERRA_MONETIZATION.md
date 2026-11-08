# FRYZAR Adsterra Monetization Architecture

**Last updated:** 7 November 2026  
**Branch:** `feature/fryzar-preview-acceptance`  
**Default state:** `masterEnabled = false`, `effectiveActive = false`, `$0.00` verified revenue (Safely Disabled until real verified Adsterra publisher zone IDs are supplied by the Owner)

## 1. Design Principles

FRYZAR integrates Adsterra publisher monetization as an optional, secondary revenue channel alongside primary food and grocery ordering. Ordering conversion, layout stability, customer privacy, and brand safety take precedence over ad impressions at all times.

1. **Zero Fake Zone IDs or Fabricated Revenue:** All ad slots ship disabled (`is_enabled = 0`, empty `publisher_zone_id`, empty `script_origin`, `$0.00` reported revenue). The Admin Monetization Control Center never simulates revenue or loads third-party scripts until verified credentials are saved.
2. **Async Non-Blocking Isolation & Duplicate Guard:** Ad scripts load asynchronously inside bounded containers (`apps/storefront/src/ads/adsterraLoader.ts`) with a configurable timeout (`loadTimeoutMs`, default `4500ms`), `data-fryzar-zone-id` duplicate-script guard, and unmount DOM cleanup in `AdSlot.tsx`.
3. **Zero CLS (Cumulative Layout Shift):** Slots reserve bounded dimensions only when active and cleanly collapse (`status = "collapsed"`) when disabled, unconfigured, timed out, or blocked by browser content blockers.
4. **Owner-Only Governance + Instant Emergency Kill Switch:** Only the authenticated `owner` role can modify monetization settings or activate zones. `POST /api/v1/admin/advertising/kill-switch` atomically disables `masterEnabled`, `previewEnabled`, and every row in `ad_zones` in a single D1 batch.

## 2. Modular Frontend Architecture (`apps/storefront/src/ads/` — Exact 12 Files)

| File | Responsibility |
|---|---|
| `adConfig.ts` | Canonical runtime types (`MonetizationRuntimeConfig`, `AdZoneDefinition`), safe disabled defaults, `MonetizationConfig` contract normalization, and alias mapping between seeded `0009` `placement_slot` values and canonical `PlacementKey`s. |
| `adSafety.ts` | Enforces restricted transactional/policy page exclusions (`isPageAdSafe`), blocks intrusive formats (`popunder`, `interstitial`, `auto_redirect`), and validates `publisher_zone_id` + HTTPS `script_origin`. |
| `adConsent.ts` | Consent state manager (`fryzar-ad-consent` in `localStorage`) supporting consent-gated script loading (`consentRequiredRegions`). |
| `adRegistry.ts` | Per-route active slot registry (`tryRegisterAdSlot`, `unregisterAdSlot`) enforcing `maxAdsPerPage` / `frequencyCapPerSession` and viewport class detection (`detectDeviceClass`). |
| `adsterraFormats.ts` | Dimension (`minHeightPx`, `maxWidthPx`) and bilingual disclosure (`"Sponsored"` / `"اشتہار"`) specifications for approved formats (`native_banner`, `display_banner`, `in_content`, `mobile_banner`, `footer_banner`, `social_bar`). |
| `adPlacementMap.ts` | Declarative registry of the **9 canonical brand-safe `PlacementKey`s** (`home_mid_feed`, `category_footer`, `products_footer`, `product_below_related`, `search_below_results`, `promotions_sponsor_card`, `editorial_in_article`, `editorial_footer`, `about_footer`) and minimum CTA distance rules (`48–64px`). |
| `adsterraLoader.ts` | Sandboxed asynchronous script injector with `4500ms` timeout, HTTPS origin check, and `data-fryzar-zone-id` duplicate-injection guard. |
| `adPerformance.ts` | IntersectionObserver lazy-viewport trigger (`observeNearViewport`) and PII-free telemetry dispatcher (`POST /api/v1/ad-events`). |
| `AdFallback.tsx` | Safe zero-network visual placeholder (`[data-ad-preview]`) rendered exclusively when Owner `previewEnabled` test mode is active. |
| `AdSlot.tsx` | Core accessible slot component enforcing route safety, consent, per-page caps, lazy viewport observation, bilingual disclosure badges, and clean DOM teardown on route change. |
| `BannerAd.tsx` | Standard display/footer banner wrapper around `AdSlot`. |
| `NativeAd.tsx` | Editorial and catalogue feed native banner wrapper around `AdSlot`. |

## 3. Backend Schema & API Endpoints

Defined in `apps/api/migrations/0009_platform_completion.sql` and `apps/api/src/platform-modules.ts`:

- **Tables:** `monetization_settings`, `ad_zones`, `ad_performance_reports`, `ad_events`
- **Public Endpoints:**
  - `GET /api/v1/monetization-config` — Returns complete `MonetizationConfig` (`devices`, `pages`, `formats`, `safety`, `placements`), active zones, and `restricted_pages`.
  - `POST /api/v1/ad-events` — Records anonymous slot health telemetry; strictly rejects payloads containing `phone`, `email`, `address`, `name`, `token`, `session`, or `cookie` keys (`HTTP 400`).
- **Owner Admin Endpoints (`owner` role + exact `Origin` required for writes):**
  - `GET /api/v1/admin/advertising/overview` — Complete configuration, zones, imported `ad_performance_reports`, telemetry summary, and audit history.
  - `PATCH /api/v1/admin/advertising/config` — Updates master switch, preview toggle, consent regions, frequency cap, timeout, device toggles, page toggles, and safety flags. Rejects prohibited intrusive formats (`popunder`, `interstitial`, `smartlink`).
  - `PUT /api/v1/admin/advertising/zones/:id` — Updates zone `placement_slot`, format, `publisher_zone_id`, `script_origin`, and `active`; refuses activation unless genuine `publisher_zone_id` and valid `https://` `script_origin` are supplied.
  - `POST /api/v1/admin/advertising/kill-switch` — Atomic one-click emergency shutoff.
  - `POST /api/v1/admin/advertising/reports` — Manual owner import of verified daily Adsterra publisher report totals (`impressions`, `clicks`, `revenue_usd_cents`, `revenue_pkr_paisa`).

## 4. Owner Activation Checklist (Post-Launch)

1. Register and verify `fryzar.com` in the official Adsterra Publisher Dashboard.
2. In Adsterra zone settings, disable Adult, Gambling, Dating, Malware/Fake-Download, Crypto-Scam, Political, and Sound-On video categories.
3. Copy the verified HTTPS script host and numeric/alphanumeric `publisher_zone_id` for `Banner` or `Native Banner` units only.
4. Sign in to FRYZAR Admin -> **22. Advertising & Monetization**, configure each slot, test in `previewEnabled` mode first, verify zero layout shift on mobile, and only then enable `productionApproved` + `masterEnabled`.
