import { useEffect, useState, type FormEvent } from "react";
import {
  AdminApiError,
  adminApi,
  type AdZoneAdmin,
  type AdminOrder,
  type AdminOrderItem,
  type AdvertisingOverviewResponse,
  type AnalyticsResponse,
  type CustomerDirectoryRecord,
  type EditorialPostAdmin,
  type FinanceSummaryResponse,
  type Ingredient,
  type LedgerEntry,
  type LinkedModifierGroup,
  type ModifierGroup,
  type MonetizationConfigAdmin,
  type NotificationItem,
  type Product,
  type ProductVariant,
  type PurchaseOrder,
  type RecipeItem,
  type RefundRecord,
  type SeoSettingsResponse,
  type StaffUser,
  type Supplier,
  type SystemHealthResponse,
  type WastageRecord
} from "./api";

export function formatMoneyPkr(paisa: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0
  }).format(paisa / 100);
}

export function formatUsdMicros(micros: number): string {
  return "$" + (micros / 1_000_000).toFixed(2) + " USD";
}

export function describeAdminError(error: unknown): string {
  if (error instanceof AdminApiError) {
    if (error.serverMessage) return error.serverMessage;
    switch (error.code) {
      case "insufficient_permissions": return "Your staff role does not have permission for this action.";
      case "owner_permission_required": return "Only the store Owner can modify advertising & monetization controls.";
      case "prohibited_ad_format": return "Popunder, interstitial, and smartlink formats are permanently prohibited on FRYZAR.";
      case "publisher_approval_incomplete": return "Production ad approval requires a verified Adsterra Site ID and 'approved' publisher status.";
      case "safe_ads_required": return "Safe-ads enforcement cannot be turned off while monetization is enabled.";
      case "zone_credentials_missing": return "A real Adsterra publisher zone ID and verified HTTPS script origin are required to enable a zone.";
      case "invalid_script_origin": return "Script origin must be an HTTPS origin (e.g. https://www.highperformanceformat.com) with no path or query.";
      case "estimate_cannot_be_marked_paid": return "Local estimate records cannot be marked finalized or paid.";
      case "product_has_history_archive_instead": return "This product has order or stock history and cannot be deleted; use Archive instead.";
      case "slug_conflict":
      case "slug_or_sku_conflict": return "That URL slug or SKU is already used by another record.";
      case "invalid_canonical_domain": return "Canonical domain must be an HTTPS root URL (e.g. https://fryzar.com) with no trailing slash.";
      case "refund_exceeds_order_total": return "Refund amount exceeds the remaining refundable balance on this order.";
      case "insufficient_stock": return "Insufficient stock quantity available for this deduction.";
      case "invalid_placement_slot": return "Select a valid storefront placement slot for this ad zone.";
      case "manual_transfer_disabled": return "Manual bank transfer is currently disabled by release policy.";
      default: return `Request failed (${error.code}, HTTP ${error.status}).`;
    }
  }
  return "Something went wrong. Please try again.";
}

/* Printable Order Receipt Modal (Section 5.6) */
export function PrintableReceiptModal({
  orderId,
  storeName,
  onClose
}: {
  orderId: string;
  storeName: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<(AdminOrder & { notes?: string }) | null>(null);
  const [items, setItems] = useState<AdminOrderItem[]>([]);
  const [history, setHistory] = useState<Array<{ old_status: string | null; new_status: string; note: string; created_at: string }>>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    adminApi.adminOrder(orderId)
      .then((res) => {
        if (!active) return;
        setOrder(res.order);
        setItems(res.items);
        setHistory(res.history);
      })
      .catch((err) => {
        if (active) setError(describeAdminError(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [orderId]);

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-label="Order receipt">
      <div className="admin-modal">
        <div className="team-form-heading no-print">
          <h2>Order Receipt &amp; Timeline</h2>
          <div className="ops-inline-actions">
            <button type="button" className="primary-button" onClick={() => window.print()} disabled={loading || !order}>
              Print Receipt
            </button>
            <button type="button" className="secondary-button" onClick={onClose}>Close</button>
          </div>
        </div>
        {error ? <div className="orders-alert" role="alert">{error}</div> : null}
        {loading ? (
          <div className="orders-empty">Loading receipt…</div>
        ) : order ? (
          <div className="receipt-sheet">
            <h3>{storeName || "FRYZAR"}</h3>
            <div>Order <strong>{order.order_number}</strong> · {new Date(order.created_at).toLocaleString()}</div>
            <div>Status: <strong>{order.status.replaceAll("_", " ")}</strong> · Payment: <strong>{order.payment_method.toUpperCase()} ({order.payment_status})</strong></div>
            <hr className="receipt-divider" />
            <div><strong>Customer:</strong> {order.customer_name || "Restricted (Kitchen view)"}</div>
            {order.customer_phone ? <div><strong>Phone:</strong> {order.customer_phone}</div> : null}
            {order.delivery_area ? <div><strong>Area:</strong> {order.delivery_area}</div> : null}
            {order.delivery_address ? <div><strong>Address:</strong> {order.delivery_address}</div> : null}
            {order.notes ? <div><strong>Notes:</strong> {order.notes}</div> : null}
            <hr className="receipt-divider" />
            {items.map((item, idx) => (
              <div className="receipt-row" key={idx}>
                <span>
                  {item.quantity} × {item.product_name_en_snapshot}
                  {item.variant_name_en_snapshot ? ` (${item.variant_name_en_snapshot})` : ""}
                </span>
                <strong>{formatMoneyPkr(item.line_total_paisa)}</strong>
              </div>
            ))}
            <hr className="receipt-divider" />
            <div className="receipt-row"><span>Subtotal</span><span>{formatMoneyPkr(order.subtotal_paisa)}</span></div>
            {order.discount_paisa ? <div className="receipt-row"><span>Discount</span><span>-{formatMoneyPkr(order.discount_paisa)}</span></div> : null}
            <div className="receipt-row"><span>Delivery Fee</span><span>{formatMoneyPkr(order.delivery_fee_paisa)}</span></div>
            <div className="receipt-row" style={{ fontSize: "14px", fontWeight: 800 }}>
              <span>Total (PKR)</span>
              <span>{formatMoneyPkr(order.total_paisa)}</span>
            </div>
            {history.length > 0 ? (
              <div className="no-print" style={{ marginTop: "14px" }}>
                <hr className="receipt-divider" />
                <strong>Status Timeline</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: "18px", fontSize: "11px" }}>
                  {history.map((ev, idx) => (
                    <li key={idx}>
                      {new Date(ev.created_at).toLocaleString()} — {ev.old_status ? `${ev.old_status} → ` : ""}{ev.new_status}
                      {ev.note ? ` (${ev.note})` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* 6. Variants & Modifiers Module */
export function VariantsModifiersModule({ user }: { user: StaffUser }) {
  const canEdit = user.role === "owner" || user.role === "manager";
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [linkedGroups, setLinkedGroups] = useState<LinkedModifierGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [variantForm, setVariantForm] = useState({ name_en: "", name_ur: "", price_pkr: "0", sku: "", stock_qty: "" });
  const [groupForm, setGroupForm] = useState({ name_en: "", name_ur: "", min_selection: "0", max_selection: "1", is_required: "0" });
  const [optionForms, setOptionForms] = useState<Record<string, { name_en: string; name_ur: string; price_pkr: string }>>({});
  const [linkGroupId, setLinkGroupId] = useState("");

  async function loadProductDetails(pid: string) {
    if (!pid) {
      setVariants([]);
      setLinkedGroups([]);
      return;
    }
    const [vRes, lRes] = await Promise.all([
      adminApi.productVariants(pid),
      adminApi.productLinkedModifierGroups(pid)
    ]);
    setVariants(vRes.variants);
    setLinkedGroups(lRes.linked_groups);
  }

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [pRes, gRes] = await Promise.all([adminApi.adminProducts(), adminApi.modifierGroups()]);
      setProducts(pRes.products);
      setGroups(gRes.modifier_groups);
      const pid = selectedProductId || pRes.products[0]?.id || "";
      setSelectedProductId(pid);
      if (pid) await loadProductDetails(pid);
    } catch (err) {
      setError(describeAdminError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadAll(); }, []);

  async function handleSelectProduct(pid: string) {
    setSelectedProductId(pid);
    try {
      await loadProductDetails(pid);
    } catch (err) {
      setError(describeAdminError(err));
    }
  }

  async function addVariant(e: FormEvent) {
    e.preventDefault();
    if (!selectedProductId) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await adminApi.saveProductVariant(selectedProductId, {
        name_en: variantForm.name_en.trim(),
        name_ur: variantForm.name_ur.trim(),
        price_paisa: Math.round(Number(variantForm.price_pkr) * 100),
        sku: variantForm.sku.trim() || null,
        stock_qty: variantForm.stock_qty === "" ? null : Number(variantForm.stock_qty),
        is_available: true
      });
      setVariantForm({ name_en: "", name_ur: "", price_pkr: "0", sku: "", stock_qty: "" });
      setNotice("Variant saved.");
      await loadProductDetails(selectedProductId);
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setBusy(false); }
  }

  async function addGroup(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      await adminApi.saveModifierGroup({
        name_en: groupForm.name_en.trim(),
        name_ur: groupForm.name_ur.trim(),
        min_selection: Number(groupForm.min_selection),
        max_selection: Number(groupForm.max_selection),
        is_required: groupForm.is_required === "1"
      });
      setGroupForm({ name_en: "", name_ur: "", min_selection: "0", max_selection: "1", is_required: "0" });
      setNotice("Modifier group created.");
      await loadAll();
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setBusy(false); }
  }

  async function addOption(groupId: string, e: FormEvent) {
    e.preventDefault();
    const draft = optionForms[groupId];
    if (!draft?.name_en || !draft?.name_ur) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await adminApi.saveModifierOption(groupId, {
        name_en: draft.name_en.trim(),
        name_ur: draft.name_ur.trim(),
        price_paisa: Math.round(Number(draft.price_pkr || 0) * 100),
        is_available: true
      });
      setOptionForms((cur) => ({ ...cur, [groupId]: { name_en: "", name_ur: "", price_pkr: "0" } }));
      setNotice("Modifier option added.");
      await loadAll();
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setBusy(false); }
  }

  async function handleLinkGroup(e: FormEvent) {
    e.preventDefault();
    if (!selectedProductId || !linkGroupId) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await adminApi.linkModifierGroup(selectedProductId, linkGroupId, linkedGroups.length);
      setLinkGroupId("");
      setNotice("Modifier group linked to product.");
      await loadProductDetails(selectedProductId);
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setBusy(false); }
  }

  return (
    <section className="catalogue-module">
      <div className="module-heading">
        <div>
          <span className="kicker">MENU CUSTOMIZATION</span>
          <h1>Variants &amp; Modifiers</h1>
          <p>Configure size/portion variants, add-on modifier groups, option pricing in PKR, and per-product group links.</p>
        </div>
        <button className="refresh-button" type="button" disabled={loading} onClick={() => void loadAll()}>↻ Refresh</button>
      </div>
      {error ? <div className="orders-alert" role="alert">{error}</div> : null}
      {notice ? <div className="orders-notice" role="status">{notice}</div> : null}

      <div className="ops-card-padded">
        <label className="catalogue-field">
          <span>Select product to manage variants &amp; linked modifier groups</span>
          <select value={selectedProductId} onChange={(e) => void handleSelectProduct(e.target.value)}>
            <option value="">Choose product…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name_en} · {p.name_ur}</option>)}
          </select>
        </label>
      </div>

      <div className="ops-split-grid">
        <div className="ops-card-padded">
          <h2>Product Variants ({variants.length})</h2>
          {canEdit && selectedProductId ? (
            <form onSubmit={addVariant} className="catalogue-form-grid" style={{ marginBottom: "14px" }}>
              <label className="catalogue-field"><span>English name</span><input required value={variantForm.name_en} onChange={(e) => setVariantForm((c) => ({ ...c, name_en: e.target.value }))} placeholder="Regular / Large" /></label>
              <label className="catalogue-field"><span>Urdu name</span><input required value={variantForm.name_ur} onChange={(e) => setVariantForm((c) => ({ ...c, name_ur: e.target.value }))} placeholder="لارج" /></label>
              <label className="catalogue-field"><span>Price (PKR)</span><input required type="number" min="0" step="0.01" value={variantForm.price_pkr} onChange={(e) => setVariantForm((c) => ({ ...c, price_pkr: e.target.value }))} /></label>
              <label className="catalogue-field"><span>SKU (optional)</span><input value={variantForm.sku} onChange={(e) => setVariantForm((c) => ({ ...c, sku: e.target.value }))} /></label>
              <label className="catalogue-field"><span>Stock (optional)</span><input type="number" min="0" value={variantForm.stock_qty} onChange={(e) => setVariantForm((c) => ({ ...c, stock_qty: e.target.value }))} /></label>
              <div className="catalogue-field" style={{ justifyContent: "flex-end" }}>
                <button type="submit" className="primary-button" disabled={busy}>Add Variant</button>
              </div>
            </form>
          ) : null}
          {variants.length === 0 ? <p className="orders-footnote">No variants configured for the selected product.</p> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Variant</th><th>Price</th><th>Stock</th><th>Action</th></tr></thead>
                <tbody>
                  {variants.map((v) => (
                    <tr key={v.id}>
                      <td><strong>{v.name_en}</strong><small>{v.name_ur}</small></td>
                      <td>{formatMoneyPkr(v.price_paisa)}</td>
                      <td>{v.stock_qty == null ? "Unlimited" : v.stock_qty}</td>
                      <td>
                        {canEdit ? (
                          <button type="button" className="refresh-button" onClick={() => void adminApi.deleteProductVariant(v.id).then(() => loadProductDetails(selectedProductId))}>Remove</button>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <hr className="receipt-divider" />
          <h3>Linked Modifier Groups ({linkedGroups.length})</h3>
          {canEdit && selectedProductId ? (
            <form onSubmit={handleLinkGroup} className="ops-inline-actions" style={{ marginBottom: "10px" }}>
              <select value={linkGroupId} onChange={(e) => setLinkGroupId(e.target.value)} style={{ minHeight: "38px", padding: "0 10px", borderRadius: "7px", border: "1px solid var(--line)" }}>
                <option value="">Choose modifier group…</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name_en} ({g.is_required ? "Required" : "Optional"})</option>)}
              </select>
              <button type="submit" className="primary-button" disabled={busy || !linkGroupId}>Link to Product</button>
            </form>
          ) : null}
          {linkedGroups.length === 0 ? <p className="orders-footnote">No modifier groups linked to this product yet.</p> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Group</th><th>Rule</th><th>Action</th></tr></thead>
                <tbody>
                  {linkedGroups.map((lg) => (
                    <tr key={lg.group_id}>
                      <td><strong>{lg.name_en}</strong><small>{lg.name_ur}</small></td>
                      <td>{lg.is_required ? "Required" : "Optional"} ({lg.min_selection}–{lg.max_selection})</td>
                      <td>
                        {canEdit ? (
                          <button type="button" className="refresh-button" onClick={() => void adminApi.unlinkModifierGroup(selectedProductId, lg.group_id).then(() => loadProductDetails(selectedProductId))}>Unlink</button>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="ops-card-padded">
          <h2>Modifier Groups &amp; Options ({groups.length})</h2>
          {canEdit ? (
            <form onSubmit={addGroup} className="catalogue-form-grid" style={{ marginBottom: "16px" }}>
              <label className="catalogue-field"><span>Group (EN)</span><input required value={groupForm.name_en} onChange={(e) => setGroupForm((c) => ({ ...c, name_en: e.target.value }))} placeholder="Dipping Sauces" /></label>
              <label className="catalogue-field"><span>Group (UR)</span><input required value={groupForm.name_ur} onChange={(e) => setGroupForm((c) => ({ ...c, name_ur: e.target.value }))} placeholder="ساسز" /></label>
              <label className="catalogue-field"><span>Required?</span><select value={groupForm.is_required} onChange={(e) => setGroupForm((c) => ({ ...c, is_required: e.target.value }))}><option value="0">Optional</option><option value="1">Required</option></select></label>
              <label className="catalogue-field"><span>Min choices</span><input type="number" min="0" value={groupForm.min_selection} onChange={(e) => setGroupForm((c) => ({ ...c, min_selection: e.target.value }))} /></label>
              <label className="catalogue-field"><span>Max choices</span><input type="number" min="1" value={groupForm.max_selection} onChange={(e) => setGroupForm((c) => ({ ...c, max_selection: e.target.value }))} /></label>
              <div className="catalogue-field" style={{ justifyContent: "flex-end" }}>
                <button type="submit" className="primary-button" disabled={busy}>Create Group</button>
              </div>
            </form>
          ) : null}

          {groups.map((g) => {
            const optDraft = optionForms[g.id] ?? { name_en: "", name_ur: "", price_pkr: "0" };
            return (
              <div key={g.id} style={{ borderTop: "1px solid var(--line)", paddingTop: "12px", marginTop: "12px" }}>
                <div className="team-form-heading">
                  <div>
                    <strong>{g.name_en} · {g.name_ur}</strong>
                    <small style={{ display: "block", color: "var(--muted)" }}>
                      {g.is_required ? "Required" : "Optional"} · Select {g.min_selection} to {g.max_selection}
                    </small>
                  </div>
                  {canEdit ? (
                    <button type="button" className="refresh-button" onClick={() => void adminApi.deleteModifierGroup(g.id).then(() => loadAll())}>Delete Group</button>
                  ) : null}
                </div>
                {(g.options ?? []).length > 0 ? (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Option</th><th>Add-on Price</th><th>Action</th></tr></thead>
                      <tbody>
                        {(g.options ?? []).map((opt) => (
                          <tr key={opt.id}>
                            <td><strong>{opt.name_en}</strong><small>{opt.name_ur}</small></td>
                            <td>{formatMoneyPkr(opt.price_paisa)}</td>
                            <td>
                              {canEdit ? (
                                <button type="button" className="refresh-button" onClick={() => void adminApi.deleteModifierOption(opt.id).then(() => loadAll())}>Delete</button>
                              ) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="orders-footnote">No options added yet.</p>}
                {canEdit ? (
                  <form onSubmit={(e) => void addOption(g.id, e)} className="ops-inline-actions" style={{ marginTop: "8px" }}>
                    <input required placeholder="Option EN" value={optDraft.name_en} onChange={(e) => setOptionForms((c) => ({ ...c, [g.id]: { ...optDraft, name_en: e.target.value } }))} style={{ padding: "8px", borderRadius: "6px", border: "1px solid var(--line)" }} />
                    <input required placeholder="Option UR" value={optDraft.name_ur} onChange={(e) => setOptionForms((c) => ({ ...c, [g.id]: { ...optDraft, name_ur: e.target.value } }))} style={{ padding: "8px", borderRadius: "6px", border: "1px solid var(--line)" }} />
                    <input type="number" min="0" step="0.01" placeholder="PKR" value={optDraft.price_pkr} onChange={(e) => setOptionForms((c) => ({ ...c, [g.id]: { ...optDraft, price_pkr: e.target.value } }))} style={{ width: "90px", padding: "8px", borderRadius: "6px", border: "1px solid var(--line)" }} />
                    <button type="submit" className="secondary-button" disabled={busy}>+ Add Option</button>
                  </form>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* 8. Customers Directory Module */
export function CustomersModule({ user }: { user: StaffUser }) {
  const allowed = user.role === "owner" || user.role === "manager";
  const [customers, setCustomers] = useState<CustomerDirectoryRecord[]>([]);
  const [loading, setLoading] = useState(allowed);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    if (!allowed) return;
    setLoading(true); setError("");
    try {
      const res = await adminApi.customers();
      setCustomers(res.customers);
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  if (!allowed) {
    return (
      <section className="inventory-module">
        <div className="orders-alert" role="alert">Customer contact records are restricted to Owner and Manager roles to protect customer privacy.</div>
      </section>
    );
  }

  const filtered = customers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.customer_name.toLowerCase().includes(q) || c.customer_phone.includes(q) || (c.last_delivery_area ?? "").toLowerCase().includes(q);
  });

  return (
    <section className="inventory-module">
      <div className="module-heading">
        <div>
          <span className="kicker">CUSTOMER INSIGHTS</span>
          <h1>Customers Directory</h1>
          <p>Aggregated guest-order customer profiles, order frequency, delivered PKR spend, and language preference.</p>
        </div>
        <button className="refresh-button" type="button" disabled={loading} onClick={() => void load()}>↻ Refresh</button>
      </div>
      {error ? <div className="orders-alert" role="alert">{error}</div> : null}
      <div className="ops-card-padded">
        <input
          type="search"
          placeholder="Search customer name, phone, or delivery area…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", minHeight: "40px", padding: "0 12px", borderRadius: "8px", border: "1px solid var(--line)" }}
        />
      </div>
      <div className="orders-table-card">
        {loading ? <div className="orders-empty">Loading customers…</div> : filtered.length === 0 ? (
          <div className="orders-empty"><strong>No customer records yet</strong><small>Guest checkout orders automatically populate this directory.</small></div>
        ) : (
          <div className="table-wrap">
            <table className="orders-table">
              <thead><tr><th>Customer</th><th>Phone</th><th>Last Area</th><th>Orders</th><th>Delivered Spend</th><th>Language</th><th>Last Order</th></tr></thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.customer_phone}>
                    <td><strong>{c.customer_name}</strong></td>
                    <td>{c.customer_phone}</td>
                    <td>{c.last_delivery_area || "—"}</td>
                    <td><strong>{c.order_count}</strong></td>
                    <td><strong>{formatMoneyPkr(c.delivered_spend_paisa)}</strong></td>
                    <td>{c.preferred_language.toUpperCase()}</td>
                    <td><small>{new Date(c.last_order_at).toLocaleString()}</small></td>
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

/* 12. Ingredients & Recipes (BOM) Module */
export function IngredientsRecipesModule({ user }: { user: StaffUser }) {
  const canEdit = user.role === "owner" || user.role === "manager";
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [recipeLines, setRecipeLines] = useState<RecipeItem[]>([]);
  const [recipeInstructions, setRecipeInstructions] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [ingForm, setIngForm] = useState({
    name_en: "", name_ur: "", sku: "", unit: "gram", stock_qty: "0", reorder_threshold: "500", cost_pkr: "0"
  });
  const [addLineIngId, setAddLineIngId] = useState("");
  const [addLineQty, setAddLineQty] = useState("100");

  async function loadRecipe(pid: string) {
    if (!pid) return;
    const res = await adminApi.productRecipe(pid);
    setRecipeLines(res.ingredients);
    setRecipeInstructions(res.recipe?.instructions ?? "");
  }

  async function load() {
    setLoading(true); setError("");
    try {
      const [iRes, pRes] = await Promise.all([adminApi.ingredients(), adminApi.adminProducts()]);
      setIngredients(iRes.ingredients);
      setProducts(pRes.products);
      const pid = selectedProductId || pRes.products[0]?.id || "";
      setSelectedProductId(pid);
      if (pid) await loadRecipe(pid);
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function createIngredient(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      await adminApi.saveIngredient({
        name_en: ingForm.name_en.trim(),
        name_ur: ingForm.name_ur.trim(),
        sku: ingForm.sku.trim() || null,
        unit: ingForm.unit,
        stock_qty: Number(ingForm.stock_qty),
        min_threshold: Number(ingForm.reorder_threshold),
        reorder_threshold: Number(ingForm.reorder_threshold),
        cost_per_unit_paisa: Math.round(Number(ingForm.cost_pkr) * 100)
      });
      setIngForm({ name_en: "", name_ur: "", sku: "", unit: "gram", stock_qty: "0", reorder_threshold: "500", cost_pkr: "0" });
      setNotice("Ingredient saved.");
      await load();
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setBusy(false); }
  }

  function addBomLine() {
    const ing = ingredients.find((i) => i.id === addLineIngId);
    const qty = Number(addLineQty);
    if (!ing || !(qty > 0)) return;
    setRecipeLines((cur) => [
      ...cur.filter((item) => item.ingredient_id !== ing.id),
      { ingredient_id: ing.id, quantity_required: qty, unit: ing.unit, name_en: ing.name_en, name_ur: ing.name_ur }
    ]);
  }

  async function saveBom(e: FormEvent) {
    e.preventDefault();
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    setBusy(true); setError(""); setNotice("");
    try {
      await adminApi.saveProductRecipe(selectedProductId, {
        name_en: prod?.name_en ?? "Recipe",
        name_ur: prod?.name_ur ?? "ریسیپی",
        instructions: recipeInstructions,
        ingredients: recipeLines
      });
      setNotice("Product Bill of Materials saved. Ingredients deduct automatically upon delivery.");
      await loadRecipe(selectedProductId);
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setBusy(false); }
  }

  return (
    <section className="inventory-module">
      <div className="module-heading">
        <div>
          <span className="kicker">KITCHEN INVENTORY &amp; BOM</span>
          <h1>Ingredients &amp; Recipes</h1>
          <p>Manage raw kitchen ingredients, low-stock reorder thresholds, and product Bill-of-Materials recipes.</p>
        </div>
        <button className="refresh-button" type="button" disabled={loading} onClick={() => void load()}>↻ Refresh</button>
      </div>
      {error ? <div className="orders-alert" role="alert">{error}</div> : null}
      {notice ? <div className="orders-notice" role="status">{notice}</div> : null}

      <div className="ops-split-grid">
        <div className="ops-card-padded">
          <h2>Raw Ingredients ({ingredients.length})</h2>
          {canEdit ? (
            <form onSubmit={createIngredient} className="catalogue-form-grid" style={{ marginBottom: "14px" }}>
              <label className="catalogue-field"><span>Name (EN)</span><input required value={ingForm.name_en} onChange={(e) => setIngForm((c) => ({ ...c, name_en: e.target.value }))} placeholder="Chicken Breast" /></label>
              <label className="catalogue-field"><span>Name (UR)</span><input required value={ingForm.name_ur} onChange={(e) => setIngForm((c) => ({ ...c, name_ur: e.target.value }))} placeholder="چکن بریسٹ" /></label>
              <label className="catalogue-field"><span>Unit</span><select value={ingForm.unit} onChange={(e) => setIngForm((c) => ({ ...c, unit: e.target.value }))}><option value="gram">gram</option><option value="kg">kg</option><option value="ml">ml</option><option value="liter">liter</option><option value="piece">piece</option><option value="pack">pack</option></select></label>
              <label className="catalogue-field"><span>Opening Stock</span><input type="number" min="0" step="0.01" value={ingForm.stock_qty} onChange={(e) => setIngForm((c) => ({ ...c, stock_qty: e.target.value }))} /></label>
              <label className="catalogue-field"><span>Reorder Alert At</span><input type="number" min="0" step="0.01" value={ingForm.reorder_threshold} onChange={(e) => setIngForm((c) => ({ ...c, reorder_threshold: e.target.value }))} /></label>
              <label className="catalogue-field"><span>Unit Cost (PKR)</span><input type="number" min="0" step="0.01" value={ingForm.cost_pkr} onChange={(e) => setIngForm((c) => ({ ...c, cost_pkr: e.target.value }))} /></label>
              <div className="catalogue-actions"><button type="submit" disabled={busy}>Add Ingredient</button></div>
            </form>
          ) : null}
          {ingredients.length === 0 ? <p className="orders-footnote">No raw ingredients configured yet.</p> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Ingredient</th><th>Stock</th><th>Reorder At</th><th>Unit Cost</th></tr></thead>
                <tbody>
                  {ingredients.map((i) => (
                    <tr key={i.id}>
                      <td><strong>{i.name_en}</strong><small>{i.name_ur}</small></td>
                      <td>
                        <strong className={i.stock_qty <= i.reorder_threshold ? "inventory-negative" : ""}>
                          {i.stock_qty} {i.unit}
                        </strong>
                      </td>
                      <td>{i.reorder_threshold} {i.unit}</td>
                      <td>{formatMoneyPkr(i.cost_per_unit_paisa)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="ops-card-padded">
          <h2>Product Recipe / Bill of Materials</h2>
          <label className="catalogue-field" style={{ marginBottom: "12px" }}>
            <span>Product</span>
            <select value={selectedProductId} onChange={(e) => { setSelectedProductId(e.target.value); void loadRecipe(e.target.value); }}>
              <option value="">Choose product…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name_en} · {p.name_ur}</option>)}
            </select>
          </label>
          {canEdit && selectedProductId ? (
            <form onSubmit={saveBom}>
              <div className="ops-inline-actions" style={{ marginBottom: "10px" }}>
                <select value={addLineIngId} onChange={(e) => setAddLineIngId(e.target.value)} style={{ minHeight: "38px", padding: "0 10px", borderRadius: "7px", border: "1px solid var(--line)" }}>
                  <option value="">Select ingredient…</option>
                  {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name_en} ({i.unit})</option>)}
                </select>
                <input type="number" min="0.01" step="0.01" value={addLineQty} onChange={(e) => setAddLineQty(e.target.value)} style={{ width: "95px", minHeight: "38px", padding: "0 10px", borderRadius: "7px", border: "1px solid var(--line)" }} />
                <button type="button" className="secondary-button" onClick={addBomLine}>+ Add Line</button>
              </div>
              {recipeLines.length > 0 ? (
                <div className="table-wrap" style={{ marginBottom: "12px" }}>
                  <table>
                    <thead><tr><th>Ingredient</th><th>Qty per Unit</th><th>Action</th></tr></thead>
                    <tbody>
                      {recipeLines.map((line) => (
                        <tr key={line.ingredient_id}>
                          <td><strong>{line.name_en || line.ingredient_id}</strong></td>
                          <td>{line.quantity_required} {line.unit}</td>
                          <td><button type="button" className="refresh-button" onClick={() => setRecipeLines((c) => c.filter((x) => x.ingredient_id !== line.ingredient_id))}>Remove</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="orders-footnote">No BOM lines added for this product yet.</p>}
              <label className="catalogue-field">
                <span>Prep notes / kitchen instructions</span>
                <textarea rows={2} value={recipeInstructions} onChange={(e) => setRecipeInstructions(e.target.value)} />
              </label>
              <div className="catalogue-actions"><button type="submit" disabled={busy}>Save Product Recipe</button></div>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* 13. Suppliers & Purchases Module */
export function SuppliersPurchasesModule({ user }: { user: StaffUser }) {
  const canEdit = user.role === "owner" || user.role === "manager";
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [supForm, setSupForm] = useState({ name: "", contact_name: "", phone: "", email: "", address: "" });
  const [poSupplierId, setPoSupplierId] = useState("");
  const [poIngId, setPoIngId] = useState("");
  const [poQty, setPoQty] = useState("10");
  const [poCostPkr, setPoCostPkr] = useState("100");
  const [poLines, setPoLines] = useState<Array<{ ingredient_id: string; name: string; quantity: number; unit_cost_paisa: number }>>([]);

  async function load() {
    setLoading(true); setError("");
    try {
      const [sRes, iRes, poRes] = await Promise.all([
        adminApi.suppliers(),
        adminApi.ingredients(),
        adminApi.purchaseOrders()
      ]);
      setSuppliers(sRes.suppliers);
      setIngredients(iRes.ingredients);
      setPurchaseOrders(poRes.purchase_orders);
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function createSupplier(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      await adminApi.saveSupplier(supForm);
      setSupForm({ name: "", contact_name: "", phone: "", email: "", address: "" });
      setNotice("Supplier added.");
      await load();
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setBusy(false); }
  }

  function addPoLine() {
    const ing = ingredients.find((i) => i.id === poIngId);
    const qty = Number(poQty);
    const costPaisa = Math.round(Number(poCostPkr) * 100);
    if (!ing || !(qty > 0) || costPaisa < 0) return;
    setPoLines((cur) => [...cur, { ingredient_id: ing.id, name: ing.name_en, quantity: qty, unit_cost_paisa: costPaisa }]);
  }

  async function submitPo(e: FormEvent) {
    e.preventDefault();
    if (!poSupplierId || poLines.length === 0) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const res = await adminApi.createPurchaseOrder({
        supplier_id: poSupplierId,
        items: poLines.map((l) => ({ ingredient_id: l.ingredient_id, quantity: l.quantity, unit_cost_paisa: l.unit_cost_paisa }))
      });
      setPoLines([]);
      setNotice(`Purchase Order ${res.order_number} created (${formatMoneyPkr(res.total_cost_paisa)}).`);
      await load();
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setBusy(false); }
  }

  async function receivePo(id: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      await adminApi.receivePurchaseOrder(id);
      setNotice("Purchase Order received; ingredient stock and financial ledger updated.");
      await load();
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setBusy(false); }
  }

  return (
    <section className="inventory-module">
      <div className="module-heading">
        <div>
          <span className="kicker">PROCUREMENT</span>
          <h1>Suppliers &amp; Purchase Orders</h1>
          <p>Manage verified food suppliers, raise purchase orders, and receive stock into kitchen inventory.</p>
        </div>
        <button className="refresh-button" type="button" disabled={loading} onClick={() => void load()}>↻ Refresh</button>
      </div>
      {error ? <div className="orders-alert" role="alert">{error}</div> : null}
      {notice ? <div className="orders-notice" role="status">{notice}</div> : null}

      {canEdit ? (
        <div className="ops-split-grid">
          <form className="ops-card-padded" onSubmit={createSupplier}>
            <h2>Add Supplier</h2>
            <div className="catalogue-form-grid">
              <label className="catalogue-field"><span>Supplier Name</span><input required value={supForm.name} onChange={(e) => setSupForm((c) => ({ ...c, name: e.target.value }))} /></label>
              <label className="catalogue-field"><span>Contact Person</span><input value={supForm.contact_name} onChange={(e) => setSupForm((c) => ({ ...c, contact_name: e.target.value }))} /></label>
              <label className="catalogue-field"><span>Phone</span><input value={supForm.phone} onChange={(e) => setSupForm((c) => ({ ...c, phone: e.target.value }))} /></label>
              <label className="catalogue-field"><span>Email</span><input type="email" value={supForm.email} onChange={(e) => setSupForm((c) => ({ ...c, email: e.target.value }))} /></label>
              <label className="catalogue-field catalogue-wide"><span>Address</span><input value={supForm.address} onChange={(e) => setSupForm((c) => ({ ...c, address: e.target.value }))} /></label>
            </div>
            <div className="catalogue-actions"><button type="submit" disabled={busy}>Save Supplier</button></div>
          </form>

          <form className="ops-card-padded" onSubmit={submitPo}>
            <h2>Create Purchase Order</h2>
            <label className="catalogue-field" style={{ marginBottom: "10px" }}>
              <span>Supplier</span>
              <select required value={poSupplierId} onChange={(e) => setPoSupplierId(e.target.value)}>
                <option value="">Select supplier…</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <div className="ops-inline-actions" style={{ marginBottom: "10px" }}>
              <select value={poIngId} onChange={(e) => setPoIngId(e.target.value)} style={{ minHeight: "38px", padding: "0 8px", borderRadius: "7px", border: "1px solid var(--line)" }}>
                <option value="">Ingredient…</option>
                {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name_en} ({i.unit})</option>)}
              </select>
              <input type="number" min="0.1" step="0.1" value={poQty} onChange={(e) => setPoQty(e.target.value)} placeholder="Qty" style={{ width: "80px", minHeight: "38px", padding: "0 8px", borderRadius: "7px", border: "1px solid var(--line)" }} />
              <input type="number" min="0" step="0.01" value={poCostPkr} onChange={(e) => setPoCostPkr(e.target.value)} placeholder="Unit PKR" style={{ width: "95px", minHeight: "38px", padding: "0 8px", borderRadius: "7px", border: "1px solid var(--line)" }} />
              <button type="button" className="secondary-button" onClick={addPoLine}>+ Item</button>
            </div>
            {poLines.length > 0 ? (
              <ul style={{ margin: "0 0 10px", paddingLeft: "18px", fontSize: "11px" }}>
                {poLines.map((l, idx) => (
                  <li key={idx}>{l.name}: {l.quantity} × {formatMoneyPkr(l.unit_cost_paisa)}</li>
                ))}
              </ul>
            ) : null}
            <div className="catalogue-actions"><button type="submit" disabled={busy || poLines.length === 0}>Submit Purchase Order</button></div>
          </form>
        </div>
      ) : null}

      <div className="ops-card-padded">
        <h2>Purchase Orders ({purchaseOrders.length})</h2>
        {purchaseOrders.length === 0 ? <p className="orders-footnote">No purchase orders recorded yet.</p> : (
          <div className="table-wrap">
            <table className="orders-table">
              <thead><tr><th>PO #</th><th>Supplier</th><th>Total Cost</th><th>Status</th><th>Created</th><th>Action</th></tr></thead>
              <tbody>
                {purchaseOrders.map((po) => (
                  <tr key={po.id}>
                    <td><strong>{po.order_number}</strong></td>
                    <td>{po.supplier_name}</td>
                    <td><strong>{formatMoneyPkr(po.total_cost_paisa)}</strong></td>
                    <td><span className={"order-status " + (po.status === "received" ? "status-confirmed" : "status-pending")}>{po.status}</span></td>
                    <td><small>{new Date(po.created_at).toLocaleString()}</small></td>
                    <td>
                      {po.status !== "received" && canEdit ? (
                        <button type="button" className="refresh-button" disabled={busy} onClick={() => void receivePo(po.id)}>Receive Stock</button>
                      ) : <small className="restricted-action">Completed</small>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="ops-card-padded">
        <h2>Suppliers Directory ({suppliers.length})</h2>
        {suppliers.length === 0 ? <p className="orders-footnote">No suppliers added yet.</p> : (
          <div className="table-wrap">
            <table className="orders-table">
              <thead><tr><th>Supplier</th><th>Contact</th><th>Phone</th><th>Email</th><th>Address</th></tr></thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.contact_name || "—"}</td>
                    <td>{s.phone || "—"}</td>
                    <td>{s.email || "—"}</td>
                    <td>{s.address || "—"}</td>
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

/* 14. Wastage Module */
export function WastageModule({ user }: { user: StaffUser }) {
  const canEdit = user.role === "owner" || user.role === "manager" || user.role === "kitchen";
  const [records, setRecords] = useState<WastageRecord[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ targetType: "ingredient", targetId: "", quantity: "1", reason: "expired", cost_pkr: "0", note: "" });

  async function load() {
    setLoading(true); setError("");
    try {
      const [wRes, iRes, pRes] = await Promise.all([
        adminApi.wastageRecords(),
        adminApi.ingredients(),
        adminApi.adminProducts()
      ]);
      setRecords(wRes.wastage_records);
      setIngredients(iRes.ingredients);
      setProducts(pRes.products);
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.targetId) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await adminApi.logWastage({
        ...(form.targetType === "ingredient" ? { ingredient_id: form.targetId } : { product_id: form.targetId }),
        quantity: Number(form.quantity),
        reason: form.reason,
        cost_paisa: Math.round(Number(form.cost_pkr || 0) * 100),
        note: form.note.trim()
      });
      setForm((c) => ({ ...c, quantity: "1", cost_pkr: "0", note: "" }));
      setNotice("Wastage logged and deducted from inventory.");
      await load();
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setBusy(false); }
  }

  return (
    <section className="inventory-module">
      <div className="module-heading">
        <div>
          <span className="kicker">LOSS &amp; SPOILAGE TRACKING</span>
          <h1>Wastage Control</h1>
          <p>Log prep loss, spoilage, or damaged items with automatic stock deduction and financial expense entry.</p>
        </div>
        <button className="refresh-button" type="button" disabled={loading} onClick={() => void load()}>↻ Refresh</button>
      </div>
      {error ? <div className="orders-alert" role="alert">{error}</div> : null}
      {notice ? <div className="orders-notice" role="status">{notice}</div> : null}

      {canEdit ? (
        <form className="catalogue-editor" onSubmit={submit}>
          <h2>Record Wastage Event</h2>
          <div className="catalogue-form-grid">
            <label className="catalogue-field">
              <span>Item Type</span>
              <select value={form.targetType} onChange={(e) => setForm((c) => ({ ...c, targetType: e.target.value, targetId: "" }))}>
                <option value="ingredient">Raw Ingredient</option>
                <option value="product">Finished Product</option>
              </select>
            </label>
            <label className="catalogue-field">
              <span>Select Item</span>
              <select required value={form.targetId} onChange={(e) => setForm((c) => ({ ...c, targetId: e.target.value }))}>
                <option value="">Choose…</option>
                {form.targetType === "ingredient"
                  ? ingredients.map((i) => <option key={i.id} value={i.id}>{i.name_en} ({i.stock_qty} {i.unit})</option>)
                  : products.map((p) => <option key={p.id} value={p.id}>{p.name_en}{p.stock_qty != null ? ` (${p.stock_qty} in stock)` : ""}</option>)}
              </select>
            </label>
            <label className="catalogue-field">
              <span>Quantity Lost</span>
              <input
                required
                type="number"
                min={form.targetType === "product" ? "1" : "0.01"}
                step={form.targetType === "product" ? "1" : "0.01"}
                value={form.quantity}
                onChange={(e) => setForm((c) => ({ ...c, quantity: e.target.value }))}
              />
            </label>
            <label className="catalogue-field">
              <span>Reason</span>
              <select value={form.reason} onChange={(e) => setForm((c) => ({ ...c, reason: e.target.value }))}>
                <option value="expired">Expired</option>
                <option value="spilled">Spilled / Spoiled</option>
                <option value="damaged">Damaged</option>
                <option value="prep_loss">Kitchen Prep Loss</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="catalogue-field"><span>Estimated Cost (PKR)</span><input type="number" min="0" step="0.01" value={form.cost_pkr} onChange={(e) => setForm((c) => ({ ...c, cost_pkr: e.target.value }))} /></label>
            <label className="catalogue-field"><span>Note</span><input value={form.note} onChange={(e) => setForm((c) => ({ ...c, note: e.target.value }))} /></label>
          </div>
          <div className="catalogue-actions"><button type="submit" disabled={busy}>Log Wastage</button></div>
        </form>
      ) : null}

      <div className="orders-table-card">
        {loading ? <div className="orders-empty">Loading wastage logs…</div> : records.length === 0 ? (
          <div className="orders-empty"><strong>No wastage events recorded</strong></div>
        ) : (
          <div className="table-wrap">
            <table className="orders-table">
              <thead><tr><th>Item</th><th>Quantity</th><th>Reason</th><th>Cost Impact</th><th>Note</th><th>Date</th></tr></thead>
              <tbody>
                {records.map((w) => (
                  <tr key={w.id}>
                    <td><strong>{w.ingredient_name_en || w.product_name_en || "Item"}</strong></td>
                    <td>{w.quantity}</td>
                    <td><span className="environment-pill">{w.reason}</span></td>
                    <td><strong>{formatMoneyPkr(w.cost_paisa)}</strong></td>
                    <td>{w.note || "—"}</td>
                    <td><small>{new Date(w.created_at).toLocaleString()}</small></td>
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

/* 16. Refunds Module */
export function RefundsModule({ user }: { user: StaffUser }) {
  const canManage = user.role === "owner" || user.role === "manager" || user.role === "finance";
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [orderId, setOrderId] = useState("");
  const [amountPkr, setAmountPkr] = useState("");
  const [reason, setReason] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [rRes, oRes] = await Promise.all([
        adminApi.refunds(),
        adminApi.orders("")
      ]);
      setRefunds(rRes.refunds);
      setOrders(oRes.orders);
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function submitRefund(e: FormEvent) {
    e.preventDefault();
    if (!orderId) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const res = await adminApi.refundOrder(orderId, {
        amount_paisa: Math.round(Number(amountPkr) * 100),
        reason: reason.trim()
      });
      setAmountPkr(""); setReason("");
      setNotice(`Refund recorded (${formatMoneyPkr(res.amount_paisa)}) and posted to financial ledger.`);
      await load();
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setBusy(false); }
  }

  return (
    <section className="payments-module">
      <div className="module-heading">
        <div>
          <span className="kicker">CUSTOMER REFUNDS</span>
          <h1>Refunds &amp; Adjustments</h1>
          <p>Issue partial or full order refunds (capped at order total) with immutable financial ledger &amp; audit entries.</p>
        </div>
        <button className="refresh-button" type="button" disabled={loading} onClick={() => void load()}>↻ Refresh</button>
      </div>
      {error ? <div className="orders-alert" role="alert">{error}</div> : null}
      {notice ? <div className="orders-notice" role="status">{notice}</div> : null}

      {canManage ? (
        <form className="catalogue-editor" onSubmit={submitRefund}>
          <h2>Issue Partial or Full Refund</h2>
          <div className="catalogue-form-grid">
            <label className="catalogue-field">
              <span>Select Order</span>
              <select required value={orderId} onChange={(e) => setOrderId(e.target.value)}>
                <option value="">Choose order…</option>
                {orders.map((o) => <option key={o.id} value={o.id}>{o.order_number} · {formatMoneyPkr(o.total_paisa)} ({o.status})</option>)}
              </select>
            </label>
            <label className="catalogue-field"><span>Refund Amount (PKR)</span><input required type="number" min="1" step="0.01" value={amountPkr} onChange={(e) => setAmountPkr(e.target.value)} /></label>
            <label className="catalogue-field"><span>Reason</span><input required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Item missing / quality issue" /></label>
          </div>
          <div className="catalogue-actions"><button type="submit" disabled={busy}>Record Refund</button></div>
        </form>
      ) : null}

      <div className="orders-table-card">
        {loading ? <div className="orders-empty">Loading refunds…</div> : refunds.length === 0 ? (
          <div className="orders-empty"><strong>No refunds recorded</strong></div>
        ) : (
          <div className="table-wrap">
            <table className="orders-table">
              <thead><tr><th>Order</th><th>Amount</th><th>Reason</th><th>Status</th><th>Reviewer</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>
                {refunds.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.order_number}</strong></td>
                    <td><strong>{formatMoneyPkr(r.amount_paisa)}</strong></td>
                    <td>{r.reason}</td>
                    <td><span className="environment-pill">{r.status}</span></td>
                    <td>{r.reviewer_name || "—"}</td>
                    <td><small>{new Date(r.created_at).toLocaleString()}</small></td>
                    <td>
                      {canManage && r.status !== "completed" && r.status !== "rejected" ? (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button type="button" className="refresh-button" onClick={() => void adminApi.updateRefundStatus(r.id, "completed").then(() => load())}>Mark Completed</button>
                          <button type="button" className="refresh-button" onClick={() => void adminApi.updateRefundStatus(r.id, "rejected").then(() => load())}>Reject &amp; Reverse</button>
                        </div>
                      ) : <small className="restricted-action">{r.status}</small>}
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

/* 17. Finance & Ledger Module */
export function FinanceLedgerModule({ user }: { user: StaffUser }) {
  const [summary, setSummary] = useState<FinanceSummaryResponse | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [sRes, lRes] = await Promise.all([
        adminApi.financeSummary(),
        adminApi.financialLedger()
      ]);
      setSummary(sRes);
      setLedger(lRes.ledger);
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  return (
    <section className="inventory-module">
      <div className="module-heading">
        <div>
          <span className="kicker">FINANCIAL RECONCILIATION ({user.role.toUpperCase()})</span>
          <h1>Finance &amp; Immutable Ledger</h1>
          <p>Daily and monthly PKR reconciliation, order-vs-payment consistency checks, and double-entry transaction history.</p>
        </div>
        <button className="refresh-button" type="button" disabled={loading} onClick={() => void load()}>↻ Refresh</button>
      </div>
      {error ? <div className="orders-alert" role="alert">{error}</div> : null}

      {summary ? (
        <>
          <div className="inventory-summary-grid">
            <div className="inventory-summary">
              <span>Reconciliation Status</span>
              <strong>{summary.reconciliation.consistent ? "100% Consistent" : `${summary.reconciliation.discrepancy_count} Mismatches`}</strong>
            </div>
            <div className="inventory-summary">
              <span>Ledger Entry Categories</span>
              <strong>{summary.totals_by_type.length}</strong>
            </div>
            <div className="inventory-summary">
              <span>Recent Ledger Rows</span>
              <strong>{ledger.length}</strong>
            </div>
          </div>

          {summary.daily_summaries.length > 0 ? (
            <div className="ops-card-padded">
              <h2>Daily Summary (Last 31 Active Days)</h2>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Date</th><th>Order Charges</th><th>Collections</th><th>Refunds</th><th>Expenses</th></tr></thead>
                  <tbody>
                    {summary.daily_summaries.map((d) => (
                      <tr key={d.period_day}>
                        <td><strong>{d.period_day}</strong></td>
                        <td>{formatMoneyPkr(d.order_charges_paisa)}</td>
                        <td>{formatMoneyPkr(d.collections_paisa)}</td>
                        <td>{formatMoneyPkr(d.refunds_paisa)}</td>
                        <td>{formatMoneyPkr(d.expenses_paisa)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <div className="orders-table-card">
        {loading ? <div className="orders-empty">Loading financial ledger…</div> : ledger.length === 0 ? (
          <div className="orders-empty"><strong>No ledger entries recorded yet</strong></div>
        ) : (
          <div className="table-wrap">
            <table className="orders-table">
              <thead><tr><th>Entry Type</th><th>Reference</th><th>Debit</th><th>Credit</th><th>Note</th><th>Timestamp</th></tr></thead>
              <tbody>
                {ledger.map((entry) => (
                  <tr key={entry.id}>
                    <td><span className="environment-pill">{entry.entry_type}</span></td>
                    <td><small>{entry.reference_id}</small></td>
                    <td className={entry.debit_paisa > 0 ? "inventory-negative" : ""}>{entry.debit_paisa > 0 ? formatMoneyPkr(entry.debit_paisa) : "—"}</td>
                    <td className={entry.credit_paisa > 0 ? "inventory-positive" : ""}>{entry.credit_paisa > 0 ? formatMoneyPkr(entry.credit_paisa) : "—"}</td>
                    <td>{entry.note || "—"}</td>
                    <td><small>{new Date(entry.created_at).toLocaleString()}</small></td>
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

/* 19. Notifications Module */
export function NotificationsModule() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  async function load() {
    setLoading(true); setError("");
    try {
      const res = await adminApi.notifications();
      setItems(res.notifications);
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const visible = unreadOnly ? items.filter((n) => !n.read_at) : items;

  return (
    <section className="inventory-module">
      <div className="module-heading">
        <div>
          <span className="kicker">OPERATIONS ALERTS</span>
          <h1>Notifications Inbox</h1>
          <p>Real-time internal alerts for new orders, rider deliveries, payment updates, refunds, and support tickets.</p>
        </div>
        <div className="ops-inline-actions">
          <button type="button" className="secondary-button" onClick={() => setUnreadOnly((v) => !v)}>
            {unreadOnly ? "Show All" : "Unread Only"}
          </button>
          <button type="button" className="refresh-button" disabled={loading} onClick={() => void load()}>↻ Refresh</button>
        </div>
      </div>
      {error ? <div className="orders-alert" role="alert">{error}</div> : null}
      <div className="orders-table-card">
        {loading ? <div className="orders-empty">Loading notifications…</div> : visible.length === 0 ? (
          <div className="orders-empty"><strong>No notifications in this view</strong></div>
        ) : (
          <div className="table-wrap">
            <table className="orders-table">
              <thead><tr><th>Event</th><th>Message</th><th>Status</th><th>Time</th><th>Action</th></tr></thead>
              <tbody>
                {visible.map((n) => (
                  <tr key={n.id}>
                    <td><span className="environment-pill">{n.event_type}</span></td>
                    <td><strong>{n.title_en} · {n.title_ur}</strong><small>{n.body_en}</small></td>
                    <td>{n.read_at ? <span className="ops-pill-ok">Read</span> : <span className="ops-pill-warn">Unread</span>}</td>
                    <td><small>{new Date(n.created_at).toLocaleString()}</small></td>
                    <td>
                      {!n.read_at ? (
                        <button type="button" className="refresh-button" onClick={() => void adminApi.markNotificationRead(n.id).then(() => load())}>Mark Read</button>
                      ) : "—"}
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

/* 20. Analytics Module */
export function AnalyticsModule() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      setData(await adminApi.analytics());
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  return (
    <section className="inventory-module">
      <div className="module-heading">
        <div>
          <span className="kicker">BUSINESS INTELLIGENCE</span>
          <h1>Store Analytics</h1>
          <p>Zero-fabrication analytics derived strictly from verified D1 order records (excluding cancelled/rejected orders).</p>
        </div>
        <button className="refresh-button" type="button" disabled={loading} onClick={() => void load()}>↻ Refresh</button>
      </div>
      {error ? <div className="orders-alert" role="alert">{error}</div> : null}
      {loading ? <div className="orders-empty">Loading analytics…</div> : data ? (
        <div className="ops-split-grid">
          <div className="ops-card-padded">
            <h2>Top Products by Revenue</h2>
            {data.top_products.length === 0 ? <p className="orders-footnote">No completed product sales yet.</p> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Product</th><th>Units Sold</th><th>Gross Revenue</th></tr></thead>
                  <tbody>
                    {data.top_products.map((p, i) => (
                      <tr key={i}><td><strong>{p.product_name_en}</strong></td><td>{p.units_sold}</td><td>{formatMoneyPkr(p.revenue_paisa)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="ops-card-padded">
            <h2>Orders by Delivery Area</h2>
            {data.zones.length === 0 ? <p className="orders-footnote">No area data yet.</p> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Area</th><th>Orders</th><th>Value</th></tr></thead>
                  <tbody>
                    {data.zones.map((z, i) => (
                      <tr key={i}><td><strong>{z.area}</strong></td><td>{z.order_count}</td><td>{formatMoneyPkr(z.total_paisa)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="ops-card-padded">
            <h2>Daily Order Trend (30 Days)</h2>
            {data.daily_orders.length === 0 ? <p className="orders-footnote">No daily orders yet.</p> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Day</th><th>Orders</th><th>Delivered Revenue</th></tr></thead>
                  <tbody>
                    {data.daily_orders.map((d) => (
                      <tr key={d.day}><td><strong>{d.day}</strong></td><td>{d.order_count}</td><td>{formatMoneyPkr(d.delivered_paisa)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="ops-card-padded">
            <h2>Language Split</h2>
            {data.languages.length === 0 ? <p className="orders-footnote">No language metrics yet.</p> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Customer Language</th><th>Orders</th></tr></thead>
                  <tbody>
                    {data.languages.map((l) => (
                      <tr key={l.customer_language}><td><strong>{l.customer_language === "ur" ? "Urdu (اردو)" : "English"}</strong></td><td>{l.order_count}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* 21. Website Content / Editorial CMS Module */
export function EditorialCmsModule({ user }: { user: StaffUser }) {
  const canEdit = user.role === "owner" || user.role === "manager";
  const [posts, setPosts] = useState<EditorialPostAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({
    slug: "",
    content_type: "guide",
    title_en: "",
    title_ur: "",
    summary_en: "",
    summary_ur: "",
    body_en: "",
    body_ur: "",
    image_url: "",
    prep_time_mins: "",
    cook_time_mins: "",
    servings: "",
    is_published: "1"
  });

  async function load() {
    setLoading(true); setError("");
    try {
      const res = await adminApi.editorialPosts();
      setPosts(res.posts);
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  function resetForm() {
    setEditingId("");
    setForm({
      slug: "", content_type: "guide", title_en: "", title_ur: "", summary_en: "", summary_ur: "",
      body_en: "", body_ur: "", image_url: "", prep_time_mins: "", cook_time_mins: "", servings: "", is_published: "1"
    });
  }

  function editPost(p: EditorialPostAdmin) {
    setEditingId(p.id);
    setForm({
      slug: p.slug,
      content_type: p.content_type,
      title_en: p.title_en,
      title_ur: p.title_ur,
      summary_en: p.summary_en,
      summary_ur: p.summary_ur,
      body_en: p.body_en,
      body_ur: p.body_ur,
      image_url: p.image_url ?? "",
      prep_time_mins: p.prep_time_mins == null ? "" : String(p.prep_time_mins),
      cook_time_mins: p.cook_time_mins == null ? "" : String(p.cook_time_mins),
      servings: p.servings == null ? "" : String(p.servings),
      is_published: p.is_published ? "1" : "0"
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      await adminApi.saveEditorialPost({
        slug: form.slug.trim().toLowerCase(),
        content_type: form.content_type,
        title_en: form.title_en.trim(),
        title_ur: form.title_ur.trim(),
        summary_en: form.summary_en.trim(),
        summary_ur: form.summary_ur.trim(),
        body_en: form.body_en.trim(),
        body_ur: form.body_ur.trim(),
        image_url: form.image_url.trim() || null,
        prep_time_mins: form.prep_time_mins === "" ? null : Number(form.prep_time_mins),
        cook_time_mins: form.cook_time_mins === "" ? null : Number(form.cook_time_mins),
        servings: form.servings === "" ? null : Number(form.servings),
        is_published: form.is_published === "1"
      }, editingId || undefined);
      setNotice(editingId ? "Editorial article updated." : "Editorial article published.");
      resetForm();
      await load();
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setBusy(false); }
  }

  return (
    <section className="catalogue-module">
      <div className="module-heading">
        <div>
          <span className="kicker">INTERNATIONAL CONTENT &amp; GUIDES</span>
          <h1>Website Content &amp; Food Guides CMS</h1>
          <p>Publish bilingual (English &amp; Urdu) air-frying guides, recipes, and culinary articles for organic search traffic.</p>
        </div>
        <button className="refresh-button" type="button" disabled={loading} onClick={() => void load()}>↻ Refresh</button>
      </div>
      {error ? <div className="orders-alert" role="alert">{error}</div> : null}
      {notice ? <div className="orders-notice" role="status">{notice}</div> : null}

      {canEdit ? (
        <form className="catalogue-editor" onSubmit={submit}>
          <h2>{editingId ? "Edit Editorial Post" : "Create Editorial Post"}</h2>
          <div className="catalogue-form-grid">
            <label className="catalogue-field"><span>URL Slug</span><input required value={form.slug} onChange={(e) => setForm((c) => ({ ...c, slug: e.target.value }))} placeholder="crispy-samosa-air-fryer-guide" /></label>
            <label className="catalogue-field">
              <span>Content Type</span>
              <select value={form.content_type} onChange={(e) => setForm((c) => ({ ...c, content_type: e.target.value }))}>
                <option value="guide">Food Guide</option>
                <option value="recipe">Recipe (JSON-LD Recipe Schema)</option>
                <option value="article">Article</option>
                <option value="announcement">Store Announcement</option>
              </select>
            </label>
            <label className="catalogue-field">
              <span>Status</span>
              <select value={form.is_published} onChange={(e) => setForm((c) => ({ ...c, is_published: e.target.value }))}>
                <option value="1">Published (Public &amp; Sitemap)</option>
                <option value="0">Draft</option>
              </select>
            </label>
            <label className="catalogue-field"><span>Title (English)</span><input required value={form.title_en} onChange={(e) => setForm((c) => ({ ...c, title_en: e.target.value }))} /></label>
            <label className="catalogue-field"><span>Title (Urdu)</span><input required value={form.title_ur} onChange={(e) => setForm((c) => ({ ...c, title_ur: e.target.value }))} /></label>
            <label className="catalogue-field"><span>Hero Image URL (HTTPS)</span><input value={form.image_url} onChange={(e) => setForm((c) => ({ ...c, image_url: e.target.value }))} /></label>
            <label className="catalogue-field"><span>Prep Mins (optional)</span><input type="number" min="0" value={form.prep_time_mins} onChange={(e) => setForm((c) => ({ ...c, prep_time_mins: e.target.value }))} /></label>
            <label className="catalogue-field"><span>Cook Mins (optional)</span><input type="number" min="0" value={form.cook_time_mins} onChange={(e) => setForm((c) => ({ ...c, cook_time_mins: e.target.value }))} /></label>
            <label className="catalogue-field"><span>Servings (optional)</span><input type="number" min="1" value={form.servings} onChange={(e) => setForm((c) => ({ ...c, servings: e.target.value }))} /></label>
            <label className="catalogue-field catalogue-wide"><span>Summary (English)</span><input value={form.summary_en} onChange={(e) => setForm((c) => ({ ...c, summary_en: e.target.value }))} /></label>
            <label className="catalogue-field catalogue-wide"><span>Summary (Urdu)</span><input value={form.summary_ur} onChange={(e) => setForm((c) => ({ ...c, summary_ur: e.target.value }))} /></label>
            <label className="catalogue-field catalogue-wide"><span>Body Content (English)</span><textarea required rows={4} value={form.body_en} onChange={(e) => setForm((c) => ({ ...c, body_en: e.target.value }))} /></label>
            <label className="catalogue-field catalogue-wide"><span>Body Content (Urdu)</span><textarea required rows={4} value={form.body_ur} onChange={(e) => setForm((c) => ({ ...c, body_ur: e.target.value }))} /></label>
          </div>
          <div className="catalogue-actions">
            <button type="submit" disabled={busy}>{busy ? "Saving…" : editingId ? "Save Changes" : "Publish Content"}</button>
            {editingId ? <button type="button" className="refresh-button" onClick={resetForm}>Cancel</button> : null}
          </div>
        </form>
      ) : null}

      <div className="orders-table-card">
        {loading ? <div className="orders-empty">Loading editorial content…</div> : posts.length === 0 ? (
          <div className="orders-empty"><strong>No editorial posts yet</strong></div>
        ) : (
          <div className="table-wrap">
            <table className="orders-table">
              <thead><tr><th>Title</th><th>Slug</th><th>Type</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.title_en}</strong><small>{p.title_ur}</small></td>
                    <td>/guides/{p.slug}</td>
                    <td><span className="environment-pill">{p.content_type}</span></td>
                    <td>{p.is_published ? <span className="ops-pill-ok">Published</span> : <span className="ops-pill-warn">Draft</span>}</td>
                    <td><small>{new Date(p.updated_at).toLocaleDateString()}</small></td>
                    <td>
                      {canEdit ? (
                        <div className="ops-inline-actions">
                          <button type="button" className="refresh-button" onClick={() => editPost(p)}>Edit</button>
                          <button type="button" className="refresh-button" onClick={() => void adminApi.deleteEditorialPost(p.id).then(() => load())}>Delete</button>
                        </div>
                      ) : "—"}
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

/* 22. Advertising & Monetization Control Center (Section 12.6 — all 12 sub-controls + Emergency Kill Switch) */
export function AdvertisingModule({ user }: { user: StaffUser }) {
  const isOwner = user.role === "owner";
  const canView = isOwner || user.role === "manager" || user.role === "finance";
  const [data, setData] = useState<AdvertisingOverviewResponse | null>(null);
  const [configDraft, setConfigDraft] = useState<MonetizationConfigAdmin | null>(null);
  const [zoneDrafts, setZoneDrafts] = useState<Record<string, { publisher_zone_id: string; script_origin: string; placement_slot: string; is_enabled: boolean; status_note: string }>>({});
  const [loading, setLoading] = useState(canView);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [reportForm, setReportForm] = useState({
    report_date: new Date().toISOString().slice(0, 10),
    source_type: "network_reported",
    format: "banner",
    country_code: "PK",
    device_type: "all",
    impressions: "0",
    clicks: "0",
    ecpm_usd: "0",
    revenue_usd: "0",
    payout_status: "pending",
    note: ""
  });

  async function load() {
    if (!canView) return;
    setLoading(true); setError("");
    try {
      const res = await adminApi.advertisingOverview();
      setData(res);
      const rawCfg = res.config as unknown as Record<string, unknown>;
      const rawFormats = (rawCfg.formats && typeof rawCfg.formats === "object" ? rawCfg.formats : {}) as Record<string, unknown>;
      const rawDevices = (rawCfg.devices && typeof rawCfg.devices === "object" ? rawCfg.devices : {}) as Record<string, unknown>;
      const rawPages = (rawCfg.pages && typeof rawCfg.pages === "object" ? rawCfg.pages : {}) as Record<string, unknown>;
      const rawSafety = (rawCfg.safety && typeof rawCfg.safety === "object" ? rawCfg.safety : {}) as Record<string, unknown>;
      setConfigDraft({
        ...res.config,
        frequencyCapPerSession: typeof res.config.frequencyCapPerSession === "number" ? res.config.frequencyCapPerSession : 4,
        loadTimeoutMs: typeof res.config.loadTimeoutMs === "number" ? res.config.loadTimeoutMs : 4500,
        consentRequiredRegions: Array.isArray(res.config.consentRequiredRegions) ? res.config.consentRequiredRegions : ["EEA", "UK"],
        formats: {
          banner: rawFormats.banner === true,
          nativeBanner: rawFormats.nativeBanner === true || rawFormats.native === true,
          socialBar: rawFormats.socialBar === true,
          inPagePush: rawFormats.inPagePush === true,
          popunder: false,
          interstitial: false,
          smartlink: false
        },
        devices: {
          mobile: rawDevices.mobile !== false,
          desktop: rawDevices.desktop !== false
        },
        pages: {
          home: rawPages.home !== false,
          categories: rawPages.categories !== false,
          products: rawPages.products !== false,
          productDetail: rawPages.productDetail !== false,
          promotions: rawPages.promotions !== false,
          editorial: rawPages.editorial !== false
        },
        safety: {
          safeAdsOnly: rawSafety.safeAdsOnly !== false,
          soundOffOnly: rawSafety.soundOffOnly !== false,
          blockAutoRedirects: rawSafety.blockAutoRedirects !== false,
          collapseOnEmpty: rawSafety.collapseOnEmpty !== false
        }
      });
      const zMap: Record<string, { publisher_zone_id: string; script_origin: string; placement_slot: string; is_enabled: boolean; status_note: string }> = {};
      for (const z of res.zones) {
        zMap[z.id] = {
          publisher_zone_id: z.publisher_zone_id || "",
          script_origin: z.script_origin || "",
          placement_slot: z.placement_slot || "home_mid_feed",
          is_enabled: Boolean(z.is_enabled),
          status_note: z.status_note || ""
        };
      }
      setZoneDrafts(zMap);
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  if (!canView) {
    return (
      <section className="inventory-module">
        <div className="orders-alert" role="alert">Advertising &amp; Monetization controls are restricted to Owner, Manager, and Finance roles.</div>
      </section>
    );
  }

  async function handleKillSwitch() {
    setBusy(true); setError(""); setNotice("");
    try {
      await adminApi.triggerAdKillSwitch();
      setNotice("EMERGENCY KILL SWITCH ACTIVATED: All Adsterra scripts, placements, and zones have been immediately disabled.");
      await load();
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setBusy(false); }
  }

  async function handleSaveConfig(e: FormEvent) {
    e.preventDefault();
    if (!configDraft) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await adminApi.saveAdvertisingConfig(configDraft as unknown as Record<string, unknown>);
      setNotice("Adsterra monetization configuration saved.");
      await load();
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setBusy(false); }
  }

  async function handleSaveZone(zone: AdZoneAdmin) {
    const draft = zoneDrafts[zone.id];
    if (!draft) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await adminApi.updateAdZone(zone.id, draft);
      setNotice(`Ad zone "${zone.zone_key}" updated.`);
      await load();
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setBusy(false); }
  }

  async function handleAddReport(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      await adminApi.recordAdReport({
        report_date: reportForm.report_date,
        source_type: reportForm.source_type,
        format: reportForm.format,
        country_code: reportForm.country_code.toUpperCase(),
        device_type: reportForm.device_type,
        impressions: Number(reportForm.impressions),
        clicks: Number(reportForm.clicks),
        ecpm_micros_usd: Math.round(Number(reportForm.ecpm_usd) * 1_000_000),
        revenue_micros_usd: Math.round(Number(reportForm.revenue_usd) * 1_000_000),
        payout_status: reportForm.source_type === "local_estimate" ? "estimated" : reportForm.payout_status,
        note: reportForm.note.trim()
      });
      setNotice("Advertising performance report recorded honestly.");
      await load();
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setBusy(false); }
  }

  return (
    <section className="catalogue-module">
      <div className="module-heading">
        <div>
          <span className="kicker">BRAND-SAFE ADSTERRA MONETIZATION</span>
          <h1>Advertising &amp; Monetization Control Center</h1>
          <p>Owner-controlled Adsterra governance. Zero fake zone IDs, zero ads on checkout/basket/tracking/policies, and instant kill-switch protection.</p>
        </div>
        <button className="refresh-button" type="button" disabled={loading} onClick={() => void load()}>↻ Refresh</button>
      </div>

      {error ? <div className="orders-alert" role="alert">{error}</div> : null}
      {notice ? <div className="orders-notice" role="status">{notice}</div> : null}

      {loading || !data || !configDraft ? (
        <div className="orders-empty">Loading Adsterra monetization state…</div>
      ) : (
        <>
          <div className={"kill-switch-banner " + (data.config.masterEnabled ? "active-ads" : "")}>
            <div>
              <h2>
                Master Adsterra Status:{" "}
                {data.config.masterEnabled ? "ENABLED" : "SAFELY DISABLED (DEFAULT)"}
              </h2>
              <p>
                Environment: <strong>{data.environment.toUpperCase()}</strong> · Publisher Status: <strong>{data.config.publisherStatus}</strong> ·
                Popunders, Interstitials &amp; Smartlinks are permanently locked OFF in code &amp; API.
              </p>
            </div>
            {isOwner ? (
              <button type="button" className="danger-button" disabled={busy} onClick={() => void handleKillSwitch()}>
                Emergency Disable All Ads
              </button>
            ) : <span className="ops-pill-info">Owner-only mutations</span>}
          </div>

          <form className="catalogue-editor" onSubmit={handleSaveConfig}>
            <h2>1–6. Master Switch, Publisher Verification, Formats, Pages &amp; Safety Rules</h2>
            <div className="catalogue-form-grid" style={{ marginBottom: "14px" }}>
              <label className="catalogue-field">
                <span>Adsterra Site ID (human-provided)</span>
                <input disabled={!isOwner} value={configDraft.siteId} onChange={(e) => setConfigDraft({ ...configDraft, siteId: e.target.value })} placeholder="Leave blank until Adsterra domain approval" />
              </label>
              <label className="catalogue-field">
                <span>Publisher Approval Status</span>
                <select disabled={!isOwner} value={configDraft.publisherStatus} onChange={(e) => setConfigDraft({ ...configDraft, publisherStatus: e.target.value as MonetizationConfigAdmin["publisherStatus"] })}>
                  <option value="unverified">Unverified</option>
                  <option value="pending_review">Pending Adsterra Review</option>
                  <option value="approved">Approved</option>
                  <option value="suspended">Suspended</option>
                </select>
              </label>
              <label className="catalogue-field">
                <span>Session Frequency Cap</span>
                <input disabled={!isOwner} type="number" min="1" max="12" value={configDraft.frequencyCapPerSession} onChange={(e) => setConfigDraft({ ...configDraft, frequencyCapPerSession: Number(e.target.value) })} />
              </label>
            </div>

            <div className="checkbox-grid" style={{ marginBottom: "14px" }}>
              <label className="checkbox-tile">
                <input disabled={!isOwner} type="checkbox" checked={configDraft.masterEnabled} onChange={(e) => setConfigDraft({ ...configDraft, masterEnabled: e.target.checked })} />
                <span>Master Adsterra Switch</span>
              </label>
              <label className="checkbox-tile">
                <input disabled={!isOwner} type="checkbox" checked={configDraft.previewEnabled} onChange={(e) => setConfigDraft({ ...configDraft, previewEnabled: e.target.checked })} />
                <span>Allow Preview Test Rendering</span>
              </label>
              <label className="checkbox-tile">
                <input disabled={!isOwner} type="checkbox" checked={configDraft.productionApproved} onChange={(e) => setConfigDraft({ ...configDraft, productionApproved: e.target.checked })} />
                <span>Production Domain Approved</span>
              </label>
              <label className="checkbox-tile">
                <input disabled={!isOwner} type="checkbox" checked={configDraft.formats.banner} onChange={(e) => setConfigDraft({ ...configDraft, formats: { ...configDraft.formats, banner: e.target.checked } })} />
                <span>Format: Display Banner</span>
              </label>
              <label className="checkbox-tile">
                <input disabled={!isOwner} type="checkbox" checked={configDraft.formats.nativeBanner} onChange={(e) => setConfigDraft({ ...configDraft, formats: { ...configDraft.formats, nativeBanner: e.target.checked } })} />
                <span>Format: Native Content Card</span>
              </label>
              <label className="checkbox-tile">
                <input disabled={!isOwner} type="checkbox" checked={configDraft.formats.socialBar} onChange={(e) => setConfigDraft({ ...configDraft, formats: { ...configDraft.formats, socialBar: e.target.checked } })} />
                <span>Format: Non-covering Social Bar</span>
              </label>
              <label className="checkbox-tile locked">
                <input disabled type="checkbox" checked={false} />
                <span>Popunder (Permanently Blocked)</span>
              </label>
              <label className="checkbox-tile locked">
                <input disabled type="checkbox" checked={false} />
                <span>Interstitial (Permanently Blocked)</span>
              </label>
              <label className="checkbox-tile locked">
                <input disabled type="checkbox" checked={false} />
                <span>Smartlink Redirect (Blocked)</span>
              </label>
            </div>

            <h3>Device &amp; Eligible Browsing/Editorial Page Controls</h3>
            <div className="checkbox-grid" style={{ marginBottom: "14px" }}>
              <label className="checkbox-tile">
                <input disabled={!isOwner} type="checkbox" checked={configDraft.devices.mobile} onChange={(e) => setConfigDraft({ ...configDraft, devices: { ...configDraft.devices, mobile: e.target.checked } })} />
                <span>Mobile Viewports</span>
              </label>
              <label className="checkbox-tile">
                <input disabled={!isOwner} type="checkbox" checked={configDraft.devices.desktop} onChange={(e) => setConfigDraft({ ...configDraft, devices: { ...configDraft.devices, desktop: e.target.checked } })} />
                <span>Desktop Viewports</span>
              </label>
              <label className="checkbox-tile">
                <input disabled={!isOwner} type="checkbox" checked={configDraft.pages.editorial} onChange={(e) => setConfigDraft({ ...configDraft, pages: { ...configDraft.pages, editorial: e.target.checked } })} />
                <span>Page: Food Guides &amp; Editorial</span>
              </label>
              <label className="checkbox-tile">
                <input disabled={!isOwner} type="checkbox" checked={configDraft.pages.home} onChange={(e) => setConfigDraft({ ...configDraft, pages: { ...configDraft.pages, home: e.target.checked } })} />
                <span>Page: Home Below-Fold</span>
              </label>
              <label className="checkbox-tile">
                <input disabled={!isOwner} type="checkbox" checked={configDraft.pages.categories} onChange={(e) => setConfigDraft({ ...configDraft, pages: { ...configDraft.pages, categories: e.target.checked } })} />
                <span>Page: Categories</span>
              </label>
              <label className="checkbox-tile">
                <input disabled={!isOwner} type="checkbox" checked={configDraft.pages.products} onChange={(e) => setConfigDraft({ ...configDraft, pages: { ...configDraft.pages, products: e.target.checked } })} />
                <span>Page: All Products</span>
              </label>
              <label className="checkbox-tile">
                <input disabled={!isOwner} type="checkbox" checked={configDraft.pages.promotions} onChange={(e) => setConfigDraft({ ...configDraft, pages: { ...configDraft.pages, promotions: e.target.checked } })} />
                <span>Page: Promotions</span>
              </label>
              <label className="checkbox-tile">
                <input disabled={!isOwner} type="checkbox" checked={configDraft.pages.productDetail} onChange={(e) => setConfigDraft({ ...configDraft, pages: { ...configDraft.pages, productDetail: e.target.checked } })} />
                <span>Page: Product Detail Footer</span>
              </label>
              <label className="checkbox-tile">
                <input disabled type="checkbox" checked={configDraft.safety.safeAdsOnly} />
                <span>Safe Family/Food Ads Only (Mandatory)</span>
              </label>
            </div>

            <p className="orders-footnote">
              Hard-blocked ad-free pages: <strong>{data.restricted_pages.join(", ")}</strong>. Blocked categories: <strong>{data.blocked_categories.join(", ")}</strong>.
            </p>
            {isOwner ? (
              <div className="catalogue-actions"><button type="submit" disabled={busy}>Save Monetization Policy</button></div>
            ) : null}
          </form>

          <div className="ops-card-padded">
            <h2>7–8. Adsterra Placement Zones &amp; Publisher Zone IDs ({data.zones.length})</h2>
            <p className="orders-footnote" style={{ marginBottom: "12px" }}>
              Zones stay safely collapsed with zero network calls until a real Adsterra Publisher Zone ID and HTTPS Script Origin are saved.
            </p>
            <div className="table-wrap">
              <table className="orders-table">
                <thead><tr><th>Slot / Zone Key</th><th>Format &amp; Size</th><th>Publisher Zone ID</th><th>HTTPS Script Origin</th><th>Enabled</th><th>Action</th></tr></thead>
                <tbody>
                  {data.zones.map((z) => {
                    const zd = zoneDrafts[z.id] ?? { publisher_zone_id: "", script_origin: "", placement_slot: z.placement_slot || "home_mid_feed", is_enabled: false, status_note: "" };
                    return (
                      <tr key={z.id}>
                        <td>
                          <strong>{z.zone_key}</strong>
                          <select
                            disabled={!isOwner}
                            aria-label={`Placement slot for ${z.zone_key}`}
                            value={zd.placement_slot}
                            onChange={(e) => setZoneDrafts((c) => ({ ...c, [z.id]: { ...zd, placement_slot: e.target.value } }))}
                            style={{ display: "block", marginTop: "4px", fontSize: "11px", padding: "3px 6px", borderRadius: "5px", border: "1px solid var(--line)" }}
                          >
                            <option value="home_mid_feed">home_mid_feed (Home)</option>
                            <option value="category_footer">category_footer (Categories)</option>
                            <option value="products_footer">products_footer (Products)</option>
                            <option value="product_below_related">product_below_related (Product Detail)</option>
                            <option value="search_below_results">search_below_results (Search)</option>
                            <option value="promotions_sponsor_card">promotions_sponsor_card (Promotions)</option>
                            <option value="editorial_in_article">editorial_in_article (Guide In-Article)</option>
                            <option value="editorial_footer">editorial_footer (Guide Footer)</option>
                            <option value="about_footer">about_footer (About Footer)</option>
                            <option value="home_below_hero">home_below_hero → home_mid_feed</option>
                            <option value="home_editorial_mid">home_editorial_mid → home_mid_feed</option>
                            <option value="catalogue_grid_after">catalogue_grid_after → products/category</option>
                            <option value="editorial_inline_native">editorial_inline_native → editorial_in_article</option>
                            <option value="editorial_footer_banner">editorial_footer_banner → editorial_footer</option>
                          </select>
                        </td>
                        <td>{z.format} ({z.width}×{z.height})</td>
                        <td>
                          <input
                            disabled={!isOwner}
                            placeholder="Real Zone ID"
                            value={zd.publisher_zone_id}
                            onChange={(e) => setZoneDrafts((c) => ({ ...c, [z.id]: { ...zd, publisher_zone_id: e.target.value } }))}
                            style={{ width: "140px", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--line)" }}
                          />
                        </td>
                        <td>
                          <input
                            disabled={!isOwner}
                            placeholder="https://..."
                            value={zd.script_origin}
                            onChange={(e) => setZoneDrafts((c) => ({ ...c, [z.id]: { ...zd, script_origin: e.target.value } }))}
                            style={{ width: "210px", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--line)" }}
                          />
                        </td>
                        <td>
                          <input
                            disabled={!isOwner}
                            type="checkbox"
                            checked={zd.is_enabled}
                            onChange={(e) => setZoneDrafts((c) => ({ ...c, [z.id]: { ...zd, is_enabled: e.target.checked } }))}
                          />
                        </td>
                        <td>
                          {isOwner ? (
                            <button type="button" className="refresh-button" disabled={busy} onClick={() => void handleSaveZone(z)}>Save Zone</button>
                          ) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="ops-split-grid">
            <div className="ops-card-padded">
              <h2>9–10. Ad Performance &amp; Revenue Ledger (USD)</h2>
              <p className="orders-footnote" style={{ marginBottom: "10px" }}>
                Strictly separates verified Adsterra network reports from local impression estimates. Local estimates can never be marked finalized or paid.
              </p>
              {isOwner ? (
                <form onSubmit={handleAddReport} className="catalogue-form-grid" style={{ marginBottom: "14px" }}>
                  <label className="catalogue-field"><span>Date</span><input required type="date" value={reportForm.report_date} onChange={(e) => setReportForm((c) => ({ ...c, report_date: e.target.value }))} /></label>
                  <label className="catalogue-field">
                    <span>Source Type</span>
                    <select value={reportForm.source_type} onChange={(e) => setReportForm((c) => ({ ...c, source_type: e.target.value }))}>
                      <option value="network_reported">Adsterra Network Reported</option>
                      <option value="local_estimate">Local Estimate</option>
                    </select>
                  </label>
                  <label className="catalogue-field"><span>Country</span><input maxLength={4} value={reportForm.country_code} onChange={(e) => setReportForm((c) => ({ ...c, country_code: e.target.value }))} /></label>
                  <label className="catalogue-field"><span>Impressions</span><input type="number" min="0" value={reportForm.impressions} onChange={(e) => setReportForm((c) => ({ ...c, impressions: e.target.value }))} /></label>
                  <label className="catalogue-field"><span>Clicks</span><input type="number" min="0" value={reportForm.clicks} onChange={(e) => setReportForm((c) => ({ ...c, clicks: e.target.value }))} /></label>
                  <label className="catalogue-field"><span>Revenue (USD)</span><input type="number" min="0" step="0.01" value={reportForm.revenue_usd} onChange={(e) => setReportForm((c) => ({ ...c, revenue_usd: e.target.value }))} /></label>
                  <div className="catalogue-actions"><button type="submit" disabled={busy}>Record Entry</button></div>
                </form>
              ) : null}
              {data.performance_reports.length === 0 ? <p className="orders-footnote">No ad revenue reports recorded ($0.00 verified).</p> : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Date</th><th>Source</th><th>Impr / Clicks</th><th>Revenue</th><th>Payout</th></tr></thead>
                    <tbody>
                      {data.performance_reports.map((r) => (
                        <tr key={r.id}>
                          <td><strong>{r.report_date}</strong><small>{r.country_code}</small></td>
                          <td><span className={r.source_type === "network_reported" ? "ops-pill-ok" : "ops-pill-warn"}>{r.source_type}</span></td>
                          <td>{r.impressions} / {r.clicks}</td>
                          <td><strong>{formatUsdMicros(r.revenue_micros_usd)}</strong></td>
                          <td>{r.payout_status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="ops-card-padded">
              <h2>11–12. Privacy-Safe Slot Telemetry &amp; Audit Trail</h2>
              {data.telemetry_summary.length === 0 ? <p className="orders-footnote">Zero client ad telemetry events logged yet (PII-free).</p> : (
                <div className="table-wrap" style={{ marginBottom: "14px" }}>
                  <table>
                    <thead><tr><th>Event Type</th><th>Count</th><th>Avg Load (ms)</th></tr></thead>
                    <tbody>
                      {data.telemetry_summary.map((t) => (
                        <tr key={t.event_type}>
                          <td><strong>{t.event_type}</strong></td>
                          <td>{t.event_count}</td>
                          <td>{t.avg_load_ms == null ? "—" : Math.round(t.avg_load_ms)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <h3>Recent Monetization Audit Events</h3>
              {data.audit_history.length === 0 ? <p className="orders-footnote">No advertising changes recorded yet.</p> : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Action</th><th>Actor</th><th>Time</th></tr></thead>
                    <tbody>
                      {data.audit_history.map((a) => (
                        <tr key={a.id}>
                          <td><strong>{a.action}</strong></td>
                          <td>{a.actor_name || a.actor_role}</td>
                          <td><small>{new Date(a.created_at).toLocaleString()}</small></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

/* 23. SEO Settings Module */
export function SeoSettingsModule({ user }: { user: StaffUser }) {
  const canEdit = user.role === "owner";
  const [data, setData] = useState<SeoSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    seo_title_en: "",
    seo_title_ur: "",
    seo_description_en: "",
    seo_description_ur: "",
    canonical_domain: "https://fryzar.com",
    robots_index_storefront: false,
    store_address_en: "",
    store_address_ur: "",
    operating_hours_en: "",
    operating_hours_ur: "",
    store_email: ""
  });

  async function load() {
    setLoading(true); setError("");
    try {
      const res = await adminApi.seoSettings();
      setData(res);
      const s = res.seo;
      setForm({
        seo_title_en: String(s.seo_title_en ?? ""),
        seo_title_ur: String(s.seo_title_ur ?? ""),
        seo_description_en: String(s.seo_description_en ?? ""),
        seo_description_ur: String(s.seo_description_ur ?? ""),
        canonical_domain: String(s.canonical_domain ?? "https://fryzar.com"),
        robots_index_storefront: s.robots_index_storefront === true,
        store_address_en: String(s.store_address_en ?? ""),
        store_address_ur: String(s.store_address_ur ?? ""),
        operating_hours_en: String(s.operating_hours_en ?? ""),
        operating_hours_ur: String(s.operating_hours_ur ?? ""),
        store_email: String(s.store_email ?? "")
      });
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      await adminApi.saveSeoSettings(form);
      setNotice("SEO, sitemap, robots.txt, and structured business metadata saved.");
      await load();
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setBusy(false); }
  }

  return (
    <section className="settings-module">
      <div className="module-heading">
        <div>
          <span className="kicker">SEARCH ENGINE &amp; INTERNATIONAL GROWTH</span>
          <h1>SEO, Sitemap &amp; Structured Metadata</h1>
          <p>Manage bilingual meta tags, canonical domain, preview/production indexing rules, and JSON-LD FoodEstablishment details.</p>
        </div>
        <button className="refresh-button" type="button" disabled={loading} onClick={() => void load()}>↻ Refresh</button>
      </div>
      {error ? <div className="orders-alert" role="alert">{error}</div> : null}
      {notice ? <div className="orders-notice" role="status">{notice}</div> : null}

      {data ? (
        <div className="inventory-summary-grid">
          <div className="inventory-summary"><span>Indexable Products</span><strong>{data.indexable_counts.indexable_products}</strong></div>
          <div className="inventory-summary"><span>Indexable Categories</span><strong>{data.indexable_counts.indexable_categories}</strong></div>
          <div className="inventory-summary"><span>Published Food Guides</span><strong>{data.indexable_counts.published_guides}</strong></div>
        </div>
      ) : null}

      <form className="catalogue-editor" onSubmit={submit}>
        <h2>Search Metadata &amp; Business Schema</h2>
        <div className="catalogue-form-grid">
          <label className="catalogue-field"><span>Canonical Domain (HTTPS, no trailing slash)</span><input disabled={!canEdit} required value={form.canonical_domain} onChange={(e) => setForm((c) => ({ ...c, canonical_domain: e.target.value }))} /></label>
          <label className="catalogue-field"><span>Public Contact Email</span><input disabled={!canEdit} type="email" value={form.store_email} onChange={(e) => setForm((c) => ({ ...c, store_email: e.target.value }))} /></label>
          <label className="catalogue-field">
            <span>Search Indexing (robots.txt)</span>
            <select disabled={!canEdit} value={form.robots_index_storefront ? "1" : "0"} onChange={(e) => setForm((c) => ({ ...c, robots_index_storefront: e.target.value === "1" }))}>
              <option value="0">Disallow Indexing (Safe Preview Default)</option>
              <option value="1">Allow Public Search Indexing (Production)</option>
            </select>
          </label>
          <label className="catalogue-field"><span>Default Meta Title (EN)</span><input disabled={!canEdit} value={form.seo_title_en} onChange={(e) => setForm((c) => ({ ...c, seo_title_en: e.target.value }))} /></label>
          <label className="catalogue-field"><span>Default Meta Title (UR)</span><input disabled={!canEdit} value={form.seo_title_ur} onChange={(e) => setForm((c) => ({ ...c, seo_title_ur: e.target.value }))} /></label>
          <label className="catalogue-field"><span>Operating Hours (EN)</span><input disabled={!canEdit} value={form.operating_hours_en} onChange={(e) => setForm((c) => ({ ...c, operating_hours_en: e.target.value }))} /></label>
          <label className="catalogue-field"><span>Operating Hours (UR)</span><input disabled={!canEdit} value={form.operating_hours_ur} onChange={(e) => setForm((c) => ({ ...c, operating_hours_ur: e.target.value }))} /></label>
          <label className="catalogue-field"><span>Store Address (EN)</span><input disabled={!canEdit} value={form.store_address_en} onChange={(e) => setForm((c) => ({ ...c, store_address_en: e.target.value }))} /></label>
          <label className="catalogue-field"><span>Store Address (UR)</span><input disabled={!canEdit} value={form.store_address_ur} onChange={(e) => setForm((c) => ({ ...c, store_address_ur: e.target.value }))} /></label>
          <label className="catalogue-field catalogue-wide"><span>Default Meta Description (EN)</span><textarea disabled={!canEdit} rows={2} value={form.seo_description_en} onChange={(e) => setForm((c) => ({ ...c, seo_description_en: e.target.value }))} /></label>
          <label className="catalogue-field catalogue-wide"><span>Default Meta Description (UR)</span><textarea disabled={!canEdit} rows={2} value={form.seo_description_ur} onChange={(e) => setForm((c) => ({ ...c, seo_description_ur: e.target.value }))} /></label>
        </div>
        {canEdit ? <div className="catalogue-actions"><button type="submit" disabled={busy}>Save SEO Settings</button></div> : null}
      </form>
    </section>
  );
}

/* 27. System Health & Free-Tier Quota Monitor */
export function SystemHealthModule({ user }: { user: StaffUser }) {
  const allowed = user.role === "owner" || user.role === "manager";
  const [data, setData] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState(allowed);
  const [error, setError] = useState("");

  async function load() {
    if (!allowed) return;
    setLoading(true); setError("");
    try {
      setData(await adminApi.systemHealth());
    } catch (err) {
      setError(describeAdminError(err));
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  if (!allowed) {
    return (
      <section className="inventory-module">
        <div className="orders-alert" role="alert">System Health diagnostics are restricted to Owner and Manager roles.</div>
      </section>
    );
  }

  return (
    <section className="inventory-module">
      <div className="module-heading">
        <div>
          <span className="kicker">OBSERVABILITY &amp; $0 FREE-TIER GUARDRAILS</span>
          <h1>System Health &amp; Diagnostics</h1>
          <p>Live D1 schema ledger, secret-presence verification (never exposing secret values), and Cloudflare Free Tier limits.</p>
        </div>
        <button className="refresh-button" type="button" disabled={loading} onClick={() => void load()}>↻ Refresh</button>
      </div>
      {error ? <div className="orders-alert" role="alert">{error}</div> : null}
      {loading ? <div className="orders-empty">Running system diagnostics…</div> : data ? (
        <>
          <div className="inventory-summary-grid">
            <div className="inventory-summary">
              <span>API &amp; D1 Health</span>
              <strong>{data.health.ok ? "Operational" : "Degraded"} ({data.health.environment})</strong>
            </div>
            <div className="inventory-summary">
              <span>Applied D1 Migrations</span>
              <strong>{data.health.migrations_applied} · Target {data.health.schema_target}</strong>
            </div>
            <div className="inventory-summary">
              <span>Cloudflare Plan</span>
              <strong>$0 Free Tier ({data.health.free_tier_limits.worker_daily_requests_limit.toLocaleString()} req/day)</strong>
            </div>
          </div>

          <div className="ops-split-grid">
            <div className="ops-card-padded">
              <h2>Secret Presence &amp; Runtime Counters</h2>
              <div className="config-list">
                <div><span>TRACKING_SECRET (&ge; 32 bytes)</span><strong className={data.health.secrets_configured.tracking_secret ? "text-green" : "text-amber"}>{data.health.secrets_configured.tracking_secret ? "Configured" : "Not configured"}</strong></div>
                <div><span>OWNER_BOOTSTRAP_TOKEN (&ge; 32 bytes)</span><strong className={data.health.secrets_configured.owner_bootstrap_token ? "text-green" : "text-amber"}>{data.health.secrets_configured.owner_bootstrap_token ? "Configured" : "Unset / Rotated"}</strong></div>
                <div><span>SQLite User Tables</span><strong>{data.health.operational_counters.table_count ?? 0}</strong></div>
                <div><span>Active Staff Sessions</span><strong>{data.health.operational_counters.active_staff_sessions ?? 0}</strong></div>
                <div><span>Idempotency Keys Stored</span><strong>{data.health.operational_counters.active_idempotency_keys ?? 0}</strong></div>
                <div><span>Worker CPU Ceiling</span><strong>{data.health.free_tier_limits.worker_cpu_ms_limit} ms</strong></div>
                <div><span>D1 Free Storage Ceiling</span><strong>{data.health.free_tier_limits.d1_storage_limit_mb} MB</strong></div>
              </div>
            </div>

            <div className="ops-card-padded">
              <h2>Applied Migration Ledger</h2>
              {data.health.migrations.length === 0 ? <p className="orders-footnote">Local/ephemeral SQLite schema loaded directly.</p> : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Migration File</th><th>Applied At</th></tr></thead>
                    <tbody>
                      {data.health.migrations.map((m) => (
                        <tr key={m.name}><td><strong>{m.name}</strong></td><td><small>{m.applied_at}</small></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="ops-card-padded">
            <h2>Recent System Events ({data.recent_events.length})</h2>
            {data.recent_events.length === 0 ? <p className="orders-footnote">Zero error or warning events recorded.</p> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Severity</th><th>Category</th><th>Code</th><th>Path</th><th>Message</th><th>Time</th></tr></thead>
                  <tbody>
                    {data.recent_events.map((ev) => (
                      <tr key={ev.id}>
                        <td><span className={ev.severity === "error" ? "ops-pill-danger" : "ops-pill-warn"}>{ev.severity}</span></td>
                        <td>{ev.category}</td>
                        <td><strong>{ev.code}</strong></td>
                        <td><small>{ev.path}</small></td>
                        <td>{ev.message}</td>
                        <td><small>{new Date(ev.created_at).toLocaleString()}</small></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}
