-- FRYZAR Migration 0006: Product Variants, Modifier Groups, Modifier Options & Coupons

CREATE TABLE product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE,
  name_ur TEXT NOT NULL,
  name_en TEXT NOT NULL,
  price_paisa INTEGER NOT NULL CHECK (price_paisa >= 0),
  compare_at_paisa INTEGER CHECK (compare_at_paisa IS NULL OR compare_at_paisa >= 0),
  stock_qty INTEGER CHECK (stock_qty IS NULL OR stock_qty >= 0),
  is_available INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_variants_product_available ON product_variants(product_id, is_available, sort_order);

CREATE TABLE modifier_groups (
  id TEXT PRIMARY KEY,
  name_ur TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ur TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  min_selection INTEGER NOT NULL DEFAULT 0 CHECK (min_selection >= 0),
  max_selection INTEGER NOT NULL DEFAULT 1 CHECK (max_selection >= min_selection),
  is_required INTEGER NOT NULL DEFAULT 0 CHECK (is_required IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE modifier_options (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  name_ur TEXT NOT NULL,
  name_en TEXT NOT NULL,
  price_paisa INTEGER NOT NULL DEFAULT 0 CHECK (price_paisa >= 0),
  is_available INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_modifier_options_group ON modifier_options(group_id, is_available, sort_order);

CREATE TABLE product_modifier_groups (
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, group_id)
);

CREATE TABLE coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed', 'percent')),
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),
  min_order_paisa INTEGER NOT NULL DEFAULT 0 CHECK (min_order_paisa >= 0),
  max_discount_paisa INTEGER CHECK (max_discount_paisa IS NULL OR max_discount_paisa >= 0),
  usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  start_at TEXT,
  expires_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coupons_code_active ON coupons(code, is_active);

CREATE TABLE coupon_redemptions (
  id TEXT PRIMARY KEY,
  coupon_id TEXT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  discount_applied_paisa INTEGER NOT NULL CHECK (discount_applied_paisa >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_redemptions_coupon ON coupon_redemptions(coupon_id);
CREATE INDEX idx_redemptions_phone ON coupon_redemptions(customer_phone, coupon_id);
