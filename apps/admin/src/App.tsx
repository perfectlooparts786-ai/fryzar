import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AdminApiError,
  adminApi,
  type AdminOrder,
  type AdminPayment,
  type DashboardMetrics,
  type Category,
  type InventoryMovement,
  type DeliveryZone,
  type Product,
  type StaffUser,
  type StaffMember,
  type StoreSettings
} from "./api";

type AuthState = "checking" | "signed-out" | "signed-in";
type AuthMode = "login" | "bootstrap";
type Section = "overview" | "orders" | "catalogue" | "inventory" | "payments" | "delivery" | "team" | "settings";

const NAV: { id: Section; label: string; icon: string; note?: string }[] = [
  { id: "overview", label: "Overview", icon: "◫" },
  { id: "orders", label: "Orders", icon: "▤" },
  { id: "catalogue", label: "Catalogue", icon: "▦" },
  { id: "inventory", label: "Inventory", icon: "▧" },
  { id: "payments", label: "Payments", icon: "◈" },
  { id: "delivery", label: "Delivery", icon: "⌖" },
  { id: "team", label: "Team access", icon: "♙" },
  { id: "settings", label: "Store settings", icon: "⚙" }
];

function isEnabled(value: unknown): boolean {
  return value === true || value === "true" || value === "yes" || value === 1;
}

function messageFor(error: unknown): string {
  if (error instanceof AdminApiError) {
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
      case "idempotency_key_required": return "The collection request needs a retry-protection key. Refresh and try again."; 
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
      default: return "The request could not be completed (" + error.status + ").";
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
    catalogue: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
    inventory: "M3 7h18v13H3zM3 7l3-4h12l3 4M12 7v13",
    payments: "M3 6h18v12H3zM3 10h18M7 15h4",
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

function Overview({
  user,
  settings,
  products,
  categories,
  zones,
  metrics,
  loading,
  error
}: {
  user: StaffUser;
  settings: StoreSettings;
  products: Product[];
  categories: Category[];
  zones: DeliveryZone[];
  metrics: DashboardMetrics | null;
  loading: boolean;
  error: string;
}) {
  const open = settings.store_status === "open" && isEnabled(settings.launch_ready);
  const stats = [
    { label: "Total orders", value: String(metrics?.total_orders ?? "—"), tone: "mint", note: "All recorded orders" },
    { label: "Open orders", value: String(metrics?.open_orders ?? "—"), tone: "sand", note: "Awaiting completion" },
    { label: "Delivered orders", value: String(metrics?.delivered_orders ?? "—"), tone: "blue", note: "Completed deliveries" },
    { label: "Delivered revenue", value: metrics ? money(metrics.delivered_revenue_paisa) : "—", tone: "slate", note: "Delivered order totals" },
    { label: "Unpaid COD", value: String(metrics?.unpaid_cod_count ?? "—"), tone: "sand", note: "Awaiting collection" },
    { label: "Low stock", value: String(metrics?.low_stock_products ?? "—"), tone: "blue", note: "Tracked stock ≤ 5" },
    { label: "Active products", value: String(metrics?.active_products ?? products.length), tone: "mint", note: "Available catalogue items" },
    { label: "Active categories", value: String(metrics?.active_categories ?? categories.length), tone: "sand", note: "Enabled catalogue groups" },
    { label: "Delivery zones", value: String(metrics?.active_delivery_zones ?? zones.length), tone: "blue", note: "Enabled delivery areas" },
    { label: "Store readiness", value: open ? "Open" : "Setup", tone: "slate", note: "Server-controlled status" }
  ];

  return (
    <>
      <div className="welcome-row">
        <div>
          <span className="kicker">STORE OVERVIEW</span>
          <h1>Good day, {user.display_name.split(" ")[0]}.</h1>
          <p>Here is the latest configuration currently available from your store service.</p>
        </div>
        <span className={open ? "status-badge ready" : "status-badge setup"}><i />{open ? "Store open" : "Store in setup"}</span>
      </div>

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
            <div><span className="kicker">CONFIGURATION CHECK</span><h2>What is still missing</h2></div>
            <span className="check-count">{Number(products.length > 0) + Number(zones.length > 0)} / 2</span>
          </div>
          <div className="check-row"><span className={products.length ? "check-dot complete" : "check-dot"}>{products.length ? "✓" : "1"}</span><div><strong>Product catalogue</strong><small>{products.length ? products.length + " active products loaded" : "No products have been added yet"}</small></div></div>
          <div className="check-row"><span className={zones.length ? "check-dot complete" : "check-dot"}>{zones.length ? "✓" : "2"}</span><div><strong>Delivery areas</strong><small>{zones.length ? zones.length + " active delivery zones loaded" : "No delivery zones have been configured"}</small></div></div>
          <div className="check-row"><span className="check-dot">3</span><div><strong>Order operations</strong><small>Order management is available in the Orders module</small></div></div>
          <div className="check-row"><span className="check-dot">4</span><div><strong>Payment review</strong><small>COD collection recording is available; bank-transfer proof review remains disabled</small></div></div>
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
              <thead><tr><th>Area</th><th>City</th><th>Delivery fee</th><th>Minimum order</th></tr></thead>
              <tbody>{zones.map(zone => (
                <tr key={zone.id}>
                  <td><strong>{zone.name_en}</strong><small>{zone.name_ur}</small></td>
                  <td>{zone.city || "—"}</td>
                  <td>{money(zone.delivery_fee_paisa)}</td>
                  <td>{money(zone.minimum_order_paisa)}</td>
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

function OrdersModule({ user }: { user: StaffUser }) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");

  async function loadOrders(nextFilter = filter) {
    setLoading(true);
    setError("");
    try {
      const result = await adminApi.orders(nextFilter);
      setOrders(result.orders);
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

  return (
    <section className="orders-module">
      <div className="module-heading">
        <div><span className="kicker">ORDER OPERATIONS</span><h1>Orders</h1><p>Review current orders and apply role-authorized status changes.</p></div>
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
              <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Current status</th><th>Update status</th></tr></thead>
              <tbody>
                {orders.map(order => {
                  const options = nextStatuses(user.role, order.status);
                  const draft = drafts[order.id] ?? "";
                  return (
                    <tr key={order.id}>
                      <td><strong>{order.order_number}</strong><small>{new Date(order.created_at).toLocaleString()}</small></td>
                      <td><strong>{order.customer_name || "Kitchen order"}</strong><small>{order.customer_phone || "Contact details restricted"}</small></td>
                      <td><strong>{money(order.total_paisa)}</strong><small>Subtotal {money(order.subtotal_paisa)}</small></td>
                      <td><strong>{order.payment_method.replaceAll("_", " ")}</strong><small>{order.payment_status.replaceAll("_", " ")}</small></td>
                      <td><span className={"order-status status-" + order.status}>{order.status.replaceAll("_", " ")}</span></td>
                      <td>
                        {options.length ? (
                          <div className="status-action">
                            <select value={draft} onChange={event => setDrafts(current => ({ ...current, [order.id]: event.target.value }))}>
                              <option value="">Choose…</option>
                              {options.map(option => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
                            </select>
                            <button type="button" disabled={!draft || busyId === order.id} onClick={() => void saveStatus(order)}>{busyId === order.id ? "…" : "Save"}</button>
                          </div>
                        ) : <small className="restricted-action">No permitted next action</small>}
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
    </section>
  );
}


function CatalogueModule({ user }: { user: StaffUser }) {
  const [tab, setTab] = useState<"products" | "categories">("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<Record<string, string>>({
    slug: "", name_en: "", name_ur: "", description_en: "", description_ur: "",
    price_paisa: "0", compare_at_paisa: "", stock_qty: "", sku: "", category_id: "", image_url: "", sort_order: "0"
  });
  const canEdit = user.role === "owner" || user.role === "manager";

  async function load() {
    setLoading(true); setError("");
    try {
      const [p, c] = await Promise.all([adminApi.adminProducts(), adminApi.adminCategories()]);
      setProducts(p.products); setCategories(c.categories);
    } catch (cause) {
      setError(messageFor(cause));
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function resetForm() {
    setEditingId("");
    setForm({ slug: "", name_en: "", name_ur: "", description_en: "", description_ur: "", price_paisa: "0", compare_at_paisa: "", stock_qty: "", sku: "", category_id: "", image_url: "", sort_order: "0" });
  }
  function editProduct(product: Product) {
    setTab("products"); setEditingId(product.id);
    setForm({
      slug: product.slug, name_en: product.name_en, name_ur: product.name_ur,
      description_en: product.description_en ?? "", description_ur: product.description_ur ?? "",
      price_paisa: (product.price_paisa / 100).toFixed(2), compare_at_paisa: product.compare_at_paisa == null ? "" : (product.compare_at_paisa / 100).toFixed(2),
      stock_qty: product.stock_qty == null ? "" : String(product.stock_qty), sku: product.sku ?? "",
      category_id: product.category_id ?? "", image_url: product.image_url ?? "", sort_order: String(product.sort_order ?? 0)
    });
  }
  function editCategory(category: Category) {
    setTab("categories"); setEditingId(category.id);
    setForm({ slug: category.slug, name_en: category.name_en, name_ur: category.name_ur,
      description_en: category.description_en ?? "", description_ur: category.description_ur ?? "",
      sort_order: String(category.sort_order ?? 0), is_active: String(category.is_active ?? 1) });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      if (tab === "categories") {
        await adminApi.saveCategory({
          slug: form.slug, name_en: form.name_en, name_ur: form.name_ur,
          description_en: form.description_en, description_ur: form.description_ur,
          sort_order: Number(form.sort_order), is_active: form.is_active !== "0"
        }, editingId || undefined);
        setNotice("Category saved.");
      } else {
        await adminApi.saveProduct({
          slug: form.slug, name_en: form.name_en, name_ur: form.name_ur,
          description_en: form.description_en, description_ur: form.description_ur,
          price_paisa: Math.round(Number(form.price_paisa) * 100),
          compare_at_paisa: form.compare_at_paisa === "" ? null : Math.round(Number(form.compare_at_paisa) * 100),
          ...(editingId ? {} : { stock_qty: form.stock_qty === "" ? null : Number(form.stock_qty) }),
          sku: form.sku || null, category_id: form.category_id || null, image_url: form.image_url || null,
          sort_order: Number(form.sort_order), is_available: form.is_available !== "0", is_featured: form.is_featured === "1"
        }, editingId || undefined);
        setNotice("Product saved.");
      }
      resetForm(); await load();
    } catch (cause) { setError(messageFor(cause)); }
    finally { setBusy(false); }
  }
  function field(label: string, key: string, type = "text", required = false, step?: string) {
    return <label className="catalogue-field" key={key}>
      <span>{label}</span>
      <input
        type={type}
        required={required}
        min={type === "number" ? "0" : undefined}
        step={step ?? (type === "number" ? "1" : undefined)}
        inputMode={type === "number" ? "decimal" : undefined}
        value={form[key] ?? ""}
        onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))}
      />
    </label>;
  }

  return <section className="catalogue-module">
    <div className="module-heading"><div><span className="kicker">CATALOGUE MANAGEMENT</span><h1>Products &amp; categories</h1><p>Create and update store catalogue records. Enter prices in PKR; the system stores them accurately in paisa.</p></div><button className="refresh-button" type="button" disabled={loading} onClick={() => void load()}>↻ Refresh</button></div>
    <div className="filter-tabs"><button type="button" className={tab === "products" ? "selected" : ""} onClick={() => { setTab("products"); resetForm(); }}>Products ({products.length})</button><button type="button" className={tab === "categories" ? "selected" : ""} onClick={() => { setTab("categories"); resetForm(); }}>Categories ({categories.length})</button></div>
    {error ? <div className="orders-alert" role="alert">{error}</div> : null}
    {notice ? <div className="orders-notice" role="status">{notice}</div> : null}
    {canEdit ? <form className="catalogue-editor" onSubmit={submit}>
      <h2>{editingId ? "Edit" : "Create"} {tab === "products" ? "product" : "category"}</h2>
      <div className="catalogue-form-grid">
        {field("English name", "name_en", "text", true)}{field("Urdu name", "name_ur", "text", true)}{field("URL slug", "slug", "text", true)}
        {tab === "products" ? <>
          {field("Price (PKR)", "price_paisa", "number", true, "0.01")}{field("Compare-at price (PKR)", "compare_at_paisa", "number", false, "0.01")}{!editingId ? field("Opening stock (blank = not tracked)", "stock_qty", "number") : null}
          {field("SKU (optional)", "sku")}{field("Image URL (HTTPS only)", "image_url")}
          <label className="catalogue-field"><span>Category</span><select value={form.category_id ?? ""} onChange={event => setForm(current => ({ ...current, category_id: event.target.value }))}><option value="">Uncategorised</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name_en} · {c.name_ur}</option>)}</select></label>
          <label className="catalogue-field"><span>Availability</span><select value={form.is_available ?? "1"} onChange={event => setForm(current => ({ ...current, is_available: event.target.value }))}><option value="1">Available</option><option value="0">Unavailable</option></select></label>
          <label className="catalogue-field"><span>Featured</span><select value={form.is_featured ?? "0"} onChange={event => setForm(current => ({ ...current, is_featured: event.target.value }))}><option value="0">No</option><option value="1">Yes</option></select></label>
        </> : <label className="catalogue-field"><span>Active</span><select value={form.is_active ?? "1"} onChange={event => setForm(current => ({ ...current, is_active: event.target.value }))}><option value="1">Active</option><option value="0">Inactive</option></select></label>}
        {field("Sort order", "sort_order", "number")}
        <label className="catalogue-field catalogue-wide"><span>English description</span><textarea value={form.description_en ?? ""} onChange={event => setForm(current => ({ ...current, description_en: event.target.value }))} rows={2} /></label>
        <label className="catalogue-field catalogue-wide"><span>Urdu description</span><textarea value={form.description_ur ?? ""} onChange={event => setForm(current => ({ ...current, description_ur: event.target.value }))} rows={2} /></label>
      </div>
      <div className="catalogue-actions"><button type="submit" disabled={busy}>{busy ? "Saving…" : editingId ? "Save changes" : "Create record"}</button>{editingId ? <button type="button" className="refresh-button" onClick={resetForm}>Cancel edit</button> : null}</div>
    </form> : <p className="orders-footnote">Your role can view catalogue records but cannot create or edit them.</p>}
    <div className="orders-table-card">{loading ? <div className="orders-empty">Loading catalogue…</div> : tab === "products" ? products.length === 0 ? <div className="orders-empty"><strong>No products yet</strong><small>Add genuine products and prices before opening the store.</small></div> :
      <div className="table-wrap"><table className="orders-table"><thead><tr><th>Product</th><th>SKU</th><th>Price</th><th>Stock</th><th>Availability</th><th>Action</th></tr></thead><tbody>{products.map(p => <tr key={p.id}><td><strong>{p.name_en}</strong><small>{p.name_ur} · {p.slug}</small></td><td>{p.sku || "—"}</td><td>{money(p.price_paisa)}</td><td>{p.stock_qty == null ? "Unlimited" : p.stock_qty}</td><td>{p.is_available ? "Available" : "Unavailable"}</td><td><button type="button" className="refresh-button" onClick={() => editProduct(p)} disabled={!canEdit}>Edit</button></td></tr>)}</tbody></table></div>
      : categories.length === 0 ? <div className="orders-empty"><strong>No categories yet</strong><small>Create categories to organise the product catalogue.</small></div> :
      <div className="table-wrap"><table className="orders-table"><thead><tr><th>Category</th><th>Slug</th><th>Status</th><th>Action</th></tr></thead><tbody>{categories.map(c => <tr key={c.id}><td><strong>{c.name_en}</strong><small>{c.name_ur}</small></td><td>{c.slug}</td><td>{c.is_active ? "Active" : "Inactive"}</td><td><button type="button" className="refresh-button" onClick={() => editCategory(c)} disabled={!canEdit}>Edit</button></td></tr>)}</tbody></table></div>}
    </div>
  </section>;
}


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

  function reasonLabel(value: string) {
    return value.replaceAll("_", " ");
  }

  return <section className="inventory-module">
    <div className="module-heading">
      <div><span className="kicker">STOCK CONTROL</span><h1>Inventory</h1><p>Record stock receipts, returns and corrections with a traceable movement history.</p></div>
      <button className="refresh-button" type="button" disabled={loading} onClick={() => void load(filterProduct)}>↻ Refresh</button>
    </div>
    {error ? <div className="orders-alert" role="alert">{error}</div> : null}
    {notice ? <div className="orders-notice" role="status">{notice}</div> : null}
    <div className="inventory-summary-grid">
      <div className="inventory-summary"><span>Tracked products</span><strong>{trackedProducts.length}</strong></div>
      <div className="inventory-summary"><span>Not tracked</span><strong>{products.length - trackedProducts.length}</strong></div>
      <div className="inventory-summary"><span>Movement records loaded</span><strong>{movements.length}</strong></div>
    </div>
    {canAdjust ? <form className="catalogue-editor inventory-editor" onSubmit={submit}>
      <h2>Record a stock movement</h2>
      {trackedProducts.length === 0 ? <p className="orders-footnote">No products currently have stock tracking enabled. Set an opening stock quantity when creating a product. Existing untracked products need a separate stock-tracking activation step.</p> : <>
        <div className="catalogue-form-grid">
          <label className="catalogue-field catalogue-wide"><span>Product</span><select required value={selectedProduct} onChange={event => { setSelectedProduct(event.target.value); setSubmissionKey(crypto.randomUUID()); }}><option value="">Choose product…</option>{trackedProducts.map(product => <option key={product.id} value={product.id}>{product.name_en} · {product.stock_qty} units</option>)}</select></label>
          <label className="catalogue-field"><span>Movement reason</span><select value={reason} onChange={event => { setReason(event.target.value as typeof reason); setSubmissionKey(crypto.randomUUID()); }}><option value="stock_received">Stock received</option><option value="return_received">Return received</option><option value="stock_adjustment">Stock adjustment</option></select></label>
          <label className="catalogue-field"><span>Quantity change (+/-)</span><input type="number" step="1" required value={delta} onChange={event => { setDelta(event.target.value); setSubmissionKey(crypto.randomUUID()); }} placeholder={reason === "stock_adjustment" ? "e.g. -2 or 5" : "e.g. 10"} /></label>
          <label className="catalogue-field catalogue-wide"><span>Note (optional)</span><textarea rows={2} maxLength={500} value={note} onChange={event => { setNote(event.target.value); setSubmissionKey(crypto.randomUUID()); }} placeholder="Supplier, count correction or return details" /></label>
        </div>
        <div className="catalogue-actions"><button type="submit" disabled={busy || loading}>{busy ? "Saving…" : "Record movement"}</button></div>
      </>}
    </form> : <p className="orders-footnote">Your role can view inventory history but cannot make stock adjustments.</p>}
    <section className="inventory-stock-card">
      <div className="inventory-card-heading"><div><h2>Current stock</h2><p>Live quantities from the catalogue</p></div></div>
      {loading ? <div className="orders-empty">Loading stock…</div> : products.length === 0 ? <div className="orders-empty">No product records are available yet.</div> :
        <div className="table-wrap"><table className="orders-table"><thead><tr><th>Product</th><th>SKU</th><th>Available stock</th><th>Tracking</th></tr></thead><tbody>{products.map(product => <tr key={product.id}><td><strong>{product.name_en}</strong><small>{product.name_ur}</small></td><td>{product.sku || "—"}</td><td>{product.stock_qty == null ? "—" : product.stock_qty}</td><td>{product.stock_qty == null ? "Not tracked" : "Tracked"}</td></tr>)}</tbody></table></div>}
    </section>
    <section className="inventory-stock-card">
      <div className="inventory-card-heading">
        <div><h2>Movement history</h2><p>Most recent 200 adjustments</p></div>
        <select aria-label="Filter movements by product" value={filterProduct} onChange={event => { setFilterProduct(event.target.value); void load(event.target.value); }}>
          <option value="">All products</option>{products.map(product => <option key={product.id} value={product.id}>{product.name_en}</option>)}
        </select>
      </div>
      {loading ? <div className="orders-empty">Loading movement history…</div> : movements.length === 0 ? <div className="orders-empty"><strong>No inventory adjustments yet</strong><small>Stock movements will appear here after the first adjustment.</small></div> :
        <div className="table-wrap"><table className="orders-table"><thead><tr><th>Product</th><th>Reason</th><th>Change</th><th>Before → after</th><th>Recorded by</th><th>Date</th></tr></thead><tbody>{movements.map(movement => <tr key={movement.id}><td><strong>{movement.product_name_en}</strong><small>{movement.product_name_ur}</small></td><td>{reasonLabel(movement.reason)}</td><td className={movement.delta_qty > 0 ? "inventory-positive" : "inventory-negative"}>{movement.delta_qty > 0 ? "+" : ""}{movement.delta_qty}</td><td>{movement.previous_stock_qty} → {movement.new_stock_qty}</td><td>{movement.actor_name || "Former staff"}</td><td><small>{new Date(movement.created_at).toLocaleString()}</small></td></tr>)}</tbody></table></div>}
    </section>
  </section>;
}

function DeliveryModule({ user }: { user: StaffUser }) {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({
    code: "", name_en: "", name_ur: "", country_code: "PK", region: "", city: "",
    delivery_fee_paisa: "0", minimum_order_paisa: "0", is_active: "1"
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
    setForm({ code: "", name_en: "", name_ur: "", country_code: "PK", region: "", city: "", delivery_fee_paisa: "0", minimum_order_paisa: "0", is_active: "1" });
  }
  function editZone(zone: DeliveryZone) {
    setEditingId(zone.id);
    setForm({
      code: zone.code, name_en: zone.name_en, name_ur: zone.name_ur,
      country_code: zone.country_code || "PK", region: zone.region || "", city: zone.city,
      delivery_fee_paisa: String(zone.delivery_fee_paisa),
      minimum_order_paisa: String(zone.minimum_order_paisa),
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
        is_active: form.is_active === "1"
      }, editingId || undefined);
      setNotice(editingId ? "Delivery zone updated." : "Delivery zone created.");
      resetForm(); await load();
    } catch (cause) { setError(messageFor(cause)); }
    finally { setBusy(false); }
  }
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));

  return <section className="delivery-module">
    <div className="module-heading">
      <div><span className="kicker">SERVICE AREA CONFIGURATION</span><h1>Delivery zones</h1><p>Manage service areas, delivery charges and minimum order values. Existing zones are deactivated, not deleted.</p></div>
      <button className="refresh-button" type="button" disabled={loading} onClick={() => void load()}>↻ Refresh</button>
    </div>
    {error ? <div className="orders-alert" role="alert">{error}</div> : null}
    {notice ? <div className="orders-notice" role="status">{notice}</div> : null}
    {canEdit ? <form className="catalogue-editor" onSubmit={submit}>
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
      </div>
      <div className="catalogue-actions"><button type="submit" disabled={busy}>{busy ? "Saving…" : editingId ? "Save changes" : "Create zone"}</button>{editingId ? <button type="button" className="refresh-button" disabled={busy} onClick={resetForm}>Cancel edit</button> : null}</div>
      <p className="orders-footnote">Amounts are integer paisa. PKR 100 = 10,000 paisa. Only active zones are offered during checkout.</p>
    </form> : <p className="orders-footnote">Your role can view delivery configuration but cannot change it.</p>}
    <section className="inventory-stock-card">
      <div className="inventory-card-heading"><div><h2>Configured service areas</h2><p>{zones.length} zones · inactive records remain available for historical orders</p></div></div>
      {loading ? <div className="orders-empty">Loading delivery zones…</div> : zones.length === 0 ? <div className="orders-empty"><strong>No delivery zones configured</strong><small>Add genuine service areas and fees before opening the store.</small></div> :
        <div className="table-wrap"><table className="orders-table"><thead><tr><th>Zone</th><th>Code</th><th>Location</th><th>Delivery fee</th><th>Minimum order</th><th>Status</th><th>Action</th></tr></thead><tbody>{zones.map(zone => <tr key={zone.id}>
          <td><strong>{zone.name_en}</strong><small>{zone.name_ur}</small></td>
          <td>{zone.code}</td><td>{[zone.city, zone.region, zone.country_code].filter(Boolean).join(", ")}</td>
          <td>{money(zone.delivery_fee_paisa)}</td><td>{money(zone.minimum_order_paisa)}</td>
          <td><span className={"order-status " + (zone.is_active ? "status-confirmed" : "status-cancelled")}>{zone.is_active ? "Active" : "Inactive"}</span></td>
          <td><button className="refresh-button" type="button" disabled={!canEdit} onClick={() => editZone(zone)}>Edit</button></td>
        </tr>)}</tbody></table></div>}
    </section>
  </section>;
}

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

  return <section className="settings-module">
    <div className="module-heading">
      <div><span className="kicker">STORE CONFIGURATION</span><h1>Store settings</h1><p>Manage customer-facing store details and operating preferences. Release-gated controls stay locked.</p></div>
      <button className="refresh-button" type="button" disabled={loading} onClick={() => void load()}>↻ Refresh</button>
    </div>
    {error ? <div className="orders-alert" role="alert">{error}</div> : null}
    {notice ? <div className="orders-notice" role="status">{notice}</div> : null}
    <section className="settings-status-grid">
      <div className="settings-status-card"><span>Store mode</span><strong>{settings.store_status ?? "setup"}</strong><small>Setup or paused only</small></div>
      <div className="settings-status-card"><span>Launch readiness</span><strong>{isEnabled(settings.launch_ready) ? "Ready" : "Not ready"}</strong><small>Release-gated, read-only</small></div>
      <div className="settings-status-card"><span>Manual transfer</span><strong>{isEnabled(settings.manual_transfer_enabled) ? "Enabled" : "Disabled"}</strong><small>Payment-proof flow not released</small></div>
    </section>
    {canEdit ? <form className="catalogue-editor" onSubmit={submit}>
      <h2>Customer-facing details</h2>
      {loading ? <p className="orders-footnote">Loading current settings…</p> : <>
        <div className="catalogue-form-grid">
          <label className="catalogue-field"><span>Store name (English)</span><input required minLength={2} maxLength={80} value={form.store_name_en} onChange={event => update("store_name_en", event.target.value)} /></label>
          <label className="catalogue-field"><span>Store name (Urdu)</span><input required minLength={2} maxLength={80} value={form.store_name_ur} onChange={event => update("store_name_ur", event.target.value)} /></label>
          <label className="catalogue-field"><span>Default language</span><select value={form.default_language} onChange={event => update("default_language", event.target.value)}><option value="ur">Urdu</option><option value="en">English</option></select></label>
          <label className="catalogue-field"><span>Cash on delivery</span><select value={form.cod_enabled} onChange={event => update("cod_enabled", event.target.value)}><option value="1">Enabled</option><option value="0">Disabled</option></select></label>
          <label className="catalogue-field"><span>WhatsApp contact (international format)</span><input inputMode="tel" maxLength={20} value={form.whatsapp_number} onChange={event => update("whatsapp_number", event.target.value)} placeholder="+923001234567" /></label>
          <label className="catalogue-field"><span>Store mode</span><select value={form.store_status} onChange={event => update("store_status", event.target.value)}><option value="setup">Setup</option><option value="paused">Paused</option></select></label>
        </div>
        <div className="settings-readonly-grid">
          <div><span>Supported languages</span><strong>Urdu · English</strong><small>Both language options stay enabled</small></div>
          <div><span>Currency</span><strong>PKR</strong><small>Stored as integer paisa</small></div>
          <div><span>Manual transfer</span><strong>Disabled</strong><small>Cannot be enabled until proof storage and review are complete</small></div>
        </div>
        <div className="catalogue-actions"><button type="submit" disabled={busy || loading}>{busy ? "Saving…" : "Save settings"}</button></div>
      </>}
    </form> : <p className="orders-footnote">Your role can view public store configuration but cannot make changes.</p>}
    <p className="orders-footnote">This screen cannot set launch readiness to true or open the store. Checkout remains closed until separate release gates are completed.</p>
  </section>;
}

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

  return <section className="team-module">
    <div className="module-heading">
      <div><span className="kicker">ACCESS CONTROL</span><h1>Team access</h1><p>Create staff accounts, assign least-privilege roles and revoke sessions when access changes.</p></div>
      <button className="refresh-button" type="button" disabled={loading} onClick={() => void load()}>↻ Refresh</button>
    </div>
    {error ? <div className="orders-alert" role="alert">{error}</div> : null}
    {notice ? <div className="orders-notice" role="status">{notice}</div> : null}

    {canManage ? <form className="catalogue-editor" onSubmit={createAccount}>
      <h2>Create staff account</h2>
      <div className="catalogue-form-grid">
        <label className="catalogue-field"><span>Email address</span><input required type="email" maxLength={254} value={createForm.email} onChange={event => setCreateForm(current => ({ ...current, email: event.target.value }))} /></label>
        <label className="catalogue-field"><span>Display name</span><input required minLength={2} maxLength={100} value={createForm.display_name} onChange={event => setCreateForm(current => ({ ...current, display_name: event.target.value }))} /></label>
        <label className="catalogue-field"><span>Staff role</span><select value={createForm.role} onChange={event => setCreateForm(current => ({ ...current, role: event.target.value as StaffUser["role"] }))}>{assignableRoles.map(role => <option key={role} value={role}>{role}</option>)}</select></label>
        <label className="catalogue-field"><span>Initial password (12–128 characters)</span><input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={createForm.password} onChange={event => setCreateForm(current => ({ ...current, password: event.target.value }))} /></label>
      </div>
      <div className="catalogue-actions"><button type="submit" disabled={busy}>{busy ? "Creating…" : "Create staff account"}</button></div>
      <p className="orders-footnote">FRYZAR does not send invitation emails yet. Share the initial password with the staff member through a separate secure channel.</p>
    </form> : null}

    {editing ? <form className="catalogue-editor" onSubmit={updateAccount}>
      <div className="team-form-heading"><h2>Edit {editing.display_name}</h2><button className="refresh-button" type="button" onClick={() => setEditing(null)}>Close</button></div>
      <div className="catalogue-form-grid">
        <label className="catalogue-field"><span>Email address (read-only)</span><input value={editing.email} disabled /></label>
        <label className="catalogue-field"><span>Display name</span><input required minLength={2} maxLength={100} value={editForm.display_name} onChange={event => setEditForm(current => ({ ...current, display_name: event.target.value }))} /></label>
        <label className="catalogue-field"><span>Role</span><select value={editForm.role} onChange={event => setEditForm(current => ({ ...current, role: event.target.value as StaffUser["role"] }))}>{assignableRoles.map(role => <option key={role} value={role}>{role}</option>)}</select></label>
        <label className="catalogue-field"><span>Account status</span><select value={editForm.is_active} onChange={event => setEditForm(current => ({ ...current, is_active: event.target.value }))}><option value="1">Active</option><option value="0">Deactivated</option></select></label>
      </div>
      <div className="catalogue-actions"><button type="submit" disabled={busy}>{busy ? "Saving…" : "Save staff changes"}</button></div>
    </form> : null}

    {resetTarget ? <form className="catalogue-editor" onSubmit={resetPassword}>
      <div className="team-form-heading"><h2>Reset password for {resetTarget.display_name}</h2><button className="refresh-button" type="button" onClick={() => { setResetTarget(null); setNewPassword(""); }}>Close</button></div>
      <div className="catalogue-form-grid">
        <label className="catalogue-field"><span>New password (12–128 characters)</span><input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} /></label>
      </div>
      <div className="catalogue-actions"><button type="submit" disabled={busy}>{busy ? "Resetting…" : "Reset password and revoke sessions"}</button></div>
    </form> : null}

    <section className="inventory-stock-card">
      <div className="inventory-card-heading"><div><h2>Staff directory</h2><p>{staff.length} accounts · maximum 200 displayed</p></div></div>
      {loading ? <div className="orders-empty">Loading staff directory…</div> : staff.length === 0 ? <div className="orders-empty"><strong>No staff accounts found</strong><small>Create the first staff account after the owner has signed in.</small></div> :
        <div className="table-wrap"><table className="orders-table"><thead><tr><th>Staff member</th><th>Role</th><th>Status</th><th>Last sign-in</th><th>Actions</th></tr></thead><tbody>{staff.map(member => <tr key={member.id}>
          <td><strong>{member.display_name}</strong><small>{member.email}</small></td>
          <td>{member.role}</td>
          <td><span className={"order-status " + (member.is_active ? "status-confirmed" : "status-cancelled")}>{member.is_active ? "Active" : "Deactivated"}</span></td>
          <td>{member.last_login_at ? new Date(member.last_login_at).toLocaleString() : "Never"}</td>
          <td>{protectedTarget(member) ? <small className="restricted-action">Protected account</small> : <div className="team-actions">
            <button className="refresh-button" type="button" disabled={busy} onClick={() => editMember(member)}>Edit</button>
            <button className="refresh-button" type="button" disabled={busy || !member.is_active} onClick={() => { setEditing(null); setResetTarget(member); setNewPassword(""); }}>Reset password</button>
          </div>}</td>
        </tr>)}</tbody></table></div>}
    </section>
  </section>;
}


function PaymentsModule({ user }: { user: StaffUser }) {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
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
      const result = await adminApi.payments(nextFilter);
      setPayments(result.payments);
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

  return (
    <section className="payments-module">
      <div className="module-heading">
        <div><span className="kicker">PAYMENT OPERATIONS</span><h1>Payments</h1><p>Review COD payment status and record collection only after delivery is confirmed.</p></div>
        <button className="refresh-button" type="button" disabled={loading} onClick={() => void load(filter)}>↻ Refresh</button>
      </div>
      {error ? <div className="orders-alert" role="alert">{error}</div> : null}
      {notice ? <div className="orders-notice" role="status">{notice}</div> : null}
      <div className="inventory-summary-grid">
        <div className="inventory-summary"><span>Unpaid records shown</span><strong>{unpaid.length}</strong></div>
        <div className="inventory-summary"><span>Collected records shown</span><strong>{collected.length}</strong></div>
        <div className="inventory-summary"><span>Collected amount shown</span><strong>{money(collected.reduce((sum, payment) => sum + payment.amount_paisa, 0))}</strong></div>
      </div>
      <div className="filter-tabs payments-filters">
        <button type="button" className={filter === "" ? "selected" : ""} onClick={() => { setFilter(""); void load(""); }}>All COD</button>
        <button type="button" className={filter === "unpaid" ? "selected" : ""} onClick={() => { setFilter("unpaid"); void load("unpaid"); }}>Unpaid</button>
        <button type="button" className={filter === "collected" ? "selected" : ""} onClick={() => { setFilter("collected"); void load("collected"); }}>Collected</button>
      </div>
      {!canCollect ? <p className="orders-footnote">Your role has read-only access to payment records.</p> : null}
      <section className="inventory-stock-card">
        <div className="inventory-card-heading"><div><h2>Cash-on-delivery records</h2><p>Latest 200 COD payment records. Amounts are stored in paisa and shown in PKR.</p></div></div>
        {loading ? <div className="orders-empty">Loading payments…</div> : payments.length === 0 ? <div className="orders-empty"><strong>No payment records in this view</strong><small>COD payments appear here after customer orders are created.</small></div> : (
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
      <p className="orders-footnote">This module records COD collection only. Online payments, bank transfers, refunds and proof uploads are separate workflows.</p>
    </section>
  );
}

function PlaceholderSection({ section }: { section: Section }) {
  const item = NAV.find(nav => nav.id === section) ?? NAV[0];
  return (
    <section className="feature-placeholder">
      <div className="placeholder-icon"><Icon name={section} /></div>
      <span className="kicker">OPERATIONS MODULE</span>
      <h1>{item.label}</h1>
      <p>This module is reserved in the FRYZAR operations workspace. Its API, permissions, and persistent actions are still being implemented. No demo data or fake controls are shown here.</p>
      <span className="module-status"><i /> {item.note ?? "Foundation"}</span>
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
      adminApi.dashboardMetrics()
    ]).then(results => {
      if (!active) return;
      if (results[0].status === "fulfilled") setSettings(results[0].value.settings);
      if (results[1].status === "fulfilled") setProducts(results[1].value.products);
      if (results[2].status === "fulfilled") setCategories(results[2].value.categories);
      if (results[3].status === "fulfilled") setZones(results[3].value.delivery_zones);
      if (results[4].status === "fulfilled") setMetrics(results[4].value.metrics);
      const failed = results.filter(result => result.status === "rejected").length;
      if (failed) setDataError("Some public store data could not be loaded. Check API connectivity.");
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

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <a className="sidebar-brand" href="#overview"><span className="ops-brand-mark">F.</span><span><strong>FRYZAR</strong><small>OPERATIONS</small></span></a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav">
          {NAV.map(item => (
            <button key={item.id} type="button" className={section === item.id ? "selected" : ""} onClick={() => setSection(item.id)}>
              <Icon name={item.id} />
              <span>{item.label}</span>
              {item.note ? <i>{item.note === "API pending" ? "Soon" : "Read"}</i> : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className={"sidebar-status " + (dataLoading ? "checking" : dataError ? "warning" : "connected")}>
            <span />
            <div>
              <strong>{dataLoading ? "Checking store services" : dataError ? "Some services need attention" : "Store services available"}</strong>
              <small>Preview environment</small>
            </div>
          </div>
          <div className="sidebar-user"><span className="avatar">{user.display_name.slice(0,1).toUpperCase()}</span><div><strong>{user.display_name}</strong><small>{user.role}</small></div><button type="button" onClick={() => void logout()} disabled={logoutBusy} aria-label="Sign out">↗</button></div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="topbar">
          <div><span className="breadcrumb">FRYZAR <i>/</i> {pageTitle}</span><strong>{pageTitle}</strong></div>
          <div className="topbar-right"><span className="environment-pill">PREVIEW</span><span className="topbar-role">{user.role.toUpperCase()}</span><button type="button" onClick={() => void logout()} disabled={logoutBusy}>Sign out</button></div>
        </header>

        <div className="page-content">
          {section === "orders" ? (
            <OrdersModule user={user} />
          ) : section === "catalogue" ? (
            <CatalogueModule user={user} />
          ) : section === "inventory" ? (
            <InventoryModule user={user} />
          ) : section === "delivery" ? (
            <DeliveryModule user={user} />
          ) : section === "settings" ? (
            <StoreSettingsModule user={user} />
          ) : section === "team" ? (
            <TeamAccessModule user={user} />
          ) : section === "payments" ? (
            <PaymentsModule user={user} />
          ) : section === "overview" ? (
            <Overview
              user={user}
              settings={settings}
              products={products}
              categories={categories}
              zones={zones}
              metrics={metrics}
              loading={dataLoading}
              error={dataError}
            />
          ) : (
            <PlaceholderSection section={section} />
          )}
        </div>

        <footer className="admin-footer"><span>FRYZAR OPERATIONS</span><span>Authenticated session · {user.role}</span><span>© {new Date().getFullYear()} FRYZAR</span></footer>
      </main>
    </div>
  );
}
