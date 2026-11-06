-- Auditable stock adjustment ledger. This table stores before/after quantities
-- so every manual stock change can be reconciled against inventory_movements.
CREATE TABLE inventory_adjustments (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  actor_staff_id TEXT REFERENCES staff_users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN ('stock_received', 'stock_adjustment', 'return_received')),
  delta_qty INTEGER NOT NULL CHECK (delta_qty != 0),
  previous_stock_qty INTEGER NOT NULL CHECK (previous_stock_qty >= 0),
  new_stock_qty INTEGER NOT NULL CHECK (new_stock_qty >= 0),
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (new_stock_qty = previous_stock_qty + delta_qty)
);

CREATE INDEX idx_inventory_adjustments_product_created
ON inventory_adjustments(product_id, created_at DESC);

CREATE UNIQUE INDEX idx_inventory_adjustment_movement_once
ON inventory_movements(reference_type, reference_id)
WHERE reference_type = 'inventory_adjustment';
