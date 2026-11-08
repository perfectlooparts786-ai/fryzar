import type { AdFormat, PageCategory } from "./adConfig";

export const IMMUTABLE_BLOCKED_PAGE_CATEGORIES: ReadonlySet<PageCategory | string> = new Set([
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
]);

export const BLOCKED_PATH_PREFIXES: readonly string[] = [
  "/basket",
  "/checkout",
  "/payment",
  "/order-confirmation",
  "/track",
  "/account",
  "/contact",
  "/support",
  "/privacy",
  "/terms",
  "/refund-policy",
  "/delivery-policy",
  "/admin"
];

export const PROHIBITED_INTRUSIVE_FORMATS: ReadonlySet<string> = new Set([
  "popunder",
  "popup",
  "auto_redirect",
  "forced_click",
  "fake_button",
  "sticky_checkout",
  "autoplay_sound",
  "deceptive_download"
]);

export const ALLOWED_AD_FORMATS: ReadonlySet<AdFormat> = new Set([
  "native_banner",
  "display_banner",
  "in_content",
  "mobile_banner",
  "footer_banner",
  "social_bar"
]);

export function isPageAdSafe(pageCategory: PageCategory | string, pathname: string, extraRestricted: string[] = []): boolean {
  if (IMMUTABLE_BLOCKED_PAGE_CATEGORIES.has(pageCategory)) {
    return false;
  }
  if (extraRestricted.includes(pageCategory)) {
    return false;
  }
  const normalizedPath = (pathname || "/").toLowerCase();
  for (const prefix of BLOCKED_PATH_PREFIXES) {
    if (normalizedPath === prefix || normalizedPath.startsWith(prefix + "/")) {
      return false;
    }
  }
  return true;
}

export function isFormatAdSafe(format: string, socialBarEnabled: boolean): format is AdFormat {
  if (PROHIBITED_INTRUSIVE_FORMATS.has(format)) {
    return false;
  }
  if (!ALLOWED_AD_FORMATS.has(format as AdFormat)) {
    return false;
  }
  if (format === "social_bar" && !socialBarEnabled) {
    return false;
  }
  return true;
}

export function isAllowedScriptOrigin(scriptOrigin: string | null | undefined): boolean {
  if (!scriptOrigin || typeof scriptOrigin !== "string") {
    return false;
  }
  try {
    const parsed = new URL(scriptOrigin);
    if (parsed.protocol !== "https:") return false;
    if (parsed.username || parsed.password) return false;
    // Block localhost or raw IP script origins in ad zones
    if (parsed.hostname === "localhost" || /^[0-9.]+$/.test(parsed.hostname)) return false;
    return parsed.hostname.includes(".");
  } catch {
    return false;
  }
}

export function isValidPublisherZoneId(zoneId: string | null | undefined): boolean {
  if (!zoneId || typeof zoneId !== "string") return false;
  const trimmed = zoneId.trim();
  if (trimmed.length < 4 || trimmed.length > 64) return false;
  if (/^(test|demo|fake|placeholder|0000|example)/i.test(trimmed)) return false;
  return /^[a-zA-Z0-9_-]+$/.test(trimmed);
}
