import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AdminApiError,
  adminApi,
  type AdminOrder,
  type AdminOrderItem,
  type AdminPayment,
  type AuditLogEntry,
  type Category,
  type Coupon,
  type CouponRedemption,
  type DashboardMetrics,
  type DeliveryAssignmentRecord,
  type DeliveryZone,
  type InventoryMovement,
  type OverviewSummaryResponse,
  type PaymentProofSummary,
  type Product,
  type ProductImageRecord,
  type Rider,
  type StaffMember,
  type StaffUser,
  type StoreSettings,
  type SupportMessage,
  type SupportTicket
} from "./api";
import {
  AdvertisingModule,
  AnalyticsModule,
  CustomersModule,
  EditorialCmsModule,
  FinanceLedgerModule,
  IngredientsRecipesModule,
  NotificationsModule,
  PrintableReceiptModal,
  RefundsModule,
  SeoSettingsModule,
  SuppliersPurchasesModule,
  SystemHealthModule,
  VariantsModifiersModule,
  WastageModule,
  describeAdminError
} from "./ExtendedModules";

type AuthState = "checking" | "signed-out" | "signed-in";
type AuthMode = "login" | "bootstrap";

export type Section =
  | "overview"
  | "orders"
  | "kitchen"
  | "products"
  | "categories"
  | "variants_modifiers"
  | "coupons"
  | "customers"
  | "delivery"
  | "riders"
  | "inventory"
  | "recipes"
  | "suppliers_purchases"
  | "wastage"
  | "payments"
  | "refunds"
  | "finance"
  | "support"
  | "notifications"
  | "analytics"
  | "editorial"
  | "advertising"
  | "seo"
  | "team"
  | "settings"
  | "audit"
  | "system_health";

const NAV: Array<{ id: Section; label: string; group: string; icon: string }> = [
  { id: "overview", label: "1. Overview", group: "Operations", icon: "overview" },
  { id: "orders", label: "2. Live Orders", group: "Operations", icon: "orders" },
  { id: "kitchen", label: "3. Kitchen Queue", group: "Operations", icon: "kitchen" },
  { id: "products", label: "4. Products", group: "Catalogue", icon: "catalogue" },
  { id: "categories", label: "5. Categories", group: "Catalogue", icon: "catalogue" },
  { id: "variants_modifiers", label: "6. Variants & Modifiers", group: "Catalogue", icon: "catalogue" },
  { id: "coupons", label: "7. Promotions & Coupons", group: "Growth & CRM", icon: "coupons" },
  { id: "customers", label: "8. Customers", group: "Growth & CRM", icon: "team" },
  { id: "delivery", label: "9. Delivery Zones", group: "Logistics", icon: "delivery" },
  { id: "riders", label: "10. Riders & Dispatch", group: "Logistics", icon: "delivery" },
  { id: "inventory", label: "11. Inventory & Stock", group: "Supply Chain", icon: "inventory" },
  { id: "recipes", label: "12. Ingredients & Recipes", group: "Supply Chain", icon: "inventory" },
  { id: "suppliers_purchases", label: "13. Suppliers & Purchases", group: "Supply Chain", icon: "inventory" },
  { id: "wastage", label: "14. Wastage", group: "Supply Chain", icon: "inventory" },
  { id: "payments", label: "15. Payments", group: "Finance", icon: "payments" },
  { id: "refunds", label: "16. Refunds", group: "Finance", icon: "payments" },
  { id: "finance", label: "17. Finance & Ledger", group: "Finance", icon: "payments" },
  { id: "support", label: "18. Support Tickets", group: "Care & Alerts", icon: "orders" },
  { id: "notifications", label: "19. Notifications", group: "Care & Alerts", icon: "overview" },
  { id: "analytics", label: "20. Analytics", group: "Intelligence", icon: "overview" },
  { id: "editorial", label: "21. Website Content", group: "Growth & Monetization", icon: "orders" },
  { id: "advertising", label: "22. Advertising & Monetization", group: "Growth & Monetization", icon: "payments" },
  { id: "seo", label: "23. SEO Settings", group: "Growth & Monetization", icon: "settings" },
  { id: "team", label: "24. Staff & Roles", group: "Governance", icon: "team" },
  { id: "settings", label: "25. Store Settings", group: "Governance", icon: "settings" },
  { id: "audit", label: "26. Audit Logs", group: "Governance", icon: "orders" },
  { id: "system_health", label: "27. System Health", group: "Governance", icon: "settings" }
];

function isEnabled(value: unknown): boolean {
  return value === true || value === "true" || value === "yes" || value === 1;
}

function messageFor(error: unknown): string {
  if (error instanceof AdminApiError) {
    if (error.serverMessage) return error.serverMessage;
    switch (error.code) {
      case "network_error": return "The FRYZAR API could not be reached. Check the API service and try again.";
      case "insufficient_stock": return "This adjustment would make stock negative. Refresh the inventory and review the quantity.";
      case "inventory_not_tracked": return "This product does not have stock tracking enabled. Set an opening quantity when creating a product.";
      case "inventory_adjustment_required": return "Stock quantities must be changed through the Inventory module so the movement is recorded.";
      case "stock_changed_retry": return "Stock changed while this adjustment was being saved. Refresh the inventory and try again.";
      case "idempotency_key_required": return "The adjustment request is missing its retry-protection key. Refresh the page and retry.";
      case "idempotency_key_reused": return "This request key was already used with different adjustment details. Refresh and submit again.";
      case "request_already_processing": return "This adjustment is still being processed. Check movement history before retrying.";
      case "product_not_found": return "The selected product no longer exists. Refresh the inventory list.";
      case "product_has_history_archive_instead": return "Products with order or inventory history cannot be deleted; use Archive instead.";
      case "delivery_zone_code_conflict": return "This delivery zone code is already in use. Choose a different code.";
      case "delivery_zone_not_found": return "This delivery zone no longer exists. Refresh the list.";
      case "setting_requires_release_gate": return "Launch readiness, currency and payment-proof settings are controlled by release checks and cannot be changed here.";
      case "store_requires_release_gate": return "The store cannot be opened from this settings screen. Complete the release-readiness checks first.";
      case "invalid_whatsapp_number": return "Enter a valid international phone number, or leave the field empty.";
      case "staff_email_conflict": return "An account with this email already exists.";
      case "staff_not_found": return "This staff account no longer exists. Refresh the directory.";
      case "role_assignment_denied": return "Your role cannot assign that staff role.";
      case "cannot_deactivate_self": return "You cannot deactivate your own account.";
      case "invalid_staff_update": return "Select a valid staff update before saving.";
      case "staff_changed_retry": return "This staff account changed during the update. Refresh the directory and try again.";
      case "invalid_payment_filter": return "Choose a valid payment status filter.";
      case "invalid_order_id": return "The order reference is invalid. Refresh the payment list.";
      case "payment_not_found": return "This payment record was not found. Refresh the list.";
      case "not_cod_payment": return "This workflow only records cash-on-delivery collections.";
      case "order_not_delivered": return "A COD payment can only be collected after the order is marked delivered.";
      case "payment_already_collected": return "This payment has already been marked collected.";
      case "payment_state_conflict": return "The payment state changed. Refresh the payment list before retrying.";
      case "payment_state_changed_retry": return "Another request changed this payment. Refresh the list before retrying.";
      case "payment_collection_failed": return "The collection could not be recorded. Check the payment list before retrying.";
      case "invalid_credentials": return "Email or password is incorrect.";
      case "owner_bootstrap_unavailable": return "First-owner setup is not enabled on the API yet. The one-time bootstrap secret must be configured securely in Cloudflare.";
      case "invalid_bootstrap_token": return "The bootstrap token was not accepted.";
      case "owner_already_configured": return "The first-owner setup has already been used. Sign in with the owner account.";
      case "password_policy_failed": return "Use a password between 12 and 128 characters.";
      case "rate_limit_exceeded": return "Too many attempts. Wait before trying again.";
      case "origin_not_allowed": return "This admin origin is not approved by the API configuration.";
      default: return describeAdminError(error);
    }
  }
  return "Something went wrong. Please try again.";
}

function money(paisa: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0
  }).format(paisa / 100);
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    overview: "M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z",
    orders: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
    kitchen: "M4 18h16M6 18V9h12v9M8 9V6a4 4 0 0 1 8 0v3M9 13h6",
    catalogue: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
    inventory: "M3 7h18v13H3zM3 7l3-4h12l3 4M12 7v13",
    payments: "M3 6h18v12H3zM3 10h18M7 15h4",
    coupons: "M2 9h20v6H2zM6 9v6M18 9v6M10 12h4",
    delivery: "M12 21s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12zM12 9a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
    team: "M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 20v-2a4 4 0 0 0-3-3.87M16 4.13a3 3 0 0 1 0 5.82",
    settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 2.94-.09-.02a1.7 1.7 0 0 0-1.72.7l-.05.08h-3.4l-.05-.08a1.7 1.7 0 0 0-1.72-.7l-.09.02-1.7-2.94.06-.06A1.7 1.7 0 0 0 9.4 15l-.09-.05v-3.4l.09-.05a1.7 1.7 0 0 0-.34-1.88L9 9.56l1.7-2.94.09.02a1.7 1.7 0 0 0 1.72-.7l.05-.08h3.4l.05.08a1.7 1.7 0 0 0 1.72.7l.09-.02 1.7 2.94-.06.06a1.7 1.7 0 0 0-.34 1.88l.09.05v3.4z"
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name] ?? paths.overview} /></svg>;
}

function AuthScreen({
  onAuthenticated
}: {
  onAuthenticated: (user: StaffUser) => void;
}) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [bootstrapToken, setBootstrapToken] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = mode === "login"
        ? await adminApi.login(email, password)
        : await adminApi.bootstrap({
            email,
            display_name: displayName,
            password,
            bootstrapToken
          });

      if (!response.user) throw new Error("Missing authenticated user.");
      onAuthenticated(response.user);
      setPassword("");
      setBootstrapToken("");
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-brand-panel">
        <a className="ops-brand" href="/" aria-label="FRYZAR operations">
          <span className="ops-brand-mark">F.</span>
          <span><strong>FRYZAR</strong><small>OPERATIONS</small></span>
        </a>
        <div className="auth-message">
          <span className="kicker">THE OPERATING DESK</span>
          <h1>One clear view of your store.</h1>
          <p>Manage the details, decisions and daily work behind every FRYZAR order.</p>
        </div>
        <div className="auth-panel-foot">
          <span>PRIVATE WORKSPACE</span>
          <span>UR · EN READY</span>
        </div>
        <div className="auth-art-circle circle-a" />
        <div className="auth-art-circle circle-b" />
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand"><span className="ops-brand-mark">F.</span><strong>FRYZAR OPS</strong></div>
          <span className="kicker">{mode === "login" ? "WELCOME BACK" : "INITIAL OWNER SETUP"}</span>
          <h2>{mode === "login" ? "Sign in to continue" : "Create the first owner"}</h2>
          <p className="auth-description">
            {mode === "login"
              ? "Use your staff account to access the operations workspace."
              : "This one-time process creates the first owner account. No default password is used."}
          </p>

          <div className="auth-tabs">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Sign in</button>
            <button type="button" className={mode === "bootstrap" ? "active" : ""} onClick={() => { setMode("bootstrap"); setError(""); }}>First-time setup</button>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {mode === "bootstrap" ? (
              <>
                <label>One-time bootstrap token
                  <input
                    value={bootstrapToken}
                    onChange={(event) => setBootstrapToken(event.target.value)}
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    required
                  />
                </label>
                <label>Owner display name
                  <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={100} required />
                </label>
              </>
            ) : null}

            <label>Email address
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" maxLength={254} required />
            </label>
            <label>Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={mode === "bootstrap" ? 12 : 1}
                maxLength={128}
                required
              />
              {mode === "bootstrap" ? <small className="field-hint">At least 12 characters. The password is never saved in this browser.</small> : null}
            </label>

            {error ? <div className="auth-error" role="alert">{error}</div> : null}
            <button className="auth-submit" type="submit" disabled={busy}>
              {busy ? "Please wait…" : mode === "login" ? "Sign in securely" : "Create owner account"}
              <span>↗</span>
            </button>
          </form>
          <div className="auth-security"><span /> Secure session · HttpOnly cookie · No saved password</div>
        </div>
      </section>
    </main>
  );
}

/* 1. Overview Module (22 Operational Metrics + Alerts + Launch Controls) */
function Overview({
  user,
  settings,
  products,
  categories,
  zones,
  metrics,
  overviewData,
  loading,
  error
}: {
  user: StaffUser;
  settings: StoreSettings;
  products: Product[];
  categories: Category[];
  zones: DeliveryZone[];
  metrics: DashboardMetrics | null;
  overviewData: OverviewSummaryResponse | null;
  loading: boolean;
  error: string;
}) {
  const open = settings.store_status === "open" && isEnabled(settings.launch_ready);
  const ov = overviewData?.overview;

  const stats = [
    { label: "Total orders", value: String(ov?.total_orders ?? metrics?.total_orders ?? "—"), tone: "mint", note: `${ov?.new_orders ?? 0} in last 24h` },
    { label: "Pending / Confirmed", value: ov ? `${ov.pending_orders} / ${ov.confirmed_orders}` : String(metrics?.open_orders ?? "—"), tone: "sand", note: "Awaiting action" },
    { label: "Preparing / Ready", value: ov ? `${ov.preparing_orders} / ${ov.ready_orders}` : "—", tone: "blue", note: "Preparation pipeline" },
    { label: "Out for delivery", value: String(ov?.out_for_delivery_orders ?? "—"), tone: "mint", note: "Active rider dispatches" },
    { label: "Delivered orders", value: String(ov?.delivered_orders ?? metrics?.delivered_orders ?? "—"), tone: "blue", note: `${ov?.cancelled_orders ?? 0} cancelled/rejected` },
    { label: "Delivered revenue", value: ov ? money(ov.delivered_revenue_paisa) : metrics ? money(metrics.delivered_revenue_paisa) : "—", tone: "slate", note: ov ? `Gross ${money(ov.gross_order_value_paisa)}` : "Delivered order totals" },
    { label: "Collected COD", value: ov ? money(ov.collected_cod_paisa) : "—", tone: "mint", note: ov ? `Pending ${money(ov.pending_payments_paisa)}` : `${metrics?.unpaid_cod_count ?? 0} unpaid COD` },
    { label: "Refund totals", value: ov ? money(ov.refund_totals_paisa) : "—", tone: "sand", note: "Approved & completed" },
    { label: "Active products", value: String(ov?.active_products ?? metrics?.active_products ?? products.length), tone: "mint", note: `${ov?.archived_products ?? 0} archived` },
    { label: "Low / Out of stock", value: ov ? `${ov.low_stock_products} / ${ov.out_of_stock_products}` : String(metrics?.low_stock_products ?? "—"), tone: "sand", note: "Tracked stock ≤ 5" },
    { label: "Categories & Zones", value: `${ov?.active_categories ?? metrics?.active_categories ?? categories.length} / ${ov?.active_delivery_zones ?? metrics?.active_delivery_zones ?? zones.length}`, tone: "blue", note: "Active groups / PK zones" },
    { label: "Open support cases", value: String(ov?.open_support_cases ?? 0), tone: "slate", note: open ? "Store Open" : "Store in Setup" }
  ];

  return (
    <>
      <div className="welcome-row">
        <div>
          <span className="kicker">STORE OVERVIEW</span>
          <h1>Good day, {user.display_name.split(" ")[0]}.</h1>
          <p>Live single-store PKR operational dashboard backed directly by Cloudflare D1.</p>
        </div>
        <span className={open ? "status-badge ready" : "status-badge setup"}><i />{open ? "Store open" : "Store in setup"}</span>
      </div>

      {overviewData?.operational_warnings.map((w) => (
        <div key={w.code} className={w.level === "warn" ? "orders-alert" : "orders-notice"}>
          {w.message}
        </div>
      ))}

      <div className="stat-grid">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <span className={"stat-icon " + stat.tone}><Icon name={stat.tone === "mint" ? "catalogue" : stat.tone === "sand" ? "overview" : stat.tone === "blue" ? "delivery" : "settings"} /></span>
            <small>{stat.label}</small>
            <strong>{loading ? "…" : stat.value}</strong>
            <span className="stat-note">{stat.note}</span>
          </article>
        ))}
      </div>

      <section className="overview-grid">
        <article className="content-card store-card">
          <div className="card-heading">
            <div><span className="kicker">STORE CONFIGURATION</span><h2>Launch controls</h2></div>
            <span className="card-mark">F.</span>
          </div>
          <div className="config-list">
            <div><span>Store status</span><strong className={open ? "text-green" : "text-amber"}>{settings.store_status ?? "Unknown"}</strong></div>
            <div><span>Launch ready</span><strong>{isEnabled(settings.launch_ready) ? "Yes" : "No"}</strong></div>
            <div><span>Cash on delivery</span><strong>{isEnabled(settings.cod_enabled) ? "Enabled" : "Disabled"}</strong></div>
            <div><span>Manual transfer</span><strong>{isEnabled(settings.manual_transfer_enabled) ? "Enabled" : "Disabled"}</strong></div>
            <div><span>Currency</span><strong>{settings.currency ?? "PKR"}</strong></div>
            <div><span>Languages</span><strong>{(settings.supported_languages ?? ["ur", "en"]).join(" / ").toUpperCase()}</strong></div>
          </div>
          <div className="notice-box"><span>!</span><p>Public checkout remains unavailable until the store is explicitly opened and its catalogue and delivery setup have been verified.</p></div>
        </article>

        <article className="content-card checklist-card">
          <div className="card-heading">
            <div><span className="kicker">LOW STOCK &amp; RECENT ACTIVITY</span><h2>Operational alerts</h2></div>
          </div>
          {(overviewData?.low_stock_alerts.products.length ?? 0) === 0 && (overviewData?.low_stock_alerts.ingredients.length ?? 0) === 0 ? (
            <p className="orders-footnote">All tracked products and kitchen ingredients are above low-stock thresholds.</p>
          ) : (
            <div style={{ marginBottom: "12px" }}>
              {overviewData?.low_stock_alerts.products.map((p) => (
                <div className="check-row" key={p.id}>
                  <span className="check-dot">!</span>
                  <div><strong>{p.name_en} ({p.stock_qty} units left)</strong><small>{p.name_ur}</small></div>
                </div>
              ))}
              {overviewData?.low_stock_alerts.ingredients.map((ing) => (
                <div className="check-row" key={ing.id}>
                  <span className="check-dot">!</span>
                  <div><strong>{ing.name_en} ({ing.stock_qty} {ing.unit})</strong><small>Reorder at {ing.reorder_threshold} {ing.unit}</small></div>
                </div>
              ))}
            </div>
          )}
          {(overviewData?.recent_activity.length ?? 0) > 0 ? (
            <div style={{ marginTop: "8px" }}>
              <span className="kicker">LATEST AUDIT EVENTS</span>
              {overviewData!.recent_activity.slice(0, 4).map((act) => (
                <div className="check-row" key={act.id}>
                  <span className="check-dot complete">✓</span>
                  <div><strong>{act.action}</strong><small>{act.actor_name || act.actor_role || "System"} · {new Date(act.created_at).toLocaleString()}</small></div>
                </div>
              ))}
            </div>
          ) : null}
        </article>
      </section>

      <section className="content-card data-card">
        <div className="card-heading">
          <div><span className="kicker">LIVE DATA</span><h2>Current delivery areas</h2></div>
          <span className="data-count">{zones.length} active</span>
        </div>
        {error ? <p className="data-message error">{error}</p> : zones.length === 0 ? (
          <div className="data-message">No delivery zones are configured in the database.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Area</th><th>City</th><th>Delivery fee</th><th>Minimum order</th><th>ETA</th></tr></thead>
              <tbody>{zones.map(zone => (
                <tr key={zone.id}>
                  <td><strong>{zone.name_en}</strong><small>{zone.name_ur}</small></td>
                  <td>{zone.city || "—"}</td>
                  <td>{money(zone.delivery_fee_paisa)}</td>
                  <td>{money(zone.minimum_order_paisa)}</td>
                  <td>{zone.estimated_mins_min ?? 30}–{zone.estimated_mins_max ?? 55} min</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function nextStatuses(role: StaffUser["role"], current: string): string[] {
  const allowed: Record<string, string[]> = {
    pending: role === "owner" || role === "manager"
      ? ["confirmed", "cancelled", "rejected"]
      : role === "operator" ? ["confirmed"] : [],
    confirmed: role === "owner" || role === "manager"
      ? ["preparing", "cancelled"]
      : role === "operator" || role === "kitchen" ? ["preparing"] : [],
    preparing: role === "owner" || role === "manager"
      ? ["ready", "cancelled"]
      : role === "operator" || role === "kitchen" ? ["ready"] : [],
    ready: role === "owner" || role === "manager"
      ? ["out_for_delivery", "cancelled"]
      : role === "operator" ? ["out_for_delivery"] : [],
    out_for_delivery: role === "owner" || role === "manager"
      ? ["delivered", "cancelled"]
      : role === "operator" ? ["delivered"] : []
  };
  return allowed[current] ?? [];
}

/* 2. Live Orders Module (with Printable Receipt & Rider Assignment) */
function OrdersModule({ user, storeName }: { user: StaffUser; storeName: string }) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [riderDrafts, setRiderDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");
  const [receiptOrderId, setReceiptOrderId] = useState("");

  const canDispatch = user.role === "owner" || user.role === "manager" || user.role === "operator";

  async function loadOrders(nextFilter = filter) {
    setLoading(true);
    setError("");
    try {
      const [result, riderRes] = await Promise.all([
        adminApi.orders(nextFilter),
        canDispatch ? adminApi.riders().catch(() => ({ riders: [] as Rider[] })) : Promise.resolve({ riders: [] as Rider[] })
      ]);
      setOrders(result.orders);
      setRiders(riderRes.riders.filter((r) => r.is_active));
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders("");
  }, []);

  async function saveStatus(order: AdminOrder) {
    const next = drafts[order.id];
    if (!next || next === order.status) return;
    setBusyId(order.id);
    setError("");
    setNotice("");
    try {
      await adminApi.updateOrderStatus(order.id, next);
      setNotice(order.order_number + " updated to " + next.replaceAll("_", " ") + ".");
      setDrafts(current => {
        const copy = { ...current };
        delete copy[order.id];
        return copy;
      });
      await loadOrders(filter);
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusyId("");
    }
  }

  async function dispatchOrder(order: AdminOrder) {
    const riderId = riderDrafts[order.id];
    if (!riderId) return;
    setBusyId(order.id);
    setError("");
    setNotice("");
    try {
      await adminApi.assignRider(order.id, riderId, "Dispatched from Live Orders");
      setNotice(`${order.order_number} assigned to rider and moved to out for delivery.`);
      await loadOrders(filter);
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="orders-module">
      <div className="module-heading">
        <div><span className="kicker">ORDER OPERATIONS</span><h1>Live Orders</h1><p>Review current orders, apply role-authorized status transitions, dispatch riders, and print receipts.</p></div>
        <button className="refresh-button" type="button" onClick={() => void loadOrders(filter)} disabled={loading}>↻ Refresh</button>
      </div>

      <div className="orders-toolbar">
        <div className="filter-tabs">
          {["", "pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"].map(value => (
            <button key={value || "all"} type="button" className={filter === value ? "selected" : ""} onClick={() => { setFilter(value); void loadOrders(value); }}>
              {value ? value.replaceAll("_", " ") : "All orders"}
            </button>
          ))}
        </div>
        <span>{orders.length} shown · newest first</span>
      </div>

      {error ? <div className="orders-alert" role="alert">{error}</div> : null}
      {notice ? <div className="orders-notice" role="status">{notice}</div> : null}

      <div className="orders-table-card">
        {loading ? <div className="orders-empty">Loading orders…</div> : orders.length === 0 ? (
          <div className="orders-empty"><span className="empty-order-icon">▤</span><strong>No orders in this view</strong><small>New customer orders will appear here after the store is configured and opened.</small></div>
        ) : (
          <div className="table-wrap">
            <table className="orders-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Current status</th><th>Operations</th></tr></thead>
              <tbody>
                {orders.map(order => {
                  const options = nextStatuses(user.role, order.status);
                  const draft = drafts[order.id] ?? "";
                  const rDraft = riderDrafts[order.id] ?? "";
                  return (
                    <tr key={order.id}>
                      <td><strong>{order.order_number}</strong><small>{new Date(order.created_at).toLocaleString()}</small></td>
                      <td><strong>{order.customer_name || "Restricted"}</strong><small>{order.customer_phone || "Contact details restricted"}</small></td>
                      <td><strong>{money(order.total_paisa)}</strong><small>Subtotal {money(order.subtotal_paisa)}</small></td>
                      <td><strong>{order.payment_method.replaceAll("_", " ")}</strong><small>{order.payment_status.replaceAll("_", " ")}</small></td>
                      <td><span className={"order-status status-" + order.status}>{order.status.replaceAll("_", " ")}</span></td>
                      <td>
                        <div className="ops-inline-actions">
                          {options.length ? (
                            <div className="status-action">
                              <select value={draft} onChange={event => setDrafts(current => ({ ...current, [order.id]: event.target.value }))}>
                                <option value="">Choose…</option>
                                {options.map(option => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
                              </select>
                              <button type="button" disabled={!draft || busyId === order.id} onClick={() => void saveStatus(order)}>{busyId === order.id ? "…" : "Save"}</button>
                            </div>
                          ) : null}
                          {canDispatch && riders.length > 0 && ["confirmed", "preparing", "ready"].includes(order.status) ? (
                            <div className="status-action">
                              <select value={rDraft} onChange={(e) => setRiderDrafts((c) => ({ ...c, [order.id]: e.target.value }))}>
                                <option value="">Rider…</option>
                                {riders.map((r) => <option key={r.id} value={r.id}>{r.display_name}</option>)}
                              </select>
                              <button type="button" disabled={!rDraft || busyId === order.id} onClick={() => void dispatchOrder(order)}>Assign</button>
                            </div>
                          ) : null}
                          <button type="button" className="refresh-button" onClick={() => setReceiptOrderId(order.id)}>Receipt</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="orders-footnote">Status permissions are enforced by the API. Kitchen accounts receive no customer phone number or delivery address.</p>
      {receiptOrderId ? (
        <PrintableReceiptModal orderId={receiptOrderId} storeName={storeName} onClose={() => setReceiptOrderId("")} />
      ) : null}
    </section>
  );
}

/* 3. Kitchen Queue Module (Preserves exact smoke.spec.cjs behaviour) */
function KitchenModule({ user }: { user: StaffUser }) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, AdminOrderItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadQueue() {
    setLoading(true);
    setError("");
    try {
      const [confirmed, preparing] = await Promise.all([
        adminApi.orders("confirmed"),
        adminApi.orders("preparing")
      ]);
      const queue = [...confirmed.orders, ...preparing.orders].sort(
        (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)
      );
      const details = await Promise.all(queue.map(order => adminApi.adminOrder(order.id)));
      setOrders(queue);
      setOrderItems(Object.fromEntries(queue.map((order, index) => [order.id, details[index].items])));
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadQueue(); }, []);

  async function advance(order: AdminOrder, status: "preparing" | "ready") {
    setBusyId(order.id);
    setError("");
    setNotice("");
    try {
      await adminApi.updateOrderStatus(order.id, status, "Kitchen workflow");
      setNotice(order.order_number + " moved to " + status + ".");
      await loadQueue();
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusyId("");
    }
  }

  const queued = orders.filter(order => order.status === "confirmed");
  const active = orders.filter(order => order.status === "preparing");
  const lane = (title: string, items: AdminOrder[], next: "preparing" | "ready") => (
    <section className="kitchen-lane">
      <header><h2>{title}</h2><span>{items.length}</span></header>
      {items.length === 0 ? <div className="kitchen-empty">No orders in this stage.</div> : items.map(order => (
        <article className="kitchen-ticket" key={order.id}>
          <div className="kitchen-ticket-head"><strong>{order.order_number}</strong><time>{new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>
          <p>{order.customer_language === "ur" ? "اردو آرڈر" : "Customer order"}</p>
          <ul className="kitchen-items">
            {(orderItems[order.id] ?? []).map((item, index) => (
              <li key={order.id + "-" + index}>
                <span>{order.customer_language === "ur" ? item.product_name_ur_snapshot : item.product_name_en_snapshot}</span>
                <strong>× {item.quantity}</strong>
              </li>
            ))}
          </ul>
          <div className="kitchen-ticket-total">{money(order.total_paisa)}</div>
          <button type="button" disabled={busyId === order.id} onClick={() => void advance(order, next)}>
            {busyId === order.id ? "Saving…" : next === "preparing" ? "Start preparing" : "Mark ready"}
          </button>
        </article>
      ))}
    </section>
  );

  return (
    <section className="kitchen-module">
      <div className="module-heading">
        <div><span className="kicker">FOOD PREPARATION</span><h1>Kitchen queue</h1><p>Work through confirmed orders and move each ticket to ready when preparation is complete.</p><small className="kitchen-role">{user.role} access</small></div>
        <button type="button" className="secondary-button" onClick={() => void loadQueue()} disabled={loading}>Refresh queue</button>
      </div>
      {error ? <div className="orders-alert" role="alert">{error}</div> : null}
      {notice ? <div className="orders-notice" role="status">{notice}</div> : null}
      {loading ? <div className="kitchen-empty">Loading kitchen queue…</div> : (
        <div className="kitchen-board">
          {lane("Waiting to start", queued, "preparing")}
          {lane("In preparation", active, "ready")}
        </div>
      )}
      <p className="orders-footnote">Kitchen accounts only receive order references, language, totals and timestamps. Customer contact and delivery details remain restricted.</p>
    </section>
  );
}

/* 4. Products Module (CRUD + Archive/Restore + Safe Delete + Gallery Images) */
function ProductsModule({ user }: { user: StaffUser }) {
  const canEdit = user.role === "owner" || user.role === "manager";
  const isOwner = user.role === "owner";
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [galleryProductId, setGalleryProductId] = useState("");
  const [galleryImages, setGalleryImages] = useState<ProductImageRecord[]>([]);
  const [imgUrl, setImgUrl] = useState("");
  const [imgAltEn, setImgAltEn] = useState("");
  const [imgPrimary, setImgPrimary] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<Record<string, string>>({
    slug: "", name_en: "", name_ur: "", description_en: "", description_ur: "",
    price_paisa: "0", compare_at_paisa: "", stock_qty: "", sku: "", category_id: "", image_url: "", sort_order: "0",
    is_available: "1", is_featured: "0"
  });

  async function load() {
    setLoading(true); setError("");
    try {
      const [p, c] = await Promise.all([adminApi.adminProducts(), adminApi.adminCategories()]);
      setProducts(p.products);
      setCategories(c.categories);
    } catch (cause) {
      setError(messageFor(cause));
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  function resetForm() {
    setEditingId("");
    setForm({
      slug: "", name_en: "", name_ur: "", description_en: "", description_ur: "",
      price_paisa: "0", compare_at_paisa: "", stock_qty: "", sku: "", category_id: "", image_url: "", sort_order: "0",
      is_available: "1", is_featured: "0"
    });
  }

  function editProduct(product: Product) {
    setEditingId(product.id);
    setForm({
      slug: product.slug,
      name_en: product.name_en,
      name_ur: product.name_ur,
      description_en: product.description_en ?? "",
      description_ur: product.description_ur ?? "",
      price_paisa: (product.price_paisa / 100).toFixed(2),
      compare_at_paisa: product.compare_at_paisa == null ? "" : (product.compare_at_paisa / 100).toFixed(2),
      stock_qty: product.stock_qty == null ? "" : String(product.stock_qty),
      sku: product.sku ?? "",
      category_id: product.category_id ?? "",
      image_url: product.image_url ?? "",
      sort_order: String(product.sort_order ?? 0),
      is_available: String(product.is_available ?? 1),
      is_featured: String(product.is_featured ?? 0)
    });
  }

  async function openGallery(pid: string) {
    setGalleryProductId(pid);
    try {
      const res = await adminApi.productImages(pid);
      setGalleryImages(res.images);
    } catch (cause) {
      setError(messageFor(cause));
    }
  }

  async function addImage(e: FormEvent) {
    e.preventDefault();
    if (!galleryProductId || !imgUrl.trim()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await adminApi.addProductImage(galleryProductId, {
        object_key: imgUrl.trim(),
        alt_en: imgAltEn.trim(),
        alt_ur: imgAltEn.trim(),
        is_primary: imgPrimary
      });
      setImgUrl(""); setImgAltEn("");
      setNotice("Product image added.");
      await openGallery(galleryProductId);
      await load();
    } catch (cause) {
      setError(messageFor(cause));
    } finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      await adminApi.saveProduct({
        slug: form.slug.trim(),
        name_en: form.name_en.trim(),
        name_ur: form.name_ur.trim(),
        description_en: form.description_en,
        description_ur: form.description_ur,
        price_paisa: Math.round(Number(form.price_paisa) * 100),
        compare_at_paisa: form.compare_at_paisa === "" ? null : Math.round(Number(form.compare_at_paisa) * 100),
        ...(editingId ? {} : { stock_qty: form.stock_qty === "" ? null : Number(form.stock_qty) }),
        sku: form.sku || null,
        category_id: form.category_id || null,
        image_url: form.image_url || null,
        sort_order: Number(form.sort_order),
        is_available: form.is_available !== "0",
        is_featured: form.is_featured === "1"
      }, editingId || undefined);
      setNotice("Product saved.");
      resetForm();
      await load();
    } catch (cause) {
      setError(messageFor(cause));
    } finally { setBusy(false); }
  }

  return (
    <section className="catalogue-module">
      <div className="module-heading">
        <div>
          <span className="kicker">CATALOGUE PRODUCTS</span>
          <h1>Products Management</h1>
          <p>Create, update, archive/restore, safely delete unused records, and manage HTTPS product image galleries.</p>
        </div>
        <button className="refresh-button" type="button" disabled={loading} onClick={() => void load()}>↻ Refresh</button>
      </div>
      {error ? <div className="orders-alert" role="alert">{error}</div> : null}
      {notice ? <div className="orders-notice" role="status">{notice}</div> : null}

      {canEdit ? (
        <form className="catalogue-editor" onSubmit={submit}>
          <h2>{editingId ? "Edit Product" : "Create Product"}</h2>
          <div className="catalogue-form-grid">
            <label className="catalogue-field"><span>English name</span><input required value={form.name_en} onChange={(e) => setForm((c) => ({ ...c, name_en: e.target.value }))} /></label>
            <label className="catalogue-field"><span>Urdu name</span><input required value={form.name_ur} onChange={(e) => setForm((c) => ({ ...c, name_ur: e.target.value }))} /></label>
            <label className="catalogue-field"><span>URL slug</span><input required value={form.slug} onChange={(e) => setForm((c) => ({ ...c, slug: e.target.value }))} /></label>
            <label className="catalogue-field"><span>Price (PKR)</span><input required type="number" min="0" step="0.01" value={form.price_paisa} onChange={(e) => setForm((c) => ({ ...c, price_paisa: e.target.value }))} /></label>
            <label className="catalogue-field"><span>Compare-at price (PKR)</span><input type="number" min="0" step="0.01" value={form.compare_at_paisa} onChange={(e) => setForm((c) => ({ ...c, compare_at_paisa: e.target.value }))} /></label>
            {!editingId ? (
              <label className="catalogue-field"><span>Opening stock (blank = unlimited)</span><input type="number" min="0" step="1" value={form.stock_qty} onChange={(e) => setForm((c) => ({ ...c, stock_qty: e.target.value }))} /></label>
            ) : null}
            <label className="catalogue-field"><span>SKU (optional)</span><input value={form.sku} onChange={(e) => setForm((c) => ({ ...c, sku: e.target.value }))} /></label>
            <label className="catalogue-field"><span>Primary Image URL (HTTPS)</span><input value={form.image_url} onChange={(e) => setForm((c) => ({ ...c, image_url: e.target.value }))} /></label>
            <label className="catalogue-field">
              <span>Category</span>
              <select value={form.category_id} onChange={(e) => setForm((c) => ({ ...c, category_id: e.target.value }))}>
                <option value="">Uncategorised</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name_en} · {c.name_ur}</option>)}
              </select>
            </label>
            <label className="catalogue-field">
              <span>Availability</span>
              <select value={form.is_available} onChange={(e) => setForm((c) => ({ ...c, is_available: e.target.value }))}>
                <option value="1">Available</option>
                <option value="0">Unavailable</option>
              </select>
            </label>
            <label className="catalogue-field">
              <span>Featured</span>
              <select value={form.is_featured} onChange={(e) => setForm((c) => ({ ...c, is_featured: e.target.value }))}>
                <option value="0">No</option>
                <option value="1">Yes</option>
              </select>
            </label>
            <label className="catalogue-field"><span>Sort order</span><input type="number" value={form.sort_order} onChange={(e) => setForm((c) => ({ ...c, sort_order: e.target.value }))} /></label>
            <label className="catalogue-field catalogue-wide"><span>English description</span><textarea rows={2} value={form.description_en} onChange={(e) => setForm((c) => ({ ...c, description_en: e.target.value }))} /></label>
            <label className="catalogue-field catalogue-wide"><span>Urdu description</span><textarea rows={2} value={form.description_ur} onChange={(e) => setForm((c) => ({ ...c, description_ur: e.target.value }))} /></label>
          </div>
          <div className="catalogue-actions">
            <button type="submit" disabled={busy}>{busy ? "Saving…" : editingId ? "Save changes" : "Create product"}</button>
            {editingId ? <button type="button" className="refresh-button" onClick={resetForm}>Cancel edit</button> : null}
          </div>
        </form>
      ) : null}

      {galleryProductId ? (
        <div className="ops-card-padded">
          <div className="team-form-heading">
            <h2>Product Image Gallery</h2>
            <button type="button" className="secondary-button" onClick={() => setGalleryProductId("")}>Close Gallery</button>
          </div>
          {canEdit ? (
            <form onSubmit={addImage} className="ops-inline-actions" style={{ marginBottom: "12px" }}>
              <input required placeholder="https://... image URL" value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} style={{ flex: 1, minHeight: "38px", padding: "0 10px", borderRadius: "7px", border: "1px solid var(--line)" }} />
              <input placeholder="Alt text" value={imgAltEn} onChange={(e) => setImgAltEn(e.target.value)} style={{ width: "180px", minHeight: "38px", padding: "0 10px", borderRadius: "7px", border: "1px solid var(--line)" }} />
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
                <input type="checkbox" checked={imgPrimary} onChange={(e) => setImgPrimary(e.target.checked)} /> Primary
              </label>
              <button type="submit" className="primary-button" disabled={busy}>Add Image</button>
            </form>
          ) : null}
          {galleryImages.length === 0 ? <p className="orders-footnote">No gallery images saved for this product yet.</p> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>URL</th><th>Alt</th><th>Primary</th><th>Action</th></tr></thead>
                <tbody>
                  {galleryImages.map((img) => (
                    <tr key={img.id}>
                      <td><small>{img.object_key}</small></td>
                      <td>{img.alt_en || "—"}</td>
                      <td>{img.is_primary ? "Yes" : "No"}</td>
                      <td>
                        {canEdit ? (
                          <button type="button" className="refresh-button" onClick={() => void adminApi.deleteProductImage(img.id).then(() => openGallery(galleryProductId))}>Delete</button>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      <div className="orders-table-card">
        {loading ? <div className="orders-empty">Loading products…</div> : products.length === 0 ? (
          <div className="orders-empty"><strong>No products yet</strong><small>Add genuine products and prices before opening the store.</small></div>
        ) : (
          <div className="table-wrap">
            <table className="orders-table">
              <thead><tr><th>Product</th><th>SKU</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.name_en}</strong><small>{p.name_ur} · {p.slug}</small></td>
                    <td>{p.sku || "—"}</td>
                    <td>{money(p.price_paisa)}</td>
                    <td>{p.stock_qty == null ? "Unlimited" : p.stock_qty}</td>
                    <td>
                      {p.is_archived ? (
                        <span className="ops-pill-warn">Archived</span>
                      ) : p.is_available ? (
                        <span className="ops-pill-ok">Available</span>
                      ) : (
                        <span className="ops-pill-danger">Unavailable</span>
                      )}
                    </td>
                    <td>
                      <div className="ops-inline-actions">
                        <button type="button" className="refresh-button" disabled={!canEdit} onClick={() => editProduct(p)}>Edit</button>
                        <button type="button" className="refresh-button" onClick={() => void openGallery(p.id)}>Images</button>
                        {canEdit ? (
                          p.is_archived ? (
                            <button type="button" className="refresh-button" onClick={() => void adminApi.restoreProduct(p.id).then(() => load())}>Restore</button>
                          ) : (
                            <button type="button" className="refresh-button" onClick={() => void adminApi.archiveProduct(p.id).then(() => load())}>Archive</button>
                          )
                        ) : null}
                        {isOwner ? (
                          <button type="button" className="refresh-button" onClick={() => void adminApi.deleteProduct(p.id).then(() => load()).catch((err) => setError(messageFor(err)))}>Delete</button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

/* 5. Categories Module */
function CategoriesModule({ user }: { user: StaffUser }) {
  const canEdit = user.role === "owner" || user.role === "manager";
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({
    slug: "", name_en: "", name_ur: "", description_en: "", description_ur: "", image_url: "", sort_order: "0", is_active: "1"
  });

  async function load() {
    setLoading(true); setError("");
    try {
      const res = await adminApi.adminCategories();
      setCategories(res.categories);
    } catch (cause) {
      setError(messageFor(cause));
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  function resetForm() {
    setEditingId("");
    setForm({ slug: "", name_en: "", name_ur: "", description_en: "", description_ur: "", image_url: "", sort_order: "0", is_active: "1" });
  }

  function editCategory(c: Category) {
    setEditingId(c.id);
    setForm({
      slug: c.slug,
      name_en: c.name_en,
      name_ur: c.name_ur,
      description_en: c.description_en ?? "",
      description_ur: c.description_ur ?? "",
      image_url: c.image_url ?? "",
      sort_order: String(c.sort_order ?? 0),
      is_active: String(c.is_active ?? 1)
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      await adminApi.saveCategory({
        slug: form.slug.trim(),
        name_en: form.name_en.trim(),
        name_ur: form.name_ur.trim(),
        description_en: form.description_en,
        description_ur: form.description_ur,
        image_url: form.image_url.trim() || null,
        sort_order: Number(form.sort_order),
        is_active: form.is_active !== "0"
      }, editingId || undefined);
      setNotice("Category saved.");
      resetForm();
      await load();
    } catch (cause) {
      setError(messageFor(cause));
    } finally { setBusy(false); }
  }

  return (
    <section className="catalogue-module">
      <div className="module-heading">
        <div>
          <span className="kicker">CATALOGUE STRUCTURE</span>
          <h1>Categories</h1>
          <p>Organize menu sections in English and Urdu with custom display ordering and HTTPS category imagery.</p>
        </div>
        <button className="refresh-button" type="button" disabled={loading} onClick={() => void load()}>↻ Refresh</button>
      </div>
      {error ? <div className="orders-alert" role="alert">{error}</div> : null}
      {notice ? <div className="orders-notice" role="status">{notice}</div> : null}

      {canEdit ? (
        <form className="catalogue-editor" onSubmit={submit}>
          <h2>{editingId ? "Edit Category" : "Create Category"}</h2>
          <div className="catalogue-form-grid">
            <label className="catalogue-field"><span>English name</span><input required value={form.name_en} onChange={(e) => setForm((c) => ({ ...c, name_en: e.target.value }))} /></label>
            <label className="catalogue-field"><span>Urdu name</span><input required value={form.name_ur} onChange={(e) => setForm((c) => ({ ...c, name_ur: e.target.value }))} /></label>
            <label className="catalogue-field"><span>URL slug</span><input required value={form.slug} onChange={(e) => setForm((c) => ({ ...c, slug: e.target.value }))} /></label>
            <label className="catalogue-field"><span>Category Image URL (HTTPS)</span><input value={form.image_url} onChange={(e) => setForm((c) => ({ ...c, image_url: e.target.value }))} /></label>
            <label className="catalogue-field"><span>Sort order</span><input type="number" value={form.sort_order} onChange={(e) => setForm((c) => ({ ...c, sort_order: e.target.value }))} /></label>
            <label className="catalogue-field"><span>Status</span><select value={form.is_active} onChange={(e) => setForm((c) => ({ ...c, is_active: e.target.value }))}><option value="1">Active</option><option value="0">Inactive</option></select></label>
            <label className="catalogue-field catalogue-wide"><span>English description</span><textarea rows={2} value={form.description_en} onChange={(e) => setForm((c) => ({ ...c, description_en: e.target.value }))} /></label>
            <label className="catalogue-field catalogue-wide"><span>Urdu description</span><textarea rows={2} value={form.description_ur} onChange={(e) => setForm((c) => ({ ...c, description_ur: e.target.value }))} /></label>
          </div>
          <div className="catalogue-actions">
            <button type="submit" disabled={busy}>{busy ? "Saving…" : editingId ? "Save changes" : "Create category"}</button>
            {editingId ? <button type="button" className="refresh-button" onClick={resetForm}>Cancel edit</button> : null}
          </div>
        </form>
      ) : null}

      <div className="orders-table-card">
        {loading ? <div className="orders-empty">Loading categories…</div> : categories.length === 0 ? (
          <div className="orders-empty"><strong>No categories yet</strong></div>
        ) : (
          <div className="table-wrap">
            <table className="orders-table">
              <thead><tr><th>Category</th><th>Slug</th><th>Sort</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.name_en}</strong><small>{c.name_ur}</small></td>
                    <td>{c.slug}</td>
                    <td>{c.sort_order ?? 0}</td>
                    <td><span className={"order-status " + (c.is_active ? "status-confirmed" : "status-cancelled")}>{c.is_active ? "Active" : "Inactive"}</span></td>
                    <td><button type="button" className="refresh-button" disabled={!canEdit} onClick={() => editCategory(c)}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

/* 7. Promotions & Coupons Module (CRUD + Redemption History) */
function CouponsModule({ user }: { user: StaffUser }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [redemptions, setRedemptions] = useState<CouponRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<Record<string, string>>({
    code: "",
    discount_type: "fixed",
    discount_value: "100",
    min_order_paisa: "0",
    max_discount_paisa: "",
    usage_limit: "",
    start_at: "",
    expires_at: "",
    is_active: "1"
  });

  const canEdit = user.role === "owner" || user.role === "manager";

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [res, redRes] = await Promise.all([
        adminApi.coupons(),
        adminApi.couponRedemptions().catch(() => ({ redemptions: [] as CouponRedemption[] }))
      ]);
      setCoupons(res.coupons);
      setRedemptions(redRes.redemptions);
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function resetForm() {
    setEditingId("");
    setForm({
      code: "", discount_type: "fixed", discount_value: "100", min_order_paisa: "0",
      max_discount_paisa: "", usage_limit: "", start_at: "", expires_at: "", is_active: "1"
    });
  }

  function editCoupon(c: Coupon) {
    setEditingId(c.id);
    setForm({
      code: c.code,
      discount_type: c.discount_type,
      discount_value: c.discount_type === "fixed" ? (c.discount_value / 100).toFixed(2) : String(c.discount_value),
      min_order_paisa: (c.min_order_paisa / 100).toFixed(2),
      max_discount_paisa: c.max_discount_paisa == null ? "" : (c.max_discount_paisa / 100).toFixed(2),
      usage_limit: c.usage_limit == null ? "" : String(c.usage_limit),
      start_at: c.start_at ? c.start_at.slice(0, 16) : "",
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : "",
      is_active: String(c.is_active)
    });
  }

  async function handleDelete(id: string) {
    setBusy(true);
    setError("");
    try {
      await adminApi.deleteCoupon(id);
      setNotice("Coupon deleted.");
      resetForm();
      await load();
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const valNum = Number(form.discount_value);
      const discountValue = form.discount_type === "fixed" ? Math.round(valNum * 100) : Math.round(valNum);
      await adminApi.saveCoupon({
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: discountValue,
        min_order_paisa: Math.round(Number(form.min_order_paisa || 0) * 100),
        max_discount_paisa: form.max_discount_paisa ? Math.round(Number(form.max_discount_paisa) * 100) : null,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        is_active: form.is_active !== "0"
      }, editingId || undefined);
      setNotice("Coupon saved successfully.");
      resetForm();
      await load();
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="catalogue-module">
      <div className="module-heading">
        <div>
          <span className="kicker">MARKETING &amp; PROMOTIONS</span>
          <h1>Promotions &amp; Coupons</h1>
          <p>Create promotional discount codes and audit verified coupon redemptions across orders.</p>
        </div>
        <button className="refresh-button" type="button" disabled={loading} onClick={() => void load()}>↻ Refresh</button>
      </div>
      {error ? <div className="orders-alert" role="alert">{error}</div> : null}
      {notice ? <div className="orders-notice" role="status">{notice}</div> : null}

      {canEdit ? (
        <form className="catalogue-editor" onSubmit={submit}>
          <h2>{editingId ? "Edit" : "Create"} coupon</h2>
          <div className="catalogue-form-grid">
            <label className="catalogue-field"><span>Coupon code</span><input type="text" required value={form.code} onChange={(e) => setForm((c) => ({ ...c, code: e.target.value }))} placeholder="WELCOME100" /></label>
            <label className="catalogue-field">
              <span>Discount type</span>
              <select value={form.discount_type} onChange={(e) => setForm((c) => ({ ...c, discount_type: e.target.value }))}>
                <option value="fixed">Fixed PKR Amount</option>
                <option value="percent">Percentage (%)</option>
              </select>
            </label>
            <label className="catalogue-field"><span>Discount value ({form.discount_type === "fixed" ? "PKR" : "%"})</span><input type="number" step={form.discount_type === "fixed" ? "0.01" : "1"} min="1" required value={form.discount_value} onChange={(e) => setForm((c) => ({ ...c, discount_value: e.target.value }))} /></label>
            <label className="catalogue-field"><span>Minimum order (PKR)</span><input type="number" step="0.01" min="0" value={form.min_order_paisa} onChange={(e) => setForm((c) => ({ ...c, min_order_paisa: e.target.value }))} /></label>
            <label className="catalogue-field"><span>Max discount cap (PKR)</span><input type="number" step="0.01" min="0" value={form.max_discount_paisa} onChange={(e) => setForm((c) => ({ ...c, max_discount_paisa: e.target.value }))} /></label>
            <label className="catalogue-field"><span>Usage limit</span><input type="number" min="1" value={form.usage_limit} onChange={(e) => setForm((c) => ({ ...c, usage_limit: e.target.value }))} placeholder="Blank = unlimited" /></label>
            <label className="catalogue-field"><span>Start date</span><input type="datetime-local" value={form.start_at} onChange={(e) => setForm((c) => ({ ...c, start_at: e.target.value }))} /></label>
            <label className="catalogue-field"><span>Expiry date</span><input type="datetime-local" value={form.expires_at} onChange={(e) => setForm((c) => ({ ...c, expires_at: e.target.value }))} /></label>
            <label className="catalogue-field"><span>Status</span><select value={form.is_active} onChange={(e) => setForm((c) => ({ ...c, is_active: e.target.value }))}><option value="1">Active</option><option value="0">Inactive</option></select></label>
          </div>
          <div className="catalogue-actions">
            <button type="submit" disabled={busy}>{busy ? "Saving…" : editingId ? "Save changes" : "Create coupon"}</button>
            {editingId ? <button type="button" className="refresh-button" onClick={resetForm}>Cancel edit</button> : null}
          </div>
        </form>
      ) : null}

      <div className="orders-table-card">
        {loading ? <div className="orders-empty">Loading coupons…</div> : coupons.length === 0 ? (
          <div className="orders-empty"><strong>No coupons configured yet</strong></div>
        ) : (
          <div className="table-wrap">
            <table className="orders-table">
              <thead><tr><th>Code</th><th>Discount</th><th>Min Order</th><th>Usage</th><th>Validity</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.code}</strong></td>
                    <td>{c.discount_type === "fixed" ? money(c.discount_value) : c.discount_value + "%"}</td>
                    <td>{money(c.min_order_paisa)}</td>
                    <td>{c.used_count} / {c.usage_limit ?? "∞"}</td>
                    <td><small>{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "No expiry"}</small></td>
                    <td><span className={"order-status " + (c.is_active ? "status-confirmed" : "status-cancelled")}>{c.is_active ? "Active" : "Inactive"}</span></td>
                    <td>
                      <div className="ops-inline-actions">
                        <button type="button" className="refresh-button" onClick={() => editCoupon(c)} disabled={!canEdit}>Edit</button>
                        <button type="button" className="refresh-button" onClick={() => void handleDelete(c.id)} disabled={!canEdit}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {redemptions.length > 0 ? (
        <div className="ops-card-padded">
          <h2>Recent Coupon Redemptions ({redemptions.length})</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Code</th><th>Order #</th><th>Discount Applied</th><th>Redeemed At</th></tr></thead>
              <tbody>
                {redemptions.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.coupon_code}</strong></td>
                    <td>{r.order_number}</td>
                    <td>{money(r.discount_applied_paisa)}</td>
                    <td><small>{new Date(r.created_at).toLocaleString()}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* 9. Delivery Zones Module */
function DeliveryModule({ user }: { user: StaffUser }) {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({
    code: "", name_en: "", name_ur: "", country_code: "PK", region: "Punjab", city: "",
    delivery_fee_paisa: "0", minimum_order_paisa: "0", estimated_mins_min: "30", estimated_mins_max: "55", is_active: "1"
  });
  const canEdit = user.role === "owner" || user.role === "manager";

  async function load() {
    setLoading(true); setError("");
    try {
      const result = await adminApi.adminDeliveryZones();
      setZones(result.delivery_zones);
    } catch (cause) {
      setError(messageFor(cause));
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function resetForm() {
    setEditingId("");
    setForm({
      code: "", name_en: "", name_ur: "", country_code: "PK", region: "Punjab", city: "",
      delivery_fee_paisa: "0", minimum_order_paisa: "0", estimated_mins_min: "30", estimated_mins_max: "55", is_active: "1"
    });
  }
  function editZone(zone: DeliveryZone) {
    setEditingId(zone.id);
    setForm({
      code: zone.code,
      name_en: zone.name_en,
      name_ur: zone.name_ur,
      country_code: zone.country_code || "PK",
      region: zone.region || "",
      city: zone.city,
      delivery_fee_paisa: String(zone.delivery_fee_paisa),
      minimum_order_paisa: String(zone.minimum_order_paisa),
      estimated_mins_min: String(zone.estimated_mins_min ?? 30),
      estimated_mins_max: String(zone.estimated_mins_max ?? 55),
      is_active: String(zone.is_active)
    });
    setError(""); setNotice("");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await adminApi.saveDeliveryZone({
        code: form.code.trim().toUpperCase(),
        name_en: form.name_en.trim(),
        name_ur: form.name_ur.trim(),
        country_code: form.country_code.trim().toUpperCase(),
        region: form.region.trim(),
        city: form.city.trim(),
        delivery_fee_paisa: Number(form.delivery_fee_paisa),
        minimum_order_paisa: Number(form.minimum_order_paisa),
        estimated_mins_min: Number(form.estimated_mins_min),
        estimated_mins_max: Number(form.estimated_mins_max),
        is_active: form.is_active === "1"
      }, editingId || undefined);
      setNotice(editingId ? "Delivery zone updated." : "Delivery zone created.");
      resetForm(); await load();
    } catch (cause) { setError(messageFor(cause)); }
    finally { setBusy(false); }
  }
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));

  return (
    <section className="delivery-module">
      <div className="module-heading">
        <div><span className="kicker">SERVICE AREA CONFIGURATION</span><h1>Delivery Zones</h1><p>Manage Pakistani delivery areas, integer-paisa fees, minimum orders, and realistic ETA windows.</p></div>
        <button className="refresh-button" type="button" disabled={loading} onClick={() => void load()}>↻ Refresh</button>
      </div>
      {error ? <div className="orders-alert" role="alert">{error}</div> : null}
      {notice ? <div className="orders-notice" role="status">{notice}</div> : null}
      {canEdit ? (
        <form className="catalogue-editor" onSubmit={submit}>
          <h2>{editingId ? "Edit delivery zone" : "Create delivery zone"}</h2>
          <div className="catalogue-form-grid">
            <label className="catalogue-field"><span>Zone code</span><input required maxLength={40} value={form.code} onChange={event => update("code", event.target.value)} placeholder="WAH-CANTT" /></label>
            <label className="catalogue-field"><span>English name</span><input required maxLength={140} value={form.name_en} onChange={event => update("name_en", event.target.value)} /></label>
            <label className="catalogue-field"><span>Urdu name</span><input required maxLength={140} value={form.name_ur} onChange={event => update("name_ur", event.target.value)} /></label>
            <label className="catalogue-field"><span>Country code</span><input required minLength={2} maxLength={2} value={form.country_code} onChange={event => update("country_code", event.target.value)} /></label>
            <label className="catalogue-field"><span>Region / province</span><input maxLength={120} value={form.region} onChange={event => update("region", event.target.value)} /></label>
            <label className="catalogue-field"><span>City</span><input required maxLength={120} value={form.city} onChange={event => update("city", event.target.value)} /></label>
            <label className="catalogue-field"><span>Delivery fee (paisa)</span><input required type="number" min="0" step="1" value={form.delivery_fee_paisa} onChange={event => update("delivery_fee_paisa", event.target.value)} /></label>
            <label className="catalogue-field"><span>Minimum order (paisa)</span><input required type="number" min="0" step="1" value={form.minimum_order_paisa} onChange={event => update("minimum_order_paisa", event.target.value)} /></label>
            <label className="catalogue-field"><span>Zone status</span><select value={form.is_active} onChange={event => update("is_active", event.target.value)}><option value="1">Active</option><option value="0">Inactive</option></select></label>
            <label className="catalogue-field"><span>ETA Min (minutes)</span><input required type="number" min="5" max="480" value={form.estimated_mins_min} onChange={event => update("estimated_mins_min", event.target.value)} /></label>
            <label className="catalogue-field"><span>ETA Max (minutes)</span><input required type="number" min="5" max="480" value={form.estimated_mins_max} onChange={event => update("estimated_mins_max", event.target.value)} /></label>
          </div>
          <div className="catalogue-actions"><button type="submit" disabled={busy}>{busy ? "Saving…" : editingId ? "Save changes" : "Create zone"}</button>{editingId ? <button type="button" className="refresh-button" disabled={busy} onClick={resetForm}>Cancel edit</button> : null}</div>
          <p className="orders-footnote">Amounts are integer paisa. PKR 100 = 10,000 paisa. Only active zones are offered during checkout.</p>
        </form>
      ) : null}
      <section className="inventory-stock-card">
        <div className="inventory-card-heading"><div><h2>Configured service areas</h2><p>{zones.length} zones</p></div></div>
        {loading ? <div className="orders-empty">Loading delivery zones…</div> : zones.length === 0 ? <div className="orders-empty"><strong>No delivery zones configured</strong></div> : (
          <div className="table-wrap"><table className="orders-table"><thead><tr><th>Zone</th><th>Code</th><th>Location</th><th>Fee</th><th>Min Order</th><th>ETA</th><th>Status</th><th>Action</th></tr></thead><tbody>{zones.map(zone => <tr key={zone.id}>
            <td><strong>{zone.name_en}</strong><small>{zone.name_ur}</small></td>
            <td>{zone.code}</td><td>{[zone.city, zone.region, zone.country_code].filter(Boolean).join(", ")}</td>
            <td>{money(zone.delivery_fee_paisa)}</td><td>{money(zone.minimum_order_paisa)}</td>
            <td>{zone.estimated_mins_min ?? 30}–{zone.estimated_mins_max ?? 55} min</td>
            <td><span className={"order-status " + (zone.is_active ? "status-confirmed" : "status-cancelled")}>{zone.is_active ? "Active" : "Inactive"}</span></td>
            <td><button className="refresh-button" type="button" disabled={!canEdit} onClick={() => editZone(zone)}>Edit</button></td>
          </tr>)}</tbody></table></div>
        )}
      </section>
    </section>
  );
}

/* 10. Riders & Dispatch Module */
function RidersModule({ user }: { user: StaffUser }) {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryAssignmentRecord[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [staffUserId, setStaffUserId] = useState("");
  const [vehicleType, setVehicleType] = useState("bike");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [busy, setBusy] = useState(false);

  const canManage = user.role === "owner" || user.role === "manager" || user.role === "operator";

  async function loadData() {
    setLoading(true); setError("");
    try {
      const [rRes, dRes, sRes] = await Promise.all([
        adminApi.riders(),
        adminApi.deliveries().catch(() => ({ deliveries: [] as DeliveryAssignmentRecord[] })),
        adminApi.staffDirectory().catch(() => ({ staff: [] as StaffMember[] }))
      ]);
      setRiders(rRes.riders);
      setDeliveries(dRes.deliveries);
      setStaffList(sRes.staff);
    } catch (cause) {
      setError(messageFor(cause));
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadData(); }, []);

  async function handleAddRider(e: FormEvent) {
    e.preventDefault();
    if (!staffUserId) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await adminApi.saveRider({ staff_user_id: staffUserId, vehicle_type: vehicleType, vehicle_number: vehicleNumber });
      setShowAdd(false); setStaffUserId(""); setVehicleNumber("");
      setNotice("Rider profile linked.");
      await loadData();
    } catch (cause) {
      setError(messageFor(cause));
    } finally { setBusy(false); }
  }

  async function handleUpdateDelivery(id: string, status: "picked_up" | "delivered" | "failed") {
    setBusy(true); setError(""); setNotice("");
    try {
      await adminApi.updateDeliveryStatus(id, status, status === "failed" ? "Customer unreachable" : "");
      setNotice(`Delivery marked ${status.replaceAll("_", " ")}.`);
      await loadData();
    } catch (cause) {
      setError(messageFor(cause));
    } finally { setBusy(false); }
  }

  return (
    <section className="inventory-module">
      <div className="module-heading">
        <div>
          <span className="kicker">DELIVERY FLEET &amp; DISPATCH</span>
          <h1>Riders &amp; Dispatch</h1>
          <p>Manage rider profiles, fleet availability, and live delivery assignment progression.</p>
        </div>
        <div className="ops-inline-actions">
          {canManage ? (
            <button className="primary-button" type="button" onClick={() => setShowAdd(!showAdd)}>+ Add Rider Profile</button>
          ) : null}
          <button className="refresh-button" type="button" onClick={() => void loadData()}>↻ Refresh</button>
        </div>
      </div>

      {error ? <div className="orders-alert" role="alert">{error}</div> : null}
      {notice ? <div className="orders-notice" role="status">{notice}</div> : null}

      {showAdd ? (
        <form className="catalogue-editor" onSubmit={handleAddRider}>
          <h2>Link Staff User as Rider</h2>
          <div className="catalogue-form-grid">
            <label className="catalogue-field">
              <span>Staff Account</span>
              <select value={staffUserId} onChange={(e) => setStaffUserId(e.target.value)} required>
                <option value="">Choose staff user…</option>
                {staffList.map((s) => <option key={s.id} value={s.id}>{s.display_name} ({s.email}) · {s.role}</option>)}
              </select>
            </label>
            <label className="catalogue-field">
              <span>Vehicle Type</span>
              <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
                <option value="bike">Bike / Motorcycle</option>
                <option value="scooter">Scooter</option>
                <option value="car">Car</option>
                <option value="van">Van</option>
                <option value="bicycle">Bicycle</option>
                <option value="foot">On Foot</option>
              </select>
            </label>
            <label className="catalogue-field"><span>Vehicle Plate</span><input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="RIW-1234" /></label>
          </div>
          <div className="catalogue-actions">
            <button type="submit" disabled={busy}>Save Rider</button>
            <button type="button" className="refresh-button" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </form>
      ) : null}

      <div className="ops-card-padded">
        <h2>Fleet Directory ({riders.length})</h2>
        {loading ? <p className="orders-footnote">Loading riders…</p> : riders.length === 0 ? (
          <p className="orders-footnote">No rider profiles configured yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="orders-table">
              <thead><tr><th>Rider</th><th>Email</th><th>Vehicle</th><th>Plate</th><th>Status</th><th>Active</th></tr></thead>
              <tbody>
                {riders.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.display_name}</strong></td>
                    <td>{r.email}</td>
                    <td><span className="environment-pill">{r.vehicle_type}</span></td>
                    <td>{r.vehicle_number || "—"}</td>
                    <td><span className={"order-status " + (r.current_status === "available" ? "status-confirmed" : "status-preparing")}>{r.current_status}</span></td>
                    <td>{r.is_active ? "Active" : "Inactive"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="ops-card-padded">
        <h2>Dispatch Assignments ({deliveries.length})</h2>
        {deliveries.length === 0 ? <p className="orders-footnote">No rider assignments yet. Assign orders from Live Orders.</p> : (
          <div className="table-wrap">
            <table className="orders-table">
              <thead><tr><th>Order</th><th>Area</th><th>Rider</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id}>
                    <td><strong>{d.order_number}</strong><small>{new Date(d.assigned_at).toLocaleString()}</small></td>
                    <td>{d.delivery_area || "—"}</td>
                    <td><strong>{d.rider_name}</strong><small>{d.vehicle_type}</small></td>
                    <td>{money(d.total_paisa)}</td>
                    <td><span className="environment-pill">{d.status}</span></td>
                    <td>
                      <div className="ops-inline-actions">
                        {d.status === "assigned" ? (
                          <button type="button" className="refresh-button" disabled={busy} onClick={() => void handleUpdateDelivery(d.id, "picked_up")}>Picked Up</button>
                        ) : null}
                        {d.status === "assigned" || d.status === "picked_up" ? (
                          <>
                            <button type="button" className="refresh-button" disabled={busy} onClick={() => void handleUpdateDelivery(d.id, "delivered")}>Delivered</button>
                            <button type="button" className="refresh-button" disabled={busy} onClick={() => void handleUpdateDelivery(d.id, "failed")}>Failed</button>
                          </>
                        ) : <small className="restricted-action">{d.status}</small>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

/* 11. Inventory & Stock Module */
function InventoryModule({ user }: { user: StaffUser }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState<"stock_received" | "stock_adjustment" | "return_received">("stock_received");
  const [note, setNote] = useState("");
  const [submissionKey, setSubmissionKey] = useState(() => crypto.randomUUID());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canAdjust = user.role === "owner" || user.role === "manager";
  const trackedProducts = products.filter(product => product.stock_qty !== null && product.stock_qty !== undefined);

  async function load(productFilter = filterProduct) {
    setLoading(true); setError("");
    try {
      const [productResult, movementResult] = await Promise.all([
        adminApi.adminProducts(),
        adminApi.inventoryMovements(productFilter)
      ]);
      setProducts(productResult.products);
      setMovements(movementResult.movements);
      if (!selectedProduct && productResult.products.some(product => product.stock_qty !== null && product.stock_qty !== undefined)) {
        setSelectedProduct(productResult.products.find(product => product.stock_qty !== null && product.stock_qty !== undefined)!.id);
      }
    } catch (cause) {
      setError(messageFor(cause));
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(""); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const quantity = Number(delta);
    if (!selectedProduct || !Number.isSafeInteger(quantity) || quantity === 0) {
      setError("Choose a tracked product and enter a non-zero whole-number quantity.");
      return;
    }
    if ((reason === "stock_received" || reason === "return_received") && quantity < 0) {
      setError("Received stock and returns must use a positive quantity. Use Stock adjustment for reductions.");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await adminApi.adjustInventory({
        product_id: selectedProduct,
        delta_qty: quantity,
        reason,
        note: note.trim()
      }, submissionKey);
      const product = products.find(item => item.id === selectedProduct);
      setNotice((product?.name_en ?? "Product") + ": movement recorded (" + (result.delta_qty > 0 ? "+" : "") + result.delta_qty + " units).");
      setDelta(""); setNote("");
      setSubmissionKey(crypto.randomUUID());
      await load(filterProduct);
    } catch (cause) { setError(messageFor(cause)); }
    finally { setBusy(false); }
  }

  return (
    <section className="inventory-module">
      <div className="module-heading">
        <div><span className="kicker">STOCK CONTROL</span><h1>Inventory &amp; Stock</h1><p>Record idempotent stock receipts, returns and corrections with an immutable movement trail.</p></div>
        <button className="refresh-button" type="button" disabled={loading} onClick={() => void load(filterProduct)}>↻ Refresh</button>
      </div>
      {error ? <div className="orders-alert" role="alert">{error}</div> : null}
      {notice ? <div className="orders-notice" role="status">{notice}</div> : null}
      <div className="inventory-summary-grid">
        <div className="inventory-summary"><span>Tracked products</span><strong>{trackedProducts.length}</strong></div>
        <div className="inventory-summary"><span>Not tracked</span><strong>{products.length - trackedProducts.length}</strong></div>
        <div className="inventory-summary"><span>Movement records loaded</span><strong>{movements.length}</strong></div>
      </div>
      {canAdjust ? (
        <form className="catalogue-editor inventory-editor" onSubmit={submit}>
          <h2>Record a stock movement</h2>
          {trackedProducts.length === 0 ? <p className="orders-footnote">No products currently have stock tracking enabled. Set an opening stock quantity when creating a product.</p> : (
            <>
              <div className="catalogue-form-grid">
                <label className="catalogue-field catalogue-wide"><span>Product</span><select required value={selectedProduct} onChange={event => { setSelectedProduct(event.target.value); setSubmissionKey(crypto.randomUUID()); }}><option value="">Choose product…</option>{trackedProducts.map(product => <option key={product.id} value={product.id}>{product.name_en} · {product.stock_qty} units</option>)}</select></label>
                <label className="catalogue-field"><span>Movement reason</span><select value={reason} onChange={event => { setReason(event.target.value as typeof reason); setSubmissionKey(crypto.randomUUID()); }}><option value="stock_received">Stock received</option><option value="return_received">Return received</option><option value="stock_adjustment">Stock adjustment</option></select></label>
                <label className="catalogue-field"><span>Quantity change (+/-)</span><input type="number" step="1" required value={delta} onChange={event => { setDelta(event.target.value); setSubmissionKey(crypto.randomUUID()); }} /></label>
                <label className="catalogue-field catalogue-wide"><span>Note (optional)</span><textarea rows={2} maxLength={500} value={note} onChange={event => { setNote(event.target.value); setSubmissionKey(crypto.randomUUID()); }} /></label>
              </div>
              <div className="catalogue-actions"><button type="submit" disabled={busy || loading}>{busy ? "Saving…" : "Record movement"}</button></div>
            </>
          )}
        </form>
      ) : null}
      <section className="inventory-stock-card">
        <div className="inventory-card-heading">
          <div><h2>Movement history</h2><p>Most recent 200 adjustments</p></div>
          <select aria-label="Filter movements by product" value={filterProduct} onChange={event => { setFilterProduct(event.target.value); void load(event.target.value); }}>
            <option value="">All products</option>{products.map(product => <option key={product.id} value={product.id}>{product.name_en}</option>)}
          </select>
        </div>
        {loading ? <div className="orders-empty">Loading movement history…</div> : movements.length === 0 ? <div className="orders-empty"><strong>No inventory adjustments yet</strong></div> : (
          <div className="table-wrap"><table className="orders-table"><thead><tr><th>Product</th><th>Reason</th><th>Change</th><th>Before → after</th><th>Recorded by</th><th>Date</th></tr></thead><tbody>{movements.map(movement => <tr key={movement.id}><td><strong>{movement.product_name_en}</strong><small>{movement.product_name_ur}</small></td><td>{movement.reason.replaceAll("_", " ")}</td><td className={movement.delta_qty > 0 ? "inventory-positive" : "inventory-negative"}>{movement.delta_qty > 0 ? "+" : ""}{movement.delta_qty}</td><td>{movement.previous_stock_qty} → {movement.new_stock_qty}</td><td>{movement.actor_name || "Staff"}</td><td><small>{new Date(movement.created_at).toLocaleString()}</small></td></tr>)}</tbody></table></div>
        )}
      </section>
    </section>
  );
}

/* 15. Payments Module (COD Collection + Extended Payment & Proof Review) */
function PaymentsModule({ user }: { user: StaffUser }) {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [allRecords, setAllRecords] = useState<AdminPayment[]>([]);
  const [proofs, setProofs] = useState<PaymentProofSummary[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [pendingKeys, setPendingKeys] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canCollect = user.role === "owner" || user.role === "manager" || user.role === "finance";
  const unpaid = payments.filter(payment => payment.payment_status === "unpaid");
  const collected = payments.filter(payment => payment.payment_status === "collected");

  async function load(nextFilter = filter) {
    setLoading(true);
    setError("");
    try {
      const [result, ext] = await Promise.all([
        adminApi.payments(nextFilter),
        canCollect ? adminApi.allPayments().catch(() => ({ payments: [] as AdminPayment[], proofs: [] as PaymentProofSummary[] })) : Promise.resolve({ payments: [] as AdminPayment[], proofs: [] as PaymentProofSummary[] })
      ]);
      setPayments(result.payments);
      setAllRecords(ext.payments.filter((p) => p.method !== "cod"));
      setProofs(ext.proofs);
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(""); }, []);

  async function collect(payment: AdminPayment) {
    if (!canCollect || payment.payment_status !== "unpaid" || payment.order_status !== "delivered") return;
    const key = pendingKeys[payment.order_id] || crypto.randomUUID();
    setPendingKeys(current => ({ ...current, [payment.order_id]: key }));
    setBusyId(payment.payment_id);
    setError("");
    setNotice("");
    try {
      const result = await adminApi.collectCodPayment(payment.order_id, key);
      setPendingKeys(current => {
        const next = { ...current };
        delete next[payment.order_id];
        return next;
      });
      setNotice(result.order_number + " marked collected: " + money(result.amount_paisa) + ".");
      await load(filter);
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusyId("");
    }
  }

  async function reviewManual(paymentId: string, decision: "verified" | "rejected") {
    setBusyId(paymentId); setError(""); setNotice("");
    try {
      await adminApi.reviewPayment(paymentId, { decision, review_note: `Reviewed by ${user.display_name}` });
      setNotice(`Manual payment marked ${decision}.`);
      await load(filter);
    } catch (cause) {
      setError(messageFor(cause));
    } finally { setBusyId(""); }
  }

  return (
    <section className="payments-module">
      <div className="module-heading">
        <div><span className="kicker">PAYMENT OPERATIONS</span><h1>Payments</h1><p>Record COD cash collections post-delivery and review manual payment verification records.</p></div>
        <button className="refresh-button" type="button" disabled={loading} onClick={() => void load(filter)}>↻ Refresh</button>
      </div>
      {error ? <div className="orders-alert" role="alert">{error}</div> : null}
      {notice ? <div className="orders-notice" role="status">{notice}</div> : null}
      <div className="inventory-summary-grid">
        <div className="inventory-summary"><span>Unpaid COD shown</span><strong>{unpaid.length}</strong></div>
        <div className="inventory-summary"><span>Collected COD shown</span><strong>{collected.length}</strong></div>
        <div className="inventory-summary"><span>Collected COD total</span><strong>{money(collected.reduce((sum, payment) => sum + payment.amount_paisa, 0))}</strong></div>
      </div>
      <div className="filter-tabs payments-filters">
        <button type="button" className={filter === "" ? "selected" : ""} onClick={() => { setFilter(""); void load(""); }}>All COD</button>
        <button type="button" className={filter === "unpaid" ? "selected" : ""} onClick={() => { setFilter("unpaid"); void load("unpaid"); }}>Unpaid</button>
        <button type="button" className={filter === "collected" ? "selected" : ""} onClick={() => { setFilter("collected"); void load("collected"); }}>Collected</button>
      </div>
      <section className="inventory-stock-card">
        <div className="inventory-card-heading"><div><h2>Cash-on-delivery records</h2><p>Amounts stored in integer paisa and displayed in PKR.</p></div></div>
        {loading ? <div className="orders-empty">Loading payments…</div> : payments.length === 0 ? <div className="orders-empty"><strong>No COD payment records in this view</strong></div> : (
          <div className="table-wrap">
            <table className="orders-table">
              <thead><tr><th>Order</th><th>Order status</th><th>Payment status</th><th>Amount</th><th>Collected by</th><th>Action</th></tr></thead>
              <tbody>{payments.map(payment => (
                <tr key={payment.payment_id}>
                  <td><strong>{payment.order_number}</strong><small>{new Date(payment.created_at).toLocaleString()}</small></td>
                  <td><span className={"order-status status-" + payment.order_status}>{payment.order_status.replaceAll("_", " ")}</span></td>
                  <td><span className={"order-status " + (payment.payment_status === "collected" ? "status-confirmed" : "status-pending")}>{payment.payment_status}</span></td>
                  <td><strong>{money(payment.amount_paisa)}</strong></td>
                  <td>{payment.collected_by || (payment.reviewed_at ? new Date(payment.reviewed_at).toLocaleString() : "Not collected")}</td>
                  <td>
                    {payment.payment_status === "collected"
                      ? <small className="restricted-action">Collection recorded</small>
                      : payment.order_status === "delivered"
                        ? <button className="refresh-button payment-collect-button" type="button" disabled={!canCollect || busyId === payment.payment_id} onClick={() => void collect(payment)}>{busyId === payment.payment_id ? "Recording…" : "Mark collected"}</button>
                        : <small className="restricted-action">Awaiting delivery</small>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      {allRecords.length > 0 || proofs.length > 0 ? (
        <section className="inventory-stock-card">
          <div className="inventory-card-heading"><div><h2>Manual Transfer Review Queue ({allRecords.length})</h2><p>Manual bank transfer remains disabled on public checkout until private receipt storage is provisioned.</p></div></div>
          <div className="table-wrap">
            <table className="orders-table">
              <thead><tr><th>Order</th><th>Method</th><th>Status</th><th>Amount</th><th>Action</th></tr></thead>
              <tbody>
                {allRecords.map((rec) => (
                  <tr key={rec.payment_id}>
                    <td><strong>{rec.order_number}</strong></td>
                    <td>{rec.method}</td>
                    <td>{rec.payment_status}</td>
                    <td>{money(rec.amount_paisa)}</td>
                    <td>
                      {canCollect && ["pending_review", "awaiting_proof"].includes(rec.payment_status) ? (
                        <div className="ops-inline-actions">
                          <button type="button" className="refresh-button" disabled={busyId === rec.payment_id} onClick={() => void reviewManual(rec.payment_id, "verified")}>Verify</button>
                          <button type="button" className="refresh-button" disabled={busyId === rec.payment_id} onClick={() => void reviewManual(rec.payment_id, "rejected")}>Reject</button>
                        </div>
                      ) : <small className="restricted-action">{rec.payment_status}</small>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </section>
  );
}

/* 18. Support Tickets Module (with Staff Assignment & Internal Notes) */
function SupportModule({ user }: { user: StaffUser }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [newStatus, setNewStatus] = useState("in_progress");
  const [assignedId, setAssignedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadTickets() {
    setLoading(true); setError("");
    try {
      const [res, sRes] = await Promise.all([
        adminApi.supportTickets(),
        adminApi.staffDirectory().catch(() => ({ staff: [] as StaffMember[] }))
      ]);
      setTickets(res.tickets);
      setStaffList(sRes.staff);
    } catch (cause) {
      setError(messageFor(cause));
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadTickets(); }, []);

  async function openTicket(ticket: SupportTicket) {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status);
    setAssignedId(ticket.assigned_staff_id ?? "");
    setMessages([]);
    try {
      const res = await adminApi.supportTicketDetails(ticket.id);
      setMessages(res.messages);
    } catch (cause) {
      setError(messageFor(cause));
    }
  }

  async function handleAssign(staffId: string) {
    if (!selectedTicket) return;
    setAssignedId(staffId);
    try {
      await adminApi.assignSupportTicket(selectedTicket.id, { assigned_staff_id: staffId || null });
      await loadTickets();
    } catch (cause) {
      setError(messageFor(cause));
    }
  }

  async function handleSendReply(e: FormEvent) {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;
    setBusy(true); setError("");
    try {
      await adminApi.replySupportTicket(selectedTicket.id, replyText, newStatus, isInternal);
      setReplyText("");
      setIsInternal(false);
      await openTicket(selectedTicket);
      await loadTickets();
    } catch (cause) {
      setError(messageFor(cause));
    } finally { setBusy(false); }
  }

  return (
    <section className="inventory-module">
      <div className="module-heading">
        <div>
          <span className="kicker">CUSTOMER CARE ({user.role.toUpperCase()})</span>
          <h1>Support Tickets Desk</h1>
          <p>Assign support cases to staff, add private internal staff notes, and respond to customer inquiries.</p>
        </div>
        <button className="refresh-button" type="button" onClick={() => void loadTickets()}>↻ Refresh</button>
      </div>
      {error ? <div className="orders-alert" role="alert">{error}</div> : null}

      <div className="ops-split-grid">
        <div className="orders-table-card">
          {loading ? <div className="orders-empty">Loading support tickets…</div> : tickets.length === 0 ? (
            <div className="orders-empty"><strong>No support tickets found</strong></div>
          ) : (
            <div className="table-wrap">
              <table className="orders-table">
                <thead><tr><th>Customer</th><th>Subject</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id}>
                      <td><strong>{t.customer_name}</strong><small>{t.customer_phone}</small></td>
                      <td><strong>{t.subject}</strong></td>
                      <td><span className="environment-pill">{t.status}</span></td>
                      <td><button className="refresh-button" type="button" onClick={() => void openTicket(t)}>Open</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedTicket ? (
          <div className="ops-card-padded">
            <div className="team-form-heading">
              <div>
                <span className="kicker">CASE THREAD</span>
                <h2>{selectedTicket.subject}</h2>
                <small>{selectedTicket.customer_name} ({selectedTicket.customer_phone})</small>
              </div>
              <button className="icon-button" type="button" onClick={() => setSelectedTicket(null)}>✕</button>
            </div>

            {staffList.length > 0 ? (
              <label className="catalogue-field" style={{ marginBottom: "10px" }}>
                <span>Assigned Staff Member</span>
                <select value={assignedId} onChange={(e) => void handleAssign(e.target.value)}>
                  <option value="">Unassigned</option>
                  {staffList.map((s) => <option key={s.id} value={s.id}>{s.display_name} ({s.role})</option>)}
                </select>
              </label>
            ) : null}

            <div style={{ maxHeight: "260px", overflowY: "auto", margin: "12px 0", display: "flex", flexDirection: "column", gap: "8px" }}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    background: m.is_internal ? "#fef9c3" : m.sender_type === "staff" ? "#eaf0e5" : "#f3f4f6"
                  }}
                >
                  <small style={{ fontWeight: 700, display: "block" }}>
                    {m.is_internal ? "INTERNAL STAFF NOTE" : m.sender_type === "staff" ? "FRYZAR Support" : selectedTicket.customer_name} · {new Date(m.created_at).toLocaleString()}
                  </small>
                  <p style={{ margin: "4px 0 0", fontSize: "12px" }}>{m.message}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendReply}>
              <label className="catalogue-field" style={{ marginBottom: "8px" }}>
                <span>Ticket Status</span>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_customer">Waiting on Customer</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
              <label className="catalogue-field" style={{ marginBottom: "8px" }}>
                <span>Message</span>
                <textarea rows={3} required value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write customer reply or internal note…" />
              </label>
              <label className="checkbox-tile" style={{ marginBottom: "10px" }}>
                <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                <span>Internal staff-only note (hidden from customer)</span>
              </label>
              <button className="primary-button full-width" type="submit" disabled={busy}>
                {busy ? "Saving…" : isInternal ? "Save Internal Note" : "Send Customer Reply"}
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* 24. Staff & Roles Module */
function TeamAccessModule({ user }: { user: StaffUser }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [resetTarget, setResetTarget] = useState<StaffMember | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [createForm, setCreateForm] = useState({
    email: "", display_name: "", role: "operator" as StaffUser["role"], password: ""
  });
  const [editForm, setEditForm] = useState({
    display_name: "", role: "operator" as StaffUser["role"], is_active: "1"
  });
  const isManager = user.role === "manager";
  const canManage = user.role === "owner" || isManager;
  const assignableRoles: StaffUser["role"][] = isManager
    ? ["operator", "kitchen", "finance", "rider", "support"]
    : ["manager", "operator", "kitchen", "finance", "rider", "support"];

  async function load() {
    setLoading(true); setError("");
    try {
      const result = await adminApi.staffDirectory();
      setStaff(result.staff);
    } catch (cause) { setError(messageFor(cause)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function protectedTarget(member: StaffMember) {
    return member.role === "owner" || (isManager && member.role === "manager");
  }
  function editMember(member: StaffMember) {
    setEditing(member); setResetTarget(null);
    setEditForm({
      display_name: member.display_name,
      role: member.role,
      is_active: member.is_active ? "1" : "0"
    });
    setError(""); setNotice("");
  }
  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const result = await adminApi.createStaff({
        email: createForm.email.trim().toLowerCase(),
        display_name: createForm.display_name.trim(),
        role: createForm.role,
        password: createForm.password
      });
      setNotice("Staff account created (" + result.role + "). No invitation email was sent.");
      setCreateForm({ email: "", display_name: "", role: isManager ? "operator" : "manager", password: "" });
      await load();
    } catch (cause) { setError(messageFor(cause)); }
    finally { setBusy(false); }
  }
  async function updateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const payload: { display_name?: string; role?: StaffUser["role"]; is_active?: boolean } = {};
    if (editForm.display_name.trim() !== editing.display_name) payload.display_name = editForm.display_name.trim();
    if (editForm.role !== editing.role) payload.role = editForm.role;
    if ((editForm.is_active === "1") !== Boolean(editing.is_active)) payload.is_active = editForm.is_active === "1";
    if (Object.keys(payload).length === 0) { setNotice("No changes to save."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await adminApi.updateStaff(editing.id, payload);
      setNotice(result.sessions_revoked ? "Staff account updated. Existing sessions were revoked." : "Staff profile updated.");
      setEditing(null); await load();
    } catch (cause) { setError(messageFor(cause)); }
    finally { setBusy(false); }
  }
  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetTarget) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await adminApi.resetStaffPassword(resetTarget.id, newPassword);
      setNotice("Password reset completed. All existing sessions for " + resetTarget.display_name + " were revoked.");
      setNewPassword(""); setResetTarget(null);
    } catch (cause) { setError(messageFor(cause)); }
    finally { setBusy(false); }
  }

  return (
    <section className="team-module">
      <div className="module-heading">
        <div><span className="kicker">ACCESS CONTROL</span><h1>Staff &amp; Roles</h1><p>Create staff accounts, assign least-privilege roles and revoke sessions when access changes.</p></div>
        <button className="refresh-button" type="button" disabled={loading} onClick={() => void load()}>↻ Refresh</button>
      </div>
      {error ? <div className="orders-alert" role="alert">{error}</div> : null}
      {notice ? <div className="orders-notice" role="status">{notice}</div> : null}

      {canManage ? (
        <form className="catalogue-editor" onSubmit={createAccount}>
          <h2>Create staff account</h2>
          <div className="catalogue-form-grid">
            <label className="catalogue-field"><span>Email address</span><input required type="email" maxLength={254} value={createForm.email} onChange={event => setCreateForm(current => ({ ...current, email: event.target.value }))} /></label>
            <label className="catalogue-field"><span>Display name</span><input required minLength={2} maxLength={100} value={createForm.display_name} onChange={event => setCreateForm(current => ({ ...current, display_name: event.target.value }))} /></label>
            <label className="catalogue-field"><span>Staff role</span><select value={createForm.role} onChange={event => setCreateForm(current => ({ ...current, role: event.target.value as StaffUser["role"] }))}>{assignableRoles.map(role => <option key={role} value={role}>{role}</option>)}</select></label>
            <label className="catalogue-field"><span>Initial password (12–128 characters)</span><input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={createForm.password} onChange={event => setCreateForm(current => ({ ...current, password: event.target.value }))} /></label>
          </div>
          <div className="catalogue-actions"><button type="submit" disabled={busy}>{busy ? "Creating…" : "Create staff account"}</button></div>
        </form>
      ) : null}

      {editing ? (
        <form className="catalogue-editor" onSubmit={updateAccount}>
          <div className="team-form-heading"><h2>Edit {editing.display_name}</h2><button className="refresh-button" type="button" onClick={() => setEditing(null)}>Close</button></div>
          <div className="catalogue-form-grid">
            <label className="catalogue-field"><span>Email address (read-only)</span><input value={editing.email} disabled /></label>
            <label className="catalogue-field"><span>Display name</span><input required minLength={2} maxLength={100} value={editForm.display_name} onChange={event => setEditForm(current => ({ ...current, display_name: event.target.value }))} /></label>
            <label className="catalogue-field"><span>Role</span><select value={editForm.role} onChange={event => setEditForm(current => ({ ...current, role: event.target.value as StaffUser["role"] }))}>{assignableRoles.map(role => <option key={role} value={role}>{role}</option>)}</select></label>
            <label className="catalogue-field"><span>Account status</span><select value={editForm.is_active} onChange={event => setEditForm(current => ({ ...current, is_active: event.target.value }))}><option value="1">Active</option><option value="0">Deactivated</option></select></label>
          </div>
          <div className="catalogue-actions"><button type="submit" disabled={busy}>{busy ? "Saving…" : "Save staff changes"}</button></div>
        </form>
      ) : null}

      {resetTarget ? (
        <form className="catalogue-editor" onSubmit={resetPassword}>
          <div className="team-form-heading"><h2>Reset password for {resetTarget.display_name}</h2><button className="refresh-button" type="button" onClick={() => { setResetTarget(null); setNewPassword(""); }}>Close</button></div>
          <div className="catalogue-form-grid">
            <label className="catalogue-field"><span>New password (12–128 characters)</span><input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} /></label>
          </div>
          <div className="catalogue-actions"><button type="submit" disabled={busy}>{busy ? "Resetting…" : "Reset password and revoke sessions"}</button></div>
        </form>
      ) : null}

      <section className="inventory-stock-card">
        <div className="inventory-card-heading"><div><h2>Staff directory</h2><p>{staff.length} accounts</p></div></div>
        {loading ? <div className="orders-empty">Loading staff directory…</div> : staff.length === 0 ? <div className="orders-empty"><strong>No staff accounts found</strong></div> : (
          <div className="table-wrap"><table className="orders-table"><thead><tr><th>Staff member</th><th>Role</th><th>Status</th><th>Last sign-in</th><th>Actions</th></tr></thead><tbody>{staff.map(member => <tr key={member.id}>
            <td><strong>{member.display_name}</strong><small>{member.email}</small></td>
            <td>{member.role}</td>
            <td><span className={"order-status " + (member.is_active ? "status-confirmed" : "status-cancelled")}>{member.is_active ? "Active" : "Deactivated"}</span></td>
            <td>{member.last_login_at ? new Date(member.last_login_at).toLocaleString() : "Never"}</td>
            <td>{protectedTarget(member) ? <small className="restricted-action">Protected account</small> : <div className="team-actions">
              <button className="refresh-button" type="button" disabled={busy} onClick={() => editMember(member)}>Edit</button>
              <button className="refresh-button" type="button" disabled={busy || !member.is_active} onClick={() => { setEditing(null); setResetTarget(member); setNewPassword(""); }}>Reset password</button>
            </div>}</td>
          </tr>)}</tbody></table></div>
        )}
      </section>
    </section>
  );
}

/* 25. Store Settings Module */
function StoreSettingsModule({ user }: { user: StaffUser }) {
  const [settings, setSettings] = useState<StoreSettings>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    store_name_en: "FRYZAR",
    store_name_ur: "FRYZAR",
    default_language: "ur",
    cod_enabled: "1",
    whatsapp_number: "",
    store_status: "setup"
  });
  const canEdit = user.role === "owner" || user.role === "manager";

  async function load() {
    setLoading(true); setError("");
    try {
      const result = await adminApi.adminSettings();
      const value = result.settings;
      setSettings(value);
      setForm({
        store_name_en: value.store_name_en ?? "FRYZAR",
        store_name_ur: value.store_name_ur ?? "FRYZAR",
        default_language: value.default_language === "en" ? "en" : "ur",
        cod_enabled: isEnabled(value.cod_enabled) ? "1" : "0",
        whatsapp_number: value.whatsapp_number ?? "",
        store_status: value.store_status === "paused" ? "paused" : "setup"
      });
    } catch (cause) {
      setError(messageFor(cause));
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const result = await adminApi.saveStoreSettings({
        store_name_en: form.store_name_en.trim(),
        store_name_ur: form.store_name_ur.trim(),
        default_language: form.default_language,
        cod_enabled: form.cod_enabled === "1",
        whatsapp_number: form.whatsapp_number.trim(),
        store_status: form.store_status
      });
      setNotice("Store settings saved: " + result.updated_keys.join(", ") + ".");
      await load();
    } catch (cause) {
      setError(messageFor(cause));
    } finally { setBusy(false); }
  }

  return (
    <section className="settings-module">
      <div className="module-heading">
        <div><span className="kicker">STORE CONFIGURATION</span><h1>Store Settings</h1><p>Manage customer-facing store details and operating preferences. Release-gated controls stay locked.</p></div>
        <button className="refresh-button" type="button" disabled={loading} onClick={() => void load()}>↻ Refresh</button>
      </div>
      {error ? <div className="orders-alert" role="alert">{error}</div> : null}
      {notice ? <div className="orders-notice" role="status">{notice}</div> : null}
      <section className="settings-status-grid">
        <div className="settings-status-card"><span>Store mode</span><strong>{settings.store_status ?? "setup"}</strong><small>Setup or paused only</small></div>
        <div className="settings-status-card"><span>Launch readiness</span><strong>{isEnabled(settings.launch_ready) ? "Ready" : "Not ready"}</strong><small>Release-gated, read-only</small></div>
        <div className="settings-status-card"><span>Manual transfer</span><strong>{isEnabled(settings.manual_transfer_enabled) ? "Enabled" : "Disabled"}</strong><small>Payment-proof flow not released</small></div>
      </section>
      {canEdit ? (
        <form className="catalogue-editor" onSubmit={submit}>
          <h2>Customer-facing details</h2>
          <div className="catalogue-form-grid">
            <label className="catalogue-field"><span>Store name (English)</span><input required minLength={2} maxLength={80} value={form.store_name_en} onChange={event => update("store_name_en", event.target.value)} /></label>
            <label className="catalogue-field"><span>Store name (Urdu)</span><input required minLength={2} maxLength={80} value={form.store_name_ur} onChange={event => update("store_name_ur", event.target.value)} /></label>
            <label className="catalogue-field"><span>Default language</span><select value={form.default_language} onChange={event => update("default_language", event.target.value)}><option value="ur">Urdu</option><option value="en">English</option></select></label>
            <label className="catalogue-field"><span>Cash on delivery</span><select value={form.cod_enabled} onChange={event => update("cod_enabled", event.target.value)}><option value="1">Enabled</option><option value="0">Disabled</option></select></label>
            <label className="catalogue-field"><span>WhatsApp contact</span><input inputMode="tel" maxLength={20} value={form.whatsapp_number} onChange={event => update("whatsapp_number", event.target.value)} placeholder="+923001234567" /></label>
            <label className="catalogue-field"><span>Store mode</span><select value={form.store_status} onChange={event => update("store_status", event.target.value)}><option value="setup">Setup</option><option value="paused">Paused</option></select></label>
          </div>
          <div className="catalogue-actions"><button type="submit" disabled={busy || loading}>{busy ? "Saving…" : "Save settings"}</button></div>
        </form>
      ) : null}
    </section>
  );
}

/* 26. Audit Logs Module */
function AuditLogsModule({ user }: { user: StaffUser }) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");

  async function loadLogs() {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.auditLogs({
        action: actionFilter || undefined,
        entity_type: entityTypeFilter || undefined,
        limit: 80
      });
      setLogs(res.audit_logs);
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user.role === "owner" || user.role === "manager") {
      void loadLogs();
    }
  }, [actionFilter, entityTypeFilter]);

  if (user.role !== "owner" && user.role !== "manager") {
    return (
      <section className="inventory-module">
        <div className="orders-alert" role="alert">Access denied. Audit logs are restricted to store owners and managers.</div>
      </section>
    );
  }

  return (
    <section className="inventory-module">
      <div className="module-heading">
        <div>
          <span className="kicker">SYSTEM TRANSPARENCY &amp; AUDIT TRAIL</span>
          <h1>Audit Logs Directory</h1>
          <p>Immutable records of administrative, operational, inventory, financial, advertising, and security events.</p>
        </div>
        <button className="refresh-button" type="button" onClick={() => void loadLogs()}>↻ Refresh</button>
      </div>
      <div className="ops-inline-actions" style={{ marginBottom: "10px" }}>
        <input type="text" placeholder="Filter by action (e.g. advertising.emergency_disabled)…" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={{ flex: 1, minHeight: "38px", padding: "0 10px", borderRadius: "7px", border: "1px solid var(--line)" }} />
        <input type="text" placeholder="Filter by entity type…" value={entityTypeFilter} onChange={(e) => setEntityTypeFilter(e.target.value)} style={{ flex: 1, minHeight: "38px", padding: "0 10px", borderRadius: "7px", border: "1px solid var(--line)" }} />
      </div>
      {error ? <div className="orders-alert" role="alert">{error}</div> : null}
      {loading ? <div className="orders-empty">Loading audit logs…</div> : logs.length === 0 ? (
        <div className="orders-empty"><strong>No audit log records found</strong></div>
      ) : (
        <div className="table-wrap">
          <table className="orders-table">
            <thead><tr><th>Action</th><th>Actor</th><th>Entity</th><th>Entity ID</th><th>Metadata</th><th>Timestamp</th></tr></thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td><span className="environment-pill">{log.action}</span></td>
                  <td><strong>{log.actor_display_name || "System"}</strong>{log.actor_role ? <small>{log.actor_role}</small> : null}</td>
                  <td>{log.entity_type}</td>
                  <td><small>{log.entity_id || "—"}</small></td>
                  <td><code style={{ fontSize: "10px" }}>{JSON.stringify(log.metadata ?? {})}</code></td>
                  <td><small>{new Date(log.created_at).toLocaleString()}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function App() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [user, setUser] = useState<StaffUser | null>(null);
  const [section, setSection] = useState<Section>("overview");
  const [settings, setSettings] = useState<StoreSettings>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [overviewData, setOverviewData] = useState<OverviewSummaryResponse | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [logoutBusy, setLogoutBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void adminApi.session()
      .then(result => {
        if (active && result.authenticated && result.user) {
          setUser(result.user);
          setAuthState("signed-in");
        } else if (active) {
          setAuthState("signed-out");
        }
      })
      .catch(() => {
        if (active) setAuthState("signed-out");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (authState !== "signed-in") return;
    let active = true;
    setDataLoading(true);
    setDataError("");

    Promise.allSettled([
      adminApi.settings(),
      adminApi.products(),
      adminApi.categories(),
      adminApi.deliveryZones(),
      adminApi.dashboardMetrics(),
      adminApi.overviewSummary()
    ]).then(results => {
      if (!active) return;
      if (results[0].status === "fulfilled") setSettings(results[0].value.settings);
      if (results[1].status === "fulfilled") setProducts(results[1].value.products);
      if (results[2].status === "fulfilled") setCategories(results[2].value.categories);
      if (results[3].status === "fulfilled") setZones(results[3].value.delivery_zones);
      if (results[4].status === "fulfilled") setMetrics(results[4].value.metrics);
      if (results[5].status === "fulfilled") setOverviewData(results[5].value);
      const coreFailed = results.slice(0, 5).filter(result => result.status === "rejected").length;
      if (coreFailed) setDataError("Some public store data could not be loaded. Check API connectivity.");
      setDataLoading(false);
    });

    return () => { active = false; };
  }, [authState]);

  async function logout() {
    setLogoutBusy(true);
    try {
      await adminApi.logout();
    } finally {
      setUser(null);
      setAuthState("signed-out");
      setSection("overview");
      setLogoutBusy(false);
    }
  }

  const pageTitle = useMemo(
    () => NAV.find(item => item.id === section)?.label ?? "Overview",
    [section]
  );

  if (authState === "checking") {
    return <div className="boot-screen"><span className="boot-mark">F.</span><div className="boot-loader" /><p>Connecting to FRYZAR operations…</p></div>;
  }

  if (authState === "signed-out" || !user) {
    return <AuthScreen onAuthenticated={(staff) => { setUser(staff); setAuthState("signed-in"); }} />;
  }

  let lastGroup = "";

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <a className="sidebar-brand" href="#overview"><span className="ops-brand-mark">F.</span><span><strong>FRYZAR</strong><small>OWNER CONTROL CENTER</small></span></a>
        <div className="workspace-label">27 MODULES</div>
        <nav className="side-nav" aria-label="Owner control center modules">
          {NAV.map(item => {
            const showGroup = item.group !== lastGroup;
            lastGroup = item.group;
            return (
              <div key={item.id} style={{ display: "contents" }}>
                {showGroup ? <div className="side-nav-group">{item.group}</div> : null}
                <button type="button" className={section === item.id ? "selected" : ""} onClick={() => setSection(item.id)}>
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </button>
              </div>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className={"sidebar-status " + (dataLoading ? "checking" : dataError ? "warning" : "connected")}>
            <span />
            <div>
              <strong>{dataLoading ? "Checking store services" : dataError ? "Some services need attention" : "Store services available"}</strong>
              <small>$0 Free-Tier Stack</small>
            </div>
          </div>
          <div className="sidebar-user"><span className="avatar">{user.display_name.slice(0, 1).toUpperCase()}</span><div><strong>{user.display_name}</strong><small>{user.role}</small></div><button type="button" onClick={() => void logout()} disabled={logoutBusy} aria-label="Sign out">↗</button></div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="topbar">
          <div><span className="breadcrumb">FRYZAR <i>/</i> {pageTitle}</span><strong>{pageTitle}</strong></div>
          <div className="topbar-right"><span className="environment-pill">CONTROL CENTER</span><span className="topbar-role">{user.role.toUpperCase()}</span><button type="button" onClick={() => void logout()} disabled={logoutBusy}>Sign out</button></div>
        </header>

        <div className="page-content">
          {section === "overview" ? (
            <Overview
              user={user}
              settings={settings}
              products={products}
              categories={categories}
              zones={zones}
              metrics={metrics}
              overviewData={overviewData}
              loading={dataLoading}
              error={dataError}
            />
          ) : section === "orders" ? (
            <OrdersModule user={user} storeName={settings.store_name_en ?? "FRYZAR"} />
          ) : section === "kitchen" ? (
            <KitchenModule user={user} />
          ) : section === "products" ? (
            <ProductsModule user={user} />
          ) : section === "categories" ? (
            <CategoriesModule user={user} />
          ) : section === "variants_modifiers" ? (
            <VariantsModifiersModule user={user} />
          ) : section === "coupons" ? (
            <CouponsModule user={user} />
          ) : section === "customers" ? (
            <CustomersModule user={user} />
          ) : section === "delivery" ? (
            <DeliveryModule user={user} />
          ) : section === "riders" ? (
            <RidersModule user={user} />
          ) : section === "inventory" ? (
            <InventoryModule user={user} />
          ) : section === "recipes" ? (
            <IngredientsRecipesModule user={user} />
          ) : section === "suppliers_purchases" ? (
            <SuppliersPurchasesModule user={user} />
          ) : section === "wastage" ? (
            <WastageModule user={user} />
          ) : section === "payments" ? (
            <PaymentsModule user={user} />
          ) : section === "refunds" ? (
            <RefundsModule user={user} />
          ) : section === "finance" ? (
            <FinanceLedgerModule user={user} />
          ) : section === "support" ? (
            <SupportModule user={user} />
          ) : section === "notifications" ? (
            <NotificationsModule />
          ) : section === "analytics" ? (
            <AnalyticsModule />
          ) : section === "editorial" ? (
            <EditorialCmsModule user={user} />
          ) : section === "advertising" ? (
            <AdvertisingModule user={user} />
          ) : section === "seo" ? (
            <SeoSettingsModule user={user} />
          ) : section === "team" ? (
            <TeamAccessModule user={user} />
          ) : section === "settings" ? (
            <StoreSettingsModule user={user} />
          ) : section === "audit" ? (
            <AuditLogsModule user={user} />
          ) : (
            <SystemHealthModule user={user} />
          )}
        </div>

        <footer className="admin-footer"><span>FRYZAR OWNER CONTROL CENTER</span><span>Authenticated session · {user.role}</span><span>© {new Date().getFullYear()} FRYZAR</span></footer>
      </main>
    </div>
  );
}
