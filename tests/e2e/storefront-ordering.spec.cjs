const { test, expect } = require("@playwright/test");

const categoryFixtures = [
  {
    id: "category-produce",
    slug: "produce",
    name_en: "Produce",
    name_ur: "تازہ سبزیاں",
    description_en: "Fresh produce",
    description_ur: "تازہ",
    sort_order: 1
  },
  {
    id: "category-bakery",
    slug: "bakery",
    name_en: "Bakery",
    name_ur: "بیکری",
    description_en: "Bakery items",
    description_ur: "بیکری کی اشیا",
    sort_order: 2
  }
];

const productFixtures = [
  {
    id: "product-apple",
    slug: "apples",
    sku: "APL-001",
    category_id: "category-produce",
    category_slug: "produce",
    category_name_en: "Produce",
    category_name_ur: "تازہ سبزیاں",
    name_en: "Fresh apples",
    name_ur: "تازہ سیب",
    description_en: "Crisp locally selected apples",
    description_ur: "تازہ اور عمدہ سیب",
    price_paisa: 45000,
    compare_at_paisa: null,
    image_url: null,
    is_available: 1,
    is_featured: 1
  },
  {
    id: "product-bread",
    slug: "bread",
    sku: "BRD-001",
    category_id: "category-bakery",
    category_slug: "bakery",
    category_name_en: "Bakery",
    category_name_ur: "بیکری",
    name_en: "Whole wheat bread",
    name_ur: "گندم کی ڈبل روٹی",
    description_en: "Fresh whole wheat loaf",
    description_ur: "تازہ گندم کی ڈبل روٹی",
    price_paisa: 30000,
    compare_at_paisa: null,
    image_url: null,
    is_available: 1,
    is_featured: 0
  }
];

const zoneFixture = {
  id: "zone-test",
  code: "TEST",
  name_en: "Test Area",
  name_ur: "ٹیسٹ علاقہ",
  city: "Test City",
  region: "Test Region",
  delivery_fee_paisa: 10000,
  minimum_order_paisa: 0
};

test("customer can discover products, manage the basket and complete a mocked guest COD checkout", async ({ page }) => {
  let capturedOrder = null;
  await page.route("**/api/v1/**", async route => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "POST" && url.pathname === "/api/v1/orders") {
      capturedOrder = request.postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          order: {
            id: "order-synthetic",
            order_number: "FZ-TEST-0001",
            status: "pending",
            payment_method: "cod",
            payment_status: "unpaid",
            currency: "PKR",
            subtotal_paisa: 45000,
            delivery_fee_paisa: 10000,
            total_paisa: 55000,
            created_at: "2026-11-03T12:00:00.000Z"
          },
          tracking_token: "a".repeat(64),
          tracking_url: "/track/" + "a".repeat(64)
        })
      });
      return;
    }

    const responses = {
      "/api/v1/health": { ok: true, service: "fryzar-api", database: "local-test", schema: "0005" },
      "/api/v1/categories": { categories: categoryFixtures },
      "/api/v1/products?limit=50": { products: productFixtures, limit: 50 },
      "/api/v1/storefront-config": {
        settings: {
          store_status: "open",
          launch_ready: true,
          currency: "PKR",
          supported_languages: ["ur", "en"],
          cod_enabled: true
        }
      },
      "/api/v1/delivery-zones": { delivery_zones: [zoneFixture], currency: "PKR" }
    };
    const body = responses[url.pathname + url.search] ?? responses[url.pathname];
    await route.fulfill({
      status: body ? 200 : 404,
      contentType: "application/json",
      body: JSON.stringify(body ?? { error: "not_found" })
    });
  });

  await page.goto("http://127.0.0.1:5173");
  await expect(page.getByRole("heading", { name: "Fresh apples" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Whole wheat bread" })).toBeVisible();

  await page.getByRole("button", { name: "Produce" }).click();
  await expect(page.getByRole("heading", { name: "Fresh apples" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Whole wheat bread" })).toHaveCount(0);

  await page.getByRole("button", { name: "All products" }).click();
  await page.getByRole("searchbox", { name: "Search" }).fill("bread");
  await expect(page.getByRole("heading", { name: "Whole wheat bread" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fresh apples" })).toHaveCount(0);
  await page.getByRole("searchbox", { name: "Search" }).fill("");

  const appleCard = page.locator(".product-card").filter({ has: page.getByRole("heading", { name: "Fresh apples" }) });
  await appleCard.getByRole("button", { name: "Add to basket" }).click();
  await page.getByRole("button", { name: "Basket (1)" }).click();

  const basket = page.getByRole("dialog", { name: "Basket" });
  await expect(basket.getByText("Fresh apples")).toBeVisible();
  await expect(basket.getByRole("button", { name: "Continue to checkout" })).toBeEnabled();
  await basket.getByRole("button", { name: "Continue to checkout" }).click();

  const checkout = page.getByRole("dialog", { name: "Delivery details" });
  await checkout.getByLabel("Full name").fill("Synthetic Customer");
  await checkout.getByLabel("Mobile number").fill("+923001234567");
  await checkout.getByLabel("Delivery address").fill("123 Test Street, Test City");
  await checkout.getByLabel("Delivery area").selectOption("zone-test");
  await checkout.getByRole("button", { name: "Place COD order" }).click();

  await expect(page.getByRole("heading", { name: "Order received" })).toBeVisible();
  await expect(page.getByText("FZ-TEST-0001")).toBeVisible();
  expect(capturedOrder).toMatchObject({
    customer_name: "Synthetic Customer",
    customer_phone: "+923001234567",
    delivery_zone_id: "zone-test",
    payment_method: "cod",
    items: [{ product_id: "product-apple", quantity: 1 }]
  });
});
