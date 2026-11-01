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
  const clientIp = request.headers.get("CF-Connecting-IP");

  if (!clientIp) {
    return env.APP_ENV !== "production";
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
    return env.APP_ENV !== "production";
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
        "updated_at = CURRENT_TIMESTAMP WHERE id = ?2 AND is_available = 1"
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
      salt,
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
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
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
    )
  ]);

  const headers = new Headers();
  headers.append("Set-Cookie", sessionCookie(token, ADMIN_SESSION_SECONDS));
  return applySecurityHeaders(json({
    authenticated: true,
    user: {
      id: staff.id,
      email: staff.email,
      display_name: staff.display_name,
      role: staff.role
    },
    expires_at: expiresAt
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
  if (configuredToken.length < 32 || suppliedToken.length < 32) {
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

  const existing = await env.DB.prepare(
    "SELECT COUNT(*) AS user_count FROM staff_users"
  ).first<{ user_count: number }>();

  if (!existing || existing.user_count !== 0) {
    return json({ error: "owner_already_configured" }, 409);
  }

  const passwordHash = await hashPassword(password);
  const staff: SessionUser = {
    id: crypto.randomUUID(),
    email,
    display_name: displayName,
    role: "owner"
  };

  try {
    await env.DB.prepare(
      "INSERT INTO staff_users (id, email, password_hash, display_name, role, is_active) " +
      "VALUES (?1, ?2, ?3, ?4, 'owner', 1)"
    ).bind(staff.id, staff.email, passwordHash, staff.display_name).run();
  } catch {
    return json({ error: "owner_already_configured" }, 409);
  }

  const response = await createStaffSession(env, staff, request);
  return new Response(response.body, {
    status: 201,
    headers: response.headers
  });
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

  const staff = await env.DB.prepare(
    "SELECT id, email, password_hash, display_name, role, is_active " +
    "FROM staff_users WHERE email = ?1 COLLATE NOCASE LIMIT 1"
  ).bind(email).first<StaffUserRow>();

  if (!staff || staff.is_active !== 1 || !staff.password_hash) {
    return json({ error: "invalid_credentials" }, 401);
  }

  const valid = await verifyPassword(password, staff.password_hash);
  if (!valid) return json({ error: "invalid_credentials" }, 401);

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
