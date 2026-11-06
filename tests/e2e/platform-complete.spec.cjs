const { test, expect } = require("@playwright/test");

const zingerProduct = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "crispy-zinger",
  sku: "ZNG-01",
  category_id: "cat-burgers",
  category_slug: "burgers",
  category_name_en: "Burgers",
  category_name_ur: "برگر",
  name_en: "Crispy Zinger Burger",
  name_ur: "کرسپی زنگر برگر",
  description_en: "Freshly breaded crispy fillet with signature sauce",
  description_ur: "تازہ کرسپی چکن فلٹ اور خاص ساس",
  price_paisa: 55000,
  compare_at_paisa: 65000,
  image_url: null,
  is_available: 1,
  is_featured: 1,
  variants: [
    {
      id: "var-double",
      product_id: "11111111-1111-4111-8111-111111111111",
      name_en: "Double Fillet",
      name_ur: "ڈبل فلٹ",
      price_paisa: 75000,
      compare_at_paisa: null,
      stock_qty: 10,
      is_available: 1,
      sort_order: 1
    }
  ],
  modifier_groups: [
    {
      id: "grp-sauce",
      name_en: "Choose Sauce",
      name_ur: "ساس منتخب کریں",
      description_en: "",
      description_ur: "",
      min_selection: 1,
      max_selection: 1,
      is_required: 1,
      sort_order: 1,
      options: [
        {
          id: "opt-garlic",
          group_id: "grp-sauce",
          name_en: "Garlic Mayo",
          name_ur: "گارلک مایو",
          price_paisa: 5000,
          is_available: 1,
          sort_order: 1
        }
      ]
    }
  ]
};

const editorialGuide = {
  id: "ed-1",
  slug: "crispy-samosa-air-fryer-guide",
  content_type: "guide",
  title_en: "How to Air-Fry Frozen Samosas Perfectly",
  title_ur: "فروزن سموسے ایئر فرائر میں بنانے کا طریقہ",
  summary_en: "Golden crunch in 12 minutes.",
  summary_ur: "صرف 12 منٹ میں خستہ سموسے۔",
  body_en: "Preheat to 190C and brush lightly with oil.\n\nFlip halfway through cooking.",
  body_ur: "ایئر فرائر کو 190 ڈگری پر گرم کریں۔",
  image_url: null,
  prep_time_mins: 5,
  cook_time_mins: 12,
  servings: 4,
  published_at: "2026-11-05T10:00:00.000Z",
  updated_at: "2026-11-05T10:00:00.000Z"
};

async function setupRichStorefrontApi(page, { masterAdsEnabled = false } = {}) {
  const token = "b".repeat(64);
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const respond = (body, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

    if (url.pathname === "/api/v1/health") return respond({ ok: true, service: "fryzar-api" });
    if (url.pathname === "/api/v1/categories") {
      return respond({
        categories: [
          { id: "cat-burgers", slug: "burgers", name_en: "Burgers", name_ur: "برگر", sort_order: 1 }
        ]
      });
    }
    if (url.pathname === "/api/v1/products") {
      return respond({ products: [zingerProduct], limit: 50 });
    }
    if (url.pathname === `/api/v1/products/${zingerProduct.id}` || url.pathname === "/api/v1/products/crispy-zinger") {
      return respond({ product: zingerProduct });
    }
    if (url.pathname === "/api/v1/storefront-config") {
      return respond({
        settings: {
          store_name_en: "FRYZAR",
          store_name_ur: "فرائیزار",
          store_status: "open",
          launch_ready: true,
          currency: "PKR",
          supported_languages: ["ur", "en"],
          cod_enabled: true,
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
            delivery_fee_paisa: 10000,
            minimum_order_paisa: 50000,
            estimated_mins_min: 30,
            estimated_mins_max: 45
          }
        ],
        currency: "PKR"
      });
    }
    if (url.pathname === "/api/v1/promotions") {
      return respond({
        promotions: [
          {
            code: "SAVE100",
            discount_type: "fixed",
            discount_value: 10000,
            min_order_paisa: 50000,
            max_discount_paisa: null,
            expires_at: null
          }
        ]
      });
    }
    if (url.pathname === "/api/v1/editorial") {
      return respond({ posts: [editorialGuide] });
    }
    if (url.pathname === `/api/v1/editorial/${editorialGuide.slug}`) {
      return respond({ post: editorialGuide });
    }
    if (url.pathname === "/api/v1/monetization-config") {
      return respond({
        environment: "preview",
        config: {
          masterEnabled: masterAdsEnabled,
          previewEnabled: masterAdsEnabled,
          productionApproved: false,
          siteId: "",
          publisherStatus: "unverified",
          consentRequiredRegions: ["EEA", "UK"],
          frequencyCapPerSession: 4,
          loadTimeoutMs: 4500,
          formats: {
            banner: true,
            nativeBanner: true,
            socialBar: false,
            inPagePush: false,
            popunder: false,
            interstitial: false,
            smartlink: false
          },
          devices: { mobile: true, desktop: true },
          pages: {
            home: true,
            categories: true,
            products: true,
            productDetail: true,
            promotions: true,
            editorial: true
          },
          safety: {
            safeAdsOnly: true,
            soundOffOnly: true,
            blockAutoRedirects: true,
            collapseOnEmpty: true
          }
        },
        zones: []
      });
    }
    if (url.pathname === "/api/v1/coupons/validate" && req.method() === "POST") {
      const payload = req.postDataJSON();
      if (payload.code === "SAVE100") {
        return respond({ valid: true, discount_paisa: 10000 });
      }
      return respond({ valid: false, discount_paisa: 0 });
    }
    if (url.pathname === "/api/v1/orders" && req.method() === "POST") {
      return respond(
        {
          order: {
            id: "ord-zinger-1",
            order_number: "FZ-ZNG-0009",
            status: "pending",
            payment_method: "cod",
            payment_status: "unpaid",
            currency: "PKR",
            subtotal_paisa: 80000,
            discount_paisa: 10000,
            delivery_fee_paisa: 10000,
            total_paisa: 80000,
            created_at: "2026-11-06T12:00:00.000Z"
          },
          tracking_token: token,
          tracking_url: `/track/${token}`
        },
        201
      );
    }
    if (url.pathname === `/api/v1/orders/track/${token}`) {
      return respond({
        order: {
          order_number: "FZ-ZNG-0009",
          status: "preparing",
          payment_method: "cod",
          payment_status: "unpaid",
          currency: "PKR",
          subtotal_paisa: 80000,
          delivery_fee_paisa: 10000,
          total_paisa: 80000,
          created_at: "2026-11-06T12:00:00.000Z",
          updated_at: "2026-11-06T12:15:00.000Z"
        },
        items: [
          {
            product_name_en: "Crispy Zinger Burger",
            product_name_ur: "کرسپی زنگر برگر",
            quantity: 1,
            unit_price_paisa: 80000,
            line_total_paisa: 80000
          }
        ]
      });
    }
    if (url.pathname === "/api/v1/monetization/events" && req.method() === "POST") {
      return respond({ recorded: true }, 202);
    }
    return respond({ error: "not_found" }, 404);
  });
}

test.describe("FRYZAR 17-page storefront, SEO, ad safety, and mobile RTL ordering", () => {
  test("renders editorial, policy, promotions, and enforces zero ads on restricted pages", async ({ page }) => {
    await setupRichStorefrontApi(page, { masterAdsEnabled: true });

    await page.goto("http://127.0.0.1:5173/guides");
    await expect(page.getByText("How to Air-Fry Frozen Samosas Perfectly")).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/guides$/);
    await expect(page.locator('link[rel="alternate"][hreflang="ur"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);

    await page.locator('a[href="/guides/crispy-samosa-air-fryer-guide"]').click();
    await expect(page).toHaveURL(/\/guides\/crispy-samosa-air-fryer-guide$/);
    await expect(page.getByText("Preheat to 190C and brush lightly with oil.")).toBeVisible();

    const restrictedRoutes = [
      "/basket",
      "/checkout",
      "/order-confirmation",
      "/track",
      "/support",
      "/privacy-policy",
      "/terms",
      "/refund-policy",
      "/delivery-policy"
    ];

    for (const path of restrictedRoutes) {
      await page.goto("http://127.0.0.1:5173" + path);
      await expect(page.locator("[data-ad-slot]")).toHaveCount(0);
    }
  });

  test("completes mobile viewport variant + required modifier + coupon + guest checkout + Urdu RTL switch", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await setupRichStorefrontApi(page, { masterAdsEnabled: false });

    await page.goto("http://127.0.0.1:5173");
    await expect(page.getByRole("heading", { name: "Crispy Zinger Burger" })).toBeVisible();

    const card = page.locator(".product-card").filter({ has: page.getByRole("heading", { name: "Crispy Zinger Burger" }) });
    await card.getByRole("button", { name: "Add to basket" }).click();

    const dialog = page.getByRole("dialog", { name: "Product details" });
    const addBtn = dialog.getByRole("button", { name: /Add to basket/ });
    await expect(addBtn).toBeDisabled();

    await dialog.getByText("Garlic Mayo").click();
    await expect(addBtn).toBeEnabled();
    await addBtn.click();

    await page.getByRole("button", { name: "Basket (1)" }).click();
    const basket = page.getByRole("dialog", { name: "Basket" });
    await basket.getByRole("button", { name: "Continue to checkout" }).click();

    const checkout = page.getByRole("dialog", { name: "Delivery details" });
    await checkout.getByPlaceholder("Enter coupon code").fill("SAVE100");
    await checkout.getByRole("button", { name: "Apply" }).click();
    await expect(checkout.getByText("Coupon Discount (SAVE100)")).toBeVisible();

    await checkout.getByLabel("Full name").fill("Amina Khan");
    await checkout.getByLabel("Mobile number").fill("+923009876543");
    await checkout.getByLabel("Delivery address").fill("House 14, Street 3, Wah Cantt");
    await checkout.getByRole("button", { name: "Place COD order" }).click();

    await expect(page.getByRole("heading", { name: "Order received" })).toBeVisible();
    await expect(page.getByText("FZ-ZNG-0009")).toBeVisible();

    await page.goto("http://127.0.0.1:5173/track/" + "b".repeat(64));
    await expect(page.getByText("FZ-ZNG-0009")).toBeVisible();
    await expect(page.locator(".tracking-current-status")).toHaveText("Preparing");

    await page.getByRole("button", { name: "Switch language" }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });
});

test.describe("FRYZAR 27-module Owner Control Center & Adsterra Emergency Kill Switch", () => {
  test("exposes all 27 owner modules with zero placeholders and executes Adsterra kill switch", async ({ page }) => {
    let masterAds = true;
    let killSwitchCalled = false;

    await page.route("**/api/v1/**", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const respond = (body, status = 200) =>
        route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

      if (url.pathname === "/api/v1/admin/session") {
        return respond({
          authenticated: true,
          user: { id: "owner-1", email: "owner@fryzar.com", display_name: "Owner Admin", role: "owner" }
        });
      }
      if (url.pathname === "/api/v1/storefront-config") {
        return respond({ settings: { store_name_en: "FRYZAR", store_status: "setup", launch_ready: false, currency: "PKR" } });
      }
      if (url.pathname === "/api/v1/products") return respond({ products: [] });
      if (url.pathname === "/api/v1/categories") return respond({ categories: [] });
      if (url.pathname === "/api/v1/delivery-zones") return respond({ delivery_zones: [] });
      if (url.pathname === "/api/v1/admin/metrics") {
        return respond({
          metrics: {
            total_orders: 0, open_orders: 0, delivered_orders: 0, delivered_revenue_paisa: 0,
            unpaid_cod_count: 0, active_products: 4, low_stock_products: 0, active_categories: 3, active_delivery_zones: 1
          }
        });
      }
      if (url.pathname === "/api/v1/admin/overview") {
        return respond({
          overview: {
            total_orders: 0, new_orders: 0, pending_orders: 0, confirmed_orders: 0, preparing_orders: 0,
            ready_orders: 0, out_for_delivery_orders: 0, delivered_orders: 0, cancelled_orders: 0,
            gross_order_value_paisa: 0, delivered_revenue_paisa: 0, pending_payments_paisa: 0,
            collected_cod_paisa: 0, refund_totals_paisa: 0, active_products: 4, out_of_stock_products: 0,
            low_stock_products: 0, archived_products: 0, active_categories: 3, active_delivery_zones: 1,
            open_support_cases: 0
          },
          low_stock_alerts: { products: [], ingredients: [] },
          recent_activity: [],
          operational_warnings: []
        });
      }
      if (url.pathname === "/api/v1/admin/advertising/overview") {
        return respond({
          environment: "preview",
          config: {
            masterEnabled: masterAds,
            previewEnabled: masterAds,
            productionApproved: false,
            siteId: "",
            publisherStatus: "unverified",
            consentRequiredRegions: ["EEA", "UK"],
            frequencyCapPerSession: 4,
            loadTimeoutMs: 4500,
            formats: { banner: true, nativeBanner: true, socialBar: false, inPagePush: false, popunder: false, interstitial: false, smartlink: false },
            devices: { mobile: true, desktop: true },
            pages: { home: true, categories: true, products: true, productDetail: true, promotions: true, editorial: true },
            safety: { safeAdsOnly: true, soundOffOnly: true, blockAutoRedirects: true, collapseOnEmpty: true }
          },
          format_registry: [],
          restricted_pages: ["basket", "checkout", "payment", "order-confirmation", "order-tracking", "privacy-policy"],
          blocked_categories: ["adult", "gambling", "malware"],
          zones: [
            {
              id: "zone-home-1",
              zone_key: "home_below_fold_banner",
              publisher_zone_id: "",
              format: "banner",
              placement_slot: "home_below_fold",
              script_origin: "",
              width: 728,
              height: 90,
              is_enabled: 0,
              status_note: "Awaiting real publisher zone ID",
              updated_at: "2026-11-06T00:00:00.000Z"
            }
          ],
          performance_reports: [],
          telemetry_summary: [],
          recent_errors: [],
          audit_history: []
        });
      }
      if (url.pathname === "/api/v1/admin/advertising/kill-switch" && req.method() === "POST") {
        masterAds = false;
        killSwitchCalled = true;
        return respond({ disabled: true, config: { masterEnabled: false } });
      }
      if (url.pathname === "/api/v1/admin/system-health") {
        return respond({
          health: {
            ok: true,
            service: "fryzar-api",
            environment: "preview",
            schema_target: "0009_platform_completion.sql",
            migrations_applied: 9,
            migrations: [{ name: "0009_platform_completion.sql", applied_at: "2026-11-06T00:00:00.000Z" }],
            secrets_configured: { tracking_secret: true, owner_bootstrap_token: false },
            free_tier_limits: { plan: "Cloudflare Workers Free", worker_daily_requests_limit: 100000, worker_cpu_ms_limit: 10, d1_storage_limit_mb: 500 },
            operational_counters: { table_count: 30, active_staff_sessions: 1 }
          },
          event_breakdown: [],
          recent_events: []
        });
      }
      return respond({});
    });

    await page.goto("http://127.0.0.1:5174");
    const navButtons = page.locator("nav.side-nav button");
    await expect(navButtons).toHaveCount(27);
    await expect(page.locator(".feature-placeholder")).toHaveCount(0);

    await page.getByRole("button", { name: "22. Advertising & Monetization" }).click();
    await expect(page.getByRole("heading", { name: "Advertising & Monetization Control Center" })).toBeVisible();
    await expect(page.getByText("Master Adsterra Status: ENABLED")).toBeVisible();

    await page.getByRole("button", { name: "Emergency Disable All Ads" }).click();
    await expect(page.getByRole("status")).toContainText("EMERGENCY KILL SWITCH ACTIVATED");
    await expect(page.getByText("Master Adsterra Status: SAFELY DISABLED (DEFAULT)")).toBeVisible();
    expect(killSwitchCalled).toBe(true);

    await page.getByRole("button", { name: "27. System Health" }).click();
    await expect(page.getByRole("heading", { name: "System Health & Diagnostics" })).toBeVisible();
    await expect(page.getByText("0009_platform_completion.sql")).toHaveCount(2);
  });
});
