const { test, expect } = require("@playwright/test");

const emptyStoreResponses = {
  "/api/v1/health": { ok: true, service: "fryzar-api", database: "local-test", schema: "0005" },
  "/api/v1/categories": { categories: [] },
  "/api/v1/products?limit=50": { products: [], limit: 50 },
  "/api/v1/storefront-config": {
    settings: {
      store_status: "setup",
      launch_ready: false,
      currency: "PKR",
      supported_languages: ["ur", "en"],
      cod_enabled: false
    }
  },
  "/api/v1/delivery-zones": { delivery_zones: [], currency: "PKR" }
};

async function mockStorefrontApi(page, overrides = {}) {
  await page.route("**/api/v1/**", async route => {
    const url = new URL(route.request().url());
    const body = Object.prototype.hasOwnProperty.call(overrides, url.pathname)
      ? overrides[url.pathname]
      : emptyStoreResponses[url.pathname + url.search] ?? emptyStoreResponses[url.pathname];
    if (body === undefined) {
      await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not_found" }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

test.describe("FRYZAR customer storefront", () => {
  test("renders the setup state without depending on remote services", async ({ page }) => {
    await mockStorefrontApi(page);
    await page.goto("http://127.0.0.1:5173");

    await expect(page.getByRole("link", { name: "FRYZAR home" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Good things, close to home." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your store is getting ready" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });

  test("switches language and document direction between English and Urdu", async ({ page }) => {
    await mockStorefrontApi(page);
    await page.goto("http://127.0.0.1:5173");

    await page.getByRole("button", { name: "Switch language" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "ur");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: /اچھی چیزیں/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "آپ کا اسٹور تیار ہو رہا ہے" })).toBeVisible();

    await page.getByRole("button", { name: "Switch language" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });
});

test.describe("FRYZAR admin authentication", () => {
  test("shows sign-in and first-owner setup without creating a real session", async ({ page }) => {
    await page.route("**/api/v1/admin/session", route =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "unauthenticated" })
      })
    );
    await page.goto("http://127.0.0.1:5174");

    await expect(page.getByRole("heading", { name: "Sign in to continue" })).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();

    await page.getByRole("button", { name: "First-time setup" }).click();
    await expect(page.getByRole("heading", { name: "Create the first owner" })).toBeVisible();
    await expect(page.getByLabel("One-time bootstrap token")).toBeVisible();
    await expect(page.getByLabel("Owner display name")).toBeVisible();
    await expect(page.getByLabel("Password")).toHaveAttribute("minlength", "12");
  });
});

test.describe("FRYZAR kitchen operations", () => {
  test("kitchen staff can progress a privacy-limited order through preparation", async ({ page }) => {
    let currentStatus = "confirmed";
    const transitions = [];
    const order = {
      id: "order-kitchen-1",
      order_number: "FZ-KIT-0001",
      status: "confirmed",
      payment_method: "cod",
      payment_status: "unpaid",
      customer_name: null,
      customer_phone: null,
      delivery_address: null,
      delivery_area: null,
      subtotal_paisa: 120000,
      delivery_fee_paisa: 5000,
      total_paisa: 125000,
      customer_language: "ur",
      created_at: "2026-11-04T12:05:00.000Z"
    };
    const orderDetails = {
      order: { ...order, notes: null },
      items: [{
        product_name_ur_snapshot: "چکن برگر",
        product_name_en_snapshot: "Chicken burger",
        sku_snapshot: "CHK-001",
        unit_price_paisa: 60000,
        quantity: 2,
        line_total_paisa: 120000
      }],
      history: []
    };

    await page.route("**/api/v1/**", async route => {
      const request = route.request();
      const url = new URL(request.url());
      const respond = (body, status = 200) => route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body)
      });

      if (url.pathname === "/api/v1/admin/session" && request.method() === "GET") {
        return respond({
          authenticated: true,
          user: {
            id: "staff-kitchen-1",
            email: "kitchen@example.test",
            display_name: "Kitchen Test",
            role: "kitchen"
          }
        });
      }

      if (url.pathname === "/api/v1/storefront-config") {
        return respond({ settings: {
          store_status: "open",
          launch_ready: true,
          currency: "PKR",
          supported_languages: ["ur", "en"],
          cod_enabled: true,
          manual_transfer_enabled: false
        } });
      }
      if (url.pathname === "/api/v1/products") return respond({ products: [] });
      if (url.pathname === "/api/v1/categories") return respond({ categories: [] });
      if (url.pathname === "/api/v1/delivery-zones") return respond({ delivery_zones: [] });
      if (url.pathname === "/api/v1/admin/metrics") {
        return respond({ metrics: {
          total_orders: 1,
          open_orders: 1,
          delivered_orders: 0,
          delivered_revenue_paisa: 0,
          unpaid_cod_count: 1,
          active_products: 0,
          low_stock_products: 0,
          active_categories: 0,
          active_delivery_zones: 0
        } });
      }

      if (url.pathname === "/api/v1/admin/orders" && request.method() === "GET") {
        const requestedStatus = url.searchParams.get("status");
        const matches = requestedStatus === currentStatus && ["confirmed", "preparing"].includes(currentStatus);
        const orders = matches ? [{ ...order, status: currentStatus }] : [];
        return respond({
          orders,
          pagination: { limit: 25, offset: 0, returned: orders.length }
        });
      }

      if (url.pathname === "/api/v1/admin/orders/order-kitchen-1" && request.method() === "GET") {
        return respond(orderDetails);
      }

      if (url.pathname === "/api/v1/admin/orders/order-kitchen-1/status" && request.method() === "PATCH") {
        const payload = request.postDataJSON();
        if (!["preparing", "ready"].includes(payload.status)) {
          return respond({ error: "invalid_order_status" }, 400);
        }
        transitions.push(payload.status);
        currentStatus = payload.status;
        return respond({
          updated: true,
          order_id: order.id,
          old_status: payload.status === "preparing" ? "confirmed" : "preparing",
          status: payload.status
        });
      }

      return respond({ error: "not_found" }, 404);
    });

    await page.goto("http://127.0.0.1:5174");
    await page.getByRole("button", { name: "Kitchen" }).click();

    await expect(page.getByRole("heading", { name: "Kitchen queue" })).toBeVisible();
    await expect(page.getByText("FZ-KIT-0001")).toBeVisible();
    await expect(page.getByText("چکن برگر")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start preparing" })).toBeEnabled();
    await expect(page.getByText("+923001234567")).toHaveCount(0);
    await expect(page.getByText("Private Test Customer")).toHaveCount(0);
    await expect(page.getByText("Private Test Address")).toHaveCount(0);

    await page.getByRole("button", { name: "Start preparing" }).click();
    await expect(page.getByRole("button", { name: "Mark ready" })).toBeVisible();

    await page.getByRole("button", { name: "Mark ready" }).click();
    await expect(page.getByText("FZ-KIT-0001")).toHaveCount(0);
    await expect(page.getByText("No orders in this stage.")).toHaveCount(2);
    expect(transitions).toEqual(["preparing", "ready"]);
  });
});
