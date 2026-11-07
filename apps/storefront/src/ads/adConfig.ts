export type AdFormat =
  | "native_banner"
  | "display_banner"
  | "in_content"
  | "mobile_banner"
  | "footer_banner"
  | "social_bar";

export type PageCategory =
  | "home"
  | "categories"
  | "products"
  | "product-detail"
  | "search"
  | "promotions"
  | "editorial-list"
  | "editorial-detail"
  | "about"
  | "basket"
  | "checkout"
  | "payment"
  | "order-confirmation"
  | "order-tracking"
  | "account"
  | "support"
  | "privacy-policy"
  | "terms"
  | "refund-policy"
  | "delivery-policy"
  | "admin"
  | "kitchen"
  | "finance";

export interface AdZoneDefinition {
  id: string;
  placement_key: string;
  name: string;
  format: AdFormat;
  page_type: string;
  device_target: "all" | "desktop" | "mobile";
  language_target: "all" | "en" | "ur";
  publisher_zone_id: string | null;
  script_origin: string | null;
  max_per_page: number;
  lazy_load: number | boolean;
  refresh_seconds: number;
}

export interface MonetizationRuntimeConfig {
  masterEnabled: boolean;
  consentRequired: boolean;
  previewTestMode: boolean;
  socialBarEnabled: boolean;
  maxAdsPerPage: number;
  restrictedPageTypes: string[];
  zones: AdZoneDefinition[];
}

export const DEFAULT_MONETIZATION_CONFIG: MonetizationRuntimeConfig = {
  masterEnabled: false,
  consentRequired: false,
  previewTestMode: false,
  socialBarEnabled: false,
  maxAdsPerPage: 2,
  restrictedPageTypes: [
    "basket",
    "checkout",
    "payment",
    "order-confirmation",
    "order-tracking",
    "account",
    "support",
    "admin",
    "kitchen",
    "finance",
    "privacy-policy",
    "terms",
    "refund-policy",
    "delivery-policy"
  ],
  zones: []
};

function mapBackendFormat(fmt: unknown): AdFormat {
  const s = String(fmt ?? "").toLowerCase();
  if (s === "banner" || s === "display_banner") return "display_banner";
  if (s === "native" || s === "native_banner") return "native_banner";
  if (s === "socialbar" || s === "social_bar") return "social_bar";
  if (s === "in_content") return "in_content";
  if (s === "mobile_banner") return "mobile_banner";
  if (s === "footer_banner") return "footer_banner";
  return "native_banner";
}

function mapPlacementKeyAliases(rawKey: string): string[] {
  const key = rawKey.trim();
  switch (key) {
    case "home_below_hero":
    case "home_editorial_mid":
      return ["home_mid_feed"];
    case "catalogue_grid_after":
      return ["products_footer", "category_footer"];
    case "editorial_inline_native":
      return ["editorial_in_article"];
    case "editorial_footer_banner":
      return ["editorial_footer"];
    default:
      return key ? [key] : [];
  }
}

export function normalizeMonetizationConfig(raw: unknown): MonetizationRuntimeConfig {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_MONETIZATION_CONFIG;
  }
  const record = raw as Record<string, unknown>;
  const mon = (
    record.monetization && typeof record.monetization === "object"
      ? record.monetization
      : record.config && typeof record.config === "object"
        ? record.config
        : record
  ) as Record<string, unknown>;

  const formatsObj = (mon.formats && typeof mon.formats === "object"
    ? mon.formats
    : {}) as Record<string, unknown>;

  const masterEnabled =
    mon.effectiveActive === true ||
    mon.master_enabled === true ||
    (mon.masterEnabled === true && mon.previewEnabled === true) ||
    (mon.masterEnabled === true && mon.productionApproved === true);
  const previewTestMode = mon.previewEnabled === true || record.preview_test_mode === true;
  const socialBarEnabled = formatsObj.socialBar === true || record.social_bar_enabled === true;

  const zonesRaw = Array.isArray(record.zones) ? record.zones : [];
  const zones: AdZoneDefinition[] = [];
  for (const z of zonesRaw) {
    if (!z || typeof z !== "object") continue;
    const item = z as Record<string, unknown>;
    const rawSlot = String(item.placement_key ?? item.placement_slot ?? item.zone_key ?? "");
    const mappedKeys = mapPlacementKeyAliases(rawSlot);
    for (const placementKey of mappedKeys) {
      zones.push({
        id: String(item.id ?? item.zone_key ?? placementKey),
        placement_key: placementKey,
        name: String(item.name ?? item.zone_key ?? placementKey),
        format: mapBackendFormat(item.format),
        page_type: String(item.page_type ?? ""),
        device_target: item.device_target === "desktop" || item.device_target === "mobile" ? item.device_target : "all",
        language_target: item.language_target === "en" || item.language_target === "ur" ? item.language_target : "all",
        publisher_zone_id:
          typeof item.publisher_zone_id === "string" && item.publisher_zone_id.trim()
            ? item.publisher_zone_id.trim()
            : null,
        script_origin:
          typeof item.script_origin === "string" && item.script_origin.trim() ? item.script_origin.trim() : null,
        max_per_page: typeof item.max_per_page === "number" ? Math.max(1, Math.min(4, item.max_per_page)) : 1,
        lazy_load: item.lazy_load !== 0 && item.lazy_load !== false,
        refresh_seconds: typeof item.refresh_seconds === "number" ? Math.max(0, item.refresh_seconds) : 0
      });
    }
  }

  const extraRestricted = Array.isArray(record.restricted_pages)
    ? record.restricted_pages.map(String)
    : Array.isArray(record.restricted_page_types)
      ? record.restricted_page_types.map(String)
      : [];

  const maxAdsSource =
    typeof record.max_ads_per_page === "number"
      ? record.max_ads_per_page
      : typeof mon.frequencyCapPerSession === "number"
        ? mon.frequencyCapPerSession
        : 2;

  return {
    masterEnabled,
    consentRequired: record.consent_required === true,
    previewTestMode,
    socialBarEnabled,
    maxAdsPerPage: Math.max(0, Math.min(4, maxAdsSource)),
    restrictedPageTypes: Array.from(new Set([...DEFAULT_MONETIZATION_CONFIG.restrictedPageTypes, ...extraRestricted])),
    zones
  };
}
