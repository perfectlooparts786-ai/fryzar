import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AdminApiError,
  adminApi,
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
          {section === "overview" ? (
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
