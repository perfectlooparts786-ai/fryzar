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
  const language = body.customer_language === "en" ? "en" : body.customer_language === "ur" || body.customer_language === undefined ? "ur" : null;
  const paymentMethod = body.payment_method === "cod" || body.payment_method === "manual_transfer" ? body.payment_method : null;
  const notes = safeString(body.notes);
  const rawItems = body.items;

  if (customerName.length < 2 || customerName.length > 100) return { ok: false, response: json({ error: "invalid_customer_name" }, 400) };
  if (phone.length < 10 || phone.length > 15) return { ok: false, response: json({ error: "invalid_customer_phone" }, 400) };
  if (address.length < 8 || address.length > 500) return { ok: false, response: json({ error: "invalid_delivery_address" }, 400) };
  if (!validUuid(deliveryZoneId)) return { ok: false, response: json({ error: "delivery_zone_required" }, 400) };
  if (!language) return { ok: false, response: json({ error: "invalid_language" }, 400) };
  if (!paymentMethod) return { ok: false, response: json({ error: "invalid_payment_method" }, 400) };
  if (notes.length > 500) return { ok: false, response: json({ error: "notes_too_long" }, 400) };
  if (!Array.isArray(rawItems) || rawItems.length < 1 || rawItems.length > 20) return { ok: false, response: json({ error: "invalid_cart" }, 400) };

  const items = [];
  const seen = new Set();
  for (const item of rawItems) {
    if (!isRecord(item)) return { ok: false, response: json({ error: "invalid_cart_line" }, 400) };
    const productId = safeString(item.product_id);
    const quantity = item.quantity;
    if (!validUuid(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return { ok: false, response: json({ error: "invalid_cart_line" }, 400) };
    }
    if (seen.has(productId)) return { ok: false, response: json({ error: "duplicate_cart_product" }, 400) };
    seen.add(productId);
    items.push({ product_id: productId, quantity });
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
function clientOrderResponse(stored, trackingToken) {
  return {
    ...stored,
    tracking_token: trackingToken,
    tracking_url: "/api/v1/orders/track/" + trackingToken
  };
}
async function loadIdempotency(env, key) {
  return env.DB.prepare(
    "SELECT request_hash, response_json, expires_at FROM idempotency_keys " +
    "WHERE scope = 'checkout' AND idempotency_key = ?1 LIMIT 1"
  ).bind(key).first();
}
async function checkout(request, env) {
  const rateAllowed = await consumeRateLimit(request, env, "checkout", 5, 10 * 60 * 1000);
  if (!rateAllowed) return json({ error: "rate_limit_exceeded", retry_after_seconds: 600 }, 429, { "Retry-After": "600" });

  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() ?? "";
  if (!/^[A-Za-z0-9._:-]{16,128}$/.test(idempotencyKey)) return json({ error: "idempotency_key_required" }, 400);

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
    if (existing.request_hash !== requestHash) return json({ error: "idempotency_key_reused" }, 409);
    if (!existing.response_json) return json({ error: "request_already_processing" }, 409);
    try {
      const stored = JSON.parse(existing.response_json);
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
  ).bind(input.delivery_zone_id).first();
  if (!zone) return json({ error: "delivery_zone_unavailable" }, 422);

  const placeholders = input.items.map((_, index) => "?" + String(index + 1)).join(", ");
  const productResult = await env.DB.prepare(
    "SELECT p.id, p.sku, p.name_ur, p.name_en, p.price_paisa, p.stock_qty, p.is_available " +
    "FROM products p LEFT JOIN categories c ON c.id = p.category_id " +
    "WHERE p.id IN (" + placeholders + ") AND p.is_available = 1 " +
    "AND (p.category_id IS NULL OR c.is_active = 1)"
  ).bind(...input.items.map((item) => item.product_id)).all();

  if (productResult.results.length !== input.items.length) return json({ error: "product_unavailable" }, 409);
  const products = new Map(productResult.results.map((product) => [product.id, product]));
  let subtotal = 0;

  for (const item of input.items) {
    const product = products.get(item.product_id);
    if (!product) return json({ error: "product_unavailable" }, 409);
    if (product.stock_qty !== null && product.stock_qty < item.quantity) return json({ error: "insufficient_stock" }, 409);
    if (!Number.isSafeInteger(product.price_paisa) || product.price_paisa < 0) return json({ error: "product_price_invalid" }, 409);
    subtotal += product.price_paisa * item.quantity;
    if (!Number.isSafeInteger(subtotal) || subtotal > 1000000000) return json({ error: "order_total_exceeded" }, 422);
  }

  if (subtotal < zone.minimum_order_paisa) {
    return json({ error: "minimum_order_not_met", minimum_order_paisa: zone.minimum_order_paisa }, 422);
  }
  const deliveryFee = zone.delivery_fee_paisa;
  if (!Number.isSafeInteger(deliveryFee) || deliveryFee < 0) return json({ error: "delivery_configuration_invalid" }, 503);
  const total = subtotal + deliveryFee;
  if (!Number.isSafeInteger(total) || total > 1000000000) return json({ error: "order_total_exceeded" }, 422);

  const orderId = crypto.randomUUID();
  const paymentId = crypto.randomUUID();
  const statusEventId = crypto.randomUUID();
  const auditId = crypto.randomUUID();
  const orderNumber = "FRZ-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + randomHex(3).toUpperCase();
  const trackingToken = await hmacHex(trackingSecret, "order-track:" + orderId);
  const trackingTokenHash = await sha256Hex(trackingToken);
  const createdAt = new Date().toISOString();
  const paymentStatus = input.payment_method === "cod" ? "unpaid" : "awaiting_proof";
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const storedResponse = {
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

  const statements = [
    env.DB.prepare(
      "DELETE FROM idempotency_keys WHERE scope = 'checkout' AND idempotency_key = ?1 AND expires_at <= ?2"
    ).bind(idempotencyKey, createdAt),
    env.DB.prepare(
      "INSERT INTO idempotency_keys (id, scope, idempotency_key, request_hash, response_json, expires_at) " +
      "VALUES (?1, 'checkout', ?2, ?3, ?4, ?5)"
    ).bind(crypto.randomUUID(), idempotencyKey, requestHash, JSON.stringify(storedResponse), expiresAt),
    env.DB.prepare(
      "INSERT INTO orders (id, order_number, tracking_token_hash, customer_name, customer_phone, delivery_address, " +
      "delivery_area, delivery_zone_id, customer_language, payment_method, payment_status, status, " +
      "subtotal_paisa, delivery_fee_paisa, discount_paisa, total_paisa, notes) " +
      "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'pending', ?12, ?13, 0, ?14, ?15)"
    ).bind(
      orderId, orderNumber, trackingTokenHash, input.customer_name, input.customer_phone,
      input.delivery_address, input.customer_language === "ur" ? zone.name_ur : zone.name_en,
      zone.id, input.customer_language, input.payment_method, paymentStatus,
      subtotal, deliveryFee, total, input.notes
    ),
    env.DB.prepare(
      "INSERT INTO payments (id, order_id, method, status, amount_paisa) VALUES (?1, ?2, ?3, ?4, ?5)"
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
        "INSERT INTO order_items (id, order_id, product_id, product_name_ur_snapshot, product_name_en_snapshot, " +
        "sku_snapshot, unit_price_paisa, quantity, line_total_paisa) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
      ).bind(
        crypto.randomUUID(), orderId, product.id, product.name_ur, product.name_en,
        product.sku, product.price_paisa, item.quantity, product.price_paisa * item.quantity
      ),
      env.DB.prepare(
        "UPDATE products SET stock_qty = CASE WHEN stock_qty IS NULL THEN NULL ELSE stock_qty - ?1 END, " +
        "updated_at = CURRENT_TIMESTAMP WHERE id = ?2 AND is_available = 1"
      ).bind(item.quantity, product.id),
      env.DB.prepare(
        "INSERT INTO inventory_movements (id, product_id, delta_qty, reason, reference_type, reference_id, note) " +
        "SELECT ?1, id, ?2, 'order_reserved', 'order', ?3, 'Stock reserved for order' " +
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
        const stored = JSON.parse(replay.response_json);
        const token = await hmacHex(trackingSecret, "order-track:" + stored.order.id);
        return json(clientOrderResponse(stored, token), 200, { "Idempotent-Replay": "true" });
      }
    } catch {}
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("insufficient_stock") || message.includes("product_unavailable") || message.includes("product_missing")) {
      return json({ error: "product_or_stock_changed" }, 409);
    }
    return json({ error: "order_could_not_be_created" }, 500);
  }
}
async function trackOrder(request, env, token) {
  const rateAllowed = await consumeRateLimit(request, env, "order-track", 40, 60 * 1000);
  if (!rateAllowed) return json({ error: "rate_limit_exceeded", retry_after_seconds: 60 }, 429, { "Retry-After": "60" });
  const tokenHash = await sha256Hex(token);
  const order = await env.DB.prepare(
    "SELECT id, order_number, status, payment_method, payment_status, subtotal_paisa, delivery_fee_paisa, " +
    "discount_paisa, total_paisa, customer_language, created_at, updated_at " +
    "FROM orders WHERE tracking_token_hash = ?1 LIMIT 1"
  ).bind(tokenHash).first();
  if (!order) return json({ error: "order_not_found" }, 404);
  const items = await env.DB.prepare(
    "SELECT product_name_ur_snapshot, product_name_en_snapshot, unit_price_paisa, quantity, line_total_paisa " +
    "FROM order_items WHERE order_id = ?1 ORDER BY rowid ASC"
  ).bind(order.id).all();
  return json({ order, items: items.results });
}
async function route(request, env) {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/api/v1/health") return health(env);
  if (request.method === "GET" && url.pathname === "/api/v1/categories") return listCategories(env);
  if (request.method === "GET" && url.pathname === "/api/v1/products") return listProducts(request, env);
  if (request.method === "GET" && url.pathname === "/api/v1/storefront-config") return storefrontConfig(env);
  if (request.method === "POST" && url.pathname === "/api/v1/orders") return checkout(request, env);
  const trackingMatch = url.pathname.match(/^\/api\/v1\/orders\/track\/([a-f0-9]{64})$/i);
  if (request.method === "GET" && trackingMatch) return trackOrder(request, env, trackingMatch[1].toLowerCase());
  return json({ error: "not_found", message: "The requested API endpoint does not exist." }, 404);
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    if (!originAllowed(origin, env)) return applySecurityHeaders(json({ error: "origin_not_allowed" }, 403), request, env);
    if (request.method === "OPTIONS") return applySecurityHeaders(new Response(null, { status: 204 }), request, env);
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