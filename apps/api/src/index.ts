interface QueryResult<T> {
  success: boolean;
  results: T[];
  meta?: Record<string, unknown>;
}

interface PreparedStatement {
  bind(...values: unknown[]): PreparedStatement;
  first<T = Record<string, unknown>>(columnName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<QueryResult<T>>;
}

interface D1Database {
  prepare(query: string): PreparedStatement;
}

interface Env {
  DB: D1Database;
  APP_ENV?: string;
  ALLOWED_ORIGINS?: string;
}

type JsonRecord = Record<string, unknown>;

function json(data: JsonRecord, status = 200, extraHeaders?: HeadersInit): Response {
  const headers = new Headers(extraHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { status, headers });
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
    headers.set("Access-Control-Allow-Headers", "Content-Type, Idempotency-Key, X-Request-ID");
    headers.set("Access-Control-Max-Age", "600");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
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
  ).all<{ setting_key: string; value_json: string }>();

  const settings: JsonRecord = {};
  for (const row of result.results) {
    settings[row.setting_key] = parseSetting(row.value_json);
  }

  return json({ settings });
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

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
