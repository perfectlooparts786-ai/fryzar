# FRYZAR Ad Placement Map

**Last updated:** 7 November 2026  
**Source of truth:** `apps/storefront/src/ads/adPlacementMap.ts` and `apps/api/migrations/0009_platform_completion.sql`

## 1. Approved Storefront Placements

Every placement requires:
- `masterEnabled === true`
- Environment gate (`previewEnabled === true` in preview, or `productionApproved === true` in production)
- Page-category toggle enabled
- Device toggle (`mobile` / `desktop`) enabled
- Session impression count below `frequencyCapPerSession` (default `4`)
- Verified `publisher_zone_id` and `https://` `script_origin`

| Slot Key | Allowed Route(s) | Format | Desktop Max Size | Mobile Max Size | Position & UX Guardrail |
|---|---|---|---|---|---|
| `home_below_fold` | `/` (Home) | `banner` | `728×90` | `320×50` | Rendered strictly **below** the hero banner and featured menu grid; never pushes food items below the first viewport fold. |
| `categories_inline` | `/categories` | `banner` | `728×90` | `320×50` | Positioned below the category directory cards, separated by generous whitespace and `"Sponsored"` label. |
| `products_grid_break` | `/products`, `/search` | `nativeBanner` | Fluid card | Fluid card | Appears after the main product catalogue grid; never impersonates an `Add to basket` food card. |
| `product_detail_below` | `/products/:slug` | `banner` | `728×90` | `320×50` | Placed below full product description, variants, modifier groups, and primary `Add to basket` CTA. |
| `promotions_sponsor_card` | `/promotions` | `nativeBanner` | Fluid card | Fluid card | Placed below FRYZAR's own store coupon cards (` promo-grid `) with explicit bilingual sponsor disclosure. |
| `editorial_in_article` | `/guides/:slug` | `nativeBanner` | Fluid card | Fluid card | Placed once after the opening paragraph of long-form culinary/storage guides. |
| `editorial_footer` | `/guides`, `/guides/:slug` | `banner` | `728×90` | `320×50` | Placed at the bottom of the editorial guide index or article reader. |

## 2. Density & Viewport Rules

1. **Maximum 1 ad unit visible per mobile viewport** (`375×812`).
2. **Maximum 2 ad units per page** on content-rich editorial guides; **maximum 1 ad unit** on catalogue browsing pages.
3. **Zero sticky bottom bars overlapping the mobile Basket CTA** (`SocialBarController` is disabled by default and suppressed whenever cart items exist or checkout modals open).
4. **Bilingual Labelling:** Every rendered `AdSlot` displays `"Sponsored"` in English (`dir="ltr"`) and `"اشتہار"` in Urdu (`dir="rtl"`).

## 3. Zero-Ad Zones (100% Excluded)

| Route | Reason |
|---|---|
| `/basket` | Active purchase intent — zero distraction |
| `/checkout` | Customer address, zone selection, coupon application, and COD submission |
| `/order-confirmation` | Order number and private 64-hex tracking link |
| `/track`, `/track/:token` | Live kitchen/rider fulfilment tracking |
| `/support` | Customer issue resolution and support ticket submission |
| `/about` | Brand story and operational transparency |
| `/privacy-policy`, `/terms`, `/refund-policy`, `/delivery-policy` | Legal & compliance disclosures |
| `fryzar-admin*` | Internal staff and owner operations |
