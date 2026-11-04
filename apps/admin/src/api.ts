export interface Rider {
  id: string;
  staff_user_id: string;
  display_name: string;
  email: string;
  vehicle_type: string;
  vehicle_number: string;
  current_status: "available" | "busy" | "offline";
  is_active: number;
}

export interface SupportTicket {
  id: string;
  order_id: string | null;
  customer_name: string;
  customer_phone: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";
  assigned_staff_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  case_id: string;
  sender_type: "customer" | "staff";
  sender_staff_id: string | null;
  message: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  recipient_type: "staff" | "customer";
  title_ur: string;
  title_en: string;
  body_ur: string;
  body_en: string;
  event_type: string;
  related_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface StaffUser {
  id: string;
  email: string;
  display_name: string;
  role: "owner" | "manager" | "operator" | "kitchen" | "finance" | "rider" | "support";
}

export interface StaffMember extends StaffUser {
  is_active: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
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
  store_name_en?: string;
  store_name_ur?: string;
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

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string | null;
  name_en: string;
  name_ur: string;
  price_paisa: number;
  compare_at_paisa: number | null;
  stock_qty: number | null;
  is_available: number;
  sort_order: number;
}

export interface ModifierOption {
  id: string;
  group_id: string;
  name_en: string;
  name_ur: string;
  price_paisa: number;
  is_available: number;
  sort_order: number;
}

export interface ModifierGroup {
  id: string;
  name_en: string;
  name_ur: string;
  description_en: string;
  description_ur: string;
  min_selection: number;
  max_selection: number;
  is_required: number;
  sort_order: number;
  options?: ModifierOption[];
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: "fixed" | "percent";
  discount_value: number;
  min_order_paisa: number;
  max_discount_paisa: number | null;
  usage_limit: number | null;
  used_count: number;
  start_at: string | null;
  expires_at: string | null;
  is_active: number;
  created_at: string;
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
  country_code: string;
  region: string;
  city: string;
  delivery_fee_paisa: number;
  minimum_order_paisa: number;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export interface DashboardMetrics {
  total_orders: number;
  open_orders: number;
  delivered_orders: number;
  delivered_revenue_paisa: number;
  unpaid_cod_count: number;
  active_products: number;
  low_stock_products: number;
  active_categories: number;
  active_delivery_zones: number;
}

export interface AdminPayment {
  payment_id: string;
  order_id: string;
  order_number: string;
  order_status: string;
  method: "cod";
  payment_status: "unpaid" | "collected";
  amount_paisa: number;
  created_at: string;
  reviewed_at: string | null;
  collected_by: string | null;
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

export interface AdminOrderItem {
  product_name_ur_snapshot: string;
  product_name_en_snapshot: string;
  sku_snapshot: string | null;
  unit_price_paisa: number;
  quantity: number;
  line_total_paisa: number;
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

  dashboardMetrics: () =>
    apiRequest<{ metrics: DashboardMetrics }>("/admin/metrics"),

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

  productVariants: (productId: string) =>
    apiRequest<{ variants: ProductVariant[] }>("/admin/products/" + encodeURIComponent(productId) + "/variants"),

  saveProductVariant: (productId: string, data: Record<string, unknown>, variantId?: string) =>
    apiRequest<{ saved: boolean; id: string }>(
      variantId
        ? "/admin/variants/" + encodeURIComponent(variantId)
        : "/admin/products/" + encodeURIComponent(productId) + "/variants",
      {
        method: variantId ? "PUT" : "POST",
        body: JSON.stringify(data)
      }
    ),

  deleteProductVariant: (variantId: string) =>
    apiRequest<{ deleted: boolean }>("/admin/variants/" + encodeURIComponent(variantId), { method: "DELETE" }),

  modifierGroups: () =>
    apiRequest<{ modifier_groups: ModifierGroup[] }>("/admin/modifier-groups"),

  saveModifierGroup: (data: Record<string, unknown>, id?: string) =>
    apiRequest<{ saved: boolean; id: string }>(
      "/admin/modifier-groups" + (id ? "/" + encodeURIComponent(id) : ""),
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(data)
      }
    ),

  deleteModifierGroup: (id: string) =>
    apiRequest<{ deleted: boolean }>("/admin/modifier-groups/" + encodeURIComponent(id), { method: "DELETE" }),

  saveModifierOption: (groupId: string, data: Record<string, unknown>, optionId?: string) =>
    apiRequest<{ saved: boolean; id: string }>(
      optionId
        ? "/admin/modifier-options/" + encodeURIComponent(optionId)
        : "/admin/modifier-groups/" + encodeURIComponent(groupId) + "/options",
      {
        method: optionId ? "PUT" : "POST",
        body: JSON.stringify(data)
      }
    ),

  deleteModifierOption: (optionId: string) =>
    apiRequest<{ deleted: boolean }>("/admin/modifier-options/" + encodeURIComponent(optionId), { method: "DELETE" }),

  coupons: () =>
    apiRequest<{ coupons: Coupon[] }>("/admin/coupons"),

  saveCoupon: (data: Record<string, unknown>, id?: string) =>
    apiRequest<{ saved: boolean; id: string }>(
      "/admin/coupons" + (id ? "/" + encodeURIComponent(id) : ""),
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(data)
      }
    ),

  deleteCoupon: (id: string) =>
    apiRequest<{ deleted: boolean }>("/admin/coupons/" + encodeURIComponent(id), { method: "DELETE" }),

  payments: (status = "") =>
    apiRequest<{ payments: AdminPayment[] }>("/admin/payments" + (status ? "?status=" + encodeURIComponent(status) : "")),

  collectCodPayment: (orderId: string, idempotencyKey: string) =>
    apiRequest<{
      collected: boolean;
      order_id: string;
      order_number: string;
      payment_id: string;
      payment_status: string;
      amount_paisa: number;
    }>("/admin/payments/cod-collection", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ order_id: orderId })
    }),

  staffDirectory: () =>
    apiRequest<{ staff: StaffMember[] }>("/admin/staff"),

  createStaff: (data: {
    email: string;
    display_name: string;
    role: StaffUser["role"];
    password: string;
  }) =>
    apiRequest<{ created: boolean; id: string; role: StaffUser["role"] }>("/admin/staff", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  updateStaff: (id: string, data: {
    display_name?: string;
    role?: StaffUser["role"];
    is_active?: boolean;
  }) =>
    apiRequest<{ updated: boolean; id: string; sessions_revoked: boolean }>("/admin/staff/" + encodeURIComponent(id), {
      method: "PATCH",
      body: JSON.stringify(data)
    }),

  resetStaffPassword: (id: string, new_password: string) =>
    apiRequest<{ password_reset: boolean; id: string; sessions_revoked: boolean }>("/admin/staff/" + encodeURIComponent(id) + "/reset-password", {
      method: "POST",
      body: JSON.stringify({ new_password })
    }),

  adminSettings: () =>
    apiRequest<{ settings: StoreSettings }>("/admin/settings"),

  saveStoreSettings: (data: Record<string, unknown>) =>
    apiRequest<{ saved: boolean; updated_keys: string[] }>("/admin/settings", {
      method: "PATCH",
      body: JSON.stringify(data)
    }),

  adminDeliveryZones: () =>
    apiRequest<{ delivery_zones: DeliveryZone[] }>("/admin/delivery-zones"),

  saveDeliveryZone: (data: Record<string, unknown>, id?: string) =>
    apiRequest<{ saved: boolean; id: string }>("/admin/delivery-zones" + (id ? "/" + encodeURIComponent(id) : ""), {
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

  adminOrder: (orderId: string) =>
    apiRequest<{ order: AdminOrder & { notes?: string }; items: AdminOrderItem[]; history: Array<{ old_status: string | null; new_status: string; note: string; created_at: string }> }>(
      "/admin/orders/" + encodeURIComponent(orderId)
    ),

  updateOrderStatus: (orderId: string, status: string, note = "") =>
    apiRequest<{ updated: boolean; order_id: string; old_status: string; status: string }>(
      "/admin/orders/" + encodeURIComponent(orderId) + "/status",
      {
        method: "PATCH",
        body: JSON.stringify({ status, note })
      }
    ),

  riders: () =>
    apiRequest<{ riders: Rider[] }>("/admin/riders"),

  saveRider: (data: { staff_user_id?: string; vehicle_type: string; vehicle_number: string; current_status?: string; is_active?: boolean }, id?: string) =>
    apiRequest<{ saved: boolean; id: string }>(
      "/admin/riders" + (id ? "/" + encodeURIComponent(id) : ""),
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(data)
      }
    ),

  assignRider: (orderId: string, riderId: string, notes = "") =>
    apiRequest<{ assigned: boolean; assignment_id: string; order_status: string }>(
      "/admin/orders/" + encodeURIComponent(orderId) + "/assign-rider",
      {
        method: "POST",
        body: JSON.stringify({ rider_id: riderId, notes })
      }
    ),

  updateDeliveryStatus: (assignmentId: string, status: "picked_up" | "delivered" | "failed", failureReason = "", notes = "") =>
    apiRequest<{ updated: boolean; status: string }>(
      "/admin/deliveries/" + encodeURIComponent(assignmentId) + "/status",
      {
        method: "PATCH",
        body: JSON.stringify({ status, failure_reason: failureReason, notes })
      }
    ),

  riderAssignments: () =>
    apiRequest<{ assignments: Record<string, unknown>[] }>("/rider/assignments"),

  supportTickets: () =>
    apiRequest<{ tickets: SupportTicket[] }>("/admin/support/tickets"),

  supportTicketDetails: (id: string) =>
    apiRequest<{ ticket: SupportTicket; messages: SupportMessage[] }>("/admin/support/tickets/" + encodeURIComponent(id)),

  replySupportTicket: (id: string, message: string, status?: string) =>
    apiRequest<{ saved: boolean; message_id: string }>("/admin/support/tickets/" + encodeURIComponent(id) + "/messages", {
      method: "POST",
      body: JSON.stringify({ message, status })
    }),

  notifications: () =>
    apiRequest<{ notifications: NotificationItem[] }>("/admin/notifications"),

  markNotificationRead: (id: string) =>
    apiRequest<{ read: boolean; id: string }>("/admin/notifications/" + encodeURIComponent(id) + "/read", {
      method: "PATCH"
    })
};
