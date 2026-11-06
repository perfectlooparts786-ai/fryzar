"use strict";

const assert = require("node:assert/strict");
const { createLocalD1, requestJson } = require("./helpers/local-d1-worker.cjs");

async function main() {
  const bootstrapToken = "hardening-test-bootstrap-token-64chars-long-string-00000002";
  const db = await createLocalD1({ vars: { OWNER_BOOTSTRAP_TOKEN: bootstrapToken } });

  try {
    const baseUrl = await db.startWorker();

    // 1. Owner Bootstrap & Login
    const bootstrapped = await requestJson(baseUrl, "/api/v1/admin/bootstrap-owner", {
      method: "POST",
      headers: { "X-Owner-Bootstrap-Token": bootstrapToken },
      body: {
        email: "hardening-owner@fryzar.test",
        password: "OwnerSecurePassword123!",
        display_name: "Hardening Owner"
      }
    });
    assert.equal(bootstrapped.response.status, 201);
    const ownerCookie = (bootstrapped.response.headers.get("Set-Cookie") || "").match(/__Host-fryzar_admin=([a-f0-9]{64})/)[1];

    // Open store & enable launch ready
    db.execSql("UPDATE store_settings SET value_json='\"open\"' WHERE setting_key='store_status'; UPDATE store_settings SET value_json='true' WHERE setting_key='launch_ready';");

    // Create Category, Product, Delivery Zone
    const catRes = await requestJson(baseUrl, "/api/v1/admin/categories", {
      method: "POST", cookie: ownerSessionHeader(ownerCookie),
      body: { slug: "pizzas", name_en: "Pizzas", name_ur: "پیزا", sort_order: 1 }
    });
    const catId = catRes.body.id;

    const prodRes = await requestJson(baseUrl, "/api/v1/admin/products", {
      method: "POST", cookie: ownerSessionHeader(ownerCookie),
      body: { slug: "tikka-pizza", name_en: "Tikka Pizza", name_ur: "ٹکہ پیزا", price_paisa: 150000, stock_qty: 3, category_id: catId }
    });
    const prodId = prodRes.body.id;

    const zoneRes = await requestJson(baseUrl, "/api/v1/admin/delivery-zones", {
      method: "POST", cookie: ownerSessionHeader(ownerCookie),
      body: { code: "DEFENCE", name_en: "DHA", name_ur: "ڈی ایچ اے", city: "Lahore", delivery_fee_paisa: 15000, minimum_order_paisa: 100000 }
    });
    const zoneId = zoneRes.body.id;

    // Create Operator & Kitchen Staff Accounts
    const operatorStaff = await requestJson(baseUrl, "/api/v1/admin/staff", {
      method: "POST", cookie: ownerSessionHeader(ownerCookie),
      body: { email: "op@fryzar.test", password: "OperatorPassword123!", display_name: "Operator User", role: "operator" }
    });
    const kitchenStaff = await requestJson(baseUrl, "/api/v1/admin/staff", {
      method: "POST", cookie: ownerSessionHeader(ownerCookie),
      body: { email: "kitch@fryzar.test", password: "KitchenPassword123!", display_name: "Kitchen User", role: "kitchen" }
    });

    const kitchenLogin = await requestJson(baseUrl, "/api/v1/admin/login", {
      method: "POST", body: { email: "kitch@fryzar.test", password: "KitchenPassword123!" }
    });
    const kitchenCookie = (kitchenLogin.response.headers.get("Set-Cookie") || "").match(/__Host-fryzar_admin=([a-f0-9]{64})/)[1];

    const opLogin = await requestJson(baseUrl, "/api/v1/admin/login", {
      method: "POST", body: { email: "op@fryzar.test", password: "OperatorPassword123!" }
    });
    const opCookie = (opLogin.response.headers.get("Set-Cookie") || "").match(/__Host-fryzar_admin=([a-f0-9]{64})/)[1];

    // --- A. COUPON HARDENING ---
    // 1. Expired Coupon
    await requestJson(baseUrl, "/api/v1/admin/coupons", {
      method: "POST", cookie: ownerSessionHeader(ownerCookie),
      body: { code: "EXPIRED10", discount_type: "fixed", discount_value: 20000, expires_at: "2020-01-01T00:00:00.000Z", is_active: true }
    });
    const expVal = await requestJson(baseUrl, "/api/v1/coupons/validate", {
      method: "POST", body: { code: "EXPIRED10", subtotal_paisa: 150000 }
    });
    assert.equal(expVal.response.status, 400, "expired coupon rejected");
    assert.equal(expVal.body.valid, false);

    // 2. Inactive Coupon
    await requestJson(baseUrl, "/api/v1/admin/coupons", {
      method: "POST", cookie: ownerSessionHeader(ownerCookie),
      body: { code: "INACTIVE10", discount_type: "fixed", discount_value: 20000, is_active: false }
    });
    const inactVal = await requestJson(baseUrl, "/api/v1/coupons/validate", {
      method: "POST", body: { code: "INACTIVE10", subtotal_paisa: 150000 }
    });
    assert.equal(inactVal.response.status, 400, "inactive coupon rejected");
    assert.equal(inactVal.body.valid, false);

    // 3. Max Discount Cap Coupon
    await requestJson(baseUrl, "/api/v1/admin/coupons", {
      method: "POST", cookie: ownerSessionHeader(ownerCookie),
      body: { code: "CAP50", discount_type: "percent", discount_value: 50, max_discount_paisa: 30000, is_active: true }
    });
    const capVal = await requestJson(baseUrl, "/api/v1/coupons/validate", {
      method: "POST", body: { code: "CAP50", subtotal_paisa: 150000 }
    });
    assert.equal(capVal.response.status, 200);
    assert.equal(capVal.body.discount_paisa, 30000, "discount capped at max_discount_paisa");

    // --- B. INVENTORY & CHECKOUT HARDENING ---
    // Insufficient Stock Check
    const overStockRes = await requestJson(baseUrl, "/api/v1/orders", {
      method: "POST",
      headers: { "Idempotency-Key": "overstock-key-001" },
      body: {
        customer_name: "John", customer_phone: "03001112233", delivery_address: "Street 1",
        delivery_zone_id: zoneId, customer_language: "en", payment_method: "cod",
        items: [{ product_id: prodId, quantity: 10 }] // Stock is only 3
      }
    });
    assert.equal(overStockRes.response.status, 409, "insufficient stock order rejected");
    assert.equal(overStockRes.body.error, "insufficient_stock");

    // Create Valid Order
    const validOrderRes = await requestJson(baseUrl, "/api/v1/orders", {
      method: "POST",
      headers: { "Idempotency-Key": "valid-hardening-order-1" },
      body: {
        customer_name: "Alice", customer_phone: "03002223344", delivery_address: "Street 2",
        delivery_zone_id: zoneId, customer_language: "en", payment_method: "cod",
        items: [{ product_id: prodId, quantity: 1 }]
      }
    });
    assert.equal(validOrderRes.response.status, 201);
    const orderId = validOrderRes.body.order.id;

    // --- C. STATE MACHINE HARDENING ---
    // 1. Direct invalid transition: pending -> delivered (403/409)
    const invalidTrans1 = await requestJson(baseUrl, "/api/v1/admin/orders/" + orderId + "/status", {
      method: "PATCH", cookie: ownerSessionHeader(ownerCookie),
      body: { status: "delivered" }
    });
    assert.equal(invalidTrans1.response.status, 403, "pending -> delivered transition rejected");

    // 2. Kitchen role attempting status transition to out_for_delivery (403)
    await requestJson(baseUrl, "/api/v1/admin/orders/" + orderId + "/status", {
      method: "PATCH", cookie: ownerSessionHeader(ownerCookie),
      body: { status: "confirmed" }
    });
    await requestJson(baseUrl, "/api/v1/admin/orders/" + orderId + "/status", {
      method: "PATCH", cookie: ownerSessionHeader(ownerCookie),
      body: { status: "preparing" }
    });
    await requestJson(baseUrl, "/api/v1/admin/orders/" + orderId + "/status", {
      method: "PATCH", cookie: ownerSessionHeader(ownerCookie),
      body: { status: "ready" }
    });

    const kitchenIllegalTrans = await requestJson(baseUrl, "/api/v1/admin/orders/" + orderId + "/status", {
      method: "PATCH", cookie: ownerSessionHeader(kitchenCookie),
      body: { status: "out_for_delivery" }
    });
    assert.equal(kitchenIllegalTrans.response.status, 403, "kitchen role cannot mark out_for_delivery");

    // Kitchen role attempting order cancellation (403)
    const kitchenCancel = await requestJson(baseUrl, "/api/v1/admin/orders/" + orderId + "/status", {
      method: "PATCH", cookie: ownerSessionHeader(kitchenCookie),
      body: { status: "cancelled" }
    });
    assert.equal(kitchenCancel.response.status, 403, "kitchen role cannot cancel order");

    // --- D. FINANCE HARDENING ---
    // COD collection on non-delivered order
    const earlyCod = await requestJson(baseUrl, "/api/v1/admin/payments/cod-collection", {
      method: "POST", cookie: ownerSessionHeader(ownerCookie),
      headers: { "Idempotency-Key": "early-cod-key-01" },
      body: { order_id: orderId }
    });
    assert.equal(earlyCod.response.status, 409, "COD collection before delivery rejected");

    // --- E. RBAC BOUNDARY HARDENING ---
    // Operator role trying to create a manager account
    const operatorManagerCreate = await requestJson(baseUrl, "/api/v1/admin/staff", {
      method: "POST", cookie: ownerSessionHeader(opCookie),
      body: { email: "unauthorized-mgr@fryzar.test", password: "Password123!", display_name: "Illegal Mgr", role: "manager" }
    });
    assert.equal(operatorManagerCreate.response.status, 403, "operator cannot manage staff");

    process.stdout.write(
      "Hardening and Edge Cases Integration Test passed: Coupon expiration/caps, insufficient stock guards, " +
      "state machine boundary enforcement, kitchen/operator RBAC limits, and early COD collection safety.\n"
    );
  } finally {
    await db.cleanup();
  }
}

function ownerSessionHeader(cookie) {
  return cookie;
}

main().catch((error) => {
  process.stderr.write((error && error.stack) || String(error));
  process.exitCode = 1;
});
