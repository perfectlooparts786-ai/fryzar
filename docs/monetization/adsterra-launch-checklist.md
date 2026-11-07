# FRYZAR — Adsterra Monetization Integration & Launch Checklist

**Document ID:** `ADSTERRA-LAUNCH-CHECKLIST`  
**Framework Technical Status:** `IMPLEMENTED & VERIFIED (100%)`  
**Live Commercial / Publisher Status:** `DISABLED BY DEFAULT — AWAITING OWNER PUBLISHER APPROVAL & REAL ZONE IDS`  
**Revenue / Impressions Fabricated:** `NONE ($0.00 — NOT LIVE)`

---

## 1. Current Truthful State

In strict compliance with operational integrity rules:
- **Adsterra publisher account approval:** **NOT GRANTED YET** (owner action required after `https://fryzar.com` TLS & public storefront go live).
- **Live Adsterra Zone IDs / Script URLs:** **NONE CONFIGURED** (`ad_zones.zone_id` is empty/unconfigured; `is_active = 0` across all 5 slots).
- **Effective Monetization Status (`GET /api/v1/monetization-config`):** `effectiveActive: false`, `enabled: false`, `killSwitch: false`.
- **Browser Script Loading:** Zero external third-party ad network requests are made while `effectiveActive === false`. Empty slots collapse cleanly with zero placeholder boxes and zero Cumulative Layout Shift (CLS).

---

## 2. Implemented Engineering Architecture

| Component | File Path | Verified Capability |
| --- | --- | --- |
| Public & Admin API Contract | `apps/api/src/platform-modules.ts`, `apps/api/migrations/0009_adsterra_monetization_hardening.sql` | Serves `/api/v1/monetization-config`, validates PII-free `/api/v1/ad-events` (`60/1m` rate limit), enforces Owner-only `/api/v1/admin/advertising*` mutations and atomic `/kill-switch`. |
| Placement Registry & Route Guard | `apps/storefront/src/ads/adPlacementMap.ts`, `apps/storefront/src/ads/adSafety.ts` | Hard-blocks ad rendering on `/basket`, `/checkout`, `/order-confirmation` payment steps, `/track`, `/contact`, `/support`, `/privacy`, `/terms`, and all `/admin/*` pages. |
| Format Blocklist | `apps/storefront/src/ads/adsterraFormats.ts` & API validator | Permanently rejects intrusive formats (`popunder`, `popup`, `social_bar`, `push`, `interstitial`, `auto_redirect`, `floating_overlay`) with HTTP `422`. Permits only `banner` and `native` inline cards. |
| Lazy Script Loader & CLS Guard | `apps/storefront/src/ads/adsterraLoader.ts`, `apps/storefront/src/ads/AdSlot.tsx` | IntersectionObserver lazy-loading (`200px` rootMargin), strict `https://` script validation, timeout/ad-blocker graceful collapse (`AdFallback.tsx`), explicit `"Sponsored"` / `"اشتہار"` disclosure badge, and max-per-page cap (`<= 2`). |
| Admin Monetization Console | `apps/admin/src/ExtendedModules.tsx` (`AdvertisingModule`) | Owner-only master switch, one-click **Emergency Kill-Switch**, per-slot Zone ID + HTTPS script editor, placement guard summary, and non-PII event telemetry counters. |

---

## 3. Approved Placement Slots (`5` Configured in D1 `ad_zones`)

| Slot Key (`placement_slot`) | Allowed Storefront Surface | Permitted Format | Current D1 State |
| --- | --- | --- | --- |
| `home_editorial` | Homepage below featured menu & trust section | `native` / `banner` | `is_active = 0` |
| `category_feed` | Category browse page below product grid | `banner` | `is_active = 0` |
| `product_detail_footer` | Product detail page below editorial pairing notes (never near Add-to-Basket CTA) | `native` | `is_active = 0` |
| `editorial_inline` | Food Guides (`/guides`, `/guides/:slug`) inline editorial slot | `native` / `banner` | `is_active = 0` |
| `confirmation_footer` | Optional post-order editorial discovery footer (disabled unless explicitly enabled) | `banner` | `is_active = 0` |

---

## 4. Step-by-Step Post-Launch Activation Checklist (Owner Workflow)

Do **not** apply to Adsterra until `https://fryzar.com` is live with real menu items, legal pages (`/privacy`, `/terms`, `/refund-policy`, `/about`, `/contact`), and published Food Guides (`/guides`):

1. **Complete Domain & Production Storefront Cutover** (`docs/production/05-domain-and-cloudflare-runbook.md` & `07-release-runbook.md`) so Adsterra reviewers can inspect `https://fryzar.com` over valid HTTPS.
2. **Verify Privacy & Cookie Disclosure:** Confirm `/privacy` and `/cookies` reflect FRYZAR's verified business contact email and cookie/advertising disclosure.
3. **Submit `https://fryzar.com` in Adsterra Publisher Dashboard:**
   - Request **ONLY** standard **Banner** (`300x250` / `728x90`) or **Native Banner** units.
   - **NEVER** request or paste Popunder, Social Bar, Direct Link, Interstitial, or Web Push tags (both the API and Storefront will block them to protect food-ordering conversion).
4. **Configure Approved Zone IDs in FRYZAR Admin (`https://admin.fryzar.com`):**
   - Sign in as `owner`.
   - Open **Adsterra Monetization**.
   - For each approved placement slot (start with `editorial_inline` on `/guides` first), enter the real Adsterra `zone_id` and `https://...` invoke script URL, set `is_active = true`, and save.
   - Toggle **Enable Monetization (`adsterra_enabled = true`)** and verify `kill_switch = false`.
5. **Post-Activation Smoke & UX Check:**
   - Open `/guides` in desktop and mobile viewports: confirm `"Sponsored"` badge renders, CLS remains `< 0.05`, and ad blocker simulation collapses cleanly without blank gaps.
   - Open `/basket`, `/checkout`, and `/track`: confirm **zero** ad slots or external ad network scripts execute.
   - Test **Emergency Kill-Switch** readiness if any creative degrades page speed or brand trust.
