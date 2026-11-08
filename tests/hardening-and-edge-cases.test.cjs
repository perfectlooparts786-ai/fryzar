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

    // --- E. RBAC BOUNDARY HARDENING ACROSS ALL 7 ROLES ---
    // Operator role trying to create a manager account
    const operatorManagerCreate = await requestJson(baseUrl, "/api/v1/admin/staff", {
      method: "POST", cookie: ownerSessionHeader(opCookie),
      body: { email: "unauthorized-mgr@fryzar.test", password: "Password123!", display_name: "Illegal Mgr", role: "manager" }
    });
    assert.equal(operatorManagerCreate.response.status, 403, "operator cannot manage staff");

    // Create Manager, Finance, Rider, and Support staff accounts
    const loginRole = async (email, password, displayName, role) => {
      const created = await requestJson(baseUrl, "/api/v1/admin/staff", {
        method: "POST", cookie: ownerSessionHeader(ownerCookie),
        body: { email, password, display_name: displayName, role }
      });
      assert.equal(created.response.status, 201, `create ${role}`);
      const loggedIn = await requestJson(baseUrl, "/api/v1/admin/login", {
        method: "POST", body: { email, password }
      });
      assert.equal(loggedIn.response.status, 200, `login ${role}`);
      return {
        id: created.body.id,
        cookie: (loggedIn.response.headers.get("Set-Cookie") || "").match(/__Host-fryzar_admin=([a-f0-9]{64})/)[1]
      };
    };

    const manager = await loginRole("mgr@fryzar.test", "ManagerPassword123!", "Manager User", "manager");
    const finance = await loginRole("fin@fryzar.test", "FinancePassword123!", "Finance User", "finance");
    const rider = await loginRole("rider@fryzar.test", "RiderPassword123!", "Rider User", "rider");
    const support = await loginRole("sup@fryzar.test", "SupportPassword123!", "Support User", "support");

    // Manager denied Owner-only endpoints (SEO write, Adsterra write, Store Launch Gate)
    assert.equal((await requestJson(baseUrl, "/api/v1/admin/seo", {
      method: "PATCH", cookie: manager.cookie, body: { canonical_domain: "https://fryzar.com" }
    })).response.status, 403, "manager denied PATCH /admin/seo");
    assert.equal((await requestJson(baseUrl, "/api/v1/admin/advertising/settings", {
      method: "PATCH", cookie: manager.cookie, body: { masterEnabled: false }
    })).response.status, 403, "manager denied PATCH /admin/advertising/settings");
    assert.equal((await requestJson(baseUrl, "/api/v1/admin/store/launch-gate", {
      method: "POST", cookie: manager.cookie, body: { action: "pause" }
    })).response.status, 403, "manager denied POST /admin/store/launch-gate");

    // Finance allowed PII-free payments/refunds/coupons-read, denied raw orders & coupon writes
    assert.equal((await requestJson(baseUrl, "/api/v1/admin/orders", { cookie: finance.cookie })).response.status, 403, "finance denied /admin/orders");
    assert.equal((await requestJson(baseUrl, "/api/v1/admin/payments/all", { cookie: finance.cookie })).response.status, 200, "finance allowed /admin/payments/all");
    assert.equal((await requestJson(baseUrl, "/api/v1/admin/refunds", { cookie: finance.cookie })).response.status, 200, "finance allowed /admin/refunds");
    assert.equal((await requestJson(baseUrl, "/api/v1/admin/coupons", { cookie: finance.cookie })).response.status, 200, "finance allowed GET /admin/coupons");
    assert.equal((await requestJson(baseUrl, "/api/v1/admin/coupons", {
      method: "POST", cookie: finance.cookie, body: { code: "FIN10", discount_type: "percent", discount_value: 10 }
    })).response.status, 403, "finance denied POST /admin/coupons");

    // Rider allowed own assignments, denied overview/orders/finance
    assert.equal((await requestJson(baseUrl, "/api/v1/rider/assignments", { cookie: rider.cookie })).response.status, 200, "rider allowed /rider/assignments");
    assert.equal((await requestJson(baseUrl, "/api/v1/admin/overview", { cookie: rider.cookie })).response.status, 403, "rider denied /admin/overview");
    assert.equal((await requestJson(baseUrl, "/api/v1/admin/orders", { cookie: rider.cookie })).response.status, 403, "rider denied /admin/orders");

    // Support allowed support tickets & overview, denied orders/finance/settings
    const publicTicket = await requestJson(baseUrl, "/api/v1/support/tickets", {
      method: "POST",
      body: { customer_name: "Sara Khan", customer_phone: "03009998877", subject: "Late order question", message: "Checking delivery ETA please" }
    });
    assert.equal(publicTicket.response.status, 201);
    const supportList = await requestJson(baseUrl, "/api/v1/admin/support/tickets", { cookie: support.cookie });
    assert.equal(supportList.response.status, 200, "support allowed GET /admin/support/tickets");
    const supportReply = await requestJson(baseUrl, `/api/v1/admin/support/tickets/${publicTicket.body.case_id}/messages`, {
      method: "POST", cookie: support.cookie, body: { message: "Rider is 5 minutes away!", status: "in_progress" }
    });
    assert.equal(supportReply.response.status, 201, "support allowed reply on ticket");
    assert.equal((await requestJson(baseUrl, "/api/v1/admin/orders", { cookie: support.cookie })).response.status, 403, "support denied /admin/orders");
    assert.equal((await requestJson(baseUrl, "/api/v1/admin/finance/ledger", { cookie: support.cookie })).response.status, 403, "support denied /admin/finance/ledger");
    assert.equal((await requestJson(baseUrl, "/api/v1/admin/settings", { cookie: support.cookie })).response.status, 403, "support denied /admin/settings");

    // Missing support ticket returns 404 (not 500 FK error)
    const missingTicketReply = await requestJson(baseUrl, "/api/v1/admin/support/tickets/00000000-0000-4000-8000-000000000099/messages", {
      method: "POST", cookie: support.cookie, body: { message: "Hello" }
    });
    assert.equal(missingTicketReply.response.status, 404);
    assert.equal(missingTicketReply.body.error, "ticket_not_found");

    // Role-scoped notifications check
    const supportNotifs = await requestJson(baseUrl, "/api/v1/admin/notifications", { cookie: support.cookie });
    assert.equal(supportNotifs.response.status, 200);
    assert.ok(supportNotifs.body.notifications.every((n) => n.event_type === "support_ticket_created" || n.event_type === "support_reply"));
    const kitchenNotifs = await requestJson(baseUrl, "/api/v1/admin/notifications", { cookie: kitchenCookie });
    assert.equal(kitchenNotifs.response.status, 200);
    assert.ok(kitchenNotifs.body.notifications.every((n) => n.event_type === "order_created" || n.event_type === "order_delivered"));

    // --- F. VALIDATION, SUPPLIER UPDATE, DUPLICATE RIDER & ROBOTS HEADER HARDENING ---
    // Coupon >100% rejected & duplicate code returns 409
    const over100Coupon = await requestJson(baseUrl, "/api/v1/admin/coupons", {
      method: "POST", cookie: ownerCookie, body: { code: "OVER100", discount_type: "percent", discount_value: 150 }
    });
    assert.equal(over100Coupon.response.status, 400, "percent > 100 rejected");

    const dupCoupon = await requestJson(baseUrl, "/api/v1/admin/coupons", {
      method: "POST", cookie: ownerCookie, body: { code: "CAP50", discount_type: "percent", discount_value: 20 }
    });
    assert.equal(dupCoupon.response.status, 409, "duplicate coupon code returns 409");
    assert.equal(dupCoupon.body.error, "coupon_code_conflict");

    // Supplier create + PUT update + 404 on unknown supplier
    const supCreate = await requestJson(baseUrl, "/api/v1/admin/suppliers", {
      method: "POST", cookie: ownerCookie, body: { name: "Lahore Fresh Farms", contact_name: "Bilal", phone: "03005556677" }
    });
    assert.equal(supCreate.response.status, 201);
    const supUpdate = await requestJson(baseUrl, `/api/v1/admin/suppliers/${supCreate.body.id}`, {
      method: "PUT", cookie: ownerCookie, body: { name: "Lahore Prime Farms", contact_name: "Bilal Ahmed", phone: "03005556677", is_active: true }
    });
    assert.equal(supUpdate.response.status, 200);
    assert.equal(supUpdate.body.saved, true);
    const supMissing = await requestJson(baseUrl, "/api/v1/admin/suppliers/00000000-0000-4000-8000-000000000099", {
      method: "PUT", cookie: ownerCookie, body: { name: "Ghost Supplier" }
    });
    assert.equal(supMissing.response.status, 404);

    // Duplicate rider profile returns 409 (not 500)
    const riderCreate1 = await requestJson(baseUrl, "/api/v1/admin/riders", {
      method: "POST", cookie: ownerCookie, body: { staff_user_id: rider.id, vehicle_type: "bike", vehicle_number: "LEB-1001" }
    });
    assert.equal(riderCreate1.response.status, 201);
    const riderCreateDup = await requestJson(baseUrl, "/api/v1/admin/riders", {
      method: "POST", cookie: ownerCookie, body: { staff_user_id: rider.id, vehicle_type: "bike", vehicle_number: "LEB-1002" }
    });
    assert.equal(riderCreateDup.response.status, 409);
    assert.equal(riderCreateDup.body.error, "rider_already_exists");

    // X-Robots-Tag present on /api/* and absent on /sitemap.xml and /robots.txt
    const healthRes = await fetch(baseUrl + "/api/v1/health");
    assert.match(healthRes.headers.get("X-Robots-Tag") || "", /noindex/);
    const sitemapRes = await fetch(baseUrl + "/sitemap.xml");
    assert.equal(sitemapRes.status, 200);
    assert.equal(sitemapRes.headers.get("X-Robots-Tag"), null, "sitemap.xml must not carry X-Robots-Tag noindex");
    const robotsRes = await fetch(baseUrl + "/robots.txt");
    assert.equal(robotsRes.status, 200);
    assert.equal(robotsRes.headers.get("X-Robots-Tag"), null, "robots.txt must not carry X-Robots-Tag noindex");

    process.stdout.write(
      "Hardening and Edge Cases Integration Test passed: 7-role RBAC matrix, coupon caps/>100%/duplicate guards, " +
      "supplier PUT CRUD, rider duplicate guard, support 404 guard, scoped notifications, and X-Robots-Tag scoping.\n"
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
