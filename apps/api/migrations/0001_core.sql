PRAGMA foreign_keys = ON;

CREATE TABLE store_settings (
  setting_key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO store_settings (setting_key, value_json, is_public) VALUES
  ('store_status', '"setup"', 1),
  ('launch_ready', 'false', 1),
  ('currency', '"PKR"', 1),
  ('default_language', '"ur"', 1),
  ('supported_languages', '["ur","en"]', 1),
  ('cod_enabled', 'true', 1),
  ('manual_transfer_enabled', 'false', 1),
  ('delivery_fee_paisa', '0', 1),
  ('minimum_order_paisa', '0', 1),
  ('whatsapp_number', '""', 1),
  ('store_name_en', '"FRYZAR"', 1),
  ('store_name_ur', '"FRYZAR"', 1),
  ('timezone', '"Asia/Karachi"', 1);

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_ur TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ur TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  sku TEXT UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name_ur TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ur TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  price_paisa INTEGER NOT NULL CHECK (price_paisa >= 0),
  compare_at_paisa INTEGER CHECK (compare_at_paisa IS NULL OR compare_at_paisa >= 0),
  image_url TEXT,
  stock_qty INTEGER CHECK (stock_qty IS NULL OR stock_qty >= 0),
  is_available INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1)),
  is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL UNIQUE,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  alt_ur TEXT NOT NULL DEFAULT '',
  alt_en TEXT NOT NULL DEFAULT '',
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE delivery_zones (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_ur TEXT NOT NULL,
  name_en TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'PK',
  region TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  delivery_fee_paisa INTEGER NOT NULL DEFAULT 0 CHECK (delivery_fee_paisa >= 0),
  minimum_order_paisa INTEGER NOT NULL DEFAULT 0 CHECK (minimum_order_paisa >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE staff_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'operator', 'kitchen', 'finance', 'rider', 'support')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  password_changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE staff_sessions (
  id TEXT PRIMARY KEY,
  staff_user_id TEXT NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  tracking_token_hash TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  delivery_address TEXT NOT NULL,
  delivery_area TEXT NOT NULL DEFAULT '',
  delivery_zone_id TEXT REFERENCES delivery_zones(id) ON DELETE SET NULL,
  customer_language TEXT NOT NULL DEFAULT 'ur' CHECK (customer_language IN ('ur', 'en')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cod', 'manual_transfer')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'awaiting_proof', 'pending_review', 'verified', 'rejected', 'collected', 'refunded')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'rejected')),
  subtotal_paisa INTEGER NOT NULL CHECK (subtotal_paisa >= 0),
  delivery_fee_paisa INTEGER NOT NULL DEFAULT 0 CHECK (delivery_fee_paisa >= 0),
  discount_paisa INTEGER NOT NULL DEFAULT 0 CHECK (discount_paisa >= 0),
  total_paisa INTEGER NOT NULL CHECK (total_paisa >= 0),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (payment_method != 'cod' OR payment_status IN ('unpaid', 'collected', 'refunded')),
  CHECK (payment_method != 'manual_transfer' OR payment_status IN ('awaiting_proof', 'pending_review', 'verified', 'rejected', 'refunded'))
);

CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name_ur_snapshot TEXT NOT NULL,
  product_name_en_snapshot TEXT NOT NULL,
  sku_snapshot TEXT,
  unit_price_paisa INTEGER NOT NULL CHECK (unit_price_paisa >= 0),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  line_total_paisa INTEGER NOT NULL CHECK (line_total_paisa >= 0)
);

CREATE TABLE order_status_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('customer', 'staff', 'system')),
  actor_id TEXT,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('cod', 'manual_transfer')),
  status TEXT NOT NULL CHECK (status IN ('unpaid', 'awaiting_proof', 'pending_review', 'verified', 'rejected', 'collected', 'refunded')),
  amount_paisa INTEGER NOT NULL CHECK (amount_paisa >= 0),
  transaction_reference TEXT NOT NULL DEFAULT '',
  reviewer_staff_id TEXT REFERENCES staff_users(id) ON DELETE SET NULL,
  review_note TEXT NOT NULL DEFAULT '',
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payment_proofs (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  private_object_key TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL,
  detected_mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes BETWEEN 1 AND 5242880),
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  delta_qty INTEGER NOT NULL CHECK (delta_qty != 0),
  reason TEXT NOT NULL CHECK (reason IN ('stock_received', 'stock_adjustment', 'order_reserved', 'order_cancelled', 'return_received')),
  reference_type TEXT,
  reference_id TEXT,
  actor_staff_id TEXT REFERENCES staff_users(id) ON DELETE SET NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE idempotency_keys (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  UNIQUE (scope, idempotency_key)
);

CREATE TABLE auth_login_attempts (
  id TEXT PRIMARY KEY,
  identity_hash TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  was_successful INTEGER NOT NULL DEFAULT 0 CHECK (was_successful IN (0, 1))
);

CREATE TABLE api_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  window_started_at TEXT NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count >= 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_staff_id TEXT REFERENCES staff_users(id) ON DELETE SET NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('staff', 'customer')),
  recipient_id TEXT,
  title_ur TEXT NOT NULL,
  title_en TEXT NOT NULL,
  body_ur TEXT NOT NULL,
  body_en TEXT NOT NULL,
  event_type TEXT NOT NULL,
  related_id TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE support_cases (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
  assigned_staff_id TEXT REFERENCES staff_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_category_available ON products(category_id, is_available, is_featured, sort_order);
CREATE INDEX idx_categories_active_sort ON categories(is_active, sort_order);
CREATE INDEX idx_orders_created_status ON orders(created_at, status);
CREATE INDEX idx_orders_phone_created ON orders(customer_phone, created_at);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_events_order_created ON order_status_events(order_id, created_at);
CREATE INDEX idx_payments_order_status ON payments(order_id, status);
CREATE INDEX idx_payment_proofs_payment ON payment_proofs(payment_id);
CREATE INDEX idx_inventory_product_created ON inventory_movements(product_id, created_at);
CREATE INDEX idx_staff_sessions_user_expiry ON staff_sessions(staff_user_id, expires_at, revoked_at);
CREATE INDEX idx_auth_attempts_identity_time ON auth_login_attempts(identity_hash, attempted_at);
CREATE INDEX idx_rate_limits_window ON api_rate_limits(window_started_at);
CREATE INDEX idx_audit_entity_created ON audit_logs(entity_type, entity_id, created_at);
CREATE INDEX idx_support_status_created ON support_cases(status, created_at);
CREATE INDEX idx_notifications_recipient_created ON notifications(recipient_type, recipient_id, created_at);

CREATE TRIGGER prevent_negative_product_stock
BEFORE UPDATE OF stock_qty ON products
WHEN NEW.stock_qty IS NOT NULL AND NEW.stock_qty < 0
BEGIN
  SELECT RAISE(ABORT, 'insufficient_stock');
END;
