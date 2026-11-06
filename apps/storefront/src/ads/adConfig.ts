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

export function normalizeMonetizationConfig(raw: unknown): MonetizationRuntimeConfig {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_MONETIZATION_CONFIG;
  }
  const record = raw as Record<string, unknown>;
  const mon = (record.monetization && typeof record.monetization === "object"
    ? record.monetization
    : record) as Record<string, unknown>;

  const formatsObj = (mon.formats && typeof mon.formats === "object"
    ? mon.formats
    : {}) as Record<string, unknown>;

  const masterEnabled = mon.effectiveActive === true || mon.master_enabled === true || (mon.masterEnabled === true && mon.previewEnabled === true);
  const previewTestMode = mon.previewEnabled === true || record.preview_test_mode === true;
  const socialBarEnabled = formatsObj.socialBar === true || record.social_bar_enabled === true;

  const zonesRaw = Array.isArray(record.zones) ? record.zones : [];
  const zones: AdZoneDefinition[] = zonesRaw
    .filter((z): z is Record<string, unknown> => Boolean(z && typeof z === "object"))
    .map((z) => ({
      id: String(z.id ?? z.zone_key ?? ""),
      placement_key: String(z.placement_key ?? z.placement_slot ?? z.zone_key ?? ""),
      name: String(z.name ?? z.zone_key ?? ""),
      format: mapBackendFormat(z.format),
      page_type: String(z.page_type ?? ""),
      device_target: (z.device_target === "desktop" || z.device_target === "mobile") ? z.device_target : "all",
      language_target: (z.language_target === "en" || z.language_target === "ur") ? z.language_target : "all",
      publisher_zone_id: typeof z.publisher_zone_id === "string" && z.publisher_zone_id.trim() ? z.publisher_zone_id.trim() : null,
      script_origin: typeof z.script_origin === "string" && z.script_origin.trim() ? z.script_origin.trim() : null,
      max_per_page: typeof z.max_per_page === "number" ? Math.max(1, Math.min(4, z.max_per_page)) : 1,
      lazy_load: z.lazy_load !== 0 && z.lazy_load !== false,
      refresh_seconds: typeof z.refresh_seconds === "number" ? Math.max(0, z.refresh_seconds) : 0
    }));

  const extraRestricted = Array.isArray(record.restricted_pages)
    ? record.restricted_pages.map(String)
    : Array.isArray(record.restricted_page_types)
      ? record.restricted_page_types.map(String)
      : [];

  return {
    masterEnabled,
    consentRequired: record.consent_required === true,
    previewTestMode,
    socialBarEnabled,
    maxAdsPerPage: typeof record.max_ads_per_page === "number"
      ? Math.max(0, Math.min(4, record.max_ads_per_page))
      : 2,
    restrictedPageTypes: Array.from(new Set([...DEFAULT_MONETIZATION_CONFIG.restrictedPageTypes, ...extraRestricted])),
    zones
  };
}
