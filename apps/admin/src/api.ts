export interface StaffUser {
  id: string;
  email: string;
  display_name: string;
  role: "owner" | "manager" | "operator" | "kitchen" | "finance" | "rider" | "support";
}

export interface SessionResponse {
  authenticated: boolean;
  user?: StaffUser;
}

export interface StoreSettings {
  store_status?: string;
  launch_ready?: boolean | string;
  currency?: string;
  default_language?: string;
  supported_languages?: string[];
  cod_enabled?: boolean | string;
  manual_transfer_enabled?: boolean | string;
  whatsapp_number?: string;
}

export interface Category {
  id: string;
  slug: string;
  name_en: string;
  name_ur: string;
  description_en?: string;
  description_ur?: string;
  sort_order?: number;
  is_active?: number;
}

export interface Product {
  id: string;
  category_id?: string | null;
  sku?: string | null;
  slug: string;
  name_en: string;
  name_ur: string;
  description_en?: string;
  description_ur?: string;
  price_paisa: number;
  compare_at_paisa?: number | null;
  image_url?: string | null;
  stock_qty?: number | null;
  is_available: number;
  is_featured?: number;
  sort_order?: number;
}

export interface DeliveryZone {
  id: string;
  code: string;
  name_en: string;
  name_ur: string;
  city: string;
  delivery_fee_paisa: number;
  minimum_order_paisa: number;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  product_name_en: string;
  product_name_ur: string;
  reason: "stock_received" | "stock_adjustment" | "return_received";
  delta_qty: number;
  previous_stock_qty: number;
  new_stock_qty: number;
  note: string;
  actor_name: string | null;
  created_at: string;
}

export interface AdminOrder {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  payment_status: string;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  delivery_area: string | null;
  subtotal_paisa: number;
  delivery_fee_paisa: number;
  total_paisa: number;
  customer_language: string;
  created_at: string;
}

export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = "AdminApiError";
    this.status = status;
    this.code = code;
  }
}

async function apiRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  let response: Response;

  try {
    response = await fetch("/api/v1" + path, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers
      },
      cache: "no-store"
    });
  } catch {
    throw new AdminApiError(0, "network_error");
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const record = typeof body === "object" && body !== null
      ? body as Record<string, unknown>
      : {};
    throw new AdminApiError(
      response.status,
      typeof record.error === "string" ? record.error : "request_failed"
    );
  }
  return body as T;
}

export const adminApi = {
  session: () => apiRequest<SessionResponse>("/admin/session"),

  login: (email: string, password: string) =>
    apiRequest<SessionResponse>("/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),

  bootstrap: (data: {
    email: string;
    display_name: string;
    password: string;
    bootstrapToken: string;
  }) =>
    apiRequest<SessionResponse>("/admin/bootstrap-owner", {
      method: "POST",
      headers: { "X-Owner-Bootstrap-Token": data.bootstrapToken },
      body: JSON.stringify({
        email: data.email,
        display_name: data.display_name,
        password: data.password
      })
    }),

  logout: () =>
    apiRequest<{ authenticated: false }>("/admin/logout", { method: "POST" }),

  health: () =>
    apiRequest<{ ok: boolean; database: string; schema: string }>("/health"),

  settings: () =>
    apiRequest<{ settings: StoreSettings }>("/storefront-config"),

  categories: () =>
    apiRequest<{ categories: Category[] }>("/categories"),

  products: () =>
    apiRequest<{ products: Product[] }>("/products?limit=50"),

  deliveryZones: () =>
    apiRequest<{ delivery_zones: DeliveryZone[] }>("/delivery-zones"),

  orders: (status = "") =>
    apiRequest<{ orders: AdminOrder[]; pagination: { limit: number; offset: number; returned: number } }>(
      "/admin/orders" + (status ? "?status=" + encodeURIComponent(status) : "")
    ),

  adminCategories: () =>
    apiRequest<{ categories: Category[] }>("/admin/categories"),

  saveCategory: (data: Record<string, unknown>, id?: string) =>
    apiRequest<{ saved: boolean; id: string }>("/admin/categories" + (id ? "/" + encodeURIComponent(id) : ""), {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(data)
    }),

  adminProducts: () =>
    apiRequest<{ products: Product[] }>("/admin/products"),

  saveProduct: (data: Record<string, unknown>, id?: string) =>
    apiRequest<{ saved: boolean; id: string }>("/admin/products" + (id ? "/" + encodeURIComponent(id) : ""), {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(data)
    }),

  inventoryMovements: (productId = "") =>
    apiRequest<{ movements: InventoryMovement[] }>(
      "/admin/inventory/movements" + (productId ? "?product_id=" + encodeURIComponent(productId) : "")
    ),

  adjustInventory: (data: {
    product_id: string;
    delta_qty: number;
    reason: "stock_received" | "stock_adjustment" | "return_received";
    note?: string;
  }, idempotencyKey: string) =>
    apiRequest<{
      adjusted: boolean;
      adjustment_id: string;
      product_id: string;
      delta_qty: number;
      reason: string;
    }>("/admin/inventory/adjustments", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(data)
    }),

  updateOrderStatus: (orderId: string, status: string, note = "") =>
    apiRequest<{ updated: boolean; order_id: string; old_status: string; status: string }>(
      "/admin/orders/" + encodeURIComponent(orderId) + "/status",
      {
        method: "PATCH",
        body: JSON.stringify({ status, note })
      }
    )
};
