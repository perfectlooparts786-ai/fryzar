CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_one_per_order
ON payments(order_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_order_movement_once
ON inventory_movements(reference_type, reference_id, reason, product_id)
WHERE reference_type = 'order'
  AND reason IN ('order_reserved', 'order_cancelled');

CREATE TRIGGER IF NOT EXISTS validate_order_item_product
BEFORE INSERT ON order_items
WHEN NEW.product_id IS NOT NULL
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM products WHERE id = NEW.product_id)
    THEN RAISE(ABORT, 'product_missing')
  END;

  SELECT CASE
    WHEN (SELECT is_available FROM products WHERE id = NEW.product_id) != 1
    THEN RAISE(ABORT, 'product_unavailable')
  END;

  SELECT CASE
    WHEN (SELECT stock_qty FROM products WHERE id = NEW.product_id) IS NOT NULL
      AND (SELECT stock_qty FROM products WHERE id = NEW.product_id) < NEW.quantity
    THEN RAISE(ABORT, 'insufficient_stock')
  END;
END;
