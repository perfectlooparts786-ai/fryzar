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
