-- FRYZAR Migration 0007: Delivery Rider Profiles, Assignments, Support Threading

CREATE TABLE riders (
  id TEXT PRIMARY KEY,
  staff_user_id TEXT NOT NULL UNIQUE REFERENCES staff_users(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL DEFAULT 'bike' CHECK (vehicle_type IN ('bike', 'scooter', 'car', 'van', 'bicycle', 'foot')),
  vehicle_number TEXT NOT NULL DEFAULT '',
  current_status TEXT NOT NULL DEFAULT 'available' CHECK (current_status IN ('available', 'busy', 'offline')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_riders_status ON riders(is_active, current_status);

CREATE TABLE delivery_assignments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rider_id TEXT NOT NULL REFERENCES riders(id) ON DELETE RESTRICT,
  assigned_by_staff_id TEXT REFERENCES staff_users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'picked_up', 'delivered', 'failed')),
  failure_reason TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  picked_up_at TEXT,
  delivered_at TEXT,
  failed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_delivery_assignments_order ON delivery_assignments(order_id);
CREATE INDEX idx_delivery_assignments_rider_status ON delivery_assignments(rider_id, status);

CREATE TABLE support_messages (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES support_cases(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'staff')),
  sender_staff_id TEXT REFERENCES staff_users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_support_messages_case ON support_messages(case_id, created_at ASC);
