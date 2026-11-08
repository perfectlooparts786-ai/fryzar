export type StaffRole =
  | "owner"
  | "manager"
  | "operator"
  | "kitchen"
  | "finance"
  | "rider"
  | "support";

export interface PlatformEnv {
  DB: D1Database;
  APP_ENV?: string;
  ALLOWED_ORIGINS?: string;
  TRACKING_SECRET?: string;
  OWNER_BOOTSTRAP_TOKEN?: string;
  ADSTERRA_SITE_ID?: string;
  ADSTERRA_BANNER_ZONE_ID?: string;
  ADSTERRA_NATIVE_ZONE_ID?: string;
  ADSTERRA_SOCIAL_BAR_ZONE_ID?: string;
  ADSTERRA_INPAGE_PUSH_ZONE_ID?: string;
}

export interface PlatformUser {
  id: string;
  email: string;
  display_name: string;
  role: StaffRole;
}

type JsonRecord = Record<string, unknown>;

export interface MonetizationConfig {
  masterEnabled: boolean;
  provider: "adsterra";
  productionApproved: boolean;
  previewEnabled: boolean;
  siteId: string;
  publisherStatus: "unverified" | "pending_review" | "approved" | "suspended";
  consentRequiredRegions: string[];
  frequencyCapPerSession: number;
  loadTimeoutMs: number;
  formats: {
    banner: boolean;
    native: boolean;
    nativeBanner: boolean;
    socialBar: boolean;
    inPagePush: boolean;
    popunder: boolean;
    interstitial: boolean;
    smartlink: boolean;
  };
  devices: {
    mobile: boolean;
    desktop: boolean;
  };
  pages: {
    home: boolean;
    categories: boolean;
    products: boolean;
    productDetail: boolean;
    promotions: boolean;
    editorial: boolean;
  };
  safety: {
    safeAdsOnly: boolean;
    soundOffOnly: boolean;
    blockAutoRedirects: boolean;
    collapseOnEmpty: boolean;
    restrictedCategoriesBlocked: boolean;
    allowUnknownInventory: boolean;
  };
  placements: {
    home_below_hero: boolean;
    home_editorial_mid: boolean;
    catalogue_grid_after: boolean;
    editorial_inline_native: boolean;
    editorial_footer_banner: boolean;
  };
}

export const DEFAULT_MONETIZATION_CONFIG: MonetizationConfig = {
  masterEnabled: false,
  provider: "adsterra",
  productionApproved: false,
  previewEnabled: false,
  siteId: "",
  publisherStatus: "unverified",
  consentRequiredRegions: ["EEA", "UK"],
  frequencyCapPerSession: 4,
  loadTimeoutMs: 4500,
  formats: {
    banner: false,
    native: false,
    nativeBanner: false,
    socialBar: false,
    inPagePush: false,
    popunder: false,
    interstitial: false,
    smartlink: false
  },
  devices: {
    mobile: true,
    desktop: true
  },
  pages: {
    home: true,
    categories: true,
    products: true,
    productDetail: true,
    promotions: true,
    editorial: true
  },
  safety: {
    safeAdsOnly: true,
    soundOffOnly: true,
    blockAutoRedirects: true,
    collapseOnEmpty: true,
    restrictedCategoriesBlocked: true,
    allowUnknownInventory: false
  },
  placements: {
    home_below_hero: false,
    home_editorial_mid: false,
    catalogue_grid_after: false,
    editorial_inline_native: false,
    editorial_footer_banner: false
  }
};

export const RESTRICTED_AD_PAGES = [
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
] as const;

export const BLOCKED_AD_CATEGORIES = [
  "adult_explicit",
  "gambling_betting",
  "dating_suggestive",
  "illegal_products",
  "dangerous_substances",
  "misleading_financial",
  "deceptive_downloads",
  "malware_suspicious_software",
  "impersonation_phishing",
  "fraudulent_offers",
  "inappropriate_minors"
] as const;

export const ADSTERRA_FORMAT_REGISTRY = [
  {
    key: "banner",
    name: "Banner Ads",
    decision: "eligible",
    treatment: "Primary responsive display format on non-transactional pages",
    hardDisabled: false
  },
  {
    key: "native",
    name: "Native Banners",
    decision: "eligible",
    treatment: "Clearly labelled Sponsored content on editorial and food-guide pages",
    hardDisabled: false
  },
  {
    key: "socialBar",
    name: "Social Bar",
    decision: "restricted_test",
    treatment: "Restricted evaluation on editorial pages only; never near ordering controls",
    hardDisabled: false
  },
  {
    key: "inPagePush",
    name: "In-Page Push",
    decision: "restricted_test",
    treatment: "Restricted evaluation only where non-intrusive; off by default",
    hardDisabled: false
  },
  {
    key: "popunder",
    name: "Popunder",
    decision: "disabled",
    treatment: "Permanently disabled — never hijack ordering or browser windows",
    hardDisabled: true
  },
  {
    key: "interstitial",
    name: "Interstitial",
    decision: "disabled",
    treatment: "Permanently disabled — no full-screen food-ordering interruption",
    hardDisabled: true
  },
  {
    key: "smartlink",
    name: "Smartlink / Direct Link",
    decision: "disabled",
    treatment: "Permanently disabled — never disguise advertisements as navigation",
    hardDisabled: true
  }
] as const;

function json(data: JsonRecord, status = 200, extraHeaders?: HeadersInit): Response {
  const headers = new Headers(extraHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { status, headers });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validSlug(value: string): boolean {
  return value.length >= 2 && value.length <= 120 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function originAllowed(origin: string | null, env: PlatformEnv): boolean {
  if (!origin) return true;
  const allowed = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return allowed.includes(origin);
}

function browserOriginAllowed(request: Request, env: PlatformEnv): boolean {
  const origin = request.headers.get("Origin");
  return Boolean(origin && originAllowed(origin, env));
}

async function parseJsonBody(request: Request, maximumBytes = 24576): Promise<Record<string, unknown> | null> {
  const contentType = (request.headers.get("Content-Type") ?? "").split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") return null;
  const declaredLength = Number(request.headers.get("Content-Length") ?? "0");
  if (declaredLength > maximumBytes) return null;
  try {
    const text = await request.text();
    if (text.length > maximumBytes) return null;
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parseSettingJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

async function sha256HexPlatform(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function consumePlatformRateLimit(
  request: Request,
  env: PlatformEnv,
  scope: string,
  maximum: number,
  windowMs: number
): Promise<boolean> {
  if (env.APP_ENV === "development" || env.APP_ENV === "test") {
    return true;
  }
  const clientIp = request.headers.get("CF-Connecting-IP");
  if (!clientIp) return false;
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const cutoffIso = new Date(now - windowMs).toISOString();
  const ipHash = await sha256HexPlatform(clientIp);
  const bucketKey = scope + ":" + ipHash;
  try {
    const result = await env.DB.prepare(
      "INSERT INTO api_rate_limits (bucket_key, window_started_at, request_count) " +
      "VALUES (?1, ?2, 1) " +
      "ON CONFLICT(bucket_key) DO UPDATE SET " +
      "request_count = CASE WHEN api_rate_limits.window_started_at <= ?3 " +
      "THEN 1 ELSE api_rate_limits.request_count + 1 END, " +
      "window_started_at = CASE WHEN api_rate_limits.window_started_at <= ?3 " +
      "THEN ?2 ELSE api_rate_limits.window_started_at END, " +
      "updated_at = CURRENT_TIMESTAMP RETURNING request_count"
    ).bind(bucketKey, nowIso, cutoffIso).first<{ request_count: number }>();
    return Boolean(result && result.request_count <= maximum);
  } catch {
    return false;
  }
}

export function normalizeMonetizationConfig(raw: unknown): MonetizationConfig {
  const obj = isRecord(raw) ? raw : {};
  const formats = isRecord(obj.formats) ? obj.formats : {};
  const devices = isRecord(obj.devices) ? obj.devices : {};
  const pages = isRecord(obj.pages) ? obj.pages : {};
  const safety = isRecord(obj.safety) ? obj.safety : {};
  const placements = isRecord(obj.placements) ? obj.placements : {};
  const statusRaw = safeString(obj.publisherStatus);
  const publisherStatus: MonetizationConfig["publisherStatus"] =
    statusRaw === "pending_review" || statusRaw === "approved" || statusRaw === "suspended"
      ? statusRaw
      : "unverified";

  const nativeOn = formats.native === true || formats.nativeBanner === true;
  const freqCapRaw = Number(obj.frequencyCapPerSession);
  const frequencyCapPerSession = Number.isInteger(freqCapRaw) ? Math.min(Math.max(freqCapRaw, 1), 12) : 4;
  const timeoutRaw = Number(obj.loadTimeoutMs);
  const loadTimeoutMs = Number.isInteger(timeoutRaw) ? Math.min(Math.max(timeoutRaw, 1000), 10000) : 4500;
  const consentRequiredRegions = Array.isArray(obj.consentRequiredRegions)
    ? obj.consentRequiredRegions.map((r) => safeString(r).toUpperCase()).filter(Boolean).slice(0, 16)
    : ["EEA", "UK"];

  return {
    masterEnabled: obj.masterEnabled === true,
    provider: "adsterra",
    productionApproved: obj.productionApproved === true,
    previewEnabled: obj.previewEnabled === true,
    siteId: safeString(obj.siteId).slice(0, 64),
    publisherStatus,
    consentRequiredRegions,
    frequencyCapPerSession,
    loadTimeoutMs,
    formats: {
      banner: formats.banner === true,
      native: nativeOn,
      nativeBanner: nativeOn,
      socialBar: formats.socialBar === true,
      inPagePush: formats.inPagePush === true,
      // Intrusive formats are strictly prohibited by FRYZAR safety policy
      popunder: false,
      interstitial: false,
      smartlink: false
    },
    devices: {
      mobile: devices.mobile !== false,
      desktop: devices.desktop !== false
    },
    pages: {
      home: pages.home !== false,
      categories: pages.categories !== false,
      products: pages.products !== false,
      productDetail: pages.productDetail !== false,
      promotions: pages.promotions !== false,
      editorial: pages.editorial !== false
    },
    safety: {
      safeAdsOnly: safety.safeAdsOnly !== false,
      soundOffOnly: safety.soundOffOnly !== false,
      blockAutoRedirects: safety.blockAutoRedirects !== false,
      collapseOnEmpty: safety.collapseOnEmpty !== false,
      restrictedCategoriesBlocked: safety.restrictedCategoriesBlocked !== false,
      allowUnknownInventory: false
    },
    placements: {
      home_below_hero: placements.home_below_hero === true,
      home_editorial_mid: placements.home_editorial_mid === true,
      catalogue_grid_after: placements.catalogue_grid_after === true,
      editorial_inline_native: placements.editorial_inline_native === true,
      editorial_footer_banner: placements.editorial_footer_banner === true
    }
  };
}

export function isValidAdScriptOrigin(origin: string): boolean {
  if (!origin) return true;
  if (origin.length > 255) return false;
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "https:") return false;
    if (parsed.pathname !== "/" && parsed.pathname !== "") return false;
    if (parsed.search || parsed.hash || parsed.username || parsed.password) return false;
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(parsed.hostname);
  } catch {
    return false;
  }
}

export async function recordSystemEvent(
  env: PlatformEnv,
  category: "api_error" | "app_error" | "checkout_failure" | "db_failure" | "auth_failure" | "deployment" | "queue_failure" | "ad_error",
  severity: "info" | "warn" | "error" | "critical",
  code: string,
  path = "",
  message = ""
): Promise<void> {
  try {
    await env.DB.prepare(
      "INSERT INTO system_events (id, category, severity, code, path, message, metadata_json) " +
      "VALUES (?1, ?2, ?3, ?4, ?5, ?6, '{}')"
    ).bind(
      crypto.randomUUID(),
      category,
      severity,
      code.slice(0, 80),
      path.slice(0, 160),
      message.slice(0, 240)
    ).run();
  } catch {
    // Observability writes must never crash request handling.
  }
}

async function loadMonetizationConfig(env: PlatformEnv): Promise<MonetizationConfig> {
  try {
    const row = await env.DB.prepare(
      "SELECT config_json FROM monetization_settings WHERE config_key = 'adsterra_config' LIMIT 1"
    ).first<{ config_json: string }>();
    if (!row) return { ...DEFAULT_MONETIZATION_CONFIG };
    const parsed = JSON.parse(row.config_json) as unknown;
    const config = normalizeMonetizationConfig(parsed);
    if (!config.siteId && env.ADSTERRA_SITE_ID) {
      config.siteId = safeString(env.ADSTERRA_SITE_ID).slice(0, 64);
    }
    return config;
  } catch {
    return { ...DEFAULT_MONETIZATION_CONFIG };
  }
}

export async function handlePublicPlatformRoutes(
  request: Request,
  env: PlatformEnv,
  url: URL
): Promise<Response | null> {
  // 1. Dynamic XML Sitemap (search-engine friendly, zero private/tracking URLs)
  if (request.method === "GET" && (url.pathname === "/sitemap.xml" || url.pathname === "/api/v1/seo/sitemap.xml")) {
    const settingsRows = await env.DB.prepare(
      "SELECT setting_key, value_json FROM store_settings WHERE setting_key IN ('canonical_domain', 'robots_index_storefront')"
    ).all<{ setting_key: string; value_json: string }>();
    const map: Record<string, unknown> = {};
    for (const r of settingsRows.results) map[r.setting_key] = parseSettingJson(r.value_json);

    const baseDomain = safeString(map.canonical_domain || "https://fryzar.com").replace(/\/+$/, "");
    const nowDate = new Date().toISOString().slice(0, 10);

    const [categories, products, posts] = await Promise.all([
      env.DB.prepare("SELECT slug, updated_at FROM categories WHERE is_active = 1 ORDER BY sort_order ASC LIMIT 200").all<{ slug: string; updated_at: string }>(),
      env.DB.prepare("SELECT slug, updated_at FROM products WHERE is_available = 1 AND is_archived = 0 ORDER BY sort_order ASC LIMIT 500").all<{ slug: string; updated_at: string }>(),
      env.DB.prepare("SELECT slug, updated_at, published_at FROM editorial_posts WHERE is_published = 1 ORDER BY published_at DESC LIMIT 200").all<{ slug: string; updated_at: string; published_at: string | null }>()
    ]);

    const staticPaths = [
      { path: "/", priority: "1.0", changefreq: "daily" },
      { path: "/categories", priority: "0.9", changefreq: "daily" },
      { path: "/products", priority: "0.9", changefreq: "daily" },
      { path: "/promotions", priority: "0.8", changefreq: "daily" },
      { path: "/guides", priority: "0.8", changefreq: "weekly" },
      { path: "/about", priority: "0.6", changefreq: "monthly" },
      { path: "/contact", priority: "0.6", changefreq: "monthly" },
      { path: "/delivery-policy", priority: "0.5", changefreq: "monthly" },
      { path: "/refund-policy", priority: "0.5", changefreq: "monthly" },
      { path: "/privacy", priority: "0.4", changefreq: "monthly" },
      { path: "/terms", priority: "0.4", changefreq: "monthly" }
    ];

    const entries: string[] = [];
    for (const page of staticPaths) {
      entries.push(
        `  <url>\n    <loc>${escapeXml(baseDomain + page.path)}</loc>\n    <lastmod>${nowDate}</lastmod>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`
      );
    }
    for (const cat of categories.results) {
      const mod = (cat.updated_at || nowDate).slice(0, 10);
      entries.push(
        `  <url>\n    <loc>${escapeXml(baseDomain + "/categories/" + encodeURIComponent(cat.slug))}</loc>\n    <lastmod>${escapeXml(mod)}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`
      );
    }
    for (const prod of products.results) {
      const mod = (prod.updated_at || nowDate).slice(0, 10);
      entries.push(
        `  <url>\n    <loc>${escapeXml(baseDomain + "/products/" + encodeURIComponent(prod.slug))}</loc>\n    <lastmod>${escapeXml(mod)}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`
      );
    }
    for (const post of posts.results) {
      const mod = (post.updated_at || post.published_at || nowDate).slice(0, 10);
      entries.push(
        `  <url>\n    <loc>${escapeXml(baseDomain + "/guides/" + encodeURIComponent(post.slug))}</loc>\n    <lastmod>${escapeXml(mod)}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`
      );
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300"
      }
    });
  }

  // 2. Dynamic robots.txt (protects private, checkout, basket, and tracking paths)
  if (request.method === "GET" && (url.pathname === "/robots.txt" || url.pathname === "/api/v1/seo/robots.txt")) {
    const settingsRows = await env.DB.prepare(
      "SELECT setting_key, value_json FROM store_settings WHERE setting_key IN ('canonical_domain', 'robots_index_storefront')"
    ).all<{ setting_key: string; value_json: string }>();
    const map: Record<string, unknown> = {};
    for (const r of settingsRows.results) map[r.setting_key] = parseSettingJson(r.value_json);

    const baseDomain = safeString(map.canonical_domain || "https://fryzar.com").replace(/\/+$/, "");
    const isPreview = env.APP_ENV === "preview";
    const allowIndex = !isPreview && map.robots_index_storefront !== false;

    const lines = allowIndex
      ? [
          "User-agent: *",
          "Allow: /",
          "Disallow: /api/",
          "Disallow: /admin",
          "Disallow: /basket",
          "Disallow: /checkout",
          "Disallow: /order-confirmation",
          "Disallow: /track",
          "Disallow: /track/",
          `Sitemap: ${baseDomain}/sitemap.xml`
        ]
      : [
          "User-agent: *",
          "Disallow: /",
          `Sitemap: ${baseDomain}/sitemap.xml`
        ];

    return new Response(lines.join("\n") + "\n", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=300"
      }
    });
  }

  // 3. Public Editorial / Food Guides & Recipes endpoints
  if (request.method === "GET" && url.pathname === "/api/v1/editorial") {
    const typeFilter = safeString(url.searchParams.get("type"));
    if (typeFilter && !["article", "recipe", "guide", "announcement", "policy"].includes(typeFilter)) {
      return json({ error: "invalid_content_type" }, 400);
    }
    const rawLimit = Number(url.searchParams.get("limit") ?? "24");
    const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 24;

    const posts = await env.DB.prepare(
      "SELECT id, slug, content_type, title_en, title_ur, summary_en, summary_ur, " +
      "image_url, image_alt_en, image_alt_ur, meta_title_en, meta_title_ur, " +
      "meta_description_en, meta_description_ur, prep_time_mins, cook_time_mins, servings, published_at, updated_at " +
      "FROM editorial_posts WHERE is_published = 1 AND (?1 = '' OR content_type = ?1) " +
      "ORDER BY COALESCE(published_at, created_at) DESC LIMIT ?2"
    ).bind(typeFilter, limit).all<JsonRecord>();

    return json({ posts: posts.results });
  }

  const editorialSlugMatch = url.pathname.match(/^\/api\/v1\/editorial\/([a-z0-9-]+)$/i);
  if (request.method === "GET" && editorialSlugMatch) {
    const slug = editorialSlugMatch[1].toLowerCase();
    const post = await env.DB.prepare(
      "SELECT id, slug, content_type, title_en, title_ur, summary_en, summary_ur, body_en, body_ur, " +
      "image_url, image_alt_en, image_alt_ur, meta_title_en, meta_title_ur, " +
      "meta_description_en, meta_description_ur, prep_time_mins, cook_time_mins, servings, published_at, updated_at " +
      "FROM editorial_posts WHERE slug = ?1 AND is_published = 1 LIMIT 1"
    ).bind(slug).first<JsonRecord>();

    if (!post) return json({ error: "editorial_post_not_found" }, 404);
    return json({ post });
  }

  // 4. Public Active Promotions & Featured Deals
  if (request.method === "GET" && url.pathname === "/api/v1/promotions") {
    const nowIso = new Date().toISOString();
    const [coupons, discountedProducts] = await Promise.all([
      env.DB.prepare(
        "SELECT id, code, discount_type, discount_value, min_order_paisa, max_discount_paisa, expires_at " +
        "FROM coupons WHERE is_active = 1 " +
        "AND (start_at IS NULL OR start_at <= ?1) " +
        "AND (expires_at IS NULL OR expires_at > ?1) " +
        "AND (usage_limit IS NULL OR used_count < usage_limit) " +
        "ORDER BY created_at DESC LIMIT 20"
      ).bind(nowIso).all<JsonRecord>(),
      env.DB.prepare(
        "SELECT p.id, p.slug, p.sku, p.category_id, p.name_ur, p.name_en, p.description_ur, p.description_en, " +
        "p.price_paisa, p.compare_at_paisa, p.image_url, p.is_available, p.is_featured, " +
        "c.slug AS category_slug, c.name_ur AS category_name_ur, c.name_en AS category_name_en " +
        "FROM products p LEFT JOIN categories c ON c.id = p.category_id " +
        "WHERE p.is_available = 1 AND p.is_archived = 0 " +
        "AND p.compare_at_paisa IS NOT NULL AND p.compare_at_paisa > p.price_paisa " +
        "ORDER BY (p.compare_at_paisa - p.price_paisa) DESC LIMIT 24"
      ).all<JsonRecord>()
    ]);

    return json({
      coupons: coupons.results,
      discounted_products: discountedProducts.results,
      currency: "PKR"
    });
  }

  // 5. Public Safe Monetization Config Projection
  if (request.method === "GET" && url.pathname === "/api/v1/monetization-config") {
    const config = await loadMonetizationConfig(env);
    const isPreview = (env.APP_ENV ?? "preview") === "preview";
    const envPermitted = isPreview ? config.previewEnabled : config.productionApproved;
    const active = config.masterEnabled && envPermitted && config.safety.safeAdsOnly;

    let zones: JsonRecord[] = [];
    if (active) {
      const zoneRows = await env.DB.prepare(
        "SELECT zone_key, publisher_zone_id, format, placement_slot, script_origin, width, height " +
        "FROM ad_zones WHERE is_enabled = 1 AND publisher_zone_id != '' AND script_origin != ''"
      ).all<JsonRecord>();
      zones = zoneRows.results.filter((z) => isValidAdScriptOrigin(String(z.script_origin || "")));
    }

    return json({
      monetization: {
        ...config,
        effectiveActive: active
      },
      zones,
      restricted_pages: RESTRICTED_AD_PAGES
    });
  }

  // 6. Zero-PII Ad Performance & Error Telemetry
  if (request.method === "POST" && url.pathname === "/api/v1/ad-events") {
    const rateAllowed = await consumePlatformRateLimit(request, env, "ad-events", 60, 60 * 1000);
    if (!rateAllowed) {
      return json({ error: "rate_limit_exceeded", retry_after_seconds: 60 }, 429, {
        "Retry-After": "60"
      });
    }

    const body = await parseJsonBody(request, 2048);
    if (!body) return json({ error: "invalid_request" }, 400);

    // Strictly reject any payload carrying personal customer fields
    const forbiddenKeys = ["customer_name", "customer_phone", "email", "address", "delivery_address", "cookie", "token"];
    if (Object.keys(body).some((k) => forbiddenKeys.includes(k.toLowerCase()))) {
      return json({ error: "pii_prohibited_in_ad_telemetry" }, 400);
    }

    const slotId = safeString(body.slot_id).slice(0, 64);
    const format = safeString(body.format).slice(0, 32);
    const pageType = safeString(body.page_type).slice(0, 48);
    const eventType = safeString(body.event_type);
    const errorCode = safeString(body.error_code).slice(0, 80);
    const deviceCategory = safeString(body.device_category || "unknown");
    const loadMs = body.load_ms === null || body.load_ms === undefined ? null : Number(body.load_ms);

    if (
      !slotId ||
      !format ||
      !pageType ||
      !["slot_rendered", "script_loaded", "load_error", "blocked_restricted", "blocked_safety", "timeout"].includes(eventType) ||
      !["mobile", "desktop", "tablet", "unknown"].includes(deviceCategory) ||
      (loadMs !== null && (!Number.isSafeInteger(loadMs) || loadMs < 0 || loadMs > 120000))
    ) {
      return json({ error: "validation_failed" }, 400);
    }

    await env.DB.prepare(
      "INSERT INTO ad_events (id, slot_id, format, page_type, event_type, load_ms, error_code, device_category) " +
      "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"
    ).bind(crypto.randomUUID(), slotId, format, pageType, eventType, loadMs, errorCode, deviceCategory).run();

    if (eventType === "load_error" || eventType === "timeout") {
      await recordSystemEvent(env, "ad_error", "warn", errorCode || eventType, pageType, `Ad ${eventType} on ${slotId}`);
    }

    return json({ recorded: true }, 201);
  }

  return null;
}

export async function handleAdminPlatformRoutes(
  request: Request,
  env: PlatformEnv,
  url: URL,
  user: PlatformUser
): Promise<Response | null> {
  const now = new Date().toISOString();

  // 1. Complete Dashboard Overview (Section 5.1 — 22 honest operational metrics + alerts + activity)
  if (request.method === "GET" && url.pathname === "/api/v1/admin/overview") {
    if (!["owner", "manager", "operator", "kitchen", "finance", "support"].includes(user.role)) {
      return json({ error: "insufficient_permissions" }, 403);
    }

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [counts, lowStockProducts, lowStockIngredients, recentActivity, settingsRows, adConfig] = await Promise.all([
      env.DB.prepare(`
        SELECT
          (SELECT COUNT(*) FROM orders) AS total_orders,
          (SELECT COUNT(*) FROM orders WHERE created_at >= ?1) AS new_orders,
          (SELECT COUNT(*) FROM orders WHERE status = 'pending') AS pending_orders,
          (SELECT COUNT(*) FROM orders WHERE status = 'confirmed') AS confirmed_orders,
          (SELECT COUNT(*) FROM orders WHERE status = 'preparing') AS preparing_orders,
          (SELECT COUNT(*) FROM orders WHERE status = 'ready') AS ready_orders,
          (SELECT COUNT(*) FROM orders WHERE status = 'out_for_delivery') AS out_for_delivery_orders,
          (SELECT COUNT(*) FROM orders WHERE status = 'delivered') AS delivered_orders,
          (SELECT COUNT(*) FROM orders WHERE status IN ('cancelled', 'rejected')) AS cancelled_orders,
          (SELECT COALESCE(SUM(total_paisa), 0) FROM orders WHERE status NOT IN ('cancelled', 'rejected')) AS gross_order_value_paisa,
          (SELECT COALESCE(SUM(total_paisa), 0) FROM orders WHERE status = 'delivered') AS delivered_revenue_paisa,
          (SELECT COALESCE(SUM(amount_paisa), 0) FROM payments WHERE status IN ('unpaid', 'awaiting_proof', 'pending_review')) AS pending_payments_paisa,
          (SELECT COALESCE(SUM(amount_paisa), 0) FROM payments WHERE method = 'cod' AND status = 'collected') AS collected_cod_paisa,
          (SELECT COALESCE(SUM(amount_paisa), 0) FROM refunds WHERE status IN ('approved', 'completed')) AS refund_totals_paisa,
          (SELECT COUNT(*) FROM products WHERE is_available = 1 AND is_archived = 0) AS active_products,
          (SELECT COUNT(*) FROM products WHERE is_archived = 0 AND stock_qty IS NOT NULL AND stock_qty = 0) AS out_of_stock_products,
          (SELECT COUNT(*) FROM products WHERE is_archived = 0 AND stock_qty IS NOT NULL AND stock_qty > 0 AND stock_qty <= 5) AS low_stock_products,
          (SELECT COUNT(*) FROM products WHERE is_archived = 1) AS archived_products,
          (SELECT COUNT(*) FROM categories WHERE is_active = 1) AS active_categories,
          (SELECT COUNT(*) FROM delivery_zones WHERE is_active = 1) AS active_delivery_zones,
          (SELECT COUNT(*) FROM support_cases WHERE status IN ('open', 'in_progress')) AS open_support_cases
      `).bind(since24h).first<JsonRecord>(),
      env.DB.prepare(
        "SELECT id, name_en, name_ur, sku, stock_qty FROM products " +
        "WHERE is_archived = 0 AND stock_qty IS NOT NULL AND stock_qty <= 5 ORDER BY stock_qty ASC LIMIT 20"
      ).all<JsonRecord>(),
      env.DB.prepare(
        "SELECT id, name_en, name_ur, unit, stock_qty, reorder_threshold FROM ingredients " +
        "WHERE is_active = 1 AND stock_qty <= reorder_threshold ORDER BY stock_qty ASC LIMIT 20"
      ).all<JsonRecord>(),
      env.DB.prepare(
        "SELECT a.id, a.action, a.entity_type, a.entity_id, a.actor_role, a.created_at, s.display_name AS actor_name " +
        "FROM audit_logs a LEFT JOIN staff_users s ON s.id = a.actor_staff_id " +
        "ORDER BY a.created_at DESC LIMIT 15"
      ).all<JsonRecord>(),
      env.DB.prepare("SELECT setting_key, value_json FROM store_settings WHERE is_public = 1").all<{ setting_key: string; value_json: string }>(),
      loadMonetizationConfig(env)
    ]);

    const settingsMap: Record<string, unknown> = {};
    for (const r of settingsRows.results) settingsMap[r.setting_key] = parseSettingJson(r.value_json);

    const warnings: Array<{ code: string; level: "info" | "warn"; message: string }> = [];
    if (settingsMap.store_status !== "open" || settingsMap.launch_ready !== true) {
      warnings.push({
        code: "store_not_open",
        level: "warn",
        message: `Store status is "${String(settingsMap.store_status ?? "setup")}" (launch_ready=${String(settingsMap.launch_ready ?? false)}). Customer checkout remains protected until opened.`
      });
    }
    if (Number(counts?.active_delivery_zones ?? 0) === 0) {
      warnings.push({
        code: "no_delivery_zones",
        level: "warn",
        message: "No active Pakistani delivery zones configured yet."
      });
    }
    if (Number(counts?.out_of_stock_products ?? 0) > 0) {
      warnings.push({
        code: "out_of_stock_items",
        level: "warn",
        message: `${Number(counts?.out_of_stock_products)} product(s) have zero remaining stock.`
      });
    }
    if (!adConfig.masterEnabled) {
      warnings.push({
        code: "ads_safely_disabled",
        level: "info",
        message: "Adsterra monetization master switch is safely OFF until real publisher zone IDs and domain approval are verified."
      });
    }

    const num = (k: string) => {
      const v = Number(counts?.[k] ?? 0);
      return Number.isSafeInteger(v) && v >= 0 ? v : 0;
    };

    return json({
      overview: {
        total_orders: num("total_orders"),
        new_orders: num("new_orders"),
        pending_orders: num("pending_orders"),
        confirmed_orders: num("confirmed_orders"),
        preparing_orders: num("preparing_orders"),
        ready_orders: num("ready_orders"),
        out_for_delivery_orders: num("out_for_delivery_orders"),
        delivered_orders: num("delivered_orders"),
        cancelled_orders: num("cancelled_orders"),
        gross_order_value_paisa: num("gross_order_value_paisa"),
        delivered_revenue_paisa: num("delivered_revenue_paisa"),
        pending_payments_paisa: num("pending_payments_paisa"),
        collected_cod_paisa: num("collected_cod_paisa"),
        refund_totals_paisa: num("refund_totals_paisa"),
        active_products: num("active_products"),
        out_of_stock_products: num("out_of_stock_products"),
        low_stock_products: num("low_stock_products"),
        archived_products: num("archived_products"),
        active_categories: num("active_categories"),
        active_delivery_zones: num("active_delivery_zones"),
        open_support_cases: num("open_support_cases")
      },
      low_stock_alerts: {
        products: lowStockProducts.results,
        ingredients: lowStockIngredients.results
      },
      recent_activity: (user.role === "owner" || user.role === "manager") ? recentActivity.results : [],
      operational_warnings: warnings
    });
  }

  // 2. Product Archive / Restore / Safe Delete / Images / Linked Modifier Groups
  const archiveMatch = url.pathname.match(/^\/api\/v1\/admin\/products\/([0-9a-f-]{36})\/(archive|restore)$/i);
  if (request.method === "POST" && archiveMatch) {
    if (user.role !== "owner" && user.role !== "manager") return json({ error: "insufficient_permissions" }, 403);
    if (!browserOriginAllowed(request, env)) return json({ error: "origin_not_allowed" }, 403);
    const productId = archiveMatch[1].toLowerCase();
    const action = archiveMatch[2].toLowerCase();
    const isArchived = action === "archive" ? 1 : 0;
    const isAvailable = action === "archive" ? 0 : 1;

    const results = await env.DB.batch([
      env.DB.prepare(
        "UPDATE products SET is_archived = ?1, is_available = ?2, updated_at = ?3 WHERE id = ?4"
      ).bind(isArchived, isAvailable, now, productId),
      env.DB.prepare(
        "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json, created_at) " +
        "SELECT ?1, ?2, ?3, ?4, 'product', id, ?5, ?6 FROM products WHERE id = ?7 AND updated_at = ?6"
      ).bind(
        crypto.randomUUID(),
        user.id,
        user.role,
        action === "archive" ? "product.archived" : "product.restored",
        JSON.stringify({ is_archived: Boolean(isArchived) }),
        now,
        productId
      )
    ]);
    if ((results[0]?.meta?.changes ?? 0) !== 1) return json({ error: "product_not_found" }, 404);
    return json({ updated: true, id: productId, is_archived: Boolean(isArchived) });
  }

  const productDeleteMatch = url.pathname.match(/^\/api\/v1\/admin\/products\/([0-9a-f-]{36})$/i);
  if (request.method === "DELETE" && productDeleteMatch) {
    if (user.role !== "owner") return json({ error: "insufficient_permissions" }, 403);
    if (!browserOriginAllowed(request, env)) return json({ error: "origin_not_allowed" }, 403);
    const productId = productDeleteMatch[1].toLowerCase();

    const refs = await env.DB.prepare(
      "SELECT " +
      "(SELECT COUNT(*) FROM order_items WHERE product_id = ?1) AS order_refs, " +
      "(SELECT COUNT(*) FROM inventory_movements WHERE product_id = ?1) AS movement_refs"
    ).bind(productId).first<{ order_refs: number; movement_refs: number }>();

    if (Number(refs?.order_refs ?? 0) > 0 || Number(refs?.movement_refs ?? 0) > 0) {
      return json({
        error: "product_has_history_archive_instead",
        message: "Products with order or stock history cannot be deleted; archive the product instead."
      }, 409);
    }

    const res = await env.DB.batch([
      env.DB.prepare("DELETE FROM products WHERE id = ?1").bind(productId),
      env.DB.prepare(
        "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json, created_at) " +
        "VALUES (?1, ?2, ?3, 'product.deleted', 'product', ?4, '{}', ?5)"
      ).bind(crypto.randomUUID(), user.id, user.role, productId, now)
    ]);
    if ((res[0]?.meta?.changes ?? 0) !== 1) return json({ error: "product_not_found" }, 404);
    return json({ deleted: true, id: productId });
  }

  const productImagesMatch = url.pathname.match(/^\/api\/v1\/admin\/products\/([0-9a-f-]{36})\/images$/i);
  if (productImagesMatch) {
    const productId = productImagesMatch[1].toLowerCase();
    if (request.method === "GET") {
      if (!["owner", "manager", "operator", "kitchen"].includes(user.role)) return json({ error: "insufficient_permissions" }, 403);
      const images = await env.DB.prepare(
        "SELECT id, product_id, object_key, visibility, alt_ur, alt_en, is_primary, sort_order, created_at " +
        "FROM product_images WHERE product_id = ?1 ORDER BY is_primary DESC, sort_order ASC"
      ).bind(productId).all<JsonRecord>();
      return json({ images: images.results });
    }
    if (request.method === "POST") {
      if (user.role !== "owner" && user.role !== "manager") return json({ error: "insufficient_permissions" }, 403);
      if (!browserOriginAllowed(request, env)) return json({ error: "origin_not_allowed" }, 403);
      const body = await parseJsonBody(request, 8192);
      if (!body) return json({ error: "invalid_request" }, 400);
      const objectKey = safeString(body.object_key);
      const altEn = safeString(body.alt_en);
      const altUr = safeString(body.alt_ur);
      const visibility = body.visibility === "private" ? "private" : "public";
      const isPrimary = body.is_primary === true ? 1 : 0;
      const sortOrder = Number.isInteger(body.sort_order) ? Number(body.sort_order) : 0;
      if (!objectKey || objectKey.length > 2000 || !/^https:\/\//i.test(objectKey)) {
        return json({ error: "validation_failed", message: "HTTPS image URL required" }, 400);
      }
      const imageId = crypto.randomUUID();
      const stmts: D1PreparedStatement[] = [];
      if (isPrimary === 1) {
        stmts.push(env.DB.prepare("UPDATE product_images SET is_primary = 0 WHERE product_id = ?1").bind(productId));
        stmts.push(env.DB.prepare("UPDATE products SET image_url = ?1, updated_at = ?2 WHERE id = ?3").bind(objectKey, now, productId));
      }
      stmts.push(
        env.DB.prepare(
          "INSERT INTO product_images (id, product_id, object_key, visibility, alt_ur, alt_en, is_primary, sort_order, created_at) " +
          "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
        ).bind(imageId, productId, objectKey, visibility, altUr, altEn, isPrimary, sortOrder, now),
        env.DB.prepare(
          "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json, created_at) " +
          "VALUES (?1, ?2, ?3, 'product.image_added', 'product_image', ?4, ?5, ?6)"
        ).bind(crypto.randomUUID(), user.id, user.role, imageId, JSON.stringify({ product_id: productId, visibility, is_primary: Boolean(isPrimary) }), now)
      );
      await env.DB.batch(stmts);
      return json({ saved: true, id: imageId }, 201);
    }
  }

  const singleImageMatch = url.pathname.match(/^\/api\/v1\/admin\/product-images\/([0-9a-f-]{36})$/i);
  if (singleImageMatch) {
    if (user.role !== "owner" && user.role !== "manager") return json({ error: "insufficient_permissions" }, 403);
    if (!browserOriginAllowed(request, env)) return json({ error: "origin_not_allowed" }, 403);
    const imageId = singleImageMatch[1].toLowerCase();
    if (request.method === "PATCH") {
      const body = await parseJsonBody(request, 4096);
      if (!body) return json({ error: "invalid_request" }, 400);
      const visibility = body.visibility === "private" ? "private" : "public";
      const altEn = safeString(body.alt_en);
      const altUr = safeString(body.alt_ur);
      const sortOrder = Number.isInteger(body.sort_order) ? Number(body.sort_order) : 0;
      await env.DB.prepare(
        "UPDATE product_images SET visibility = ?1, alt_en = ?2, alt_ur = ?3, sort_order = ?4 WHERE id = ?5"
      ).bind(visibility, altEn, altUr, sortOrder, imageId).run();
      return json({ updated: true, id: imageId });
    }
    if (request.method === "DELETE") {
      await env.DB.prepare("DELETE FROM product_images WHERE id = ?1").bind(imageId).run();
      return json({ deleted: true, id: imageId });
    }
  }

  const productLinkedGroupsGet = url.pathname.match(/^\/api\/v1\/admin\/products\/([0-9a-f-]{36})\/modifier-groups$/i);
  if (request.method === "GET" && productLinkedGroupsGet) {
    if (!["owner", "manager", "operator", "kitchen"].includes(user.role)) return json({ error: "insufficient_permissions" }, 403);
    const productId = productLinkedGroupsGet[1].toLowerCase();
    const linked = await env.DB.prepare(
      "SELECT pmg.product_id, pmg.group_id, pmg.sort_order, mg.name_en, mg.name_ur, mg.is_required, mg.min_selection, mg.max_selection " +
      "FROM product_modifier_groups pmg JOIN modifier_groups mg ON mg.id = pmg.group_id " +
      "WHERE pmg.product_id = ?1 ORDER BY pmg.sort_order ASC"
    ).bind(productId).all<JsonRecord>();
    return json({ linked_groups: linked.results });
  }

  // 3. Coupon Redemptions History
  if (request.method === "GET" && url.pathname === "/api/v1/admin/coupon-redemptions") {
    if (!["owner", "manager", "finance"].includes(user.role)) return json({ error: "insufficient_permissions" }, 403);
    const couponId = safeString(url.searchParams.get("coupon_id")).toLowerCase();
    const rows = await env.DB.prepare(
      "SELECT cr.id, cr.coupon_id, c.code AS coupon_code, cr.order_id, o.order_number, " +
      "cr.discount_applied_paisa, cr.created_at " +
      "FROM coupon_redemptions cr " +
      "JOIN coupons c ON c.id = cr.coupon_id " +
      "JOIN orders o ON o.id = cr.order_id " +
      "WHERE (?1 = '' OR cr.coupon_id = ?1) " +
      "ORDER BY cr.created_at DESC LIMIT 200"
    ).bind(couponId).all<JsonRecord>();
    return json({ redemptions: rows.results });
  }

  // 4. Customers Directory (Owner & Manager only — protects personal contact details)
  if (request.method === "GET" && url.pathname === "/api/v1/admin/customers") {
    if (user.role !== "owner" && user.role !== "manager") {
      return json({ error: "insufficient_permissions" }, 403);
    }
    const customers = await env.DB.prepare(
      "SELECT customer_phone, MAX(customer_name) AS customer_name, MAX(customer_language) AS preferred_language, " +
      "MAX(delivery_area) AS last_delivery_area, COUNT(*) AS order_count, " +
      "SUM(CASE WHEN status = 'delivered' THEN total_paisa ELSE 0 END) AS delivered_spend_paisa, " +
      "MAX(created_at) AS last_order_at " +
      "FROM orders GROUP BY customer_phone ORDER BY last_order_at DESC LIMIT 250"
    ).all<JsonRecord>();
    return json({ customers: customers.results });
  }

  // 5. Delivery Assignments History & Dispatch Overview
  if (request.method === "GET" && url.pathname === "/api/v1/admin/deliveries") {
    if (!["owner", "manager", "operator", "rider"].includes(user.role)) {
      return json({ error: "insufficient_permissions" }, 403);
    }
    const riderOnlyFilter = user.role === "rider" ? user.id : "";
    const deliveries = await env.DB.prepare(
      "SELECT da.id, da.order_id, o.order_number, o.status AS order_status, o.delivery_area, o.total_paisa, " +
      "da.rider_id, s.display_name AS rider_name, r.vehicle_type, r.vehicle_number, " +
      "da.status, da.failure_reason, da.notes, da.assigned_at, da.picked_up_at, da.delivered_at, da.failed_at " +
      "FROM delivery_assignments da " +
      "JOIN orders o ON o.id = da.order_id " +
      "JOIN riders r ON r.id = da.rider_id " +
      "JOIN staff_users s ON s.id = r.staff_user_id " +
      "WHERE (?1 = '' OR r.staff_user_id = ?1) " +
      "ORDER BY da.assigned_at DESC LIMIT 200"
    ).bind(riderOnlyFilter).all<JsonRecord>();
    return json({ deliveries: deliveries.results });
  }

  // 6. Extended Payments Review, Refunds List/Update & Finance Summary/Reconciliation
  if (request.method === "GET" && url.pathname === "/api/v1/admin/payments/all") {
    if (!["owner", "manager", "finance"].includes(user.role)) return json({ error: "insufficient_permissions" }, 403);
    const [payments, proofs] = await Promise.all([
      env.DB.prepare(
        "SELECT p.id AS payment_id, p.order_id, o.order_number, o.status AS order_status, " +
        "p.method, p.status AS payment_status, p.amount_paisa, p.transaction_reference, " +
        "p.review_note, p.created_at, p.reviewed_at, s.display_name AS reviewer_name " +
        "FROM payments p JOIN orders o ON o.id = p.order_id " +
        "LEFT JOIN staff_users s ON s.id = p.reviewer_staff_id " +
        "ORDER BY p.created_at DESC LIMIT 250"
      ).all<JsonRecord>(),
      env.DB.prepare(
        "SELECT id, payment_id, original_filename, detected_mime_type, file_size_bytes, submitted_at " +
        "FROM payment_proofs ORDER BY submitted_at DESC LIMIT 250"
      ).all<JsonRecord>()
    ]);
    return json({ payments: payments.results, proofs: proofs.results });
  }

  const paymentReviewMatch = url.pathname.match(/^\/api\/v1\/admin\/payments\/([0-9a-f-]{36})\/review$/i);
  if (request.method === "POST" && paymentReviewMatch) {
    if (!["owner", "manager", "finance"].includes(user.role)) return json({ error: "insufficient_permissions" }, 403);
    if (!browserOriginAllowed(request, env)) return json({ error: "origin_not_allowed" }, 403);
    const paymentId = paymentReviewMatch[1].toLowerCase();
    const body = await parseJsonBody(request, 4096);
    if (!body) return json({ error: "invalid_request" }, 400);
    const decision = safeString(body.decision);
    const reviewNote = safeString(body.review_note);
    const txRef = safeString(body.transaction_reference);
    if (decision !== "verified" && decision !== "rejected") {
      return json({ error: "validation_failed" }, 400);
    }

    const payment = await env.DB.prepare(
      "SELECT id, order_id, method, status, amount_paisa FROM payments WHERE id = ?1 LIMIT 1"
    ).bind(paymentId).first<{ id: string; order_id: string; method: string; status: string; amount_paisa: number }>();
    if (!payment) return json({ error: "payment_not_found" }, 404);
    if (payment.method !== "manual_transfer") return json({ error: "not_manual_transfer" }, 409);
    if (payment.status !== "pending_review" && payment.status !== "awaiting_proof") {
      return json({ error: "payment_already_reviewed" }, 409);
    }

    const stmts: D1PreparedStatement[] = [
      env.DB.prepare(
        "UPDATE payments SET status = ?1, transaction_reference = ?2, reviewer_staff_id = ?3, review_note = ?4, reviewed_at = ?5, updated_at = ?5 WHERE id = ?6"
      ).bind(decision, txRef, user.id, reviewNote, now, paymentId),
      env.DB.prepare(
        "UPDATE orders SET payment_status = ?1, updated_at = ?2 WHERE id = ?3"
      ).bind(decision, now, payment.order_id),
      env.DB.prepare(
        "INSERT INTO notifications (id, recipient_type, title_ur, title_en, body_ur, body_en, event_type, related_id, created_at) " +
        "VALUES (?1, 'staff', 'ادائیگی اپ ڈیٹ', 'Payment Updated', ?2, ?3, 'payment_updated', ?4, ?5)"
      ).bind(
        crypto.randomUUID(),
        decision === "verified" ? "دستی ادائیگی کی تصدیق ہو گئی" : "دستی ادائیگی مسترد کر دی گئی",
        `Manual payment ${decision}`,
        payment.order_id,
        now
      ),
      env.DB.prepare(
        "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json, created_at) " +
        "VALUES (?1, ?2, ?3, 'payment.reviewed', 'payment', ?4, ?5, ?6)"
      ).bind(crypto.randomUUID(), user.id, user.role, paymentId, JSON.stringify({ decision, order_id: payment.order_id }), now)
    ];

    if (decision === "verified") {
      stmts.push(
        env.DB.prepare(
          "INSERT INTO financial_ledger (id, entry_type, reference_id, debit_paisa, credit_paisa, actor_staff_id, note, created_at) " +
          "VALUES (?1, 'manual_payment', ?2, ?3, 0, ?4, ?5, ?6)"
        ).bind(crypto.randomUUID(), paymentId, payment.amount_paisa, user.id, "Verified manual transfer", now)
      );
    }

    await env.DB.batch(stmts);
    return json({ reviewed: true, payment_id: paymentId, status: decision });
  }

  if (request.method === "GET" && url.pathname === "/api/v1/admin/refunds") {
    if (!["owner", "manager", "finance"].includes(user.role)) return json({ error: "insufficient_permissions" }, 403);
    const refunds = await env.DB.prepare(
      "SELECT r.id, r.order_id, o.order_number, r.payment_id, r.amount_paisa, r.reason, r.status, " +
      "s.display_name AS reviewer_name, r.created_at, r.updated_at " +
      "FROM refunds r JOIN orders o ON o.id = r.order_id " +
      "LEFT JOIN staff_users s ON s.id = r.reviewer_staff_id " +
      "ORDER BY r.created_at DESC LIMIT 200"
    ).all<JsonRecord>();
    return json({ refunds: refunds.results });
  }

  const refundStatusMatch = url.pathname.match(/^\/api\/v1\/admin\/refunds\/([0-9a-f-]{36})$/i);
  if (request.method === "PATCH" && refundStatusMatch) {
    if (!["owner", "manager", "finance"].includes(user.role)) return json({ error: "insufficient_permissions" }, 403);
    if (!browserOriginAllowed(request, env)) return json({ error: "origin_not_allowed" }, 403);
    const refundId = refundStatusMatch[1].toLowerCase();
    const body = await parseJsonBody(request, 4096);
    if (!body) return json({ error: "invalid_request" }, 400);
    const status = safeString(body.status);
    if (!["approved", "rejected", "completed"].includes(status)) {
      return json({ error: "validation_failed" }, 400);
    }

    const existingRefund = await env.DB.prepare(
      "SELECT r.id, r.order_id, r.amount_paisa, r.status, o.payment_method, o.payment_status " +
      "FROM refunds r JOIN orders o ON o.id = r.order_id WHERE r.id = ?1 LIMIT 1"
    ).bind(refundId).first<{
      id: string;
      order_id: string;
      amount_paisa: number;
      status: string;
      payment_method: string;
      payment_status: string;
    }>();
    if (!existingRefund) return json({ error: "refund_not_found" }, 404);
    if (existingRefund.status === "completed" || existingRefund.status === "rejected") {
      return json({ error: "refund_already_finalized" }, 409);
    }

    const stmts: D1PreparedStatement[] = [
      env.DB.prepare("UPDATE refunds SET status = ?1, reviewer_staff_id = ?2, updated_at = ?3 WHERE id = ?4")
        .bind(status, user.id, now, refundId),
      env.DB.prepare(
        "INSERT INTO notifications (id, recipient_type, title_ur, title_en, body_ur, body_en, event_type, related_id, created_at) " +
        "VALUES (?1, 'staff', 'ریفنڈ اپ ڈیٹ', 'Refund Updated', ?2, ?3, 'refund_updated', ?4, ?5)"
      ).bind(crypto.randomUUID(), `ریفنڈ کی حالت: ${status}`, `Refund marked ${status}`, refundId, now),
      env.DB.prepare(
        "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json, created_at) " +
        "VALUES (?1, ?2, ?3, 'refund.updated', 'refund', ?4, ?5, ?6)"
      ).bind(crypto.randomUUID(), user.id, user.role, refundId, JSON.stringify({ previous_status: existingRefund.status, status }), now)
    ];

    if (status === "rejected") {
      stmts.push(
        env.DB.prepare(
          "INSERT INTO financial_ledger (id, entry_type, reference_id, debit_paisa, credit_paisa, actor_staff_id, note, created_at) " +
          "VALUES (?1, 'refund', ?2, 0, ?3, ?4, 'Refund reversal (rejected)', ?5)"
        ).bind(crypto.randomUUID(), refundId, existingRefund.amount_paisa, user.id, now)
      );
      if (existingRefund.payment_status === "refunded") {
        const restoredStatus = existingRefund.payment_method === "manual_transfer" ? "verified" : "collected";
        stmts.push(
          env.DB.prepare("UPDATE orders SET payment_status = ?1, updated_at = ?2 WHERE id = ?3").bind(restoredStatus, now, existingRefund.order_id),
          env.DB.prepare("UPDATE payments SET status = ?1, updated_at = ?2 WHERE order_id = ?3").bind(restoredStatus, now, existingRefund.order_id)
        );
      }
    }

    await env.DB.batch(stmts);
    return json({ updated: true, id: refundId, status });
  }

  if (request.method === "GET" && url.pathname === "/api/v1/admin/finance/summary") {
    if (!["owner", "manager", "finance"].includes(user.role)) return json({ error: "insufficient_permissions" }, 403);
    const [byType, daily, monthly, discrepancies] = await Promise.all([
      env.DB.prepare(
        "SELECT entry_type, COUNT(*) AS entry_count, COALESCE(SUM(debit_paisa), 0) AS total_debit_paisa, " +
        "COALESCE(SUM(credit_paisa), 0) AS total_credit_paisa " +
        "FROM financial_ledger GROUP BY entry_type"
      ).all<JsonRecord>(),
      env.DB.prepare(
        "SELECT substr(created_at, 1, 10) AS period_day, " +
        "SUM(CASE WHEN entry_type = 'order_charge' THEN credit_paisa ELSE 0 END) AS order_charges_paisa, " +
        "SUM(CASE WHEN entry_type IN ('cod_collection', 'manual_payment') THEN debit_paisa ELSE 0 END) AS collections_paisa, " +
        "SUM(CASE WHEN entry_type = 'refund' THEN (debit_paisa - credit_paisa) ELSE 0 END) AS refunds_paisa, " +
        "SUM(CASE WHEN entry_type IN ('purchase_expense', 'wastage_expense') THEN debit_paisa ELSE 0 END) AS expenses_paisa " +
        "FROM financial_ledger GROUP BY substr(created_at, 1, 10) ORDER BY period_day DESC LIMIT 31"
      ).all<JsonRecord>(),
      env.DB.prepare(
        "SELECT substr(created_at, 1, 7) AS period_month, " +
        "SUM(CASE WHEN entry_type = 'order_charge' THEN credit_paisa ELSE 0 END) AS order_charges_paisa, " +
        "SUM(CASE WHEN entry_type IN ('cod_collection', 'manual_payment') THEN debit_paisa ELSE 0 END) AS collections_paisa, " +
        "SUM(CASE WHEN entry_type = 'refund' THEN (debit_paisa - credit_paisa) ELSE 0 END) AS refunds_paisa, " +
        "SUM(CASE WHEN entry_type IN ('purchase_expense', 'wastage_expense') THEN debit_paisa ELSE 0 END) AS expenses_paisa " +
        "FROM financial_ledger GROUP BY substr(created_at, 1, 7) ORDER BY period_month DESC LIMIT 12"
      ).all<JsonRecord>(),
      env.DB.prepare(
        "SELECT o.id AS order_id, o.order_number, o.status, o.payment_status, o.total_paisa, " +
        "p.amount_paisa AS payment_amount_paisa, p.status AS payment_record_status " +
        "FROM orders o LEFT JOIN payments p ON p.order_id = o.id " +
        "WHERE p.id IS NULL OR p.amount_paisa != o.total_paisa OR p.status != o.payment_status " +
        "LIMIT 50"
      ).all<JsonRecord>()
    ]);

    return json({
      currency: "PKR",
      totals_by_type: byType.results,
      daily_summaries: daily.results,
      monthly_summaries: monthly.results,
      reconciliation: {
        consistent: discrepancies.results.length === 0,
        discrepancy_count: discrepancies.results.length,
        discrepancies: discrepancies.results
      }
    });
  }

  // 7. Support Ticket Assignment & Status Management
  const supportAssignMatch = url.pathname.match(/^\/api\/v1\/admin\/support\/tickets\/([0-9a-f-]{36})\/assign$/i);
  if (request.method === "PATCH" && supportAssignMatch) {
    if (!["owner", "manager", "operator", "support"].includes(user.role)) return json({ error: "insufficient_permissions" }, 403);
    if (!browserOriginAllowed(request, env)) return json({ error: "origin_not_allowed" }, 403);
    const caseId = supportAssignMatch[1].toLowerCase();
    const body = await parseJsonBody(request, 4096);
    if (!body) return json({ error: "invalid_request" }, 400);
    const assignedStaffId = safeString(body.assigned_staff_id).toLowerCase() || null;
    const status = safeString(body.status);
    if (assignedStaffId && !validUuid(assignedStaffId)) return json({ error: "validation_failed" }, 400);
    if (status && !["open", "in_progress", "waiting_customer", "resolved", "closed"].includes(status)) {
      return json({ error: "validation_failed" }, 400);
    }

    await env.DB.batch([
      env.DB.prepare(
        "UPDATE support_cases SET assigned_staff_id = ?1, status = COALESCE(NULLIF(?2, ''), status), updated_at = ?3 WHERE id = ?4"
      ).bind(assignedStaffId, status, now, caseId),
      env.DB.prepare(
        "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json, created_at) " +
        "VALUES (?1, ?2, ?3, 'support.case_updated', 'support_case', ?4, ?5, ?6)"
      ).bind(crypto.randomUUID(), user.id, user.role, caseId, JSON.stringify({ assigned_staff_id: assignedStaffId, status }), now)
    ]);
    return json({ updated: true, id: caseId });
  }

  // 8. Honest Business Analytics
  if (request.method === "GET" && url.pathname === "/api/v1/admin/analytics") {
    if (!["owner", "manager", "finance"].includes(user.role)) return json({ error: "insufficient_permissions" }, 403);
    const [topProducts, zoneBreakdown, languageBreakdown, dailyOrders] = await Promise.all([
      env.DB.prepare(
        "SELECT oi.product_name_en_snapshot AS product_name_en, SUM(oi.quantity) AS units_sold, " +
        "SUM(oi.line_total_paisa) AS revenue_paisa " +
        "FROM order_items oi JOIN orders o ON o.id = oi.order_id " +
        "WHERE o.status NOT IN ('cancelled', 'rejected') " +
        "GROUP BY oi.product_name_en_snapshot ORDER BY revenue_paisa DESC LIMIT 15"
      ).all<JsonRecord>(),
      env.DB.prepare(
        "SELECT COALESCE(NULLIF(delivery_area, ''), 'Unspecified') AS area, COUNT(*) AS order_count, " +
        "SUM(total_paisa) AS total_paisa FROM orders WHERE status NOT IN ('cancelled', 'rejected') " +
        "GROUP BY area ORDER BY order_count DESC LIMIT 20"
      ).all<JsonRecord>(),
      env.DB.prepare(
        "SELECT customer_language, COUNT(*) AS order_count FROM orders GROUP BY customer_language"
      ).all<JsonRecord>(),
      env.DB.prepare(
        "SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS order_count, " +
        "SUM(CASE WHEN status = 'delivered' THEN total_paisa ELSE 0 END) AS delivered_paisa " +
        "FROM orders GROUP BY substr(created_at, 1, 10) ORDER BY day DESC LIMIT 30"
      ).all<JsonRecord>()
    ]);

    return json({
      top_products: topProducts.results,
      zones: zoneBreakdown.results,
      languages: languageBreakdown.results,
      daily_orders: dailyOrders.results
    });
  }

  // 9. Website Content / Editorial CMS (Section 13 #23)
  const editorialAdminCollection = url.pathname === "/api/v1/admin/editorial";
  const editorialAdminSingle = url.pathname.match(/^\/api\/v1\/admin\/editorial\/([0-9a-f-]{36})$/i);
  if (editorialAdminCollection || editorialAdminSingle) {
    if (request.method === "GET" && editorialAdminCollection) {
      if (!["owner", "manager", "operator"].includes(user.role)) return json({ error: "insufficient_permissions" }, 403);
      const posts = await env.DB.prepare(
        "SELECT id, slug, content_type, title_en, title_ur, summary_en, summary_ur, body_en, body_ur, " +
        "image_url, image_alt_en, image_alt_ur, meta_title_en, meta_title_ur, meta_description_en, meta_description_ur, " +
        "prep_time_mins, cook_time_mins, servings, is_published, published_at, created_at, updated_at " +
        "FROM editorial_posts ORDER BY updated_at DESC LIMIT 200"
      ).all<JsonRecord>();
      return json({ posts: posts.results });
    }

    if (user.role !== "owner" && user.role !== "manager") return json({ error: "insufficient_permissions" }, 403);
    if (!browserOriginAllowed(request, env)) return json({ error: "origin_not_allowed" }, 403);

    if (request.method === "DELETE" && editorialAdminSingle) {
      const id = editorialAdminSingle[1].toLowerCase();
      await env.DB.batch([
        env.DB.prepare("DELETE FROM editorial_posts WHERE id = ?1").bind(id),
        env.DB.prepare(
          "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json, created_at) " +
          "VALUES (?1, ?2, ?3, 'editorial.deleted', 'editorial_post', ?4, '{}', ?5)"
        ).bind(crypto.randomUUID(), user.id, user.role, id, now)
      ]);
      return json({ deleted: true, id });
    }

    if ((request.method === "POST" && editorialAdminCollection) || (request.method === "PUT" && editorialAdminSingle)) {
      const body = await parseJsonBody(request, 65536);
      if (!body) return json({ error: "invalid_request" }, 400);
      const slug = safeString(body.slug).toLowerCase();
      const contentType = safeString(body.content_type || "guide");
      const titleEn = safeString(body.title_en);
      const titleUr = safeString(body.title_ur);
      const summaryEn = safeString(body.summary_en);
      const summaryUr = safeString(body.summary_ur);
      const bodyEn = safeString(body.body_en);
      const bodyUr = safeString(body.body_ur);
      const imageUrl = safeString(body.image_url) || null;
      const imageAltEn = safeString(body.image_alt_en);
      const imageAltUr = safeString(body.image_alt_ur);
      const metaTitleEn = safeString(body.meta_title_en);
      const metaTitleUr = safeString(body.meta_title_ur);
      const metaDescEn = safeString(body.meta_description_en);
      const metaDescUr = safeString(body.meta_description_ur);
      const prepTime = body.prep_time_mins === null || body.prep_time_mins === undefined || body.prep_time_mins === "" ? null : Number(body.prep_time_mins);
      const cookTime = body.cook_time_mins === null || body.cook_time_mins === undefined || body.cook_time_mins === "" ? null : Number(body.cook_time_mins);
      const servings = body.servings === null || body.servings === undefined || body.servings === "" ? null : Number(body.servings);
      const isPublished = body.is_published === undefined ? true : body.is_published === true;

      if (
        !validSlug(slug) ||
        !["article", "recipe", "guide", "announcement", "policy"].includes(contentType) ||
        !titleEn || !titleUr || !bodyEn || !bodyUr ||
        (imageUrl !== null && !/^https:\/\//i.test(imageUrl))
      ) {
        return json({ error: "validation_failed" }, 400);
      }

      const id = request.method === "POST" ? crypto.randomUUID() : editorialAdminSingle![1].toLowerCase();
      const publishedAt = isPublished ? now : null;
      try {
        const writeStmt = request.method === "POST"
          ? env.DB.prepare(
              "INSERT INTO editorial_posts (id, slug, content_type, title_en, title_ur, summary_en, summary_ur, body_en, body_ur, image_url, image_alt_en, image_alt_ur, meta_title_en, meta_title_ur, meta_description_en, meta_description_ur, prep_time_mins, cook_time_mins, servings, is_published, published_at, author_staff_id, created_at, updated_at) " +
              "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?23)"
            ).bind(id, slug, contentType, titleEn, titleUr, summaryEn, summaryUr, bodyEn, bodyUr, imageUrl, imageAltEn, imageAltUr, metaTitleEn, metaTitleUr, metaDescEn, metaDescUr, prepTime, cookTime, servings, isPublished ? 1 : 0, publishedAt, user.id, now)
          : env.DB.prepare(
              "UPDATE editorial_posts SET slug=?1, content_type=?2, title_en=?3, title_ur=?4, summary_en=?5, summary_ur=?6, body_en=?7, body_ur=?8, image_url=?9, image_alt_en=?10, image_alt_ur=?11, meta_title_en=?12, meta_title_ur=?13, meta_description_en=?14, meta_description_ur=?15, prep_time_mins=?16, cook_time_mins=?17, servings=?18, is_published=?19, published_at=COALESCE(published_at, ?20), updated_at=?21 WHERE id=?22"
            ).bind(slug, contentType, titleEn, titleUr, summaryEn, summaryUr, bodyEn, bodyUr, imageUrl, imageAltEn, imageAltUr, metaTitleEn, metaTitleUr, metaDescEn, metaDescUr, prepTime, cookTime, servings, isPublished ? 1 : 0, publishedAt, now, id);

        await env.DB.batch([
          writeStmt,
          env.DB.prepare(
            "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json, created_at) " +
            "VALUES (?1, ?2, ?3, ?4, 'editorial_post', ?5, ?6, ?7)"
          ).bind(
            crypto.randomUUID(),
            user.id,
            user.role,
            request.method === "POST" ? "editorial.created" : "editorial.updated",
            id,
            JSON.stringify({ slug, content_type: contentType, is_published: isPublished }),
            now
          )
        ]);
        return json({ saved: true, id, slug }, request.method === "POST" ? 201 : 200);
      } catch (err) {
        if (err instanceof Error && /UNIQUE constraint failed/i.test(err.message)) {
          return json({ error: "slug_conflict" }, 409);
        }
        throw err;
      }
    }
  }

  // 10. SEO & Business Information Settings (Section 13 #24)
  if (url.pathname === "/api/v1/admin/seo") {
    const seoKeys = [
      "seo_title_en",
      "seo_title_ur",
      "seo_description_en",
      "seo_description_ur",
      "canonical_domain",
      "robots_index_storefront",
      "store_address_en",
      "store_address_ur",
      "operating_hours_en",
      "operating_hours_ur",
      "store_email"
    ] as const;

    if (request.method === "GET") {
      if (!["owner", "manager", "operator"].includes(user.role)) return json({ error: "insufficient_permissions" }, 403);
      const [rows, counts] = await Promise.all([
        env.DB.prepare("SELECT setting_key, value_json FROM store_settings WHERE is_public = 1").all<{ setting_key: string; value_json: string }>(),
        env.DB.prepare(
          "SELECT " +
          "(SELECT COUNT(*) FROM products WHERE is_available = 1 AND is_archived = 0) AS indexable_products, " +
          "(SELECT COUNT(*) FROM categories WHERE is_active = 1) AS indexable_categories, " +
          "(SELECT COUNT(*) FROM editorial_posts WHERE is_published = 1) AS published_guides"
        ).first<JsonRecord>()
      ]);
      const settings: Record<string, unknown> = {};
      for (const r of rows.results) settings[r.setting_key] = parseSettingJson(r.value_json);
      return json({
        seo: settings,
        indexable_counts: counts ?? { indexable_products: 0, indexable_categories: 0, published_guides: 0 }
      });
    }

    if (request.method === "PATCH") {
      if (user.role !== "owner") return json({ error: "owner_permission_required" }, 403);
      if (!browserOriginAllowed(request, env)) return json({ error: "origin_not_allowed" }, 403);
      const body = await parseJsonBody(request, 8192);
      if (!body) return json({ error: "invalid_request" }, 400);

      const stmts: D1PreparedStatement[] = [];
      const updatedKeys: string[] = [];

      for (const key of Object.keys(body)) {
        if (!(seoKeys as readonly string[]).includes(key)) {
          return json({ error: "unknown_seo_setting" }, 400);
        }
        const val = body[key];
        if (key === "robots_index_storefront") {
          if (typeof val !== "boolean") return json({ error: "validation_failed" }, 400);
          stmts.push(
            env.DB.prepare(
              "INSERT INTO store_settings (setting_key, value_json, is_public, updated_at) VALUES (?1, ?2, 1, ?3) " +
              "ON CONFLICT(setting_key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at"
            ).bind(key, JSON.stringify(val), now)
          );
          updatedKeys.push(key);
        } else {
          const strVal = safeString(val);
          if (key === "canonical_domain" && strVal && !/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/i.test(strVal)) {
            return json({ error: "invalid_canonical_domain" }, 400);
          }
          if (strVal.length > 400) return json({ error: "validation_failed" }, 400);
          stmts.push(
            env.DB.prepare(
              "INSERT INTO store_settings (setting_key, value_json, is_public, updated_at) VALUES (?1, ?2, 1, ?3) " +
              "ON CONFLICT(setting_key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at"
            ).bind(key, JSON.stringify(strVal), now)
          );
          updatedKeys.push(key);
        }
      }

      if (stmts.length === 0) return json({ error: "empty_update" }, 400);
      stmts.push(
        env.DB.prepare(
          "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json, created_at) " +
          "VALUES (?1, ?2, ?3, 'seo.settings_updated', 'store_settings', NULL, ?4, ?5)"
        ).bind(crypto.randomUUID(), user.id, user.role, JSON.stringify({ updated_keys: updatedKeys }), now)
      );
      await env.DB.batch(stmts);
      return json({ saved: true, updated_keys: updatedKeys });
    }
  }

  // 10b. Owner-Only Store Release Gate Control (Section 5.10 & Section 6.2)
  if (request.method === "POST" && url.pathname === "/api/v1/admin/store/launch-gate") {
    if (user.role !== "owner") {
      return json({ error: "owner_permission_required" }, 403);
    }
    if (!browserOriginAllowed(request, env)) {
      return json({ error: "origin_not_allowed" }, 403);
    }
    const body = await parseJsonBody(request, 2048);
    if (!body) return json({ error: "invalid_request" }, 400);
    const action = safeString(body.action);
    if (!["open", "pause", "setup"].includes(action)) {
      return json({ error: "validation_failed" }, 400);
    }

    if (action === "open") {
      const readiness = await env.DB.prepare(
        "SELECT " +
        "(SELECT COUNT(*) FROM categories WHERE is_active = 1) AS active_categories, " +
        "(SELECT COUNT(*) FROM products WHERE is_available = 1 AND is_archived = 0) AS active_products, " +
        "(SELECT COUNT(*) FROM delivery_zones WHERE is_active = 1) AS active_delivery_zones, " +
        "(SELECT value_json FROM store_settings WHERE setting_key = 'cod_enabled' LIMIT 1) AS cod_enabled_json"
      ).first<{
        active_categories: number;
        active_products: number;
        active_delivery_zones: number;
        cod_enabled_json: string | null;
      }>();

      const codOn = readiness?.cod_enabled_json ? parseSettingJson(readiness.cod_enabled_json) === true : false;
      const missing: string[] = [];
      if (Number(readiness?.active_categories ?? 0) < 1) missing.push("active_categories");
      if (Number(readiness?.active_products ?? 0) < 1) missing.push("active_products");
      if (Number(readiness?.active_delivery_zones ?? 0) < 1) missing.push("active_delivery_zones");
      if (!codOn) missing.push("cod_enabled");

      if (missing.length > 0) {
        return json({
          error: "store_launch_prerequisites_incomplete",
          missing_prerequisites: missing,
          message: "Store cannot open until at least 1 active category, 1 active product, 1 active delivery zone, and Cash on Delivery are enabled."
        }, 422);
      }

      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO store_settings (setting_key, value_json, is_public, updated_at) VALUES ('store_status', '\"open\"', 1, ?1) " +
          "ON CONFLICT(setting_key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at"
        ).bind(now),
        env.DB.prepare(
          "INSERT INTO store_settings (setting_key, value_json, is_public, updated_at) VALUES ('launch_ready', 'true', 1, ?1) " +
          "ON CONFLICT(setting_key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at"
        ).bind(now),
        env.DB.prepare(
          "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json, created_at) " +
          "VALUES (?1, ?2, 'owner', 'store.launch_gate_opened', 'store_settings', 'store_status', '{\"store_status\":\"open\",\"launch_ready\":true}', ?3)"
        ).bind(crypto.randomUUID(), user.id, now)
      ]);

      return json({ updated: true, store_status: "open", launch_ready: true });
    }

    const nextStatus = action === "pause" ? "paused" : "setup";
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO store_settings (setting_key, value_json, is_public, updated_at) VALUES ('store_status', ?1, 1, ?2) " +
        "ON CONFLICT(setting_key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at"
      ).bind(JSON.stringify(nextStatus), now),
      env.DB.prepare(
        "INSERT INTO store_settings (setting_key, value_json, is_public, updated_at) VALUES ('launch_ready', 'false', 1, ?1) " +
        "ON CONFLICT(setting_key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at"
      ).bind(now),
      env.DB.prepare(
        "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json, created_at) " +
        "VALUES (?1, ?2, 'owner', 'store.launch_gate_closed', 'store_settings', 'store_status', ?3, ?4)"
      ).bind(crypto.randomUUID(), user.id, JSON.stringify({ store_status: nextStatus, launch_ready: false }), now)
    ]);

    return json({ updated: true, store_status: nextStatus, launch_ready: false });
  }

  // 11. Adsterra Advertising & Monetization Control Center (Section 7.11 & Section 13 #22)
  if (url.pathname.startsWith("/api/v1/admin/advertising")) {
    if (request.method === "GET" && url.pathname === "/api/v1/admin/advertising/overview") {
      if (user.role !== "owner" && user.role !== "manager" && user.role !== "finance") {
        return json({ error: "insufficient_permissions" }, 403);
      }

      const [config, zones, reports, eventSummary, recentErrors, auditHistory] = await Promise.all([
        loadMonetizationConfig(env),
        env.DB.prepare(
          "SELECT id, zone_key, publisher_zone_id, format, placement_slot, script_origin, width, height, is_enabled, status_note, updated_at " +
          "FROM ad_zones ORDER BY zone_key ASC"
        ).all<JsonRecord>(),
        env.DB.prepare(
          "SELECT id, report_date, source_type, format, country_code, device_type, impressions, clicks, " +
          "fill_rate_bps, ecpm_micros_usd, revenue_micros_usd, payout_status, note, created_at " +
          "FROM ad_performance_reports ORDER BY report_date DESC, created_at DESC LIMIT 100"
        ).all<JsonRecord>(),
        env.DB.prepare(
          "SELECT event_type, COUNT(*) AS event_count, AVG(load_ms) AS avg_load_ms " +
          "FROM ad_events GROUP BY event_type"
        ).all<JsonRecord>(),
        env.DB.prepare(
          "SELECT id, slot_id, format, page_type, event_type, error_code, device_category, created_at " +
          "FROM ad_events WHERE event_type IN ('load_error', 'timeout', 'blocked_restricted', 'blocked_safety') " +
          "ORDER BY created_at DESC LIMIT 50"
        ).all<JsonRecord>(),
        env.DB.prepare(
          "SELECT a.id, a.action, a.actor_role, a.metadata_json, a.created_at, s.display_name AS actor_name " +
          "FROM audit_logs a LEFT JOIN staff_users s ON s.id = a.actor_staff_id " +
          "WHERE a.action LIKE 'advertising.%' ORDER BY a.created_at DESC LIMIT 40"
        ).all<JsonRecord>()
      ]);

      return json({
        config,
        format_registry: ADSTERRA_FORMAT_REGISTRY,
        restricted_pages: RESTRICTED_AD_PAGES,
        blocked_categories: BLOCKED_AD_CATEGORIES,
        zones: zones.results,
        performance_reports: reports.results,
        telemetry_summary: eventSummary.results,
        recent_errors: recentErrors.results,
        audit_history: auditHistory.results,
        environment: env.APP_ENV ?? "preview"
      });
    }

    // All advertising mutations require strictly OWNER role!
    if (user.role !== "owner") {
      return json({ error: "owner_permission_required" }, 403);
    }
    if (!browserOriginAllowed(request, env)) {
      return json({ error: "origin_not_allowed" }, 403);
    }

    if (request.method === "POST" && url.pathname === "/api/v1/admin/advertising/kill-switch") {
      const current = await loadMonetizationConfig(env);
      const disabledConfig: MonetizationConfig = {
        ...current,
        masterEnabled: false,
        previewEnabled: false,
        productionApproved: false
      };

      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO monetization_settings (config_key, config_json, updated_by_staff_id, updated_at) " +
          "VALUES ('adsterra_config', ?1, ?2, ?3) " +
          "ON CONFLICT(config_key) DO UPDATE SET config_json = excluded.config_json, updated_by_staff_id = excluded.updated_by_staff_id, updated_at = excluded.updated_at"
        ).bind(JSON.stringify(disabledConfig), user.id, now),
        env.DB.prepare("UPDATE ad_zones SET is_enabled = 0, updated_by_staff_id = ?1, updated_at = ?2").bind(user.id, now),
        env.DB.prepare(
          "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json, created_at) " +
          "VALUES (?1, ?2, 'owner', 'advertising.emergency_disabled', 'monetization', 'adsterra_config', '{\"masterEnabled\":false}', ?3)"
        ).bind(crypto.randomUUID(), user.id, now)
      ]);

      return json({ disabled: true, config: disabledConfig });
    }

    if (request.method === "PATCH" && url.pathname === "/api/v1/admin/advertising/config") {
      const body = await parseJsonBody(request, 8192);
      if (!body) return json({ error: "invalid_request" }, 400);

      // Reject attempts to enable permanently prohibited intrusive formats
      if (isRecord(body.formats) && (body.formats.popunder === true || body.formats.interstitial === true || body.formats.smartlink === true)) {
        return json({ error: "prohibited_ad_format", message: "Popunder, interstitial, and smartlink formats are permanently disabled on FRYZAR." }, 422);
      }

      const nextConfig = normalizeMonetizationConfig(body);

      if (nextConfig.productionApproved && (!nextConfig.siteId || nextConfig.publisherStatus !== "approved")) {
        return json({
          error: "publisher_approval_incomplete",
          message: "Production ad approval requires a verified Adsterra Site ID and 'approved' publisher status."
        }, 422);
      }

      if (nextConfig.masterEnabled && !nextConfig.safety.safeAdsOnly) {
        return json({ error: "safe_ads_required" }, 422);
      }

      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO monetization_settings (config_key, config_json, updated_by_staff_id, updated_at) " +
          "VALUES ('adsterra_config', ?1, ?2, ?3) " +
          "ON CONFLICT(config_key) DO UPDATE SET config_json = excluded.config_json, updated_by_staff_id = excluded.updated_by_staff_id, updated_at = excluded.updated_at"
        ).bind(JSON.stringify(nextConfig), user.id, now),
        env.DB.prepare(
          "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json, created_at) " +
          "VALUES (?1, ?2, 'owner', 'advertising.config_updated', 'monetization', 'adsterra_config', ?3, ?4)"
        ).bind(
          crypto.randomUUID(),
          user.id,
          JSON.stringify({
            masterEnabled: nextConfig.masterEnabled,
            previewEnabled: nextConfig.previewEnabled,
            productionApproved: nextConfig.productionApproved,
            publisherStatus: nextConfig.publisherStatus
          }),
          now
        )
      ]);

      return json({ saved: true, config: nextConfig });
    }

    const zoneUpdateMatch = url.pathname.match(/^\/api\/v1\/admin\/advertising\/zones\/([0-9a-f-]{36})$/i);
    if (request.method === "PUT" && zoneUpdateMatch) {
      const zoneId = zoneUpdateMatch[1].toLowerCase();
      const body = await parseJsonBody(request, 4096);
      if (!body) return json({ error: "invalid_request" }, 400);

      const publisherZoneId = safeString(body.publisher_zone_id);
      const scriptOrigin = safeString(body.script_origin);
      const placementSlot = safeString(body.placement_slot);
      const isEnabled = body.is_enabled === true;
      const statusNote = safeString(body.status_note).slice(0, 240);

      const allowedPlacementSlots = [
        "home_mid_feed",
        "category_footer",
        "products_footer",
        "product_below_related",
        "search_below_results",
        "promotions_sponsor_card",
        "editorial_in_article",
        "editorial_footer",
        "about_footer",
        "home_below_hero",
        "home_editorial_mid",
        "catalogue_grid_after",
        "editorial_inline_native",
        "editorial_footer_banner"
      ];
      if (placementSlot && !allowedPlacementSlots.includes(placementSlot)) {
        return json({ error: "invalid_placement_slot" }, 400);
      }
      if (publisherZoneId && !/^[A-Za-z0-9_-]{4,64}$/.test(publisherZoneId)) {
        return json({ error: "invalid_publisher_zone_id" }, 400);
      }
      if (!isValidAdScriptOrigin(scriptOrigin)) {
        return json({ error: "invalid_script_origin", message: "Script origin must be an HTTPS origin URL with no path or query." }, 400);
      }
      if (isEnabled && (!publisherZoneId || !scriptOrigin)) {
        return json({ error: "zone_credentials_missing", message: "Cannot enable an ad zone without a real publisher zone ID and verified HTTPS script origin." }, 422);
      }

      await env.DB.batch([
        env.DB.prepare(
          "UPDATE ad_zones SET publisher_zone_id = ?1, script_origin = ?2, placement_slot = COALESCE(NULLIF(?3, ''), placement_slot), is_enabled = ?4, status_note = ?5, updated_by_staff_id = ?6, updated_at = ?7 WHERE id = ?8"
        ).bind(publisherZoneId, scriptOrigin, placementSlot, isEnabled ? 1 : 0, statusNote, user.id, now, zoneId),
        env.DB.prepare(
          "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json, created_at) " +
          "VALUES (?1, ?2, 'owner', 'advertising.zone_updated', 'ad_zone', ?3, ?4, ?5)"
        ).bind(
          crypto.randomUUID(),
          user.id,
          zoneId,
          JSON.stringify({ is_enabled: isEnabled, has_zone_id: Boolean(publisherZoneId), script_origin: scriptOrigin, placement_slot: placementSlot || undefined }),
          now
        )
      ]);

      return json({ saved: true, id: zoneId });
    }

    if (request.method === "POST" && url.pathname === "/api/v1/admin/advertising/reports") {
      const body = await parseJsonBody(request, 4096);
      if (!body) return json({ error: "invalid_request" }, 400);

      const reportDate = safeString(body.report_date);
      const sourceType = body.source_type === "network_reported" ? "network_reported" : "local_estimate";
      const format = safeString(body.format || "banner");
      const countryCode = safeString(body.country_code || "ALL").toUpperCase().slice(0, 8);
      const deviceType = safeString(body.device_type || "all");
      const impressions = Number(body.impressions ?? 0);
      const clicks = Number(body.clicks ?? 0);
      const ecpmMicrosUsd = Number(body.ecpm_micros_usd ?? 0);
      const revenueMicrosUsd = Number(body.revenue_micros_usd ?? 0);
      const payoutStatus = safeString(body.payout_status || (sourceType === "local_estimate" ? "estimated" : "pending"));
      const note = safeString(body.note).slice(0, 240);

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(reportDate) ||
        !["all", "mobile", "desktop", "tablet"].includes(deviceType) ||
        !["estimated", "pending", "finalized", "paid"].includes(payoutStatus) ||
        !Number.isSafeInteger(impressions) || impressions < 0 ||
        !Number.isSafeInteger(clicks) || clicks < 0 ||
        !Number.isSafeInteger(ecpmMicrosUsd) || ecpmMicrosUsd < 0 ||
        !Number.isSafeInteger(revenueMicrosUsd) || revenueMicrosUsd < 0
      ) {
        return json({ error: "validation_failed" }, 400);
      }

      // Prevent recording estimated numbers as paid or finalized revenue
      if (sourceType === "local_estimate" && (payoutStatus === "finalized" || payoutStatus === "paid")) {
        return json({ error: "estimate_cannot_be_marked_paid" }, 422);
      }

      const id = crypto.randomUUID();
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO ad_performance_reports (id, report_date, source_type, format, country_code, device_type, impressions, clicks, ecpm_micros_usd, revenue_micros_usd, payout_status, recorded_by_staff_id, note, created_at) " +
          "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)"
        ).bind(id, reportDate, sourceType, format, countryCode, deviceType, impressions, clicks, ecpmMicrosUsd, revenueMicrosUsd, payoutStatus, user.id, note, now),
        env.DB.prepare(
          "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json, created_at) " +
          "VALUES (?1, ?2, 'owner', 'advertising.report_recorded', 'ad_report', ?3, ?4, ?5)"
        ).bind(crypto.randomUUID(), user.id, id, JSON.stringify({ report_date: reportDate, source_type: sourceType, payout_status: payoutStatus }), now)
      ]);

      return json({ saved: true, id }, 201);
    }
  }

  // 12. System Health & Observability (Section 6.5 & Section 13 #27)
  if (request.method === "GET" && url.pathname === "/api/v1/admin/system-health") {
    if (user.role !== "owner" && user.role !== "manager") {
      return json({ error: "insufficient_permissions" }, 403);
    }

    const [migrations, counts, eventBreakdown, recentEvents] = await Promise.all([
      env.DB.prepare("SELECT name, applied_at FROM d1_migrations ORDER BY id ASC").all<JsonRecord>().catch(() => ({ results: [] as JsonRecord[] })),
      env.DB.prepare(
        "SELECT " +
        "(SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%') AS table_count, " +
        "(SELECT COUNT(*) FROM idempotency_keys) AS active_idempotency_keys, " +
        "(SELECT COUNT(*) FROM api_rate_limits) AS active_rate_buckets, " +
        "(SELECT COUNT(*) FROM staff_sessions WHERE revoked_at IS NULL AND expires_at > ?1) AS active_staff_sessions, " +
        "(SELECT COUNT(*) FROM system_events) AS total_system_events"
      ).bind(now).first<JsonRecord>(),
      env.DB.prepare(
        "SELECT category, severity, COUNT(*) AS event_count FROM system_events GROUP BY category, severity"
      ).all<JsonRecord>(),
      env.DB.prepare(
        "SELECT id, category, severity, code, path, message, created_at FROM system_events ORDER BY created_at DESC LIMIT 40"
      ).all<JsonRecord>()
    ]);

    return json({
      health: {
        ok: true,
        service: "fryzar-api",
        environment: env.APP_ENV ?? "preview",
        schema_target: "0009_platform_completion.sql",
        migrations_applied: migrations.results.length,
        migrations: migrations.results,
        secrets_configured: {
          tracking_secret: Boolean(env.TRACKING_SECRET && new TextEncoder().encode(env.TRACKING_SECRET).byteLength >= 32),
          owner_bootstrap_token: Boolean(env.OWNER_BOOTSTRAP_TOKEN && new TextEncoder().encode(env.OWNER_BOOTSTRAP_TOKEN).byteLength >= 32)
        },
        free_tier_limits: {
          plan: "Cloudflare Workers Free + D1 Free ($0 budget)",
          worker_daily_requests_limit: 100000,
          worker_cpu_ms_limit: 10,
          d1_storage_limit_mb: 500
        },
        operational_counters: counts ?? {}
      },
      event_breakdown: eventBreakdown.results,
      recent_events: recentEvents.results
    });
  }

  return null;
}
