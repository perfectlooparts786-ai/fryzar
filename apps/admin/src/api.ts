export interface AuditLogEntry {
  id: string;
  actor_staff_id: string | null;
  actor_role: string | null;
  actor_display_name?: string | null;
  actor_name?: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata?: Record<string, unknown>;
  metadata_json?: string;
  created_at: string;
}

export interface Ingredient {
  id: string;
  name_ur: string;
  name_en: string;
  sku: string | null;
  unit: string;
  stock_qty: number;
  min_threshold: number;
  reorder_threshold: number;
  cost_per_unit_paisa: number;
  is_active: number;
}

export interface RecipeItem {
  ingredient_id: string;
  quantity_required: number;
  unit: string;
  name_en?: string;
  name_ur?: string;
  cost_per_unit_paisa?: number;
}

export interface ProductRecipeRecord {
  id: string;
  product_id: string;
  variant_id: string | null;
  name_en: string;
  name_ur: string;
  instructions: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  is_active: number;
}

export interface PurchaseOrder {
  id: string;
  supplier_id: string;
  supplier_name: string;
  order_number: string;
  status: "draft" | "submitted" | "received" | "cancelled";
  total_cost_paisa: number;
  created_at: string;
}

export interface WastageRecord {
  id: string;
  ingredient_id: string | null;
  product_id: string | null;
  ingredient_name_en?: string;
  product_name_en?: string;
  quantity: number;
  reason: string;
  cost_paisa: number;
  note: string;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  entry_type: string;
  reference_id: string;
  debit_paisa: number;
  credit_paisa: number;
  note: string;
  created_at: string;
}

export interface FinanceSummaryResponse {
  currency: string;
  totals_by_type: Array<{
    entry_type: string;
    entry_count: number;
    total_debit_paisa: number;
    total_credit_paisa: number;
  }>;
  daily_summaries: Array<{
    period_day: string;
    order_charges_paisa: number;
    collections_paisa: number;
    refunds_paisa: number;
    expenses_paisa: number;
  }>;
  monthly_summaries: Array<{
    period_month: string;
    order_charges_paisa: number;
    collections_paisa: number;
    refunds_paisa: number;
    expenses_paisa: number;
  }>;
  reconciliation: {
    consistent: boolean;
    discrepancy_count: number;
    discrepancies: Array<{
      order_id: string;
      order_number: string;
      status: string;
      payment_status: string;
      total_paisa: number;
      payment_amount_paisa: number | null;
      payment_record_status: string | null;
    }>;
  };
}

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

export interface DeliveryAssignmentRecord {
  id: string;
  order_id: string;
  order_number: string;
  order_status: string;
  delivery_area: string | null;
  total_paisa: number;
  rider_id: string;
  rider_name: string;
  vehicle_type: string;
  vehicle_number: string;
  status: "assigned" | "picked_up" | "delivered" | "failed";
  failure_reason: string;
  notes: string;
  assigned_at: string;
  picked_up_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
}

export interface RiderSelfAssignment {
  id: string;
  order_id: string;
  order_number: string;
  status: "assigned" | "picked_up" | "delivered" | "failed";
  failure_reason: string;
  notes: string;
  assigned_at: string;
  picked_up_at: string | null;
  delivered_at: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  total_paisa: number;
  payment_method: string;
  payment_status: string;
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
  is_internal?: number;
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
  image_url?: string | null;
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

export interface LinkedModifierGroup {
  product_id: string;
  group_id: string;
  sort_order: number;
  name_en: string;
  name_ur: string;
  is_required: number;
  min_selection: number;
  max_selection: number;
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

export interface CouponRedemption {
  id: string;
  coupon_id: string;
  coupon_code: string;
  order_id: string;
  order_number: string;
  discount_applied_paisa: number;
  created_at: string;
}

export interface ProductImageRecord {
  id: string;
  product_id: string;
  object_key: string;
  visibility: "public" | "private";
  alt_ur: string;
  alt_en: string;
  is_primary: number;
  sort_order: number;
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
  is_archived?: number;
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
  estimated_mins_min?: number;
  estimated_mins_max?: number;
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

export interface OverviewSummaryResponse {
  overview: {
    total_orders: number;
    new_orders: number;
    pending_orders: number;
    confirmed_orders: number;
    preparing_orders: number;
    ready_orders: number;
    out_for_delivery_orders: number;
    delivered_orders: number;
    cancelled_orders: number;
    gross_order_value_paisa: number;
    delivered_revenue_paisa: number;
    pending_payments_paisa: number;
    collected_cod_paisa: number;
    refund_totals_paisa: number;
    active_products: number;
    out_of_stock_products: number;
    low_stock_products: number;
    archived_products: number;
    active_categories: number;
    active_delivery_zones: number;
    open_support_cases: number;
  };
  low_stock_alerts: {
    products: Array<{ id: string; name_en: string; name_ur: string; sku: string | null; stock_qty: number }>;
    ingredients: Array<{ id: string; name_en: string; name_ur: string; unit: string; stock_qty: number; reorder_threshold: number }>;
  };
  recent_activity: Array<{
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    actor_role: string | null;
    actor_name: string | null;
    created_at: string;
  }>;
  operational_warnings: Array<{ code: string; level: "info" | "warn"; message: string }>;
}

export interface AdminPayment {
  payment_id: string;
  order_id: string;
  order_number: string;
  order_status: string;
  method: "cod" | "manual_transfer" | string;
  payment_status: "unpaid" | "collected" | "awaiting_proof" | "pending_review" | "verified" | "rejected" | string;
  amount_paisa: number;
  transaction_reference?: string | null;
  review_note?: string | null;
  created_at: string;
  reviewed_at: string | null;
  collected_by?: string | null;
  reviewer_name?: string | null;
}

export interface PaymentProofSummary {
  id: string;
  payment_id: string;
  original_filename: string;
  detected_mime_type: string;
  file_size_bytes: number;
  submitted_at: string;
}

export interface RefundRecord {
  id: string;
  order_id: string;
  order_number: string;
  payment_id: string | null;
  amount_paisa: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "completed";
  reviewer_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerDirectoryRecord {
  customer_phone: string;
  customer_name: string;
  preferred_language: string;
  last_delivery_area: string | null;
  order_count: number;
  delivered_spend_paisa: number;
  last_order_at: string;
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
  variant_name_en_snapshot?: string | null;
  variant_name_ur_snapshot?: string | null;
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
  discount_paisa?: number;
  delivery_fee_paisa: number;
  total_paisa: number;
  customer_language: string;
  created_at: string;
}

export interface AnalyticsResponse {
  top_products: Array<{ product_name_en: string; units_sold: number; revenue_paisa: number }>;
  zones: Array<{ area: string; order_count: number; total_paisa: number }>;
  languages: Array<{ customer_language: string; order_count: number }>;
  daily_orders: Array<{ day: string; order_count: number; delivered_paisa: number }>;
}

export interface EditorialPostAdmin {
  id: string;
  slug: string;
  content_type: "article" | "recipe" | "guide" | "announcement" | "policy";
  title_en: string;
  title_ur: string;
  summary_en: string;
  summary_ur: string;
  body_en: string;
  body_ur: string;
  image_url: string | null;
  image_alt_en: string;
  image_alt_ur: string;
  meta_title_en: string;
  meta_title_ur: string;
  meta_description_en: string;
  meta_description_ur: string;
  prep_time_mins: number | null;
  cook_time_mins: number | null;
  servings: number | null;
  is_published: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SeoSettingsResponse {
  seo: Record<string, unknown>;
  indexable_counts: {
    indexable_products: number;
    indexable_categories: number;
    published_guides: number;
  };
}

export interface MonetizationConfigAdmin {
  masterEnabled: boolean;
  previewEnabled: boolean;
  productionApproved: boolean;
  siteId: string;
  publisherStatus: "unverified" | "pending_review" | "approved" | "suspended";
  consentRequiredRegions: string[];
  frequencyCapPerSession: number;
  loadTimeoutMs: number;
  formats: {
    banner: boolean;
    nativeBanner: boolean;
    socialBar: boolean;
    inPagePush: boolean;
    popunder: false;
    interstitial: false;
    smartlink: false;
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
  };
}

export interface AdZoneAdmin {
  id: string;
  zone_key: string;
  publisher_zone_id: string;
  format: string;
  placement_slot: string;
  script_origin: string;
  width: number;
  height: number;
  is_enabled: number;
  status_note: string;
  updated_at: string;
}

export interface AdPerformanceReport {
  id: string;
  report_date: string;
  source_type: "network_reported" | "local_estimate";
  format: string;
  country_code: string;
  device_type: string;
  impressions: number;
  clicks: number;
  fill_rate_bps: number;
  ecpm_micros_usd: number;
  revenue_micros_usd: number;
  payout_status: "estimated" | "pending" | "finalized" | "paid";
  note: string;
  created_at: string;
}

export interface AdvertisingOverviewResponse {
  config: MonetizationConfigAdmin;
  format_registry: Array<{
    format: string;
    displayName: string;
    policyStatus: string;
    rationale: string;
  }>;
  restricted_pages: string[];
  blocked_categories: string[];
  zones: AdZoneAdmin[];
  performance_reports: AdPerformanceReport[];
  telemetry_summary: Array<{ event_type: string; event_count: number; avg_load_ms: number | null }>;
  recent_errors: Array<{
    id: string;
    slot_id: string;
    format: string;
    page_type: string;
    event_type: string;
    error_code: string | null;
    device_category: string;
    created_at: string;
  }>;
  audit_history: Array<{
    id: string;
    action: string;
    actor_role: string;
    actor_name: string | null;
    metadata_json: string;
    created_at: string;
  }>;
  environment: string;
}

export interface SystemHealthResponse {
  health: {
    ok: boolean;
    service: string;
    environment: string;
    schema_target: string;
    migrations_applied: number;
    migrations: Array<{ name: string; applied_at: string }>;
    secrets_configured: {
      tracking_secret: boolean;
      owner_bootstrap_token: boolean;
    };
    free_tier_limits: {
      plan: string;
      worker_daily_requests_limit: number;
      worker_cpu_ms_limit: number;
      d1_storage_limit_mb: number;
    };
    operational_counters: Record<string, number>;
  };
  event_breakdown: Array<{ category: string; severity: string; event_count: number }>;
  recent_events: Array<{
    id: string;
    category: string;
    severity: string;
    code: string;
    path: string;
    message: string;
    created_at: string;
  }>;
}

export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly serverMessage?: string;

  constructor(status: number, code: string, serverMessage?: string) {
    super(code);
    this.name = "AdminApiError";
    this.status = status;
    this.code = code;
    this.serverMessage = serverMessage;
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
      typeof record.error === "string" ? record.error : "request_failed",
      typeof record.message === "string" ? record.message : undefined
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

  overviewSummary: () =>
    apiRequest<OverviewSummaryResponse>("/admin/overview"),

  auditLogs: (params: { limit?: number; offset?: number; action?: string; entity_type?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.set("limit", String(params.limit));
    if (params.offset) query.set("offset", String(params.offset));
    if (params.action) query.set("action", params.action);
    if (params.entity_type) query.set("entity_type", params.entity_type);
    const str = query.toString();
    return apiRequest<{ audit_logs: AuditLogEntry[]; pagination: { limit: number; offset: number; returned: number } }>(
      "/admin/audit-logs" + (str ? "?" + str : "")
    );
  },

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

  archiveProduct: (productId: string) =>
    apiRequest<{ updated: boolean; id: string; is_archived: boolean }>(
      "/admin/products/" + encodeURIComponent(productId) + "/archive",
      { method: "POST" }
    ),

  restoreProduct: (productId: string) =>
    apiRequest<{ updated: boolean; id: string; is_archived: boolean }>(
      "/admin/products/" + encodeURIComponent(productId) + "/restore",
      { method: "POST" }
    ),

  deleteProduct: (productId: string) =>
    apiRequest<{ deleted: boolean; id: string }>(
      "/admin/products/" + encodeURIComponent(productId),
      { method: "DELETE" }
    ),

  productImages: (productId: string) =>
    apiRequest<{ images: ProductImageRecord[] }>(
      "/admin/products/" + encodeURIComponent(productId) + "/images"
    ),

  addProductImage: (productId: string, data: { object_key: string; alt_en?: string; alt_ur?: string; is_primary?: boolean; sort_order?: number }) =>
    apiRequest<{ saved: boolean; id: string }>(
      "/admin/products/" + encodeURIComponent(productId) + "/images",
      {
        method: "POST",
        body: JSON.stringify(data)
      }
    ),

  deleteProductImage: (imageId: string) =>
    apiRequest<{ deleted: boolean; id: string }>(
      "/admin/product-images/" + encodeURIComponent(imageId),
      { method: "DELETE" }
    ),

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

  productLinkedModifierGroups: (productId: string) =>
    apiRequest<{ linked_groups: LinkedModifierGroup[] }>(
      "/admin/products/" + encodeURIComponent(productId) + "/modifier-groups"
    ),

  linkModifierGroup: (productId: string, groupId: string, sortOrder = 0) =>
    apiRequest<{ saved: boolean }>(
      "/admin/products/" + encodeURIComponent(productId) + "/modifier-groups",
      {
        method: "POST",
        body: JSON.stringify({ group_id: groupId, sort_order: sortOrder })
      }
    ),

  unlinkModifierGroup: (productId: string, groupId: string) =>
    apiRequest<{ deleted: boolean }>(
      "/admin/products/" + encodeURIComponent(productId) + "/modifier-groups/" + encodeURIComponent(groupId),
      { method: "DELETE" }
    ),

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

  couponRedemptions: (couponId = "") =>
    apiRequest<{ redemptions: CouponRedemption[] }>(
      "/admin/coupon-redemptions" + (couponId ? "?coupon_id=" + encodeURIComponent(couponId) : "")
    ),

  customers: () =>
    apiRequest<{ customers: CustomerDirectoryRecord[] }>("/admin/customers"),

  payments: (status = "") =>
    apiRequest<{ payments: AdminPayment[] }>("/admin/payments" + (status ? "?status=" + encodeURIComponent(status) : "")),

  allPayments: () =>
    apiRequest<{ payments: AdminPayment[]; proofs: PaymentProofSummary[] }>("/admin/payments/all"),

  reviewPayment: (paymentId: string, data: { decision: "verified" | "rejected"; review_note?: string; transaction_reference?: string }) =>
    apiRequest<{ reviewed: boolean; payment_id: string; status: string }>(
      "/admin/payments/" + encodeURIComponent(paymentId) + "/review",
      {
        method: "POST",
        body: JSON.stringify(data)
      }
    ),

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

  refunds: () =>
    apiRequest<{ refunds: RefundRecord[] }>("/admin/refunds"),

  updateRefundStatus: (refundId: string, status: "approved" | "rejected" | "completed") =>
    apiRequest<{ updated: boolean; id: string; status: string }>(
      "/admin/refunds/" + encodeURIComponent(refundId),
      {
        method: "PATCH",
        body: JSON.stringify({ status })
      }
    ),

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

  deliveries: () =>
    apiRequest<{ deliveries: DeliveryAssignmentRecord[] }>("/admin/deliveries"),

  updateDeliveryStatus: (assignmentId: string, status: "picked_up" | "delivered" | "failed", failureReason = "", notes = "") =>
    apiRequest<{ updated: boolean; status: string }>(
      "/admin/deliveries/" + encodeURIComponent(assignmentId) + "/status",
      {
        method: "PATCH",
        body: JSON.stringify({ status, failure_reason: failureReason, notes })
      }
    ),

  riderAssignments: () =>
    apiRequest<{ assignments: RiderSelfAssignment[] }>("/rider/assignments"),

  supportTickets: () =>
    apiRequest<{ tickets: SupportTicket[] }>("/admin/support/tickets"),

  supportTicketDetails: (id: string) =>
    apiRequest<{ ticket: SupportTicket; messages: SupportMessage[] }>("/admin/support/tickets/" + encodeURIComponent(id)),

  assignSupportTicket: (id: string, data: { assigned_staff_id: string | null; status?: string }) =>
    apiRequest<{ updated: boolean; id: string }>(
      "/admin/support/tickets/" + encodeURIComponent(id) + "/assign",
      {
        method: "PATCH",
        body: JSON.stringify(data)
      }
    ),

  replySupportTicket: (id: string, message: string, status?: string, isInternal = false) =>
    apiRequest<{ saved: boolean; message_id: string }>("/admin/support/tickets/" + encodeURIComponent(id) + "/messages", {
      method: "POST",
      body: JSON.stringify({ message, status, is_internal: isInternal })
    }),

  notifications: () =>
    apiRequest<{ notifications: NotificationItem[] }>("/admin/notifications"),

  markNotificationRead: (id: string) =>
    apiRequest<{ read: boolean; id: string }>("/admin/notifications/" + encodeURIComponent(id) + "/read", {
      method: "PATCH"
    }),

  ingredients: () =>
    apiRequest<{ ingredients: Ingredient[] }>("/admin/ingredients"),

  saveIngredient: (data: Record<string, unknown>, id?: string) =>
    apiRequest<{ saved: boolean; id: string }>(
      "/admin/ingredients" + (id ? "/" + encodeURIComponent(id) : ""),
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(data)
      }
    ),

  productRecipe: (productId: string) =>
    apiRequest<{ recipe: ProductRecipeRecord | null; ingredients: RecipeItem[] }>(
      "/admin/products/" + encodeURIComponent(productId) + "/recipe"
    ),

  saveProductRecipe: (productId: string, data: Record<string, unknown>) =>
    apiRequest<{ saved: boolean; recipe_id: string }>(
      "/admin/products/" + encodeURIComponent(productId) + "/recipe",
      {
        method: "POST",
        body: JSON.stringify(data)
      }
    ),

  suppliers: () =>
    apiRequest<{ suppliers: Supplier[] }>("/admin/suppliers"),

  saveSupplier: (data: Record<string, unknown>, id?: string) =>
    apiRequest<{ saved: boolean; id: string }>(
      "/admin/suppliers" + (id ? "/" + encodeURIComponent(id) : ""),
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(data)
      }
    ),

  purchaseOrders: () =>
    apiRequest<{ purchase_orders: PurchaseOrder[] }>("/admin/purchase-orders"),

  createPurchaseOrder: (data: { supplier_id: string; items: Array<{ ingredient_id: string; quantity: number; unit_cost_paisa: number }> }) =>
    apiRequest<{ created: boolean; id: string; order_number: string; total_cost_paisa: number }>(
      "/admin/purchase-orders",
      {
        method: "POST",
        body: JSON.stringify(data)
      }
    ),

  receivePurchaseOrder: (id: string) =>
    apiRequest<{ received: boolean; id: string }>("/admin/purchase-orders/" + encodeURIComponent(id) + "/receive", {
      method: "POST"
    }),

  wastageRecords: () =>
    apiRequest<{ wastage_records: WastageRecord[] }>("/admin/wastage"),

  logWastage: (data: { ingredient_id?: string; product_id?: string; quantity: number; reason: string; cost_paisa?: number; note?: string }) =>
    apiRequest<{ logged: boolean; id: string }>("/admin/wastage", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  financialLedger: () =>
    apiRequest<{ ledger: LedgerEntry[] }>("/admin/finance/ledger"),

  financeSummary: () =>
    apiRequest<FinanceSummaryResponse>("/admin/finance/summary"),

  refundOrder: (orderId: string, data: { amount_paisa: number; reason: string }) =>
    apiRequest<{ refunded: boolean; refund_id: string; amount_paisa: number }>(
      "/admin/orders/" + encodeURIComponent(orderId) + "/refund",
      {
        method: "POST",
        body: JSON.stringify(data)
      }
    ),

  analytics: () =>
    apiRequest<AnalyticsResponse>("/admin/analytics"),

  editorialPosts: () =>
    apiRequest<{ posts: EditorialPostAdmin[] }>("/admin/editorial"),

  saveEditorialPost: (data: Record<string, unknown>, id?: string) =>
    apiRequest<{ saved: boolean; id: string; slug: string }>(
      "/admin/editorial" + (id ? "/" + encodeURIComponent(id) : ""),
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(data)
      }
    ),

  deleteEditorialPost: (id: string) =>
    apiRequest<{ deleted: boolean; id: string }>(
      "/admin/editorial/" + encodeURIComponent(id),
      { method: "DELETE" }
    ),

  seoSettings: () =>
    apiRequest<SeoSettingsResponse>("/admin/seo"),

  saveSeoSettings: (data: Record<string, unknown>) =>
    apiRequest<{ saved: boolean; updated_keys: string[] }>("/admin/seo", {
      method: "PATCH",
      body: JSON.stringify(data)
    }),

  advertisingOverview: () =>
    apiRequest<AdvertisingOverviewResponse>("/admin/advertising/overview"),

  triggerAdKillSwitch: () =>
    apiRequest<{ disabled: boolean; config: MonetizationConfigAdmin }>("/admin/advertising/kill-switch", {
      method: "POST"
    }),

  saveAdvertisingConfig: (data: Record<string, unknown>) =>
    apiRequest<{ saved: boolean; config: MonetizationConfigAdmin }>("/admin/advertising/config", {
      method: "PATCH",
      body: JSON.stringify(data)
    }),

  updateAdZone: (
    zoneId: string,
    data: { publisher_zone_id: string; script_origin: string; placement_slot?: string; is_enabled: boolean; status_note: string }
  ) =>
    apiRequest<{ saved: boolean; id: string }>("/admin/advertising/zones/" + encodeURIComponent(zoneId), {
      method: "PUT",
      body: JSON.stringify(data)
    }),

  recordAdReport: (data: Record<string, unknown>) =>
    apiRequest<{ saved: boolean; id: string }>("/admin/advertising/reports", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  systemHealth: () =>
    apiRequest<SystemHealthResponse>("/admin/system-health")
};
