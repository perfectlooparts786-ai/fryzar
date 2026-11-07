# FRYZAR Ad Placement Map

**Last updated:** 7 November 2026  
**Source of truth:** `apps/storefront/src/ads/adPlacementMap.ts`, `apps/storefront/src/ads/adConfig.ts`, and `apps/api/migrations/0009_platform_completion.sql`

## 1. Approved Storefront Placements (9 Canonical `PlacementKey`s)

Every placement requires:
- `masterEnabled === true` and (`previewEnabled === true` or `productionApproved === true`)
- Route safety (`isPageAdSafe`) and device/language targeting match
- Per-page slot count within `maxAdsPerPage` / `frequencyCapPerSession`
- Verified `publisher_zone_id` and `https://` `script_origin` (or `previewEnabled === true` for zero-network `AdFallback`)

| Canonical `PlacementKey` | Seeded `0009` Alias Mapped | Allowed Route(s) | Default Format | Min CTA Distance | Position & UX Guardrail |
|---|---|---|---|---|---|
| `home_mid_feed` | `home_below_hero`, `home_editorial_mid` | `/` (Home) | `native_banner` (`1120px`) | `48px` | Below featured catalogue grid and above how-it-works section; never pushes hero/menu below fold. |
| `category_footer` | `catalogue_grid_after` | `/categories` | `display_banner` (`728×90`) | `48px` | Footer sponsorship slot below category browse cards. |
| `products_footer` | `catalogue_grid_after` | `/products` | `footer_banner` (`970×90`) | `56px` | Below product listing grid, clear of `Add to basket` buttons. |
| `product_below_related` | — | `/products/:slug` | `native_banner` | `64px` | Below product details, variants, modifiers, and primary CTA. |
| `search_below_results` | — | `/search` | `mobile_banner` / `display_banner` | `48px` | Below search result cards, never above search input. |
| `promotions_sponsor_card` | — | `/promotions` | `native_banner` | `48px` | Below FRYZAR's own verified coupon cards with bilingual `"Sponsored" / "اشتہار"` badge. |
| `editorial_in_article` | `editorial_inline_native` | `/editorial/:slug`, `/guides/:slug` | `in_content` (`760px`) | `40px` | Mid-article sponsorship slot inside long-form culinary/hygiene guides. |
| `editorial_footer` | `editorial_footer_banner` | `/editorial`, `/guides` | `footer_banner` (`970×90`) | `48px` | Footer slot at the bottom of editorial guide index and article pages. |
| `about_footer` | — | `/about` | `display_banner` (`728×90`) | `48px` | Optional brand-safe footer sponsorship on About page. |

## 2. Density & Viewport Rules

1. **Maximum 1 ad unit visible per mobile viewport** (`375×812`).
2. **Per-route cap enforced by `adRegistry.ts`** (`maxAdsPerPage`, default `2`).
3. **Zero sticky bottom bars overlapping the mobile Basket CTA** (`socialBar` is disabled by default).
4. **Bilingual Labelling:** Every rendered `AdSlot` displays `"Sponsored"` in English (`dir="ltr"`) and `"اشتہار"` in Urdu (`dir="rtl"`).

## 3. Zero-Ad Zones (100% Excluded by `isPageAdSafe`)

| Route | Reason |
|---|---|
| `/basket` | Active purchase intent — zero distraction |
| `/checkout` | Customer address, zone selection, coupon application, and COD submission |
| `/order-confirmation` | Order number and private 64-hex tracking link |
| `/track`, `/track/:token` | Live kitchen/rider fulfilment tracking |
| `/support` | Customer issue resolution and support ticket submission |
| `/privacy-policy`, `/terms`, `/refund-policy`, `/delivery-policy` | Legal & compliance disclosures |
| `fryzar-admin*` | Internal staff and owner operations (`X-Robots-Tag: noindex, nofollow, noarchive`) |
