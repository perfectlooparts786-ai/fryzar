import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AdminApiError,
  adminApi,
  type AdminOrder,
  type Category,
  type DeliveryZone,
  type Product,
  type StaffUser,
  type StoreSettings
} from "./api";

type AuthState = "checking" | "signed-out" | "signed-in";
type AuthMode = "login" | "bootstrap";
type Section = "overview" | "orders" | "catalogue" | "inventory" | "payments" | "delivery" | "team" | "settings";

const NAV: { id: Section; label: string; icon: string; note?: string }[] = [
  { id: "overview", label: "Overview", icon: "◫" },
  { id: "orders", label: "Orders", icon: "▤", note: "API pending" },
  { id: "catalogue", label: "Catalogue", icon: "▦", note: "API pending" },
  { id: "inventory", label: "Inventory", icon: "▧", note: "API pending" },
  { id: "payments", label: "Payments", icon: "◈", note: "API pending" },
  { id: "delivery", label: "Delivery", icon: "⌖", note: "Read only" },
  { id: "team", label: "Team access", icon: "♙", note: "API pending" },
  { id: "settings", label: "Store settings", icon: "⚙", note: "Read only" }
];

function isEnabled(value: unknown): boolean {
  return value === true || value === "true" || value === "yes" || value === 1;
}

function messageFor(error: unknown): string {
  if (error instanceof AdminApiError) {
    switch (error.code) {
      case "network_error": return "The FRYZAR API could not be reached. Check the API service and try again.";
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
  loading,
  error
}: {
  user: StaffUser;
  settings: StoreSettings;
  products: Product[];
  categories: Category[];
  zones: DeliveryZone[];
  loading: boolean;
  error: string;
}) {
  const open = settings.store_status === "open" && isEnabled(settings.launch_ready);
  const stats = [
    { label: "Active products", value: String(products.length), tone: "mint", note: "From live catalogue API" },
    { label: "Categories", value: String(categories.length), tone: "sand", note: "Active categories only" },
    { label: "Delivery zones", value: String(zones.length), tone: "blue", note: "Active delivery areas" },
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
          <div className="check-row"><span className="check-dot">3</span><div><strong>Order operations</strong><small>Admin order management endpoints are still under development</small></div></div>
          <div className="check-row"><span className="check-dot">4</span><div><strong>Payment review</strong><small>COD collection and bank-transfer review are not yet available</small></div></div>
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
      price_paisa: String(product.price_paisa), compare_at_paisa: product.compare_at_paisa == null ? "" : String(product.compare_at_paisa),
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
          price_paisa: Number(form.price_paisa),
          compare_at_paisa: form.compare_at_paisa === "" ? null : Number(form.compare_at_paisa),
          stock_qty: form.stock_qty === "" ? null : Number(form.stock_qty),
          sku: form.sku || null, category_id: form.category_id || null, image_url: form.image_url || null,
          sort_order: Number(form.sort_order), is_available: form.is_available !== "0", is_featured: form.is_featured === "1"
        }, editingId || undefined);
        setNotice("Product saved.");
      }
      resetForm(); await load();
    } catch (cause) { setError(messageFor(cause)); }
    finally { setBusy(false); }
  }
  function field(label: string, key: string, type = "text", required = false) {
    return <label className="catalogue-field" key={key}><span>{label}</span><input type={type} required={required} value={form[key] ?? ""} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} /></label>;
  }

  return <section className="catalogue-module">
    <div className="module-heading"><div><span className="kicker">CATALOGUE MANAGEMENT</span><h1>Products &amp; categories</h1><p>Create and update store catalogue records. Prices are entered in paisa.</p></div><button className="refresh-button" type="button" disabled={loading} onClick={() => void load()}>↻ Refresh</button></div>
    <div className="filter-tabs"><button type="button" className={tab === "products" ? "selected" : ""} onClick={() => { setTab("products"); resetForm(); }}>Products ({products.length})</button><button type="button" className={tab === "categories" ? "selected" : ""} onClick={() => { setTab("categories"); resetForm(); }}>Categories ({categories.length})</button></div>
    {error ? <div className="orders-alert" role="alert">{error}</div> : null}
    {notice ? <div className="orders-notice" role="status">{notice}</div> : null}
    {canEdit ? <form className="catalogue-editor" onSubmit={submit}>
      <h2>{editingId ? "Edit" : "Create"} {tab === "products" ? "product" : "category"}</h2>
      <div className="catalogue-form-grid">
        {field("English name", "name_en", "text", true)}{field("Urdu name", "name_ur", "text", true)}{field("URL slug", "slug", "text", true)}
        {tab === "products" ? <>
          {field("Price (paisa)", "price_paisa", "number", true)}{field("Compare-at price (paisa)", "compare_at_paisa", "number")}{field("Stock quantity (blank = unlimited)", "stock_qty", "number")}
          {field("SKU (optional)", "sku")}{field("Image URL (HTTPS only)", "image_url")}
          <label className="catalogue-field"><span>Category</span><select value={form.category_id ?? ""} onChange={event => setForm(current => ({ ...current, category_id: event.target.value }))}><option value="">Uncategorised</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name_en}</option>)}</select></label>
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
      adminApi.deliveryZones()
    ]).then(results => {
      if (!active) return;
      if (results[0].status === "fulfilled") setSettings(results[0].value.settings);
      if (results[1].status === "fulfilled") setProducts(results[1].value.products);
      if (results[2].status === "fulfilled") setCategories(results[2].value.categories);
      if (results[3].status === "fulfilled") setZones(results[3].value.delivery_zones);
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
          <div className="sidebar-status"><span /><div><strong>API connected</strong><small>Development environment</small></div></div>
          <div className="sidebar-user"><span className="avatar">{user.display_name.slice(0,1).toUpperCase()}</span><div><strong>{user.display_name}</strong><small>{user.role}</small></div><button type="button" onClick={() => void logout()} disabled={logoutBusy} aria-label="Sign out">↗</button></div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="topbar">
          <div><span className="breadcrumb">FRYZAR <i>/</i> {pageTitle}</span><strong>{pageTitle}</strong></div>
          <div className="topbar-right"><span className="environment-pill">DEV</span><span className="topbar-role">{user.role.toUpperCase()}</span><button type="button" onClick={() => void logout()} disabled={logoutBusy}>Sign out</button></div>
        </header>

        <div className="page-content">
          {section === "orders" ? (
            <OrdersModule user={user} />
          ) : section === "overview" ? (
            <Overview
              user={user}
              settings={settings}
              products={products}
              categories={categories}
              zones={zones}
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
