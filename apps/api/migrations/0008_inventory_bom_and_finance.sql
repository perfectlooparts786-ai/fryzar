-- FRYZAR Migration 0008: Ingredients, Recipes/BOM, Suppliers, Purchase Orders, Wastage, Refunds & Financial Ledger

CREATE TABLE ingredients (
  id TEXT PRIMARY KEY,
  name_ur TEXT NOT NULL,
  name_en TEXT NOT NULL,
  sku TEXT UNIQUE,
  unit TEXT NOT NULL DEFAULT 'gram' CHECK (unit IN ('gram', 'kg', 'ml', 'liter', 'piece', 'pack')),
  stock_qty REAL NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  min_threshold REAL NOT NULL DEFAULT 0 CHECK (min_threshold >= 0),
  reorder_threshold REAL NOT NULL DEFAULT 0 CHECK (reorder_threshold >= 0),
  cost_per_unit_paisa INTEGER NOT NULL DEFAULT 0 CHECK (cost_per_unit_paisa >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ingredients_active_stock ON ingredients(is_active, stock_qty);

CREATE TABLE recipes (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE CASCADE,
  name_en TEXT NOT NULL DEFAULT '',
  name_ur TEXT NOT NULL DEFAULT '',
  instructions TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (product_id, variant_id)
);

CREATE TABLE recipe_ingredients (
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity_required REAL NOT NULL CHECK (quantity_required > 0),
  unit TEXT NOT NULL DEFAULT 'gram',
  PRIMARY KEY (recipe_id, ingredient_id)
);

CREATE TABLE suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_orders (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  order_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'received', 'cancelled')),
  total_cost_paisa INTEGER NOT NULL DEFAULT 0 CHECK (total_cost_paisa >= 0),
  actor_staff_id TEXT REFERENCES staff_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_order_items (
  id TEXT PRIMARY KEY,
  purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity REAL NOT NULL CHECK (quantity > 0),
  unit_cost_paisa INTEGER NOT NULL CHECK (unit_cost_paisa >= 0),
  line_total_paisa INTEGER NOT NULL CHECK (line_total_paisa >= 0)
);

CREATE INDEX idx_po_supplier_status ON purchase_orders(supplier_id, status);

CREATE TABLE wastage_records (
  id TEXT PRIMARY KEY,
  ingredient_id TEXT REFERENCES ingredients(id) ON DELETE SET NULL,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  quantity REAL NOT NULL CHECK (quantity > 0),
  reason TEXT NOT NULL CHECK (reason IN ('damaged', 'expired', 'spilled', 'prep_loss', 'other')),
  cost_paisa INTEGER NOT NULL DEFAULT 0 CHECK (cost_paisa >= 0),
  actor_staff_id TEXT REFERENCES staff_users(id) ON DELETE SET NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refunds (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_id TEXT REFERENCES payments(id) ON DELETE SET NULL,
  amount_paisa INTEGER NOT NULL CHECK (amount_paisa > 0),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected', 'completed')),
  reviewer_staff_id TEXT REFERENCES staff_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE financial_ledger (
  id TEXT PRIMARY KEY,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('order_charge', 'cod_collection', 'manual_payment', 'refund', 'wastage_expense', 'purchase_expense')),
  reference_id TEXT NOT NULL,
  debit_paisa INTEGER NOT NULL DEFAULT 0 CHECK (debit_paisa >= 0),
  credit_paisa INTEGER NOT NULL DEFAULT 0 CHECK (credit_paisa >= 0),
  actor_staff_id TEXT REFERENCES staff_users(id) ON DELETE SET NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ledger_entry_created ON financial_ledger(entry_type, created_at DESC);
