const { test, expect } = require("@playwright/test");

const sampleProduct = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "lahori-crispy-wings",
  sku: "WNG-06",
  category_id: "cat-wings",
  category_slug: "wings",
  category_name_en: "Crispy Wings",
  category_name_ur: "کرسپی ونگز",
  name_en: "Lahori Hot Crispy Wings (6 pcs)",
  name_ur: "لاہوری ہاٹ کرسپی ونگز (6 عدد)",
  description_en: "Double-breaded spicy wings cooked fresh to order.",
  description_ur: "تازہ مسالے دار کرسپی چکن ونگز۔",
  price_paisa: 48000,
  compare_at_paisa: 55000,
  image_url: null,
  stock_qty: 8,
  is_available: 1,
  is_featured: 1,
  variants: [],
  modifier_groups: []
};

const outOfStockProduct = {
  id: "22222222-2222-4222-8222-222222222222",
  slug: "sold-out-bucket",
  sku: "BKT-01",
  category_id: "cat-wings",
  category_slug: "wings",
  category_name_en: "Crispy Wings",
  category_name_ur: "کرسپی ونگز",
  name_en: "Family Feast Bucket",
  name_ur: "فیملی فیسٹ بکٹ",
  description_en: "Temporarily sold out.",
  description_ur: "فی الحال دستیاب نہیں۔",
  price_paisa: 185000,
  compare_at_paisa: null,
  image_url: null,
  stock_qty: 0,
  is_available: 0,
  is_featured: 0,
  variants: [],
  modifier_groups: []
};

async function attachZeroErrorMonitor(page) {
  const errors = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(`console.error: ${msg.text()}`);
    }
  });
  return errors;
}

async function mockStorefront(page, { storeOpen = true, minOrderPaisa = 60000, previewAds = false } = {}) {
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const respond = (body, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

    if (url.pathname === "/api/v1/health") return respond({ ok: true, service: "fryzar-api", schema: "ready" });
    if (url.pathname === "/api/v1/categories") {
      return respond({
        categories: [{ id: "cat-wings", slug: "wings", name_en: "Crispy Wings", name_ur: "کرسپی ونگز", sort_order: 1 }]
      });
    }
    if (url.pathname === "/api/v1/products") {
      return respond({ products: [sampleProduct, outOfStockProduct], limit: 50 });
    }
    if (url.pathname.startsWith("/api/v1/products/")) {
      const target = url.pathname.endsWith(outOfStockProduct.id) || url.pathname.endsWith(outOfStockProduct.slug)
        ? outOfStockProduct
        : sampleProduct;
      return respond({ product: target, images: [], variants: [], modifier_groups: [] });
    }
    if (url.pathname === "/api/v1/storefront-config") {
      return respond({
        settings: {
          store_name_en: "FRYZAR",
          store_name_ur: "فرائیزار",
          store_status: storeOpen ? "open" : "setup",
          launch_ready: storeOpen,
          currency: "PKR",
          supported_languages: ["ur", "en"],
          cod_enabled: true,
          manual_transfer_enabled: false,
          whatsapp_number: "+923001234567"
        }
      });
    }
    if (url.pathname === "/api/v1/delivery-zones") {
      return respond({
        delivery_zones: [
          {
            id: "zone-wah",
            code: "WAH",
            name_en: "Wah Cantt",
            name_ur: "واہ کینٹ",
            city: "Wah",
            region: "Punjab",
            country_code: "PK",
            delivery_fee_paisa: 12000,
            minimum_order_paisa: minOrderPaisa,
            estimated_mins_min: 30,
            estimated_mins_max: 45
          }
        ],
        currency: "PKR"
      });
    }
    if (url.pathname === "/api/v1/promotions") return respond({ coupons: [], discounted_products: [], currency: "PKR" });
    if (url.pathname === "/api/v1/editorial") return respond({ posts: [] });
    if (url.pathname === "/api/v1/monetization-config") {
      return respond({
        monetization: {
          masterEnabled: previewAds,
          previewEnabled: previewAds,
          effectiveActive: previewAds,
          frequencyCapPerSession: 2,
          formats: { banner: true, native: true, nativeBanner: true, socialBar: false, popunder: false, interstitial: false, smartlink: false },
          safety: { safeAdsOnly: true }
        },
        zones: previewAds
          ? [
              {
                id: "z-1",
                zone_key: "home_below_hero",
                placement_slot: "home_below_hero",
                format: "banner",
                publisher_zone_id: "",
                script_origin: ""
              }
            ]
          : [],
        restricted_pages: ["basket", "checkout", "payment", "order-confirmation", "order-tracking", "support", "privacy-policy", "terms", "refund-policy", "delivery-policy"]
      });
    }
    if (url.pathname === "/api/v1/ad-events") return respond({ recorded: true }, 201);
    return respond({ error: "not_found" }, 404);
  });
}

test.describe("Phase 2 Customer Storefront Acceptance: Responsive LTR/RTL, Persistence & Negative Edge Cases", () => {
  test("verifies zero horizontal overflow across 375px/768px/1280px EN & UR, basket reload persistence, minimum order, and Escape accessibility", async ({ page }) => {
    const runtimeErrors = await attachZeroErrorMonitor(page);
    await mockStorefront(page, { storeOpen: true, minOrderPaisa: 60000, previewAds: true });

    for (const vp of [
      { width: 375, height: 812 },
      { width: 768, height: 1024 },
      { width: 1280, height: 800 }
    ]) {
      await page.setViewportSize(vp);
      await page.goto("http://127.0.0.1:5173");
      await expect(page.getByRole("heading", { name: "Lahori Hot Crispy Wings (6 pcs)" })).toBeVisible();

      const overflowLtr = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(overflowLtr).toBe(false);

      // Verify seeded placement_slot alias home_below_hero mapped to home_mid_feed preview fallback (728px display_banner)
      const adPreview = page.locator('[data-ad-preview="home_mid_feed"]');
      await expect(adPreview).toBeVisible();
      await expect(adPreview).toHaveCSS("max-width", "728px");

      // Switch to Urdu RTL and verify zero horizontal overflow
      await page.getByRole("button", { name: "Switch language" }).click();
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      const overflowRtl = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(overflowRtl).toBe(false);

      // Switch back to English LTR
      await page.getByRole("button", { name: /زبان تبدیل کریں|Switch language/ }).click();
      await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    }

    // Out-of-stock item protection + Escape closes Product details modal
    const soldOutCard = page.locator(".product-card").filter({ has: page.getByRole("heading", { name: "Family Feast Bucket" }) });
    await soldOutCard.getByRole("button", { name: /Add to basket|Unavailable|Sold out/i }).click();
    const soldOutDialog = page.getByRole("dialog", { name: "Product details" });
    await expect(soldOutDialog.getByRole("button", { name: "Add to basket" })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(soldOutDialog).toHaveCount(0);

    // Add item (PKR 480 < PKR 600 minimum order) and verify persistence across full page reload
    const wingCard = page.locator(".product-card").filter({ has: page.getByRole("heading", { name: "Lahori Hot Crispy Wings (6 pcs)" }) });
    await wingCard.getByRole("button", { name: "Add to basket" }).click();
    const productDialog = page.getByRole("dialog", { name: "Product details" });
    await expect(productDialog.getByRole("heading", { name: "Lahori Hot Crispy Wings (6 pcs)" })).toBeVisible();
    await productDialog.getByRole("button", { name: "Add to basket" }).click();
    await expect(page.getByRole("button", { name: "Basket (1)" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: "Basket (1)" })).toBeVisible();

    // Open basket, test Escape key closes modal, then reopen and verify minimum-order gate in basket
    await page.getByRole("button", { name: "Basket (1)" }).click();
    const basketDialog = page.getByRole("dialog", { name: "Basket" });
    await expect(basketDialog).toBeVisible();
    await expect(basketDialog.getByRole("button", { name: "Continue to checkout" })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(basketDialog).toHaveCount(0);

    // Reopen basket, increase quantity to 2 (PKR 960 >= PKR 600 minimum), verify checkout unlocks
    await page.getByRole("button", { name: "Basket (1)" }).click();
    await basketDialog.getByRole("button", { name: "Add to basket" }).click();
    await expect(basketDialog.getByRole("button", { name: "Continue to checkout" })).toBeEnabled();

    expect(runtimeErrors).toEqual([]);
  });
});

test.describe("Phase 2 Role-Aware Admin Control Center, Readiness Checklist & Real Monetization Contract", () => {
  test("verifies Owner Setup Readiness Checklist, Wastage DB-aligned reasons, and real backend MonetizationConfig rendering", async ({ page }) => {
    const runtimeErrors = await attachZeroErrorMonitor(page);

    await page.route("**/api/v1/**", async (route) => {
      const url = new URL(route.request().url());
      const respond = (body, status = 200) =>
        route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

      if (url.pathname === "/api/v1/admin/session") {
        return respond({
          authenticated: true,
          user: { id: "owner-1", email: "owner@fryzar.com", display_name: "Huzaifah Owner", role: "owner" }
        });
      }
      if (url.pathname === "/api/v1/storefront-config") {
        return respond({
          settings: { store_name_en: "FRYZAR", store_name_ur: "فرائیزار", store_status: "setup", launch_ready: false, cod_enabled: true, manual_transfer_enabled: false, currency: "PKR" }
        });
      }
      if (url.pathname === "/api/v1/products") return respond({ products: [] });
      if (url.pathname === "/api/v1/categories") return respond({ categories: [] });
      if (url.pathname === "/api/v1/delivery-zones") return respond({ delivery_zones: [] });
      if (url.pathname === "/api/v1/admin/metrics") {
        return respond({
          metrics: { total_orders: 0, open_orders: 0, delivered_orders: 0, delivered_revenue_paisa: 0, unpaid_cod_count: 0, active_products: 0, low_stock_products: 0, active_categories: 0, active_delivery_zones: 0 }
        });
      }
      if (url.pathname === "/api/v1/admin/overview") {
        return respond({
          overview: {
            total_orders: 0, new_orders: 0, pending_orders: 0, confirmed_orders: 0, preparing_orders: 0, ready_orders: 0,
            out_for_delivery_orders: 0, delivered_orders: 0, cancelled_orders: 0, gross_order_value_paisa: 0,
            delivered_revenue_paisa: 0, pending_payments_paisa: 0, collected_cod_paisa: 0, refund_totals_paisa: 0,
            active_products: 0, out_of_stock_products: 0, low_stock_products: 0, archived_products: 0,
            active_categories: 0, active_delivery_zones: 0, open_support_cases: 0
          },
          low_stock_alerts: { products: [], ingredients: [] },
          recent_activity: [],
          operational_warnings: []
        });
      }
      if (url.pathname === "/api/v1/admin/wastage") return respond({ wastage_records: [] });
      if (url.pathname === "/api/v1/admin/ingredients") return respond({ ingredients: [] });
      if (url.pathname === "/api/v1/admin/products") return respond({ products: [] });
      if (url.pathname === "/api/v1/admin/advertising/overview") {
        // Exact backend normalizeMonetizationConfig payload shape from platform-modules.ts
        return respond({
          environment: "preview",
          config: {
            masterEnabled: false,
            provider: "adsterra",
            productionApproved: false,
            previewEnabled: false,
            siteId: "",
            publisherStatus: "unverified",
            consentRequiredRegions: ["EEA", "UK"],
            frequencyCapPerSession: 4,
            loadTimeoutMs: 4500,
            formats: { banner: false, native: false, nativeBanner: false, socialBar: false, inPagePush: false, popunder: false, interstitial: false, smartlink: false },
            devices: { mobile: true, desktop: true },
            pages: { home: true, categories: true, products: true, productDetail: true, promotions: true, editorial: true },
            safety: { safeAdsOnly: true, soundOffOnly: true, blockAutoRedirects: true, collapseOnEmpty: true, restrictedCategoriesBlocked: true, allowUnknownInventory: false },
            placements: { home_below_hero: false, home_editorial_mid: false, catalogue_grid_after: false, editorial_inline_native: false, editorial_footer_banner: false }
          },
          format_registry: [],
          restricted_pages: ["basket", "checkout", "order-tracking"],
          blocked_categories: ["adult_explicit", "gambling_betting"],
          zones: [
            { id: "z-1", zone_key: "home_below_hero", publisher_zone_id: "", format: "banner", placement_slot: "home_below_hero", script_origin: "", width: 728, height: 90, is_enabled: 0, status_note: "", updated_at: "2026-11-07T00:00:00Z" }
          ],
          performance_reports: [],
          telemetry_summary: [],
          recent_errors: [],
          audit_history: []
        });
      }
      return respond({});
    });

    await page.goto("http://127.0.0.1:5174");
    const readinessCard = page.getByTestId("owner-setup-readiness");
    await expect(readinessCard).toBeVisible();
    await expect(readinessCard.getByText("Blocked by credentials")).toBeVisible();
    await expect(readinessCard.getByText("Blocked by verification")).toBeVisible();

    // Navigate to Wastage and confirm SQLite-aligned 'spilled' & 'other' reasons exist
    await page.getByRole("button", { name: "14. Wastage" }).click();
    await expect(page.locator('select option[value="spilled"]')).toHaveText("Spilled / Spoiled");
    await expect(page.locator('select option[value="other"]')).toHaveText("Other");

    // Navigate to Advertising & Monetization and confirm real API config renders without error
    await page.getByRole("button", { name: "22. Advertising & Monetization" }).click();
    await expect(page.getByText(/SAFELY DISABLED \(DEFAULT\)/)).toBeVisible();
    await expect(page.getByLabel("Placement slot for home_below_hero")).toBeVisible();

    expect(runtimeErrors).toEqual([]);
  });

  test("scopes Rider role navigation to Dispatch & Notifications and displays Rider self-service queue with zero 403s", async ({ page }) => {
    const runtimeErrors = await attachZeroErrorMonitor(page);

    await page.route("**/api/v1/**", async (route) => {
      const url = new URL(route.request().url());
      const respond = (body, status = 200) =>
        route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

      if (url.pathname === "/api/v1/admin/session") {
        return respond({
          authenticated: true,
          user: { id: "rider-1", email: "rider@fryzar.com", display_name: "Bilal Rider", role: "rider" }
        });
      }
      if (url.pathname === "/api/v1/storefront-config") return respond({ settings: { store_name_en: "FRYZAR", currency: "PKR" } });
      if (url.pathname === "/api/v1/products") return respond({ products: [] });
      if (url.pathname === "/api/v1/categories") return respond({ categories: [] });
      if (url.pathname === "/api/v1/delivery-zones") return respond({ delivery_zones: [] });
      if (url.pathname === "/api/v1/rider/assignments") {
        return respond({
          assignments: [
            {
              id: "assign-1",
              order_id: "ord-1",
              order_number: "FZ-RDR-101",
              status: "assigned",
              failure_reason: "",
              notes: "",
              assigned_at: "2026-11-07T07:00:00Z",
              picked_up_at: null,
              delivered_at: null,
              customer_name: "Usman Tariq",
              customer_phone: "03005556677",
              delivery_address: "Street 9, Lalarukh, Wah Cantt",
              total_paisa: 95000,
              payment_method: "cod",
              payment_status: "unpaid"
            }
          ]
        });
      }
      return respond({ error: "unexpected_endpoint_for_rider", path: url.pathname }, 403);
    });

    await page.goto("http://127.0.0.1:5174");
    await expect(page.getByRole("heading", { name: "My Assigned Deliveries" })).toBeVisible();
    await expect(page.getByText("FZ-RDR-101")).toBeVisible();
    await expect(page.locator(".workspace-label")).toHaveText("2 MODULES");
    await expect(page.getByRole("button", { name: "17. Finance & Ledger" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "24. Staff & Roles" })).toHaveCount(0);

    expect(runtimeErrors).toEqual([]);
  });
});
