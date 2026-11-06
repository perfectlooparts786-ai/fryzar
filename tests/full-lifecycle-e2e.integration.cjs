"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { createLocalD1, requestJson } = require("./helpers/local-d1-worker.cjs");

async function main() {
  const bootstrapToken = "local-e2e-owner-bootstrap-token-64chars-long-test-string-0000001";
  const db = await createLocalD1({ vars: { OWNER_BOOTSTRAP_TOKEN: bootstrapToken } });

  try {
    const baseUrl = await db.startWorker();

    // 1. Owner Bootstrap & Login
    const bootstrapped = await requestJson(baseUrl, "/api/v1/admin/bootstrap-owner", {
      method: "POST",
      headers: { "X-Owner-Bootstrap-Token": bootstrapToken },
      body: {
        email: "owner@fryzar.test",
        password: "OwnerSecurePassword123!",
        display_name: "Store Owner"
      }
    });
    assert.equal(bootstrapped.response.status, 201, "owner bootstrap creates first owner");
    const cookie = (bootstrapped.response.headers.get("Set-Cookie") || "").match(/__Host-fryzar_admin=([a-f0-9]{64})/);
    assert.ok(cookie, "bootstrap issues session cookie");
    const ownerSession = cookie[1];

    // 2. Enable Launch Readiness & Open Store in DB
    db.execSql("UPDATE store_settings SET value_json='\"open\"' WHERE setting_key='store_status'; UPDATE store_settings SET value_json='true' WHERE setting_key='launch_ready';");

    // Update editable settings via API
    const settingsRes = await requestJson(baseUrl, "/api/v1/admin/settings", {
      method: "PATCH",
      cookie: ownerSession,
      body: {
        store_name_en: "FRYZAR Central Store",
        store_name_ur: "فرائزار مرکزی اسٹور",
        cod_enabled: true
      }
    });
    assert.equal(settingsRes.response.status, 200, "editable settings updated");

    // 3. Create Category
    const categoryRes = await requestJson(baseUrl, "/api/v1/admin/categories", {
      method: "POST",
      cookie: ownerSession,
      body: {
        slug: "burgers",
        name_en: "Gourmet Burgers",
        name_ur: "برگرز",
        description_en: "Juicy beef and chicken burgers",
        description_ur: "مزیدار برگرز",
        sort_order: 1,
        is_active: true
      }
    });
    assert.equal(categoryRes.response.status, 201, "category created");
    const categoryId = categoryRes.body.id;

    // 4. Create Product with Stock 10
    const productRes = await requestJson(baseUrl, "/api/v1/admin/products", {
      method: "POST",
      cookie: ownerSession,
      body: {
        slug: "smash-burger",
        name_en: "Smash Burger",
        name_ur: "سمیش برگر",
        description_en: "Double beef patty smash burger",
        description_ur: "ڈبل بیف پیٹی",
        price_paisa: 100000, // PKR 1,000
        compare_at_paisa: 120000,
        stock_qty: 10,
        sku: "SMB-001",
        category_id: categoryId,
        is_available: true,
        is_featured: true,
        sort_order: 1
      }
    });
    assert.equal(productRes.response.status, 201, "product created");
    const productId = productRes.body.id;

    // 5. Create Product Variant
    const variantRes = await requestJson(baseUrl, "/api/v1/admin/products/" + productId + "/variants", {
      method: "POST",
      cookie: ownerSession,
      body: {
        sku: "SMB-001-LARGE",
        name_en: "Large Smash",
        name_ur: "بڑا سمیش",
        price_paisa: 120000, // PKR 1,200
        compare_at_paisa: 140000,
        stock_qty: 10,
        is_available: true,
        sort_order: 1
      }
    });
    assert.equal(variantRes.response.status, 201, "variant created");
    const variantId = variantRes.body.id;

    // 6. Create Modifier Group & Options
    const groupRes = await requestJson(baseUrl, "/api/v1/admin/modifier-groups", {
      method: "POST",
      cookie: ownerSession,
      body: {
        name_en: "Extra Toppings",
        name_ur: "اضافی چیزیں",
        description_en: "Customize your burger",
        description_ur: "اپنی پسند کا بنائیں",
        min_selection: 0,
        max_selection: 2,
        is_required: false,
        sort_order: 1
      }
    });
    assert.equal(groupRes.response.status, 201, "modifier group created");
    const groupId = groupRes.body.id;

    const optRes = await requestJson(baseUrl, "/api/v1/admin/modifier-groups/" + groupId + "/options", {
      method: "POST",
      cookie: ownerSession,
      body: {
        name_en: "Extra Cheese",
        name_ur: "اضافی چیز",
        price_paisa: 10000, // PKR 100
        is_available: true,
        sort_order: 1
      }
    });
    assert.equal(optRes.response.status, 201, "modifier option created");
    const optionId = optRes.body.id;

    // Link modifier group to product
    const linkRes = await requestJson(baseUrl, "/api/v1/admin/products/" + productId + "/modifier-groups", {
      method: "POST",
      cookie: ownerSession,
      body: { group_id: groupId, sort_order: 1 }
    });
    assert.equal(linkRes.response.status, 201, "modifier group linked to product");

    // 7. Create Delivery Zone
    const zoneRes = await requestJson(baseUrl, "/api/v1/admin/delivery-zones", {
      method: "POST",
      cookie: ownerSession,
      body: {
        code: "GULBERG",
        name_en: "Gulberg III",
        name_ur: "گلبرگ 3",
        city: "Lahore",
        region: "Punjab",
        delivery_fee_paisa: 10000, // PKR 100
        minimum_order_paisa: 50000 // PKR 500
      }
    });
    assert.equal(zoneRes.response.status, 201, "delivery zone created");
    const zoneId = zoneRes.body.id;

    // 8. Create Coupon (50% Off)
    const couponRes = await requestJson(baseUrl, "/api/v1/admin/coupons", {
      method: "POST",
      cookie: ownerSession,
      body: {
        code: "WELCOME50",
        discount_type: "percent",
        discount_value: 50, // 50%
        min_order_paisa: 50000,
        max_discount_paisa: 200000,
        usage_limit: 100,
        is_active: true
      }
    });
    assert.equal(couponRes.response.status, 201, "coupon created");

    // 9. Customer Validates Coupon Publicly
    // Unit price = 120,000 (variant) + 10,000 (cheese) = 130,000 paisa. Subtotal for 2 items = 260,000 paisa.
    const valCoupon = await requestJson(baseUrl, "/api/v1/coupons/validate", {
      method: "POST",
      body: { code: "WELCOME50", subtotal_paisa: 260000 }
    });
    assert.equal(valCoupon.response.status, 200, "coupon is valid");
    assert.equal(valCoupon.body.discount_paisa, 130000, "50% of 260,000 is 130,000 paisa");

    // 10. Customer Places Customized COD Order
    const checkoutKey = "e2e-checkout-idem-0001";
    const checkoutRes = await requestJson(baseUrl, "/api/v1/orders", {
      method: "POST",
      headers: { "Idempotency-Key": checkoutKey },
      body: {
        customer_name: "Customer Full Name",
        customer_phone: "03009876543",
        delivery_address: "Street 5, Gulberg III, Lahore",
        delivery_zone_id: zoneId,
        customer_language: "ur",
        payment_method: "cod",
        coupon_code: "WELCOME50",
        notes: "Please call upon arrival",
        items: [
          {
            product_id: productId,
            variant_id: variantId,
            selected_modifier_option_ids: [optionId],
            quantity: 2
          }
        ]
      }
    });
    if (checkoutRes.response.status !== 201) {
      console.error("Checkout status:", checkoutRes.response.status, "body:", checkoutRes.body);
    }
    assert.equal(checkoutRes.response.status, 201, "order created successfully");
    const orderId = checkoutRes.body.order.id;
    const trackingToken = checkoutRes.body.tracking_token;

    // Verify Server-Authoritative Totals
    // Subtotal: 260,000. Discount: 130,000. Delivery Fee: 10,000. Grand Total: 140,000.
    assert.equal(checkoutRes.body.order.subtotal_paisa, 260000);
    assert.equal(checkoutRes.body.order.total_paisa, 140000);

    // 11. Customer Tracks Order
    const trackRes = await requestJson(baseUrl, "/api/v1/orders/track/" + trackingToken);
    assert.equal(trackRes.response.status, 200, "order tracked");
    assert.equal(trackRes.body.order.status, "pending");
    assert.equal(trackRes.body.items.length, 1);
    assert.ok(trackRes.body.items[0].product_name_en_snapshot.includes("Large Smash"));
    assert.ok(trackRes.body.items[0].product_name_en_snapshot.includes("Extra Cheese"));

    // 12. Admin Confirms Order
    const confirmRes = await requestJson(baseUrl, "/api/v1/admin/orders/" + orderId + "/status", {
      method: "PATCH",
      cookie: ownerSession,
      body: { status: "confirmed" }
    });
    if (confirmRes.response.status !== 200) {
      console.error("confirmRes status:", confirmRes.response.status, "body:", confirmRes.body);
    }
    assert.equal(confirmRes.response.status, 200, "order confirmed by admin");

    // 13. Kitchen Starts Preparing & Marks Ready
    const prepRes = await requestJson(baseUrl, "/api/v1/admin/orders/" + orderId + "/status", {
      method: "PATCH",
      cookie: ownerSession,
      body: { status: "preparing" }
    });
    assert.equal(prepRes.response.status, 200, "kitchen starts preparing");

    const readyRes = await requestJson(baseUrl, "/api/v1/admin/orders/" + orderId + "/status", {
      method: "PATCH",
      cookie: ownerSession,
      body: { status: "ready" }
    });
    assert.equal(readyRes.response.status, 200, "kitchen marks order ready");

    // 14. Dispatch & Rider Assignment
    // Create staff user for rider
    const staffRes = await requestJson(baseUrl, "/api/v1/admin/staff", {
      method: "POST",
      cookie: ownerSession,
      body: {
        email: "rider1@fryzar.test",
        password: "RiderSecurePassword123!",
        display_name: "Ali Rider",
        role: "operator"
      }
    });
    assert.equal(staffRes.response.status, 201, "rider staff account created");
    const riderStaffId = staffRes.body.id;

    const riderRes = await requestJson(baseUrl, "/api/v1/admin/riders", {
      method: "POST",
      cookie: ownerSession,
      body: {
        staff_user_id: riderStaffId,
        vehicle_type: "bike",
        vehicle_number: "LEA-9999"
      }
    });
    assert.equal(riderRes.response.status, 201, "rider profile created");
    const riderId = riderRes.body.id;

    // Assign Rider (automatically sets order status to 'out_for_delivery')
    const assignRes = await requestJson(baseUrl, "/api/v1/admin/orders/" + orderId + "/assign-rider", {
      method: "POST",
      cookie: ownerSession,
      body: {
        rider_id: riderId,
        notes: "Handle with care"
      }
    });
    assert.equal(assignRes.response.status, 201, "rider assigned to order");
    assert.equal(assignRes.body.order_status, "out_for_delivery");

    // Progress Delivery: out_for_delivery -> delivered
    const deliverRes = await requestJson(baseUrl, "/api/v1/admin/orders/" + orderId + "/status", {
      method: "PATCH",
      cookie: ownerSession,
      body: { status: "delivered" }
    });
    if (deliverRes.response.status !== 200) console.error("deliverRes status:", deliverRes.response.status, "body:", deliverRes.body);
    assert.equal(deliverRes.response.status, 200, "order marked delivered");

    // 15. Finance Collects COD Payment
    const collectRes = await requestJson(baseUrl, "/api/v1/admin/payments/cod-collection", {
      method: "POST",
      cookie: ownerSession,
      headers: { "Idempotency-Key": "cod-collection-e2e-0001" },
      body: { order_id: orderId }
    });
    assert.equal(collectRes.response.status, 201, "COD payment collected");
    assert.equal(collectRes.body.amount_paisa, 140000);

    // Verify Financial Ledger Entry
    const ledgerRes = await requestJson(baseUrl, "/api/v1/admin/finance/ledger", {
      cookie: ownerSession
    });
    if (ledgerRes.response.status !== 200) {
      console.error("ledgerRes status:", ledgerRes.response.status, "body:", ledgerRes.body);
    }
    assert.equal(ledgerRes.response.status, 200);
    assert.ok(ledgerRes.body.ledger.length >= 1, "ledger entries recorded");

    // 16. Support Ticket & Messaging Flow
    const ticketRes = await requestJson(baseUrl, "/api/v1/support/tickets", {
      method: "POST",
      body: {
        customer_name: "Customer Full Name",
        customer_phone: "03009876543",
        subject: "Delivery Delay Inquiry",
        message: "When will my food arrive?",
        order_id: orderId
      }
    });
    assert.equal(ticketRes.response.status, 201, "support ticket created");
    const caseId = ticketRes.body.case_id;

    const replyRes = await requestJson(baseUrl, "/api/v1/admin/support/tickets/" + caseId + "/messages", {
      method: "POST",
      cookie: ownerSession,
      body: {
        message: "Your order has been delivered! Enjoy your meal.",
        status: "resolved"
      }
    });
    assert.equal(replyRes.response.status, 201, "staff reply added to support ticket");

    // 17. Verify Audit Logs
    const auditRes = await requestJson(baseUrl, "/api/v1/admin/audit-logs", {
      cookie: ownerSession
    });
    assert.equal(auditRes.response.status, 200, "audit logs retrieved");
    assert.ok(auditRes.body.audit_logs.length >= 5, "audit logs generated across operational steps");

    process.stdout.write(
      "Full Operational End-to-End E2E Integration Test passed: Owner bootstrap, catalogue setup, variants, " +
      "modifier groups, coupons validation, guest COD checkout with server-authoritative pricing, order tracking, " +
      "kitchen preparation, rider dispatch, delivery completion, COD collection, financial ledger, support threading, " +
      "and audit logging.\n"
    );
  } finally {
    await db.cleanup();
  }
}

main().catch((error) => {
  process.stderr.write((error && error.stack) || String(error));
  process.exitCode = 1;
});
