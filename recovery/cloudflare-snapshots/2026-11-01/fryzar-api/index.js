function json(data, status = 200, extraHeaders) {
  const headers = new Headers(extraHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { status, headers });
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parseSetting(value) {
  try { return JSON.parse(value); } catch { return value; }
}
function originAllowed(origin, env) {
  if (!origin) return true;
  const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  return allowed.includes(origin);
}
function applySecurityHeaders(response, request, env) {
  const headers = new Headers(response.headers);
  const origin = request.headers.get("Origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.append("Vary", "Origin");
  if (origin && originAllowed(origin, env)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Idempotency-Key, X-Request-ID");
    headers.set("Access-Control-Max-Age", "600");
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
function toHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toHex(new Uint8Array(digest));
}
async function hmacHex(secret, value) {
  const keyBytes = new TextEncoder().encode(secret);
  if (keyBytes.byteLength < 32) throw new Error("tracking_secret_invalid");
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return toHex(new Uint8Array(signature));
}
function randomHex(byteLength) {
  return toHex(crypto.getRandomValues(new Uint8Array(byteLength)));
}
function validUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function safeString(value) {
  return typeof value === "string" ? value.trim() : "";
}
function isEnabled(value) {
  return value === true || value === "yes" || value === "true" || value === 1;
}
async function readSettings(env) {
  const result = await env.DB.prepare("SELECT setting_key, value_json FROM store_settings").all();
  const settings = {};
  for (const row of result.results) settings[row.setting_key] = parseSetting(row.value_json);
  return settings;
}
async function consumeRateLimit(request, env, scope, maximum, windowMs) {
  const clientIp = request.headers.get("CF-Connecting-IP");
  if (!clientIp) return env.APP_ENV !== "production";
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const cutoffIso = new Date(now - windowMs).toISOString();
  const ipHash = await sha256Hex(clientIp);
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
    ).bind(bucketKey, nowIso, cutoffIso).first();
    return Boolean(result && result.request_count <= maximum);
  } catch {
    return env.APP_ENV !== "production";
  }
}
async function health(env) {
  try {
    const table = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'store_settings' LIMIT 1"
    ).first();
    if (!table) return json({ ok: false, service: "fryzar-api", database: "connected", schema: "not_applied" }, 503);
    return json({ ok: true, service: "fryzar-api", database: "connected", schema: "ready" });
  } catch {
    return json({ ok: false, service: "fryzar-api", database: "unavailable" }, 503);
  }
}
async function listCategories(env) {
  const result = await env.DB.prepare(
    "SELECT id, slug, name_ur, name_en, description_ur, description_en, sort_order " +
    "FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, name_en ASC"
  ).all();
  return json({ categories: result.results });
}
async function listProducts(request, env) {
  const url = new URL(request.url);
  const requestedCategory = url.searchParams.get("category");
  const category = requestedCategory?.trim() || null;
  if (category && (category.length > 80 || !/^[a-z0-9-]+$/i.test(category))) return json({ error: "invalid_category" }, 400);
  const rawLimit = Number(url.searchParams.get("limit") ?? "24");
  const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 24;
  const result = await env.DB.prepare(
    "SELECT p.id, p.slug, p.sku, p.category_id, p.name_ur, p.name_en, p.description_ur, p.description_en, " +
    "p.price_paisa, p.compare_at_paisa, p.image_url, p.is_available, p.is_featured, " +
    "c.slug AS category_slug, c.name_ur AS category_name_ur, c.name_en AS category_name_en " +
    "FROM products p LEFT JOIN categories c ON c.id = p.category_id " +
    "WHERE p.is_available = 1 AND (p.category_id IS NULL OR c.is_active = 1) " +
    "AND (?1 IS NULL OR c.slug = ?1) " +
    "ORDER BY p.is_featured DESC, p.sort_order ASC, p.name_en ASC LIMIT ?2"
  ).bind(category, limit).all();
  return json({ products: result.results, limit });
}
async function storefrontConfig(env) {
  const result = await env.DB.prepare(
    "SELECT setting_key, value_json FROM store_settings WHERE is_public = 1 ORDER BY setting_key ASC"
  ).all();
  const settings = {};
  for (const row of result.results) settings[row.setting_key] = parseSetting(row.value_json);
  return json({ settings });
}
async function readCheckoutInput(request) {
  const contentType = (request.headers.get("Content-Type") ?? "").split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") return { ok: false, response: json({ error: "json_required" }, 415) };
  const declaredLength = Number(request.headers.get("Content-Length") ?? "0");
  if (declaredLength > 16384) return { ok: false, response: json({ error: "request_too_large" }, 413) };
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 16384) return { ok: false, response: json({ error: "request_too_large" }, 413) };
    body = JSON.parse(raw);
  } catch {
    return { ok: false, response: json({ error: "invalid_json" }, 400) };
  }
  if (!isRecord(body)) return { ok: false, response: json({ error: "invalid_request" }, 400) };

  const customerName = safeString(body.customer_name);
  const phone = safeString(body.customer_phone).replace(/\D/g, "");
  const address = safeString(body.delivery_address);
  const deliveryZoneId = safeString(body.delivery_zone_id);
  const language =  --- TRUNCATED --- 22,511 chars