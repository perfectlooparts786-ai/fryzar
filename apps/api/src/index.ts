interface Env {
  DB: D1Database;
  APP_ENV?: string;
  ALLOWED_ORIGINS?: string;
  TRACKING_SECRET?: string;
  OWNER_BOOTSTRAP_TOKEN?: string;
}

type JsonRecord = Record<string, unknown>;

interface SettingRow {
  setting_key: string;
  value_json: string;
}

interface ProductRow {
  id: string;
  sku: string | null;
  name_ur: string;
  name_en: string;
  price_paisa: number;
  stock_qty: number | null;
  is_available: number;
}

interface DeliveryZoneRow {
  id: string;
  name_ur: string;
  name_en: string;
  delivery_fee_paisa: number;
  minimum_order_paisa: number;
}

interface IdempotencyRow {
  request_hash: string;
  response_json: string | null;
  expires_at: string;
}

interface StoredOrderResponse {
  order: {
    id: string;
    order_number: string;
    status: string;
    payment_method: string;
    payment_status: string;
    currency: string;
    subtotal_paisa: number;
    delivery_fee_paisa: number;
    total_paisa: number;
    created_at: string;
  };
}

interface CheckoutLine {
  product_id: string;
  quantity: number;
}

interface CheckoutInput {
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_zone_id: string;
  customer_language: "ur" | "en";
  payment_method: "cod" | "manual_transfer";
  notes: string;
  items: CheckoutLine[];
}

function json(data: JsonRecord, status = 200, extraHeaders?: HeadersInit): Response {
  const headers = new Headers(extraHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { status, headers });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSetting(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function originAllowed(origin: string | null, env: Env): boolean {
  if (!origin) return true;
  const allowed = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return allowed.includes(origin);
}

function applySecurityHeaders(response: Response, request: Request, env: Env): Response {
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
    headers.set("Access-Control-Allow-Headers", "Content-Type, Idempotency-Key, X-Request-ID, X-Owner-Bootstrap-Token");
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Max-Age", "600");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(new Uint8Array(digest));
}

async function hmacHex(secret: string, value: string): Promise<string> {
  const keyBytes = new TextEncoder().encode(secret);
  if (keyBytes.byteLength < 32) {
    throw new Error("tracking_secret_invalid");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return toHex(new Uint8Array(signature));
}

function randomHex(byteLength: number): string {
  return toHex(crypto.getRandomValues(new Uint8Array(byteLength)));
}

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isEnabled(value: unknown): boolean {
  return value === true || value === "yes" || value === "true" || value === 1;
}

async function readSettings(env: Env): Promise<Record<string, unknown>> {
  const result = await env.DB.prepare(
    "SELECT setting_key, value_json FROM store_settings"
  ).all<SettingRow>();

  const settings: Record<string, unknown> = {};
  for (const row of result.results) {
    settings[row.setting_key] = parseSetting(row.value_json);
  }
  return settings;
}

async function consumeRateLimit(
  request: Request,
  env: Env,
  scope: string,
  maximum: number,
  windowMs: number
): Promise<boolean> {
  // Only local development and automated unit tests bypass network rate limits.
  // Preview is publicly reachable on workers.dev, so it must enforce limits too.
  if (env.APP_ENV === "development" || env.APP_ENV === "test") {
    return true;
  }

  const clientIp = request.headers.get("CF-Connecting-IP");

  // Fail closed in preview and production if the platform IP header is absent.
  if (!clientIp) {
    return false;
  }

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
    ).bind(bucketKey, nowIso, cutoffIso).first<{ request_count: number }>();

    return Boolean(result && result.request_count <= maximum);
  } catch {
    // Do not silently disable protection when the rate-limit store is unavailable.
    return false;
  }
}

async function health(env: Env): Promise<Response> {
  try {
    const table = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'store_settings' LIMIT 1"
    ).first<{ name: string }>();

    if (!table) {
      return json({
        ok: false,
        service: "fryzar-api",
        database: "connected",
        schema: "not_applied"
      }, 503);
    }

    return json({
      ok: true,
      service: "fryzar-api",
      database: "connected",
      schema: "ready"
    });
  } catch {
    return json({
      ok: false,
      service: "fryzar-api",
      database: "unavailable"
    }, 503);
  }
}

async function listCategories(env: Env): Promise<Response> {
  const result = await env.DB.prepare(
    "SELECT id, slug, name_ur, name_en, description_ur, description_en, sort_order " +
    "FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, name_en ASC"
  ).all<{
    id: string;
    slug: string;
    name_ur: string;
    name_en: string;
    description_ur: string;
    description_en: string;
    sort_order: number;
  }>();

  return json({ categories: result.results });
}

async function listProducts(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const requestedCategory = url.searchParams.get("category");
  const category = requestedCategory?.trim() || null;

  if (category && (category.length > 80 || !/^[a-z0-9-]+$/i.test(category))) {
    return json({ error: "invalid_category" }, 400);
  }

  const rawLimit = Number(url.searchParams.get("limit") ?? "24");
  const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 24;

  const result = await env.DB.prepare(
    "SELECT p.id, p.slug, p.sku, p.category_id, " +
    "p.name_ur, p.name_en, p.description_ur, p.description_en, " +
    "p.price_paisa, p.compare_at_paisa, p.image_url, p.is_available, " +
    "p.is_featured, c.slug AS category_slug, " +
    "c.name_ur AS category_name_ur, c.name_en AS category_name_en " +
    "FROM products p LEFT JOIN categories c ON c.id = p.category_id " +
    "WHERE p.is_available = 1 " +
    "AND (p.category_id IS NULL OR c.is_active = 1) " +
    "AND (?1 IS NULL OR c.slug = ?1) " +
    "ORDER BY p.is_featured DESC, p.sort_order ASC, p.name_en ASC LIMIT ?2"
  ).bind(category, limit).all<JsonRecord>();

  return json({ products: result.results, limit });
}

async function storefrontConfig(env: Env): Promise<Response> {
  const result = await env.DB.prepare(
    "SELECT setting_key, value_json FROM store_settings " +
    "WHERE is_public = 1 ORDER BY setting_key ASC"
  ).all<SettingRow>();

  const settings: JsonRecord = {};
  for (const row of result.results) {
    settings[row.setting_key] = parseSetting(row.value_json);
  }

  return json({ settings });
}

async function listDeliveryZones(env: Env): Promise<Response> {
  const result = await env.DB.prepare(
    "SELECT id, code, name_ur, name_en, city, region, " +
    "delivery_fee_paisa, minimum_order_paisa " +
    "FROM delivery_zones WHERE is_active = 1 " +
    "ORDER BY city ASC, name_en ASC"
  ).all<JsonRecord>();

  return json({
    delivery_zones: result.results,
    currency: "PKR"
  });
}

async function readCheckoutInput(request: Request): Promise<
  { ok: true; input: CheckoutInput } | { ok: false; response: Response }
> {
  const contentType = (request.headers.get("Content-Type") ?? "").split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    return { ok: false, response: json({ error: "json_required" }, 415) };
  }

  const declaredLength = Number(request.headers.get("Content-Length") ?? "0");
  if (declaredLength > 16384) {
    return { ok: false, response: json({ error: "request_too_large" }, 413) };
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 16384) {
      return { ok: false, response: json({ error: "request_too_large" }, 413) };
    }
    body = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, response: json({ error: "invalid_json" }, 400) };
  }

  if (!isRecord(body)) {
    return { ok: false, response: json({ error: "invalid_request" }, 400) };
  }

  const customerName = safeString(body.customer_name);
  const rawPhone = safeString(body.customer_phone);
  const phone = rawPhone.replace(/\D/g, "");
  const address = safeString(body.delivery_address);
  const deliveryZoneId = safeString(body.delivery_zone_id);
  const language =
    body.customer_language === "en" ? "en" :
    body.customer_language === "ur" || body.customer_language === undefined ? "ur" : null;
  const paymentMethod =
    body.payment_method === "cod" || body.payment_method === "manual_transfer"
      ? body.payment_method
      : null;
  const notes = safeString(body.notes);
  const rawItems = body.items;

  if (customerName.length < 2 || customerName.length > 100) {
    return { ok: false, response: json({ error: "invalid_customer_name" }, 400) };
  }
  if (phone.length < 10 || phone.length > 15) {
    return { ok: false, response: json({ error: "invalid_customer_phone" }, 400) };
  }
  if (address.length < 8 || address.length > 500) {
    return { ok: false, response: json({ error: "invalid_delivery_address" }, 400) };
  }
  if (!validUuid(deliveryZoneId)) {
    return { ok: false, response: json({ error: "delivery_zone_required" }, 400) };
  }
  if (!language) {
    return { ok: false, response: json({ error: "invalid_language" }, 400) };
  }
  if (!paymentMethod) {
    return { ok: false, response: json({ error: "invalid_payment_method" }, 400) };
  }
  if (notes.length > 500) {
    return { ok: false, response: json({ error: "notes_too_long" }, 400) };
  }
  if (!Array.isArray(rawItems) || rawItems.length < 1 || rawItems.length > 20) {
    return { ok: false, response: json({ error: "invalid_cart" }, 400) };
  }

  const items: CheckoutLine[] = [];
  const seen = new Set<string>();

  for (const item of rawItems) {
    if (!isRecord(item)) {
      return { ok: false, response: json({ error: "invalid_cart_line" }, 400) };
    }

    const productId = safeString(item.product_id);
    const quantity = item.quantity;

    if (!validUuid(productId) || !Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > 20) {
      return { ok: false, response: json({ error: "invalid_cart_line" }, 400) };
    }
    if (seen.has(productId)) {
      return { ok: false, response: json({ error: "duplicate_cart_product" }, 400) };
    }

    seen.add(productId);
    items.push({ product_id: productId, quantity: quantity as number });
  }

  return {
    ok: true,
    input: {
      customer_name: customerName,
      customer_phone: phone,
      delivery_address: address,
      delivery_zone_id: deliveryZoneId,
      customer_language: language,
      payment_method: paymentMethod,
      notes,
      items
    }
  };
}

function clientOrderResponse(stored: StoredOrderResponse, trackingToken: string): JsonRecord {
  return {
    ...stored,
    tracking_token: trackingToken,
    tracking_url: "/api/v1/orders/track/" + trackingToken
  };
}

async function loadIdempotency(env: Env, key: string): Promise<IdempotencyRow | null> {
  return env.DB.prepare(
    "SELECT request_hash, response_json, expires_at " +
    "FROM idempotency_keys WHERE scope = 'checkout' AND idempotency_key = ?1 LIMIT 1"
  ).bind(key).first<IdempotencyRow>();
}

async function checkout(request: Request, env: Env): Promise<Response> {
  const rateAllowed = await consumeRateLimit(request, env, "checkout", 5, 10 * 60 * 1000);
  if (!rateAllowed) {
    return json({ error: "rate_limit_exceeded", retry_after_seconds: 600 }, 429, {
      "Retry-After": "600"
    });
  }

  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() ?? "";
  if (!/^[A-Za-z0-9._:-]{16,128}$/.test(idempotencyKey)) {
    return json({ error: "idempotency_key_required" }, 400);
  }

  const parsed = await readCheckoutInput(request);
  if (!parsed.ok) return parsed.response;
  const input = parsed.input;

  const trackingSecret = env.TRACKING_SECRET;
  if (!trackingSecret || new TextEncoder().encode(trackingSecret).byteLength < 32) {
    return json({ error: "checkout_temporarily_unavailable" }, 503);
  }

  const canonicalPayload = {
    customer_name: input.customer_name,
    customer_phone: input.customer_phone,
    delivery_address: input.delivery_address,
    delivery_zone_id: input.delivery_zone_id,
    customer_language: input.customer_language,
    payment_method: input.payment_method,
    notes: input.notes,
    items: [...input.items].sort((a, b) => a.product_id.localeCompare(b.product_id))
  };
  const requestHash = await sha256Hex(JSON.stringify(canonicalPayload));
  const existing = await loadIdempotency(env, idempotencyKey);

  if (existing && Date.parse(existing.expires_at) > Date.now()) {
    if (existing.request_hash !== requestHash) {
      return json({ error: "idempotency_key_reused" }, 409);
    }
    if (!existing.response_json) {
      return json({ error: "request_already_processing" }, 409);
    }
    try {
      const stored = JSON.parse(existing.response_json) as StoredOrderResponse;
      const token = await hmacHex(trackingSecret, "order-track:" + stored.order.id);
      return json(clientOrderResponse(stored, token), 200, { "Idempotent-Replay": "true" });
    } catch {
      return json({ error: "idempotency_record_invalid" }, 500);
    }
  }

  const settings = await readSettings(env);
  if (settings.store_status !== "open" || !isEnabled(settings.launch_ready)) {
    return json({ error: "store_not_accepting_orders" }, 503);
  }

  if (input.payment_method === "cod" && !isEnabled(settings.cod_enabled)) {
    return json({ error: "payment_method_unavailable" }, 422);
  }
  if (input.payment_method === "manual_transfer" && !isEnabled(settings.manual_transfer_enabled)) {
    return json({ error: "payment_method_unavailable" }, 422);
  }

  const zone = await env.DB.prepare(
    "SELECT id, name_ur, name_en, delivery_fee_paisa, minimum_order_paisa " +
    "FROM delivery_zones WHERE id = ?1 AND is_active = 1 LIMIT 1"
  ).bind(input.delivery_zone_id).first<DeliveryZoneRow>();

  if (!zone) {
    return json({ error: "delivery_zone_unavailable" }, 422);
  }

  const placeholders = input.items.map((_, index) => "?" + String(index + 1)).join(", ");
  const productResult = await env.DB.prepare(
    "SELECT p.id, p.sku, p.name_ur, p.name_en, p.price_paisa, p.stock_qty, p.is_available " +
    "FROM products p LEFT JOIN categories c ON c.id = p.category_id " +
    "WHERE p.id IN (" + placeholders + ") AND p.is_available = 1 " +
    "AND (p.category_id IS NULL OR c.is_active = 1)"
  ).bind(...input.items.map((item) => item.product_id)).all<ProductRow>();

  if (productResult.results.length !== input.items.length) {
    return json({ error: "product_unavailable" }, 409);
  }

  const products = new Map(productResult.results.map((product) => [product.id, product]));
  let subtotal = 0;

  for (const item of input.items) {
    const product = products.get(item.product_id);
    if (!product) return json({ error: "product_unavailable" }, 409);
    if (product.stock_qty !== null && product.stock_qty < item.quantity) {
      return json({ error: "insufficient_stock" }, 409);
    }
    if (!Number.isSafeInteger(product.price_paisa) || product.price_paisa < 0) {
      return json({ error: "product_price_invalid" }, 409);
    }

    subtotal += product.price_paisa * item.quantity;
    if (!Number.isSafeInteger(subtotal) || subtotal > 1_000_000_000) {
      return json({ error: "order_total_exceeded" }, 422);
    }
  }

  if (subtotal < zone.minimum_order_paisa) {
    return json({
      error: "minimum_order_not_met",
      minimum_order_paisa: zone.minimum_order_paisa
    }, 422);
  }

  const deliveryFee = zone.delivery_fee_paisa;
  if (!Number.isSafeInteger(deliveryFee) || deliveryFee < 0) {
    return json({ error: "delivery_configuration_invalid" }, 503);
  }

  const total = subtotal + deliveryFee;
  if (!Number.isSafeInteger(total) || total > 1_000_000_000) {
    return json({ error: "order_total_exceeded" }, 422);
  }

  const orderId = crypto.randomUUID();
  const paymentId = crypto.randomUUID();
  const statusEventId = crypto.randomUUID();
  const auditId = crypto.randomUUID();
  const orderNumber = "FRZ-" +
    new Date().toISOString().slice(0, 10).replace(/-/g, "") +
    "-" + randomHex(3).toUpperCase();
  const trackingToken = await hmacHex(trackingSecret, "order-track:" + orderId);
  const trackingTokenHash = await sha256Hex(trackingToken);
  const createdAt = new Date().toISOString();
  const paymentStatus = input.payment_method === "cod" ? "unpaid" : "awaiting_proof";
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const storedResponse: StoredOrderResponse = {
    order: {
      id: orderId,
      order_number: orderNumber,
      status: "pending",
      payment_method: input.payment_method,
      payment_status: paymentStatus,
      currency: "PKR",
      subtotal_paisa: subtotal,
      delivery_fee_paisa: deliveryFee,
      total_paisa: total,
      created_at: createdAt
    }
  };

  const statements: D1PreparedStatement[] = [
    env.DB.prepare(
      "DELETE FROM idempotency_keys WHERE scope = 'checkout' AND idempotency_key = ?1 AND expires_at <= ?2"
    ).bind(idempotencyKey, createdAt),
    env.DB.prepare(
      "INSERT INTO idempotency_keys (id, scope, idempotency_key, request_hash, response_json, expires_at) " +
      "VALUES (?1, 'checkout', ?2, ?3, ?4, ?5)"
    ).bind(
      crypto.randomUUID(),
      idempotencyKey,
      requestHash,
      JSON.stringify(storedResponse),
      expiresAt
    ),
    env.DB.prepare(
      "INSERT INTO orders (" +
      "id, order_number, tracking_token_hash, customer_name, customer_phone, delivery_address, " +
      "delivery_area, delivery_zone_id, customer_language, payment_method, payment_status, status, " +
      "subtotal_paisa, delivery_fee_paisa, discount_paisa, total_paisa, notes" +
      ") VALUES (" +
      "?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'pending', ?12, ?13, 0, ?14, ?15)"
    ).bind(
      orderId,
      orderNumber,
      trackingTokenHash,
      input.customer_name,
      input.customer_phone,
      input.delivery_address,
      input.customer_language === "ur" ? zone.name_ur : zone.name_en,
      zone.id,
      input.customer_language,
      input.payment_method,
      paymentStatus,
      subtotal,
      deliveryFee,
      total,
      input.notes
    ),
    env.DB.prepare(
      "INSERT INTO payments (id, order_id, method, status, amount_paisa) " +
      "VALUES (?1, ?2, ?3, ?4, ?5)"
    ).bind(paymentId, orderId, input.payment_method, paymentStatus, total),
    env.DB.prepare(
      "INSERT INTO order_status_events (id, order_id, old_status, new_status, actor_type, note) " +
      "VALUES (?1, ?2, NULL, 'pending', 'customer', 'Order placed')"
    ).bind(statusEventId, orderId),
    env.DB.prepare(
      "INSERT INTO audit_logs (id, actor_role, action, entity_type, entity_id, metadata_json) " +
      "VALUES (?1, 'customer', 'order.created', 'order', ?2, ?3)"
    ).bind(auditId, orderId, JSON.stringify({
      payment_method: input.payment_method,
      total_paisa: total,
      item_count: input.items.length
    }))
  ];

  for (const item of input.items) {
    const product = products.get(item.product_id);
    if (!product) return json({ error: "product_unavailable" }, 409);

    statements.push(
      env.DB.prepare(
        "INSERT INTO order_items (" +
        "id, order_id, product_id, product_name_ur_snapshot, product_name_en_snapshot, " +
        "sku_snapshot, unit_price_paisa, quantity, line_total_paisa" +
        ") VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
      ).bind(
        crypto.randomUUID(),
        orderId,
        product.id,
        product.name_ur,
        product.name_en,
        product.sku,
        product.price_paisa,
        item.quantity,
        product.price_paisa * item.quantity
      ),
      env.DB.prepare(
        "UPDATE products SET " +
        "stock_qty = CASE WHEN stock_qty IS NULL THEN NULL ELSE stock_qty - ?1 END, " +
        "updated_at = CURRENT_TIMESTAMP WHERE id = ?2 AND is_available = 1 " +
        "AND (stock_qty IS NULL OR stock_qty >= ?1)"
      ).bind(item.quantity, product.id),
      env.DB.prepare(
        "INSERT INTO inventory_movements (" +
        "id, product_id, delta_qty, reason, reference_type, reference_id, note" +
        ") SELECT ?1, id, ?2, 'order_reserved', 'order', ?3, 'Stock reserved for order' " +
        "FROM products WHERE id = ?4 AND stock_qty IS NOT NULL"
      ).bind(crypto.randomUUID(), -item.quantity, orderId, product.id)
    );
  }

  try {
    await env.DB.batch(statements);
    return json(clientOrderResponse(storedResponse, trackingToken), 201);
  } catch (error) {
    try {
      const replay = await loadIdempotency(env, idempotencyKey);
      if (replay && replay.request_hash === requestHash && replay.response_json) {
        const stored = JSON.parse(replay.response_json) as StoredOrderResponse;
        const token = await hmacHex(trackingSecret, "order-track:" + stored.order.id);
        return json(clientOrderResponse(stored, token), 200, { "Idempotent-Replay": "true" });
      }
    } catch {
      // Preserve the generic failure response below.
    }

    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("insufficient_stock") || message.includes("product_unavailable") || message.includes("product_missing")) {
      return json({ error: "product_or_stock_changed" }, 409);
    }
    return json({ error: "order_could_not_be_created" }, 500);
  }
}

async function trackOrder(request: Request, env: Env, token: string): Promise<Response> {
  const rateAllowed = await consumeRateLimit(request, env, "order-track", 40, 60 * 1000);
  if (!rateAllowed) {
    return json({ error: "rate_limit_exceeded", retry_after_seconds: 60 }, 429, {
      "Retry-After": "60"
    });
  }

  const tokenHash = await sha256Hex(token);
  const order = await env.DB.prepare(
    "SELECT id, order_number, status, payment_method, payment_status, " +
    "subtotal_paisa, delivery_fee_paisa, discount_paisa, total_paisa, " +
    "customer_language, created_at, updated_at " +
    "FROM orders WHERE tracking_token_hash = ?1 LIMIT 1"
  ).bind(tokenHash).first<JsonRecord>();

  if (!order) {
    return json({ error: "order_not_found" }, 404);
  }

  const items = await env.DB.prepare(
    "SELECT product_name_ur_snapshot, product_name_en_snapshot, " +
    "unit_price_paisa, quantity, line_total_paisa " +
    "FROM order_items WHERE order_id = ?1 ORDER BY rowid ASC"
  ).bind(order.id).all<JsonRecord>();

  return json({ order, items: items.results });
}


const ADMIN_COOKIE_NAME = "__Host-fryzar_admin";
const ADMIN_SESSION_SECONDS = 8 * 60 * 60;
const PASSWORD_ITERATIONS = 310000;
const PASSWORD_HASH_FORMAT = "pbkdf2_sha256";
const DUMMY_PASSWORD_HASH =
  "pbkdf2_sha256$310000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

interface StaffUserRow {
  id: string;
  email: string;
  display_name: string;
  role: "owner" | "manager" | "operator" | "kitchen" | "finance" | "rider" | "support";
  is_active: number;
  password_hash?: string;
}

interface SessionUser {
  id: string;
  email: string;
  display_name: string;
  role: StaffUserRow["role"];
}

function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  for (const value of bytes) binary += String.fromCharCode(value);
  return btoa(binary);
}

function base64Decode(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer,
      iterations: PASSWORD_ITERATIONS
    },
    key,
    256
  );
  return [
    PASSWORD_HASH_FORMAT,
    String(PASSWORD_ITERATIONS),
    base64Encode(salt),
    base64Encode(new Uint8Array(bits))
  ].join("$");
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== PASSWORD_HASH_FORMAT) return false;

  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 1000000) return false;

  let salt: Uint8Array;
  let expected: Uint8Array;
  try {
    salt = base64Decode(parts[2]);
    expected = base64Decode(parts[3]);
  } catch {
    return false;
  }

  if (salt.length !== 16 || expected.length !== 32) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer,
      iterations
    },
    key,
    256
  );
  return constantTimeEqual(new Uint8Array(bits), expected);
}

function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  for (const item of cookieHeader.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0) continue;
    const cookieName = item.slice(0, separator).trim();
    if (cookieName === name) return item.slice(separator + 1).trim();
  }
  return null;
}

function sessionCookie(token: string, maxAge: number): string {
  return ADMIN_COOKIE_NAME + "=" + token +
    "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=" + String(maxAge);
}

function browserOriginAllowed(request: Request, env: Env): boolean {
  const origin = request.headers.get("Origin");
  return Boolean(origin && originAllowed(origin, env));
}

function validEmail(value: string): boolean {
  return value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validPassword(value: string): boolean {
  const bytes = new TextEncoder().encode(value);
  return bytes.length >= 12 && bytes.length <= 128;
}

async function parseJsonBody(request: Request, maximumBytes = 16384): Promise<Record<string, unknown> | null> {
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

async function createStaffSession(
  env: Env,
  staff: SessionUser,
  request: Request
): Promise<Response> {
  const sessionId = crypto.randomUUID();
  const token = randomHex(32);
  const tokenHash = await sha256Hex(token);
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_SECONDS * 1000).toISOString();
  const identityHash = await sha256Hex(staff.email.trim().toLowerCase());
  const sourceHash = await sha256Hex(request.headers.get("CF-Connecting-IP") ?? "unknown");
  const retentionCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO staff_sessions (id, staff_user_id, token_hash, expires_at) " +
      "VALUES (?1, ?2, ?3, ?4)"
    ).bind(sessionId, staff.id, tokenHash, expiresAt),
    env.DB.prepare(
      "UPDATE staff_users SET last_login_at = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2"
    ).bind(createdAt, staff.id),
    env.DB.prepare(
      "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json) " +
      "VALUES (?1, ?2, ?3, 'staff.login', 'staff_user', ?2, ?4)"
    ).bind(
      crypto.randomUUID(),
      staff.id,
      staff.role,
      JSON.stringify({ source: "admin_api" })
    ),
    env.DB.prepare(
      "INSERT INTO auth_login_attempts " +
      "(id, identity_hash, source_hash, attempted_at, was_successful) " +
      "VALUES (?1, ?2, ?3, ?4, 1)"
    ).bind(crypto.randomUUID(), identityHash, sourceHash, createdAt),
    env.DB.prepare(
      "DELETE FROM auth_login_attempts WHERE attempted_at < ?1"
    ).bind(retentionCutoff)
  ]);

  const response = json({
    authenticated: true,
    user: {
      id: staff.id,
      email: staff.email,
      display_name: staff.display_name,
      role: staff.role
    },
    expires_at: expiresAt
  });
  const headers = new Headers(response.headers);
  headers.append("Set-Cookie", sessionCookie(token, ADMIN_SESSION_SECONDS));
  return applySecurityHeaders(new Response(response.body, {
    status: response.status,
    headers
  }), request, env);
}

async function currentStaff(request: Request, env: Env): Promise<SessionUser | null> {
  const token = getCookie(request, ADMIN_COOKIE_NAME);
  if (!token || !/^[a-f0-9]{64}$/i.test(token)) return null;

  const tokenHash = await sha256Hex(token.toLowerCase());
  const session = await env.DB.prepare(
    "SELECT u.id, u.email, u.display_name, u.role, u.is_active " +
    "FROM staff_sessions s JOIN staff_users u ON u.id = s.staff_user_id " +
    "WHERE s.token_hash = ?1 AND s.revoked_at IS NULL " +
    "AND s.expires_at > ?2 AND u.is_active = 1 LIMIT 1"
  ).bind(tokenHash, new Date().toISOString()).first<StaffUserRow>();

  if (!session) return null;

  return {
    id: session.id,
    email: session.email,
    display_name: session.display_name,
    role: session.role
  };
}

function hasRole(user: SessionUser, allowed: readonly StaffUserRow["role"][]): boolean {
  return allowed.includes(user.role);
}

function roleDenied(): Response {
  return json({ error: "insufficient_permissions" }, 403);
}

async function ownerBootstrap(request: Request, env: Env): Promise<Response> {
  if (!browserOriginAllowed(request, env)) {
    return json({ error: "origin_not_allowed" }, 403);
  }

  const configuredToken = env.OWNER_BOOTSTRAP_TOKEN ?? "";
  const suppliedToken = request.headers.get("X-Owner-Bootstrap-Token") ?? "";
  if (new TextEncoder().encode(configuredToken).byteLength < 32 ||
      new TextEncoder().encode(suppliedToken).byteLength < 32) {
    return json({ error: "owner_bootstrap_unavailable" }, 503);
  }

  const [expectedTokenHash, suppliedTokenHash] = await Promise.all([
    sha256Hex(configuredToken),
    sha256Hex(suppliedToken)
  ]);
  if (!constantTimeEqual(
    new TextEncoder().encode(expectedTokenHash),
    new TextEncoder().encode(suppliedTokenHash)
  )) {
    return json({ error: "invalid_bootstrap_token" }, 403);
  }

  const body = await parseJsonBody(request, 8192);
  if (!body) return json({ error: "invalid_request" }, 400);

  const email = safeString(body.email).toLowerCase();
  const displayName = safeString(body.display_name);
  const password = typeof body.password === "string" ? body.password : "";

  if (!validEmail(email)) return json({ error: "invalid_email" }, 400);
  if (displayName.length < 2 || displayName.length > 100) {
    return json({ error: "invalid_display_name" }, 400);
  }
  if (!validPassword(password)) {
    return json({ error: "password_policy_failed" }, 400);
  }

  const [existingOwnerClaim, existingUsers] = await Promise.all([
    env.DB.prepare(
      "SELECT claim_key FROM bootstrap_claims WHERE claim_key = 'first_owner' LIMIT 1"
    ).first<{ claim_key: string }>(),
    env.DB.prepare("SELECT COUNT(*) AS user_count FROM staff_users")
      .first<{ user_count: number }>()
  ]);

  if (existingOwnerClaim || !existingUsers || existingUsers.user_count !== 0) {
    return json({ error: "owner_already_configured" }, 409);
  }

  const passwordHash = await hashPassword(password);
  const staff: SessionUser = {
    id: crypto.randomUUID(),
    email,
    display_name: displayName,
    role: "owner"
  };
  const sessionId = crypto.randomUUID();
  const sessionToken = randomHex(32);
  const sessionTokenHash = await sha256Hex(sessionToken);
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_SECONDS * 1000).toISOString();

  try {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO bootstrap_claims (claim_key) VALUES ('first_owner')"
      ),
      env.DB.prepare(
        "INSERT INTO staff_users (id, email, password_hash, display_name, role, is_active) " +
        "VALUES (?1, ?2, ?3, ?4, 'owner', 1)"
      ).bind(staff.id, staff.email, passwordHash, staff.display_name),
      env.DB.prepare(
        "INSERT INTO staff_sessions (id, staff_user_id, token_hash, created_at, expires_at) " +
        "VALUES (?1, ?2, ?3, ?4, ?5)"
      ).bind(sessionId, staff.id, sessionTokenHash, createdAt, expiresAt),
      env.DB.prepare(
        "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json) " +
        "VALUES (?1, ?2, 'owner', 'staff.owner_bootstrapped', 'staff_user', ?2, ?3)"
      ).bind(
        crypto.randomUUID(),
        staff.id,
        JSON.stringify({ source: "one_time_bootstrap" })
      )
    ]);
  } catch {
    return json({ error: "owner_already_configured" }, 409);
  }

  const response = json({
    authenticated: true,
    user: {
      id: staff.id,
      email: staff.email,
      display_name: staff.display_name,
      role: staff.role
    },
    expires_at: expiresAt
  }, 201);
  const headers = new Headers(response.headers);
  headers.append("Set-Cookie", sessionCookie(sessionToken, ADMIN_SESSION_SECONDS));

  return applySecurityHeaders(new Response(response.body, {
    status: response.status,
    headers
  }), request, env);
}

const ADMIN_LOGIN_FAILURE_LIMIT = 5;
const ADMIN_LOGIN_WINDOW_MS = 15 * 60 * 1000;

async function countRecentLoginFailures(
  env: Env,
  identityHash: string,
  windowStart: string
): Promise<number | null> {
  try {
    const result = await env.DB.prepare(
      "SELECT COUNT(*) AS failure_count FROM auth_login_attempts " +
      "WHERE identity_hash = ?1 AND was_successful = 0 " +
      "AND attempted_at > ?2 " +
      "AND attempted_at > COALESCE((" +
      "SELECT MAX(attempted_at) FROM auth_login_attempts " +
      "WHERE identity_hash = ?1 AND was_successful = 1), ?2)"
    ).bind(identityHash, windowStart).first<{ failure_count: number }>();

    if (!result || !Number.isSafeInteger(result.failure_count) || result.failure_count < 0) {
      return null;
    }
    return result.failure_count;
  } catch {
    return null;
  }
}

async function recordFailedLoginAttempt(
  env: Env,
  identityHash: string,
  sourceHash: string,
  attemptedAt: string,
  windowStart: string
): Promise<boolean | null> {
  const retentionCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const results = await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO auth_login_attempts " +
        "(id, identity_hash, source_hash, attempted_at, was_successful) " +
        "SELECT ?1, ?2, ?3, ?4, 0 " +
        "WHERE (" +
        "SELECT COUNT(*) FROM auth_login_attempts " +
        "WHERE identity_hash = ?2 AND was_successful = 0 " +
        "AND attempted_at > ?5 " +
        "AND attempted_at > COALESCE((" +
        "SELECT MAX(attempted_at) FROM auth_login_attempts " +
        "WHERE identity_hash = ?2 AND was_successful = 1), ?5)" +
        ") < ?6"
      ).bind(
        crypto.randomUUID(),
        identityHash,
        sourceHash,
        attemptedAt,
        windowStart,
        ADMIN_LOGIN_FAILURE_LIMIT
      ),
      env.DB.prepare(
        "DELETE FROM auth_login_attempts WHERE attempted_at < ?1"
      ).bind(retentionCutoff)
    ]);

    return (results[0]?.meta?.changes ?? 0) === 1;
  } catch {
    return null;
  }
}

function loginTemporarilyUnavailable(): Response {
  return json({ error: "login_temporarily_unavailable" }, 503);
}

function loginRateLimited(): Response {
  return json({ error: "rate_limit_exceeded" }, 429, { "Retry-After": "900" });
}

async function adminLogin(request: Request, env: Env): Promise<Response> {
  if (!browserOriginAllowed(request, env)) {
    return json({ error: "origin_not_allowed" }, 403);
  }

  const allowed = await consumeRateLimit(request, env, "admin-login", 5, 15 * 60 * 1000);
  if (!allowed) {
    return json({ error: "rate_limit_exceeded" }, 429, { "Retry-After": "900" });
  }

  const body = await parseJsonBody(request, 8192);
  if (!body) return json({ error: "invalid_request" }, 400);

  const email = safeString(body.email).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  if (!validEmail(email) || password.length === 0 || password.length > 128) {
    return json({ error: "invalid_credentials" }, 401);
  }

  const identityHash = await sha256Hex(email);
  const sourceHash = await sha256Hex(request.headers.get("CF-Connecting-IP") ?? "unknown");
  const now = Date.now();
  const attemptedAt = new Date(now).toISOString();
  const windowStart = new Date(now - ADMIN_LOGIN_WINDOW_MS).toISOString();
  const failureCount = await countRecentLoginFailures(env, identityHash, windowStart);

  if (failureCount === null) {
    return loginTemporarilyUnavailable();
  }
  if (failureCount >= ADMIN_LOGIN_FAILURE_LIMIT) {
    return loginRateLimited();
  }

  const staff = await env.DB.prepare(
    "SELECT id, email, password_hash, display_name, role, is_active " +
    "FROM staff_users WHERE email = ?1 COLLATE NOCASE LIMIT 1"
  ).bind(email).first<StaffUserRow>();

  if (!staff || staff.is_active !== 1 || !staff.password_hash) {
    await verifyPassword(password, DUMMY_PASSWORD_HASH);
    const recorded = await recordFailedLoginAttempt(env, identityHash, sourceHash, attemptedAt, windowStart);
    if (recorded === null) return loginTemporarilyUnavailable();
    if (!recorded) return loginRateLimited();
    return json({ error: "invalid_credentials" }, 401);
  }

  const valid = await verifyPassword(password, staff.password_hash);
  if (!valid) {
    const recorded = await recordFailedLoginAttempt(env, identityHash, sourceHash, attemptedAt, windowStart);
    if (recorded === null) return loginTemporarilyUnavailable();
    if (!recorded) return loginRateLimited();
    return json({ error: "invalid_credentials" }, 401);
  }

  return createStaffSession(env, {
    id: staff.id,
    email: staff.email,
    display_name: staff.display_name,
    role: staff.role
  }, request);
}

async function adminLogout(request: Request, env: Env): Promise<Response> {
  if (!browserOriginAllowed(request, env)) {
    return json({ error: "origin_not_allowed" }, 403);
  }

  const token = getCookie(request, ADMIN_COOKIE_NAME);
  if (token && /^[a-f0-9]{64}$/i.test(token)) {
    const tokenHash = await sha256Hex(token.toLowerCase());
    const staff = await currentStaff(request, env);
    if (staff) {
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE staff_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ?1 AND revoked_at IS NULL"
        ).bind(tokenHash),
        env.DB.prepare(
          "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id) " +
          "VALUES (?1, ?2, ?3, 'staff.logout', 'staff_user', ?2)"
        ).bind(crypto.randomUUID(), staff.id, staff.role)
      ]);
    }
  }

  const headers = new Headers();
  headers.append("Set-Cookie", sessionCookie("", 0));
  return json({ authenticated: false }, 200, headers);
}

async function adminSession(request: Request, env: Env): Promise<Response> {
  const user = await currentStaff(request, env);
  if (!user) return json({ authenticated: false }, 401);

  return json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      role: user.role
    }
  });
}


const ORDER_READ_ROLES: readonly StaffUserRow["role"][] = [
  "owner", "manager", "operator", "kitchen"
];
const ORDER_STATUS_VALUES = [
  "pending", "confirmed", "preparing", "ready",
  "out_for_delivery", "delivered", "cancelled", "rejected"
] as const;
type OrderStatus = typeof ORDER_STATUS_VALUES[number];

const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled", "rejected"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
  rejected: []
};

function isOrderStatus(value: string): value is OrderStatus {
  return ORDER_STATUS_VALUES.includes(value as OrderStatus);
}

function canChangeOrderStatus(
  user: SessionUser,
  current: OrderStatus,
  next: OrderStatus
): boolean {
  if (!ORDER_TRANSITIONS[current].includes(next)) return false;
  if (user.role === "owner" || user.role === "manager") return true;
  if (user.role === "operator") {
    return next !== "rejected" && next !== "cancelled";
  }
  if (user.role === "kitchen") {
    return (
      (current === "confirmed" && next === "preparing") ||
      (current === "preparing" && next === "ready")
    );
  }
  return false;
}

async function listAdminOrders(
  request: Request,
  env: Env,
  user: SessionUser
): Promise<Response> {
  if (!hasRole(user, ORDER_READ_ROLES)) return roleDenied();

  const url = new URL(request.url);
  const status = url.searchParams.get("status")?.trim() ?? "";
  if (status && !isOrderStatus(status)) {
    return json({ error: "invalid_order_status" }, 400);
  }

  const rawLimit = Number(url.searchParams.get("limit") ?? "25");
  if (!Number.isSafeInteger(rawLimit) || rawLimit < 1) {
    return json({ error: "invalid_order_pagination" }, 400);
  }
  const limit = Math.min(rawLimit, 50);
  const rawOffset = Number(url.searchParams.get("offset") ?? "0");
  // Bound OFFSET scans while preserving the existing limit/offset API contract.
  if (!Number.isSafeInteger(rawOffset) || rawOffset < 0 || rawOffset > 10000) {
    return json({ error: "invalid_order_pagination" }, 400);
  }
  const offset = rawOffset;
  const includeCustomerDetails = user.role !== "kitchen";

  const customerColumns = includeCustomerDetails
    ? "customer_name, customer_phone, delivery_address, delivery_area, "
    : "NULL AS customer_name, NULL AS customer_phone, NULL AS delivery_address, NULL AS delivery_area, ";

  const result = await env.DB.prepare(
    "SELECT id, order_number, status, payment_method, payment_status, " +
    customerColumns +
    "subtotal_paisa, delivery_fee_paisa, discount_paisa, total_paisa, " +
    "customer_language, created_at, updated_at " +
    "FROM orders WHERE (?1 = '' OR status = ?1) " +
    "ORDER BY created_at DESC, id DESC LIMIT ?2 OFFSET ?3"
  ).bind(status, limit, offset).all<JsonRecord>();

  return json({
    orders: result.results,
    pagination: {
      limit,
      offset,
      returned: result.results.length
    }
  });
}

async function getAdminOrder(
  env: Env,
  user: SessionUser,
  orderId: string
): Promise<Response> {
  if (!hasRole(user, ORDER_READ_ROLES)) return roleDenied();

  const includeCustomerDetails = user.role !== "kitchen";
  const customerColumns = includeCustomerDetails
    ? "customer_name, customer_phone, delivery_address, delivery_area, "
    : "NULL AS customer_name, NULL AS customer_phone, NULL AS delivery_address, NULL AS delivery_area, ";

  const order = await env.DB.prepare(
    "SELECT id, order_number, status, payment_method, payment_status, " +
    customerColumns +
    "subtotal_paisa, delivery_fee_paisa, discount_paisa, total_paisa, " +
    "customer_language, notes, created_at, updated_at " +
    "FROM orders WHERE id = ?1 LIMIT 1"
  ).bind(orderId).first<JsonRecord>();

  if (!order) return json({ error: "order_not_found" }, 404);

  const [items, history] = await Promise.all([
    env.DB.prepare(
      "SELECT product_name_ur_snapshot, product_name_en_snapshot, sku_snapshot, " +
      "unit_price_paisa, quantity, line_total_paisa " +
      "FROM order_items WHERE order_id = ?1 ORDER BY rowid ASC"
    ).bind(orderId).all<JsonRecord>(),
    env.DB.prepare(
      "SELECT old_status, new_status, actor_type, note, created_at " +
      "FROM order_status_events WHERE order_id = ?1 ORDER BY created_at ASC, rowid ASC"
    ).bind(orderId).all<JsonRecord>()
  ]);

  return json({
    order,
    items: items.results,
    history: history.results
  });
}

async function changeAdminOrderStatus(
  request: Request,
  env: Env,
  user: SessionUser,
  orderId: string
): Promise<Response> {
  if (!hasRole(user, ORDER_READ_ROLES)) return roleDenied();
  if (!browserOriginAllowed(request, env)) return json({ error: "origin_not_allowed" }, 403);

  const body = await parseJsonBody(request, 4096);
  if (!body) return json({ error: "invalid_request" }, 400);

  const nextStatusText = safeString(body.status);
  const note = safeString(body.note);
  if (!isOrderStatus(nextStatusText)) return json({ error: "invalid_order_status" }, 400);
  if (note.length > 500) return json({ error: "note_too_long" }, 400);

  const order = await env.DB.prepare(
    "SELECT id, status, payment_status FROM orders WHERE id = ?1 LIMIT 1"
  ).bind(orderId).first<{ id: string; status: string; payment_status: string }>();

  if (!order) return json({ error: "order_not_found" }, 404);
  if (!isOrderStatus(order.status)) return json({ error: "stored_order_status_invalid" }, 409);
  if (!canChangeOrderStatus(user, order.status, nextStatusText)) {
    return json({ error: "order_transition_not_allowed" }, 403);
  }

  if (nextStatusText === "cancelled" && user.role !== "owner" && user.role !== "manager") {
    return json({ error: "insufficient_permissions" }, 403);
  }

  const timestamp = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(
      "UPDATE orders SET status = ?1, updated_at = ?2 WHERE id = ?3 AND status = ?4"
    ).bind(nextStatusText, timestamp, orderId, order.status)
  ];

  if (nextStatusText === "cancelled") {
    statements.push(
      env.DB.prepare(
        "UPDATE products SET stock_qty = stock_qty + (" +
        "SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi " +
        "WHERE oi.order_id = ?1 AND oi.product_id = products.id" +
        "), updated_at = CURRENT_TIMESTAMP " +
        "WHERE stock_qty IS NOT NULL " +
        "AND EXISTS (SELECT 1 FROM orders WHERE id = ?1 AND status = 'cancelled' AND updated_at = ?2) " +
        "AND EXISTS (SELECT 1 FROM order_items WHERE order_id = ?1 AND product_id = products.id) " +
        "AND NOT EXISTS (SELECT 1 FROM inventory_movements im " +
        "WHERE im.reference_type = 'order' AND im.reference_id = ?1 " +
        "AND im.reason = 'order_cancelled' AND im.product_id = products.id)"
      ).bind(orderId, timestamp),
      env.DB.prepare(
        "INSERT INTO inventory_movements " +
        "(id, product_id, delta_qty, reason, reference_type, reference_id, note) " +
        "SELECT lower(hex(randomblob(16))), oi.product_id, SUM(oi.quantity), " +
        "'order_cancelled', 'order', ?1, 'Stock restored after order cancellation' " +
        "FROM order_items oi JOIN products p ON p.id = oi.product_id " +
        "WHERE oi.order_id = ?1 AND p.stock_qty IS NOT NULL " +
        "AND EXISTS (SELECT 1 FROM orders WHERE id = ?1 AND status = 'cancelled' AND updated_at = ?2) " +
        "AND NOT EXISTS (SELECT 1 FROM inventory_movements im " +
        "WHERE im.reference_type = 'order' AND im.reference_id = ?1 " +
        "AND im.reason = 'order_cancelled' AND im.product_id = oi.product_id) " +
        "GROUP BY oi.product_id"
      ).bind(orderId, timestamp)
    );
  }

  statements.push(
    env.DB.prepare(
      "INSERT INTO order_status_events " +
      "(id, order_id, old_status, new_status, actor_id, actor_type, note) " +
      "SELECT lower(hex(randomblob(16))), id, ?1, ?2, ?3, 'staff', ?4 " +
      "FROM orders WHERE id = ?5 AND status = ?2 AND updated_at = ?6 " +
      "AND NOT EXISTS (SELECT 1 FROM order_status_events e " +
      "WHERE e.order_id = ?5 AND e.old_status = ?1 AND e.new_status = ?2)"
    ).bind(order.status, nextStatusText, user.id, note || null, orderId, timestamp),
    env.DB.prepare(
      "INSERT INTO audit_logs " +
      "(id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json) " +
      "SELECT lower(hex(randomblob(16))), ?1, ?2, 'order.status_changed', 'order', id, ?3 " +
      "FROM orders WHERE id = ?4 AND status = ?5 AND updated_at = ?6 " +
      "AND NOT EXISTS (SELECT 1 FROM audit_logs a WHERE a.action = 'order.status_changed' " +
      "AND a.entity_id = ?4 AND a.actor_staff_id = ?1 AND a.metadata_json = ?3 AND a.created_at = ?6)"
    ).bind(
      user.id,
      user.role,
      JSON.stringify({ old_status: order.status, new_status: nextStatusText }),
      orderId,
      nextStatusText,
      timestamp
    )
  );

  try {
    const results = await env.DB.batch(statements);
    const changedRows = results[0]?.meta?.changes ?? 0;
    if (changedRows !== 1) {
      return json({ error: "order_changed_retry" }, 409);
    }
  } catch {
    return json({ error: "order_transition_failed" }, 409);
  }

  return json({
    updated: true,
    order_id: orderId,
    old_status: order.status,
    status: nextStatusText
  });
}

async function orderAdminApi(
  request: Request,
  env: Env,
  url: URL,
  user: SessionUser
): Promise<Response | null> {
  if (request.method === "GET" && url.pathname === "/api/v1/admin/orders") {
    return listAdminOrders(request, env, user);
  }

  const match = url.pathname.match(/^\/api\/v1\/admin\/orders\/([0-9a-f-]{36})(?:\/status)?$/i);
  if (!match || !validUuid(match[1])) return null;

  const orderId = match[1].toLowerCase();
  if (request.method === "GET" && url.pathname.endsWith("/" + orderId)) {
    return getAdminOrder(env, user, orderId);
  }
  if (request.method === "PATCH" && url.pathname.endsWith("/status")) {
    return changeAdminOrderStatus(request, env, user, orderId);
  }

  return null;
}


const CATALOG_READ_ROLES: readonly StaffUserRow["role"][] = ["owner", "manager", "operator", "kitchen"];
const CATALOG_WRITE_ROLES: readonly StaffUserRow["role"][] = ["owner", "manager"];

function validSlug(value: string): boolean {
  return value.length >= 2 && value.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}


const INVENTORY_READ_ROLES: readonly StaffUserRow["role"][] = ["owner", "manager", "operator", "kitchen"];
const INVENTORY_WRITE_ROLES: readonly StaffUserRow["role"][] = ["owner", "manager"];

async function adminInventoryApi(request: Request, env: Env, url: URL, user: SessionUser): Promise<Response | null> {
  if (request.method === "GET" && url.pathname === "/api/v1/admin/inventory/movements") {
    if (!hasRole(user, INVENTORY_READ_ROLES)) return roleDenied();
    const productId = safeString(url.searchParams.get("product_id"));
    if (productId && !validUuid(productId)) return json({ error: "invalid_product_id" }, 400);
    const statement = productId
      ? env.DB.prepare(
          "SELECT a.id, a.product_id, p.name_en AS product_name_en, p.name_ur AS product_name_ur, " +
          "a.reason, a.delta_qty, a.previous_stock_qty, a.new_stock_qty, a.note, " +
          "s.display_name AS actor_name, a.created_at " +
          "FROM inventory_adjustments a JOIN products p ON p.id = a.product_id " +
          "LEFT JOIN staff_users s ON s.id = a.actor_staff_id " +
          "WHERE a.product_id = ?1 ORDER BY a.created_at DESC, a.rowid DESC LIMIT 200"
        ).bind(productId)
      : env.DB.prepare(
          "SELECT a.id, a.product_id, p.name_en AS product_name_en, p.name_ur AS product_name_ur, " +
          "a.reason, a.delta_qty, a.previous_stock_qty, a.new_stock_qty, a.note, " +
          "s.display_name AS actor_name, a.created_at " +
          "FROM inventory_adjustments a JOIN products p ON p.id = a.product_id " +
          "LEFT JOIN staff_users s ON s.id = a.actor_staff_id " +
          "ORDER BY a.created_at DESC, a.rowid DESC LIMIT 200"
        );
    const result = await statement.all<JsonRecord>();
    return json({ movements: result.results });
  }

  if (request.method !== "POST" || url.pathname !== "/api/v1/admin/inventory/adjustments") return null;
  if (!hasRole(user, INVENTORY_WRITE_ROLES)) return roleDenied();
  if (!browserOriginAllowed(request, env)) return json({ error: "origin_not_allowed" }, 403);

  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() ?? "";
  if (!/^[A-Za-z0-9._:-]{16,128}$/.test(idempotencyKey)) {
    return json({ error: "idempotency_key_required" }, 400);
  }

  const body = await parseJsonBody(request, 2048);
  if (!body) return json({ error: "invalid_request" }, 400);
  const productId = safeString(body.product_id).toLowerCase();
  const deltaQty = Number(body.delta_qty);
  const reason = safeString(body.reason);
  const note = safeString(body.note);
  const allowedReasons = ["stock_received", "stock_adjustment", "return_received"];
  if (!validUuid(productId) || !Number.isSafeInteger(deltaQty) || deltaQty === 0 ||
      Math.abs(deltaQty) > 1000000 || !allowedReasons.includes(reason) || note.length > 500 ||
      ((reason === "stock_received" || reason === "return_received") && deltaQty < 0)) {
    return json({ error: "validation_failed" }, 400);
  }

  const requestHash = await sha256Hex(JSON.stringify({ product_id: productId, delta_qty: deltaQty, reason, note }));
  const existing = await env.DB.prepare(
    "SELECT request_hash, response_json, expires_at FROM idempotency_keys " +
    "WHERE scope = 'inventory_adjustment' AND idempotency_key = ?1 LIMIT 1"
  ).bind(idempotencyKey).first<IdempotencyRow>();

  if (existing && Date.parse(existing.expires_at) > Date.now()) {
    if (existing.request_hash !== requestHash) return json({ error: "idempotency_key_reused" }, 409);
    if (!existing.response_json) return json({ error: "request_already_processing" }, 409);
    try {
      return json(JSON.parse(existing.response_json) as JsonRecord, 200, { "Idempotent-Replay": "true" });
    } catch {
      return json({ error: "idempotency_record_invalid" }, 500);
    }
  }

  const product = await env.DB.prepare(
    "SELECT id, stock_qty FROM products WHERE id = ?1 LIMIT 1"
  ).bind(productId).first<{ id: string; stock_qty: number | null }>();
  if (!product) return json({ error: "product_not_found" }, 404);
  if (product.stock_qty === null) return json({ error: "inventory_not_tracked" }, 409);
  if (product.stock_qty + deltaQty < 0) return json({ error: "insufficient_stock" }, 409);

  const adjustmentId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const responseBody = {
    adjusted: true,
    adjustment_id: adjustmentId,
    product_id: productId,
    delta_qty: deltaQty,
    reason
  };
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(
      "DELETE FROM idempotency_keys WHERE scope = 'inventory_adjustment' " +
      "AND idempotency_key = ?1 AND expires_at <= ?2"
    ).bind(idempotencyKey, timestamp),
    env.DB.prepare(
      "UPDATE products SET stock_qty = stock_qty + ?1, updated_at = ?2 " +
      "WHERE id = ?3 AND stock_qty IS NOT NULL AND stock_qty + ?1 >= 0"
    ).bind(deltaQty, timestamp, productId),
    env.DB.prepare(
      "INSERT INTO inventory_adjustments " +
      "(id, product_id, actor_staff_id, reason, delta_qty, previous_stock_qty, new_stock_qty, note, created_at) " +
      "SELECT ?1, p.id, ?2, ?3, ?4, p.stock_qty - ?4, p.stock_qty, ?5, ?6 " +
      "FROM products p WHERE p.id = ?7 AND p.stock_qty IS NOT NULL AND changes() = 1"
    ).bind(adjustmentId, user.id, reason, deltaQty, note, timestamp, productId),
    env.DB.prepare(
      "INSERT INTO inventory_movements " +
      "(id, product_id, delta_qty, reason, reference_type, reference_id, actor_staff_id, note, created_at) " +
      "SELECT id, product_id, delta_qty, reason, 'inventory_adjustment', id, actor_staff_id, note, created_at " +
      "FROM inventory_adjustments WHERE id = ?1"
    ).bind(adjustmentId),
    env.DB.prepare(
      "INSERT INTO audit_logs " +
      "(id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json, created_at) " +
      "SELECT ?1, ?2, ?3, 'inventory.stock_adjusted', 'inventory_adjustment', id, ?4, created_at " +
      "FROM inventory_adjustments WHERE id = ?5"
    ).bind(
      crypto.randomUUID(),
      user.id,
      user.role,
      JSON.stringify({ product_id: productId, delta_qty: deltaQty, reason }),
      adjustmentId
    ),
    env.DB.prepare(
      "INSERT INTO idempotency_keys (id, scope, idempotency_key, request_hash, response_json, expires_at) " +
      "SELECT ?1, 'inventory_adjustment', ?2, ?3, ?4, ?5 FROM inventory_adjustments WHERE id = ?6"
    ).bind(
      crypto.randomUUID(), idempotencyKey, requestHash,
      JSON.stringify(responseBody), expiresAt, adjustmentId
    )
  ];

  try {
    const results = await env.DB.batch(statements);
    if ((results[1]?.meta?.changes ?? 0) !== 1 || (results[2]?.meta?.changes ?? 0) !== 1) {
      return json({ error: "stock_changed_retry" }, 409);
    }
  } catch {
    const concurrent = await env.DB.prepare(
      "SELECT request_hash, response_json, expires_at FROM idempotency_keys " +
      "WHERE scope = 'inventory_adjustment' AND idempotency_key = ?1 LIMIT 1"
    ).bind(idempotencyKey).first<IdempotencyRow>();
    if (concurrent && Date.parse(concurrent.expires_at) > Date.now()) {
      if (concurrent.request_hash !== requestHash) return json({ error: "idempotency_key_reused" }, 409);
      if (concurrent.response_json) {
        try {
          return json(JSON.parse(concurrent.response_json) as JsonRecord, 200, { "Idempotent-Replay": "true" });
        } catch {
          return json({ error: "idempotency_record_invalid" }, 500);
        }
      }
    }
    return json({ error: "inventory_adjustment_failed" }, 409);
  }

  return json(responseBody, 201);
}

async function adminCatalogueApi(request: Request, env: Env, url: URL, user: SessionUser): Promise<Response | null> {
  const categoryPath = url.pathname === "/api/v1/admin/categories";
  const categoryMatch = url.pathname.match(/^\/api\/v1\/admin\/categories\/([0-9a-f-]{36})$/i);
  const productPath = url.pathname === "/api/v1/admin/products";
  const productMatch = url.pathname.match(/^\/api\/v1\/admin\/products\/([0-9a-f-]{36})$/i);
  if (!(categoryPath || categoryMatch || productPath || productMatch)) return null;
  if (request.method === "GET") {
    if (!hasRole(user, CATALOG_READ_ROLES)) return roleDenied();
  } else {
    if (!hasRole(user, CATALOG_WRITE_ROLES)) return roleDenied();
    if (!browserOriginAllowed(request, env)) return json({ error: "origin_not_allowed" }, 403);
  }

  const isCategory = categoryPath || Boolean(categoryMatch);
  const collection = isCategory ? categoryPath : productPath;
  const entityId = (categoryMatch?.[1] ?? productMatch?.[1] ?? "").toLowerCase();

  if (request.method === "GET" && collection) {
    if (isCategory) {
      const result = await env.DB.prepare(
        "SELECT id, slug, name_en, name_ur, description_en, description_ur, sort_order, is_active, created_at, updated_at FROM categories ORDER BY sort_order, name_en LIMIT 500"
      ).all<JsonRecord>();
      return json({ categories: result.results });
    }
    const result = await env.DB.prepare(
      "SELECT id, category_id, sku, slug, name_en, name_ur, description_en, description_ur, price_paisa, compare_at_paisa, image_url, stock_qty, is_available, is_featured, sort_order, created_at, updated_at FROM products ORDER BY sort_order, name_en LIMIT 500"
    ).all<JsonRecord>();
    return json({ products: result.results });
  }

  if (request.method !== "POST" && request.method !== "PATCH") return json({ error: "method_not_allowed" }, 405);
  if (request.method === "POST" && !collection) return json({ error: "not_found" }, 404);
  if (request.method === "PATCH" && (!entityId || !validUuid(entityId))) return json({ error: "not_found" }, 404);

  const body = await parseJsonBody(request, 12000);
  if (!body) return json({ error: "invalid_request" }, 400);
  const slug = safeString(body.slug);
  const nameEn = safeString(body.name_en);
  const nameUr = safeString(body.name_ur);
  const descriptionEn = safeString(body.description_en);
  const descriptionUr = safeString(body.description_ur);
  const sortOrder = Number.isInteger(body.sort_order) ? Number(body.sort_order) : 0;
  const active = body.is_active === undefined ? true : body.is_active === true;
  const id = request.method === "POST" ? crypto.randomUUID() : entityId;
  const now = new Date().toISOString();

  if (!validSlug(slug) || !nameEn || nameEn.length > 160 || !nameUr || nameUr.length > 160 ||
      descriptionEn.length > 2000 || descriptionUr.length > 2000 || Math.abs(sortOrder) > 100000) {
    return json({ error: "validation_failed" }, 400);
  }

  try {
    if (isCategory) {
      const write = request.method === "POST"
        ? env.DB.prepare("INSERT INTO categories (id, slug, name_en, name_ur, description_en, description_ur, sort_order, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)")
            .bind(id, slug, nameEn, nameUr, descriptionEn, descriptionUr, sortOrder, active ? 1 : 0, now)
        : env.DB.prepare("UPDATE categories SET slug=?1, name_en=?2, name_ur=?3, description_en=?4, description_ur=?5, sort_order=?6, is_active=?7, updated_at=?8 WHERE id=?9")
            .bind(slug, nameEn, nameUr, descriptionEn, descriptionUr, sortOrder, active ? 1 : 0, now, id);
      const statements: D1PreparedStatement[] = [
        write,
        env.DB.prepare(
          "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json, created_at) " +
          "SELECT ?1, ?2, ?3, ?4, 'category', id, ?5, ?6 FROM categories WHERE id = ?7 AND updated_at = ?6"
        ).bind(
          crypto.randomUUID(), user.id, user.role,
          request.method === "POST" ? "category.created" : "category.updated",
          JSON.stringify({ slug, is_active: active }), now, id
        )
      ];
      const results = await env.DB.batch(statements);
      if ((results[0]?.meta?.changes ?? 0) !== 1) return json({ error: "category_not_found" }, request.method === "PATCH" ? 404 : 409);
      return json({ saved: true, id }, request.method === "POST" ? 201 : 200);
    }

    const price = Number(body.price_paisa);
    const compareAt = body.compare_at_paisa === null || body.compare_at_paisa === undefined || body.compare_at_paisa === "" ? null : Number(body.compare_at_paisa);
    const stock = body.stock_qty === null || body.stock_qty === undefined || body.stock_qty === "" ? null : Number(body.stock_qty);
    const categoryId = safeString(body.category_id) || null;
    const sku = safeString(body.sku) || null;
    const imageUrl = safeString(body.image_url) || null;
    if (request.method === "PATCH" && Object.prototype.hasOwnProperty.call(body, "stock_qty")) {
      return json({ error: "inventory_adjustment_required" }, 409);
    }
    if (!Number.isSafeInteger(price) || price < 0 || price > 100000000000 ||
        (compareAt !== null && (!Number.isSafeInteger(compareAt) || compareAt < 0)) ||
        (stock !== null && (!Number.isSafeInteger(stock) || stock < 0 || stock > 100000000)) ||
        (categoryId !== null && !validUuid(categoryId)) ||
        (sku !== null && sku.length > 100) ||
        (imageUrl !== null && (imageUrl.length > 2000 || !/^https:\/\//i.test(imageUrl)))) {
      return json({ error: "validation_failed" }, 400);
    }
    const available = body.is_available === undefined ? true : body.is_available === true;
    const featured = body.is_featured === true;
    const insertOrUpdate = request.method === "POST"
      ? env.DB.prepare("INSERT INTO products (id, category_id, sku, slug, name_en, name_ur, description_en, description_ur, price_paisa, compare_at_paisa, image_url, stock_qty, is_available, is_featured, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?16)")
          .bind(id, categoryId, sku, slug, nameEn, nameUr, descriptionEn, descriptionUr, price, compareAt, imageUrl, stock, available ? 1 : 0, featured ? 1 : 0, sortOrder, now)
      : env.DB.prepare("UPDATE products SET category_id=?1, sku=?2, slug=?3, name_en=?4, name_ur=?5, description_en=?6, description_ur=?7, price_paisa=?8, compare_at_paisa=?9, image_url=?10, is_available=?11, is_featured=?12, sort_order=?13, updated_at=?14 WHERE id=?15")
          .bind(categoryId, sku, slug, nameEn, nameUr, descriptionEn, descriptionUr, price, compareAt, imageUrl, available ? 1 : 0, featured ? 1 : 0, sortOrder, now, id);

    const statements: D1PreparedStatement[] = [insertOrUpdate];
    if (request.method === "POST" && stock !== null && stock > 0) {
      const openingId = crypto.randomUUID();
      statements.push(
        env.DB.prepare(
          "INSERT INTO inventory_adjustments (id, product_id, actor_staff_id, reason, delta_qty, previous_stock_qty, new_stock_qty, note, created_at) " +
          "VALUES (?1, ?2, ?3, 'stock_received', ?4, 0, ?4, 'Opening stock at product creation', ?5)"
        ).bind(openingId, id, user.id, stock, now),
        env.DB.prepare(
          "INSERT INTO inventory_movements (id, product_id, delta_qty, reason, reference_type, reference_id, actor_staff_id, note, created_at) " +
          "SELECT id, product_id, delta_qty, reason, 'inventory_adjustment', id, actor_staff_id, note, created_at " +
          "FROM inventory_adjustments WHERE id = ?1"
        ).bind(openingId)
      );
    }
    statements.push(
      request.method === "POST"
        ? env.DB.prepare(
            "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json, created_at) " +
            "SELECT ?1, ?2, ?3, 'product.created', 'product', id, ?4, ?5 FROM products WHERE id = ?6 AND created_at = ?5"
          ).bind(crypto.randomUUID(), user.id, user.role, JSON.stringify({ slug, price_paisa: price, initial_stock_qty: stock }), now, id)
        : env.DB.prepare(
            "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json, created_at) " +
            "SELECT ?1, ?2, ?3, 'product.updated', 'product', id, ?4, ?5 FROM products WHERE id = ?6 AND updated_at = ?5"
          ).bind(crypto.randomUUID(), user.id, user.role, JSON.stringify({ slug, price_paisa: price, is_available: available }), now, id)
    );
    const results = await env.DB.batch(statements);
    if ((results[0]?.meta?.changes ?? 0) !== 1) return json({ error: "product_not_found" }, request.method === "PATCH" ? 404 : 409);
    return json({ saved: true, id }, request.method === "POST" ? 201 : 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/UNIQUE constraint failed/i.test(message)) return json({ error: "slug_or_sku_conflict" }, 409);
    if (/FOREIGN KEY constraint failed/i.test(message)) return json({ error: "invalid_category" }, 400);
    throw error;
  }
}


const STAFF_MANAGEMENT_ROLES: readonly StaffUserRow["role"][] = ["owner", "manager"];
const STAFF_ASSIGNABLE_ROLES: readonly StaffUserRow["role"][] = [
  "manager", "operator", "kitchen", "finance", "rider", "support"
];
const STAFF_MANAGER_ASSIGNABLE_ROLES: readonly StaffUserRow["role"][] = [
  "operator", "kitchen", "finance", "rider", "support"
];

function canManageStaffTarget(actor: SessionUser, targetRole: StaffUserRow["role"]): boolean {
  if (actor.role !== "owner" && actor.role !== "manager") return false;
  if (targetRole === "owner") return false;
  if (actor.role === "manager" && targetRole === "manager") return false;
  return true;
}

function canAssignStaffRole(actor: SessionUser, role: string): role is StaffUserRow["role"] {
  const allowed = actor.role === "owner" ? STAFF_ASSIGNABLE_ROLES : STAFF_MANAGER_ASSIGNABLE_ROLES;
  return allowed.includes(role as StaffUserRow["role"]);
}

async function adminStaffApi(request: Request, env: Env, url: URL, user: SessionUser): Promise<Response | null> {
  const collection = url.pathname === "/api/v1/admin/staff";
  const resetMatch = url.pathname.match(/^\/api\/v1\/admin\/staff\/([0-9a-f-]{36})\/reset-password$/i);
  const staffMatch = url.pathname.match(/^\/api\/v1\/admin\/staff\/([0-9a-f-]{36})$/i);
  if (!collection && !resetMatch && !staffMatch) return null;
  if (!hasRole(user, STAFF_MANAGEMENT_ROLES)) return roleDenied();

  if (request.method === "GET" && collection) {
    const result = await env.DB.prepare(
      "SELECT id, email, display_name, role, is_active, last_login_at, created_at, updated_at " +
      "FROM staff_users ORDER BY role, display_name LIMIT 200"
    ).all<JsonRecord>();
    return json({ staff: result.results });
  }

  if (request.method === "POST" && collection) {
    if (!browserOriginAllowed(request, env)) return json({ error: "origin_not_allowed" }, 403);
    const body = await parseJsonBody(request, 8192);
    if (!body) return json({ error: "invalid_request" }, 400);

    const email = safeString(body.email).toLowerCase();
    const displayName = safeString(body.display_name);
    const roleText = safeString(body.role);
    const password = typeof body.password === "string" ? body.password : "";
    if (!validEmail(email)) return json({ error: "invalid_email" }, 400);
    if (displayName.length < 2 || displayName.length > 100) return json({ error: "invalid_display_name" }, 400);
    if (!canAssignStaffRole(user, roleText)) return json({ error: "role_assignment_denied" }, 403);
    if (!validPassword(password)) return json({ error: "password_policy_failed" }, 400);

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const timestamp = new Date().toISOString();
    try {
      const results = await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO staff_users (id, email, password_hash, display_name, role, is_active, password_changed_at, created_at, updated_at) " +
          "VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?6, ?6)"
        ).bind(id, email, passwordHash, displayName, roleText, timestamp),
        env.DB.prepare(
          "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json, created_at) " +
          "SELECT ?1, ?2, ?3, 'staff.user_created', 'staff_user', id, ?4, ?5 FROM staff_users WHERE id = ?6"
        ).bind(
          crypto.randomUUID(),
          user.id,
          user.role,
          JSON.stringify({ email, role: roleText }),
          timestamp,
          id
        )
      ]);
      if ((results[0]?.meta?.changes ?? 0) !== 1) return json({ error: "staff_create_conflict" }, 409);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/UNIQUE constraint failed/i.test(message)) return json({ error: "staff_email_conflict" }, 409);
      throw error;
    }
    return json({ created: true, id, role: roleText }, 201);
  }

  if (request.method === "PATCH" && staffMatch) {
    if (!browserOriginAllowed(request, env)) return json({ error: "origin_not_allowed" }, 403);
    const body = await parseJsonBody(request, 4096);
    if (!body) return json({ error: "invalid_request" }, 400);
    const allowedKeys = ["display_name", "role", "is_active"];
    const keys = Object.keys(body);
    if (keys.length === 0 || keys.some(key => !allowedKeys.includes(key))) {
      return json({ error: "invalid_staff_update" }, 400);
    }

    const staffId = staffMatch[1].toLowerCase();
    const target = await env.DB.prepare(
      "SELECT id, role, is_active FROM staff_users WHERE id = ?1 LIMIT 1"
    ).bind(staffId).first<{ id: string; role: StaffUserRow["role"]; is_active: number }>();
    if (!target) return json({ error: "staff_not_found" }, 404);
    if (staffId === user.id && body.is_active === false) {
      return json({ error: "cannot_deactivate_self" }, 409);
    }
    if (!canManageStaffTarget(user, target.role)) return roleDenied();

    const displayName = body.display_name === undefined ? null : safeString(body.display_name);
    if (displayName !== null && (displayName.length < 2 || displayName.length > 100)) {
      return json({ error: "invalid_display_name" }, 400);
    }
    let nextRole: StaffUserRow["role"] | null = null;
    if (body.role !== undefined) {
      const roleText = safeString(body.role);
      if (!canAssignStaffRole(user, roleText)) return json({ error: "role_assignment_denied" }, 403);
      nextRole = roleText;
    }
    let nextActive: number | null = null;
    if (body.is_active !== undefined) {
      if (typeof body.is_active !== "boolean") return json({ error: "invalid_active_flag" }, 400);
      nextActive = body.is_active ? 1 : 0;
      if (staffId === user.id && nextActive === 0) {
        return json({ error: "cannot_deactivate_self" }, 409);
      }
    }
    if (displayName === null && nextRole === null && nextActive === null) {
      return json({ error: "empty_staff_update" }, 400);
    }

    const timestamp = new Date().toISOString();
    const accessChanged = nextRole !== null || nextActive !== null;
    const statements: D1PreparedStatement[] = [
      env.DB.prepare(
        "UPDATE staff_users SET display_name=COALESCE(?1, display_name), " +
        "role=COALESCE(?2, role), is_active=COALESCE(?3, is_active), updated_at=?4 " +
        "WHERE id=?5 AND role=?6"
      ).bind(displayName, nextRole, nextActive, timestamp, staffId, target.role)
    ];
    if (accessChanged) {
      statements.push(
        env.DB.prepare(
          "UPDATE staff_sessions SET revoked_at=?1 WHERE staff_user_id=?2 AND revoked_at IS NULL " +
          "AND EXISTS (SELECT 1 FROM staff_users WHERE id=?2 AND updated_at=?3)"
        ).bind(timestamp, staffId, timestamp)
      );
    }
    statements.push(
      env.DB.prepare(
        "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json, created_at) " +
        "SELECT ?1, ?2, ?3, 'staff.user_updated', 'staff_user', id, ?4, ?5 " +
        "FROM staff_users WHERE id=?6 AND updated_at=?5"
      ).bind(
        crypto.randomUUID(),
        user.id,
        user.role,
        JSON.stringify({ updated_fields: keys.sort(), role: nextRole, is_active: nextActive }),
        timestamp,
        staffId
      )
    );

    const results = await env.DB.batch(statements);
    if ((results[0]?.meta?.changes ?? 0) !== 1) return json({ error: "staff_changed_retry" }, 409);
    return json({ updated: true, id: staffId, sessions_revoked: accessChanged });
  }

  if (request.method === "POST" && resetMatch) {
    if (!browserOriginAllowed(request, env)) return json({ error: "origin_not_allowed" }, 403);
    const body = await parseJsonBody(request, 4096);
    if (!body || typeof body.new_password !== "string" || !validPassword(body.new_password)) {
      return json({ error: "password_policy_failed" }, 400);
    }
    const staffId = resetMatch[1].toLowerCase();
    const target = await env.DB.prepare(
      "SELECT id, role FROM staff_users WHERE id = ?1 LIMIT 1"
    ).bind(staffId).first<{ id: string; role: StaffUserRow["role"] }>();
    if (!target) return json({ error: "staff_not_found" }, 404);
    if (!canManageStaffTarget(user, target.role)) return roleDenied();

    const timestamp = new Date().toISOString();
    const passwordHash = await hashPassword(body.new_password);
    const results = await env.DB.batch([
      env.DB.prepare(
        "UPDATE staff_users SET password_hash=?1, password_changed_at=?2, updated_at=?2 " +
        "WHERE id=?3 AND role=?4"
      ).bind(passwordHash, timestamp, staffId, target.role),
      env.DB.prepare(
        "UPDATE staff_sessions SET revoked_at=?1 WHERE staff_user_id=?2 AND revoked_at IS NULL " +
        "AND EXISTS (SELECT 1 FROM staff_users WHERE id=?2 AND updated_at=?1)"
      ).bind(timestamp, staffId),
      env.DB.prepare(
        "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json, created_at) " +
        "SELECT ?1, ?2, ?3, 'staff.password_reset', 'staff_user', id, '{\"sessions_revoked\":true}', ?4 " +
        "FROM staff_users WHERE id=?5 AND updated_at=?4"
      ).bind(crypto.randomUUID(), user.id, user.role, timestamp, staffId)
    ]);
    if ((results[0]?.meta?.changes ?? 0) !== 1) return json({ error: "staff_changed_retry" }, 409);
    return json({ password_reset: true, id: staffId, sessions_revoked: true });
  }

  return json({ error: "method_not_allowed" }, 405);
}

const SETTINGS_READ_ROLES: readonly StaffUserRow["role"][] = ["owner", "manager", "operator", "kitchen", "finance", "rider", "support"];
const SETTINGS_WRITE_ROLES: readonly StaffUserRow["role"][] = ["owner", "manager"];
const EDITABLE_STORE_SETTING_KEYS = [
  "store_name_en",
  "store_name_ur",
  "default_language",
  "cod_enabled",
  "whatsapp_number",
  "store_status"
] as const;

async function adminSettingsApi(request: Request, env: Env, url: URL, user: SessionUser): Promise<Response | null> {
  if (url.pathname !== "/api/v1/admin/settings") return null;
  if (request.method === "GET") {
    if (!hasRole(user, SETTINGS_READ_ROLES)) return roleDenied();
    const result = await env.DB.prepare(
      "SELECT setting_key, value_json FROM store_settings WHERE is_public = 1 ORDER BY setting_key"
    ).all<SettingRow>();
    const settings: Record<string, unknown> = {};
    for (const row of result.results) settings[row.setting_key] = parseSetting(row.value_json);
    return json({ settings });
  }

  if (request.method !== "PATCH") return json({ error: "method_not_allowed" }, 405);
  if (!hasRole(user, SETTINGS_WRITE_ROLES)) return roleDenied();
  if (!browserOriginAllowed(request, env)) return json({ error: "origin_not_allowed" }, 403);

  const body = await parseJsonBody(request, 4096);
  if (!body) return json({ error: "invalid_request" }, 400);
  const keys = Object.keys(body);
  if (keys.length === 0) return json({ error: "empty_settings_update" }, 400);
  if (keys.some(key => key === "launch_ready" || key === "manual_transfer_enabled" || key === "currency")) {
    return json({ error: "setting_requires_release_gate" }, 409);
  }
  if (keys.some(key => !(EDITABLE_STORE_SETTING_KEYS as readonly string[]).includes(key))) {
    return json({ error: "unknown_setting" }, 400);
  }

  const updates: Array<{ key: string; value: unknown }> = [];
  for (const key of keys) {
    const value = body[key];
    if (key === "store_name_en" || key === "store_name_ur") {
      const name = safeString(value);
      if (name.length < 2 || name.length > 80) return json({ error: "invalid_store_name" }, 400);
      updates.push({ key, value: name });
    } else if (key === "default_language") {
      if (value !== "ur" && value !== "en") return json({ error: "invalid_default_language" }, 400);
      updates.push({ key, value });
    } else if (key === "cod_enabled") {
      if (typeof value !== "boolean") return json({ error: "invalid_cod_setting" }, 400);
      updates.push({ key, value });
    } else if (key === "whatsapp_number") {
      const phone = safeString(value);
      if (phone.length > 20 || (phone && !/^\+?[1-9][0-9]{7,14}$/.test(phone))) {
        return json({ error: "invalid_whatsapp_number" }, 400);
      }
      updates.push({ key, value: phone });
    } else if (key === "store_status") {
      if (value !== "setup" && value !== "paused") {
        return json({ error: "store_requires_release_gate" }, 409);
      }
      updates.push({ key, value });
    }
  }

  const timestamp = new Date().toISOString();
  const statements: D1PreparedStatement[] = updates.map(({ key, value }) =>
    env.DB.prepare(
      "INSERT INTO store_settings (setting_key, value_json, is_public, updated_at) " +
      "VALUES (?1, ?2, 1, ?3) " +
      "ON CONFLICT(setting_key) DO UPDATE SET value_json=excluded.value_json, " +
      "is_public=1, updated_at=excluded.updated_at"
    ).bind(key, JSON.stringify(value), timestamp)
  );
  statements.push(
    env.DB.prepare(
      "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json, created_at) " +
      "VALUES (?1, ?2, ?3, 'store.settings_updated', 'store_settings', NULL, ?4, ?5)"
    ).bind(
      crypto.randomUUID(),
      user.id,
      user.role,
      JSON.stringify({ updated_keys: updates.map(item => item.key).sort() }),
      timestamp
    )
  );

  try {
    await env.DB.batch(statements);
  } catch {
    return json({ error: "settings_update_failed" }, 409);
  }

  return json({ saved: true, updated_keys: updates.map(item => item.key).sort() });
}

const DELIVERY_READ_ROLES: readonly StaffUserRow["role"][] = [
  "owner", "manager", "operator", "kitchen", "rider"
];
const DELIVERY_WRITE_ROLES: readonly StaffUserRow["role"][] = ["owner", "manager"];

async function adminDeliveryApi(request: Request, env: Env, url: URL, user: SessionUser): Promise<Response | null> {
  const collection = url.pathname === "/api/v1/admin/delivery-zones";
  const match = url.pathname.match(/^\/api\/v1\/admin\/delivery-zones\/([0-9a-f-]{36})$/i);
  if (!collection && !match) return null;

  if (request.method === "GET" && collection) {
    if (!hasRole(user, DELIVERY_READ_ROLES)) return roleDenied();
    const result = await env.DB.prepare(
      "SELECT id, code, name_en, name_ur, country_code, region, city, " +
      "delivery_fee_paisa, minimum_order_paisa, is_active, created_at, updated_at " +
      "FROM delivery_zones ORDER BY country_code, city, name_en LIMIT 500"
    ).all<JsonRecord>();
    return json({ delivery_zones: result.results });
  }

  if (request.method !== "POST" && request.method !== "PATCH") {
    return json({ error: "method_not_allowed" }, 405);
  }
  if (request.method === "POST" && !collection) return json({ error: "not_found" }, 404);
  if (request.method === "PATCH" && (!match?.[1] || !validUuid(match[1]))) {
    return json({ error: "not_found" }, 404);
  }
  if (!hasRole(user, DELIVERY_WRITE_ROLES)) return roleDenied();
  if (!browserOriginAllowed(request, env)) return json({ error: "origin_not_allowed" }, 403);

  const body = await parseJsonBody(request, 6000);
  if (!body) return json({ error: "invalid_request" }, 400);
  const code = safeString(body.code).toUpperCase();
  const nameEn = safeString(body.name_en);
  const nameUr = safeString(body.name_ur);
  const countryCode = safeString(body.country_code || "PK").toUpperCase();
  const region = safeString(body.region);
  const city = safeString(body.city);
  const deliveryFee = Number(body.delivery_fee_paisa);
  const minimumOrder = Number(body.minimum_order_paisa);
  const isActive = body.is_active === undefined ? true : body.is_active === true;

  if (!/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(code) ||
      !nameEn || nameEn.length > 140 ||
      !nameUr || nameUr.length > 140 ||
      !/^[A-Z]{2}$/.test(countryCode) ||
      !city || city.length > 120 ||
      region.length > 120 ||
      !Number.isSafeInteger(deliveryFee) || deliveryFee < 0 || deliveryFee > 100000000000 ||
      !Number.isSafeInteger(minimumOrder) || minimumOrder < 0 || minimumOrder > 100000000000) {
    return json({ error: "validation_failed" }, 400);
  }

  const id = request.method === "POST" ? crypto.randomUUID() : match![1].toLowerCase();
  const timestamp = new Date().toISOString();
  const statement = request.method === "POST"
    ? env.DB.prepare(
        "INSERT INTO delivery_zones " +
        "(id, code, name_en, name_ur, country_code, region, city, delivery_fee_paisa, minimum_order_paisa, is_active, created_at, updated_at) " +
        "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11)"
      ).bind(id, code, nameEn, nameUr, countryCode, region, city, deliveryFee, minimumOrder, isActive ? 1 : 0, timestamp)
    : env.DB.prepare(
        "UPDATE delivery_zones SET code=?1, name_en=?2, name_ur=?3, country_code=?4, region=?5, city=?6, " +
        "delivery_fee_paisa=?7, minimum_order_paisa=?8, is_active=?9, updated_at=?10 WHERE id=?11"
      ).bind(code, nameEn, nameUr, countryCode, region, city, deliveryFee, minimumOrder, isActive ? 1 : 0, timestamp, id);

  try {
    const results = await env.DB.batch([
      statement,
      env.DB.prepare(
        "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json, created_at) " +
        "SELECT ?1, ?2, ?3, ?4, 'delivery_zone', id, ?5, ?6 FROM delivery_zones WHERE id = ?7 AND updated_at = ?6"
      ).bind(
        crypto.randomUUID(), user.id, user.role,
        request.method === "POST" ? "delivery_zone.created" : "delivery_zone.updated",
        JSON.stringify({
          code,
          country_code: countryCode,
          city,
          delivery_fee_paisa: deliveryFee,
          minimum_order_paisa: minimumOrder,
          is_active: isActive
        }),
        timestamp,
        id
      )
    ]);
    if ((results[0]?.meta?.changes ?? 0) !== 1) {
      return json({ error: "delivery_zone_not_found" }, request.method === "PATCH" ? 404 : 409);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/UNIQUE constraint failed/i.test(message)) return json({ error: "delivery_zone_code_conflict" }, 409);
    throw error;
  }

  return json({ saved: true, id }, request.method === "POST" ? 201 : 200);
}

const PAYMENT_READ_ROLES: readonly StaffUserRow["role"][] = ["owner", "manager", "finance"];
const PAYMENT_WRITE_ROLES: readonly StaffUserRow["role"][] = ["owner", "manager", "finance"];

async function adminPaymentsApi(request: Request, env: Env, url: URL, user: SessionUser): Promise<Response | null> {
  if (request.method === "GET" && url.pathname === "/api/v1/admin/payments") {
    if (!hasRole(user, PAYMENT_READ_ROLES)) return roleDenied();
    const status = safeString(url.searchParams.get("status"));
    if (status && status !== "unpaid" && status !== "collected") {
      return json({ error: "invalid_payment_filter" }, 400);
    }
    const result = await env.DB.prepare(
      "SELECT p.id AS payment_id, p.order_id, o.order_number, o.status AS order_status, " +
      "p.method, p.status AS payment_status, p.amount_paisa, p.created_at, p.reviewed_at, " +
      "s.display_name AS collected_by " +
      "FROM payments p JOIN orders o ON o.id = p.order_id " +
      "LEFT JOIN staff_users s ON s.id = p.reviewer_staff_id " +
      "WHERE p.method = 'cod' AND (?1 = '' OR p.status = ?1) " +
      "ORDER BY CASE WHEN p.status = 'unpaid' THEN 0 ELSE 1 END, p.created_at DESC LIMIT 200"
    ).bind(status).all<JsonRecord>();
    return json({ payments: result.results });
  }

  if (request.method !== "POST" || url.pathname !== "/api/v1/admin/payments/cod-collection") return null;
  if (!hasRole(user, PAYMENT_WRITE_ROLES)) return roleDenied();
  if (!browserOriginAllowed(request, env)) return json({ error: "origin_not_allowed" }, 403);

  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() ?? "";
  if (!/^[A-Za-z0-9._:-]{16,128}$/.test(idempotencyKey)) {
    return json({ error: "idempotency_key_required" }, 400);
  }
  const body = await parseJsonBody(request, 2048);
  if (!body) return json({ error: "invalid_request" }, 400);
  const orderId = safeString(body.order_id).toLowerCase();
  if (!validUuid(orderId)) return json({ error: "invalid_order_id" }, 400);

  const requestHash = await sha256Hex(JSON.stringify({ order_id: orderId }));
  const existing = await env.DB.prepare(
    "SELECT request_hash, response_json, expires_at FROM idempotency_keys " +
    "WHERE scope = 'cod_collection' AND idempotency_key = ?1 LIMIT 1"
  ).bind(idempotencyKey).first<IdempotencyRow>();
  if (existing && Date.parse(existing.expires_at) > Date.now()) {
    if (existing.request_hash !== requestHash) return json({ error: "idempotency_key_reused" }, 409);
    if (!existing.response_json) return json({ error: "request_already_processing" }, 409);
    try {
      return json(JSON.parse(existing.response_json) as JsonRecord, 200, { "Idempotent-Replay": "true" });
    } catch {
      return json({ error: "idempotency_record_invalid" }, 500);
    }
  }

  const payment = await env.DB.prepare(
    "SELECT p.id AS payment_id, p.status AS payment_status, p.method, p.amount_paisa, " +
    "o.id AS order_id, o.order_number, o.status AS order_status, o.payment_status AS order_payment_status " +
    "FROM payments p JOIN orders o ON o.id = p.order_id " +
    "WHERE o.id = ?1 ORDER BY p.created_at DESC LIMIT 1"
  ).bind(orderId).first<{
    payment_id: string;
    payment_status: string;
    method: string;
    amount_paisa: number;
    order_id: string;
    order_number: string;
    order_status: string;
    order_payment_status: string;
  }>();

  if (!payment) return json({ error: "payment_not_found" }, 404);
  if (payment.method !== "cod") return json({ error: "not_cod_payment" }, 409);
  if (payment.order_status !== "delivered") return json({ error: "order_not_delivered" }, 409);
  if (payment.payment_status === "collected" && payment.order_payment_status === "collected") {
    return json({ error: "payment_already_collected" }, 409);
  }
  if (payment.payment_status !== "unpaid" || payment.order_payment_status !== "unpaid") {
    return json({ error: "payment_state_conflict" }, 409);
  }

  const timestamp = new Date().toISOString();
  const responseBody = {
    collected: true,
    order_id: payment.order_id,
    order_number: payment.order_number,
    payment_id: payment.payment_id,
    payment_status: "collected",
    amount_paisa: payment.amount_paisa
  };
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const auditId = crypto.randomUUID();
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(
      "DELETE FROM idempotency_keys WHERE scope = 'cod_collection' " +
      "AND idempotency_key = ?1 AND expires_at <= ?2"
    ).bind(idempotencyKey, timestamp),
    env.DB.prepare(
      "UPDATE orders SET payment_status='collected', updated_at=?1 " +
      "WHERE id=?2 AND status='delivered' AND payment_method='cod' AND payment_status='unpaid'"
    ).bind(timestamp, orderId),
    env.DB.prepare(
      "UPDATE payments SET status='collected', reviewer_staff_id=?1, reviewed_at=?2, updated_at=?2 " +
      "WHERE id=?3 AND method='cod' AND status='unpaid' " +
      "AND EXISTS (SELECT 1 FROM orders WHERE id=?4 AND status='delivered' AND payment_status='collected')"
    ).bind(user.id, timestamp, payment.payment_id, orderId),
    env.DB.prepare(
      "INSERT INTO audit_logs (id, actor_staff_id, actor_role, action, entity_type, entity_id, metadata_json, created_at) " +
      "SELECT ?1, ?2, ?3, 'payment.cod_collected', 'payment', p.id, ?4, ?5 " +
      "FROM payments p WHERE p.id=?6 AND p.status='collected' AND p.reviewed_at=?5 AND changes()=1"
    ).bind(
      auditId,
      user.id,
      user.role,
      JSON.stringify({ order_id: orderId, order_number: payment.order_number, amount_paisa: payment.amount_paisa }),
      timestamp,
      payment.payment_id
    ),
    env.DB.prepare(
      "INSERT INTO idempotency_keys (id, scope, idempotency_key, request_hash, response_json, expires_at) " +
      "SELECT ?1, 'cod_collection', ?2, ?3, ?4, ?5 WHERE EXISTS (SELECT 1 FROM audit_logs WHERE id=?6)"
    ).bind(
      crypto.randomUUID(),
      idempotencyKey,
      requestHash,
      JSON.stringify(responseBody),
      expiresAt,
      auditId
    )
  ];

  try {
    const results = await env.DB.batch(statements);
    if ((results[1]?.meta?.changes ?? 0) !== 1 || (results[2]?.meta?.changes ?? 0) !== 1 ||
        (results[3]?.meta?.changes ?? 0) !== 1 || (results[4]?.meta?.changes ?? 0) !== 1) {
      return json({ error: "payment_state_changed_retry" }, 409);
    }
  } catch {
    const concurrent = await env.DB.prepare(
      "SELECT request_hash, response_json, expires_at FROM idempotency_keys " +
      "WHERE scope = 'cod_collection' AND idempotency_key = ?1 LIMIT 1"
    ).bind(idempotencyKey).first<IdempotencyRow>();
    if (concurrent && Date.parse(concurrent.expires_at) > Date.now()) {
      if (concurrent.request_hash !== requestHash) return json({ error: "idempotency_key_reused" }, 409);
      if (concurrent.response_json) {
        try {
          return json(JSON.parse(concurrent.response_json) as JsonRecord, 200, { "Idempotent-Replay": "true" });
        } catch {
          return json({ error: "idempotency_record_invalid" }, 500);
        }
      }
    }
    return json({ error: "payment_collection_failed" }, 409);
  }

  return json(responseBody, 201);
}


const DASHBOARD_READ_ROLES: readonly StaffUserRow["role"][] = ["owner", "manager", "operator", "kitchen", "finance"];

async function adminDashboardMetrics(request: Request, env: Env, url: URL, user: SessionUser): Promise<Response | null> {
  if (url.pathname !== "/api/v1/admin/metrics") return null;
  if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405);
  if (!hasRole(user, DASHBOARD_READ_ROLES)) return roleDenied();

  const metrics = await env.DB.prepare(`
    SELECT
      (SELECT COUNT(*) FROM orders) AS total_orders,
      (SELECT COUNT(*) FROM orders WHERE status IN ('pending','confirmed','preparing','ready','out_for_delivery')) AS open_orders,
      (SELECT COUNT(*) FROM orders WHERE status = 'delivered') AS delivered_orders,
      (SELECT COALESCE(SUM(total_paisa), 0) FROM orders WHERE status = 'delivered') AS delivered_revenue_paisa,
      (SELECT COUNT(*) FROM orders WHERE payment_method = 'cod' AND payment_status = 'unpaid') AS unpaid_cod_count,
      (SELECT COUNT(*) FROM products WHERE is_available = 1) AS active_products,
      (SELECT COUNT(*) FROM products WHERE stock_qty IS NOT NULL AND stock_qty <= 5 AND is_available = 1) AS low_stock_products,
      (SELECT COUNT(*) FROM categories WHERE is_active = 1) AS active_categories,
      (SELECT COUNT(*) FROM delivery_zones WHERE is_active = 1) AS active_delivery_zones
  `).first<JsonRecord>();

  const number = (key: string): number => {
    const value = Number(metrics?.[key] ?? 0);
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  };

  return json({
    metrics: {
      total_orders: number("total_orders"),
      open_orders: number("open_orders"),
      delivered_orders: number("delivered_orders"),
      delivered_revenue_paisa: number("delivered_revenue_paisa"),
      unpaid_cod_count: number("unpaid_cod_count"),
      active_products: number("active_products"),
      low_stock_products: number("low_stock_products"),
      active_categories: number("active_categories"),
      active_delivery_zones: number("active_delivery_zones")
    }
  });
}

async function adminApi(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method === "POST" && url.pathname === "/api/v1/admin/bootstrap-owner") {
    return ownerBootstrap(request, env);
  }
  if (request.method === "POST" && url.pathname === "/api/v1/admin/login") {
    return adminLogin(request, env);
  }
  if (request.method === "POST" && url.pathname === "/api/v1/admin/logout") {
    return adminLogout(request, env);
  }
  if (request.method === "GET" && url.pathname === "/api/v1/admin/session") {
    return adminSession(request, env);
  }

  const user = await currentStaff(request, env);
  if (!user) return json({ error: "unauthenticated" }, 401);

  const metricsResponse = await adminDashboardMetrics(request, env, url, user);
  if (metricsResponse) return metricsResponse;

  const paymentsResponse = await adminPaymentsApi(request, env, url, user);
  if (paymentsResponse) return paymentsResponse;

  const staffResponse = await adminStaffApi(request, env, url, user);
  if (staffResponse) return staffResponse;

  const settingsResponse = await adminSettingsApi(request, env, url, user);
  if (settingsResponse) return settingsResponse;

  const deliveryResponse = await adminDeliveryApi(request, env, url, user);
  if (deliveryResponse) return deliveryResponse;

  const inventoryResponse = await adminInventoryApi(request, env, url, user);
  if (inventoryResponse) return inventoryResponse;

  const catalogueResponse = await adminCatalogueApi(request, env, url, user);
  if (catalogueResponse) return catalogueResponse;

  const orderResponse = await orderAdminApi(request, env, url, user);
  if (orderResponse) return orderResponse;

  return json({ error: "not_found" }, 404);
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/v1/admin/")) {
    return adminApi(request, env, url);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/health") {
    return health(env);
  }
  if (request.method === "GET" && url.pathname === "/api/v1/categories") {
    return listCategories(env);
  }
  if (request.method === "GET" && url.pathname === "/api/v1/products") {
    return listProducts(request, env);
  }
  if (request.method === "GET" && url.pathname === "/api/v1/storefront-config") {
    return storefrontConfig(env);
  }
  if (request.method === "GET" && url.pathname === "/api/v1/delivery-zones") {
    return listDeliveryZones(env);
  }
  if (request.method === "POST" && url.pathname === "/api/v1/orders") {
    return checkout(request, env);
  }

  const trackingMatch = url.pathname.match(/^\/api\/v1\/orders\/track\/([a-f0-9]{64})$/i);
  if (request.method === "GET" && trackingMatch) {
    return trackOrder(request, env, trackingMatch[1].toLowerCase());
  }

  return json({
    error: "not_found",
    message: "The requested API endpoint does not exist."
  }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");

    if (!originAllowed(origin, env)) {
      return applySecurityHeaders(json({ error: "origin_not_allowed" }, 403), request, env);
    }

    if (request.method === "OPTIONS") {
      return applySecurityHeaders(new Response(null, { status: 204 }), request, env);
    }

    try {
      const response = await route(request, env);
      return applySecurityHeaders(response, request, env);
    } catch (error) {
      const requestId = crypto.randomUUID();
      console.error("fryzar_api_error", {
        requestId,
        path: new URL(request.url).pathname,
        errorType: error instanceof Error ? error.name : "unknown"
      });
      return applySecurityHeaders(json({
        error: "internal_error",
        request_id: requestId,
        message: "The request could not be completed."
      }, 500), request, env);
    }
  }
};
