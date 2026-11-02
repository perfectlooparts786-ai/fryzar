-- Synthetic local-only financial integrity fixtures; staff session comes from local bootstrap.
INSERT INTO products (id,sku,slug,name_ur,name_en,price_paisa,stock_qty,is_available) VALUES
('44444444-4444-4444-8444-444444444444','FIN-A','financial-product-a','مصنوع الف','Financial Product A',12500,2,1),
('33333333-3333-4333-8333-333333333333','FIN-B','financial-product-b','مصنوع ب','Financial Product B',4500,5,1);

INSERT INTO orders (id,order_number,tracking_token_hash,customer_name,customer_phone,delivery_address,delivery_area,customer_language,payment_method,payment_status,status,subtotal_paisa,delivery_fee_paisa,discount_paisa,total_paisa) VALUES
('11111111-1111-4111-8111-111111111111','FRZ-FIN-001','1111111111111111111111111111111111111111111111111111111111111111','Synthetic Finance Customer','03000000001','Synthetic Finance Street','Local','en','cod','unpaid','delivered',38500,3000,2500,39000),
('22222222-2222-4222-8222-222222222222','FRZ-FIN-002','2222222222222222222222222222222222222222222222222222222222222222','Synthetic Failure Customer','03000000002','Synthetic Failure Street','Local','en','cod','unpaid','delivered',12500,1000,500,13000),
('33333333-3333-4333-8333-333333333333','FRZ-FIN-003','3333333333333333333333333333333333333333333333333333333333333333','Synthetic Cancelled Customer','03000000003','Synthetic Cancelled Street','Local','en','cod','unpaid','cancelled',4500,1000,0,5500),
('44444444-4444-4444-8444-444444444444','FRZ-FIN-004','4444444444444444444444444444444444444444444444444444444444444444','Synthetic Preparing Customer','03000000004','Synthetic Preparing Street','Local','en','cod','unpaid','preparing',12500,0,0,12500),
('55555555-5555-4555-8555-555555555555','FRZ-FIN-005','5555555555555555555555555555555555555555555555555555555555555555','Synthetic Transfer Customer','03000000005','Synthetic Transfer Street','Local','en','manual_transfer','verified','delivered',10000,0,0,10000),
('66666666-6666-4666-8666-666666666666','FRZ-FIN-006','6666666666666666666666666666666666666666666666666666666666666666','Synthetic Mismatch Customer','03000000006','Synthetic Mismatch Street','Local','en','cod','unpaid','delivered',20000,0,0,20000);

INSERT INTO order_items (id,order_id,product_id,product_name_ur_snapshot,product_name_en_snapshot,sku_snapshot,unit_price_paisa,quantity,line_total_paisa) VALUES
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444','مصنوع الف','Financial Product A','FIN-A',12500,2,25000),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','مصنوع ب','Financial Product B','FIN-B',4500,3,13500),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','22222222-2222-4222-8222-222222222222','44444444-4444-4444-8444-444444444444','مصنوع الف','Financial Product A','FIN-A',12500,1,12500),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4','33333333-3333-4333-8333-333333333333','33333333-3333-4333-8333-333333333333','مصنوع ب','Financial Product B','FIN-B',4500,1,4500),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5','44444444-4444-4444-8444-444444444444','44444444-4444-4444-8444-444444444444','مصنوع الف','Financial Product A','FIN-A',12500,1,12500),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6','55555555-5555-4555-8555-555555555555',NULL,'تحويل','Transfer item','TRANS',10000,1,10000),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7','66666666-6666-4666-8666-666666666666','44444444-4444-4444-8444-444444444444','مصنوع الف','Financial Product A','FIN-A',10000,2,20000);

INSERT INTO payments (id,order_id,method,status,amount_paisa) VALUES
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','11111111-1111-4111-8111-111111111111','cod','unpaid',39000),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','22222222-2222-4222-8222-222222222222','cod','unpaid',13000),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3','33333333-3333-4333-8333-333333333333','cod','unpaid',5500),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4','44444444-4444-4444-8444-444444444444','cod','unpaid',12500),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5','55555555-5555-4555-8555-555555555555','manual_transfer','verified',10000),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6','66666666-6666-4666-8666-666666666666','cod','unpaid',19999);

INSERT INTO order_status_events (id,order_id,old_status,new_status,actor_type,note) VALUES
('cccccccc-cccc-4ccc-8ccc-ccccccccccc1','11111111-1111-4111-8111-111111111111','out_for_delivery','delivered','staff','Synthetic delivery'),
('cccccccc-cccc-4ccc-8ccc-ccccccccccc2','22222222-2222-4222-8222-222222222222','out_for_delivery','delivered','staff','Synthetic delivery'),
('cccccccc-cccc-4ccc-8ccc-ccccccccccc3','33333333-3333-4333-8333-333333333333','pending','cancelled','staff','Synthetic cancellation'),
('cccccccc-cccc-4ccc-8ccc-ccccccccccc4','44444444-4444-4444-8444-444444444444','confirmed','preparing','staff','Synthetic preparation');

INSERT INTO inventory_movements (id,product_id,delta_qty,reason,reference_type,reference_id,note) VALUES
('dddddddd-dddd-4ddd-8ddd-ddddddddddd1','44444444-4444-4444-8444-444444444444',-2,'order_reserved','order','11111111-1111-4111-8111-111111111111','Synthetic reservation'),
('dddddddd-dddd-4ddd-8ddd-ddddddddddd2','33333333-3333-4333-8333-333333333333',-3,'order_reserved','order','11111111-1111-4111-8111-111111111111','Synthetic reservation'),
('dddddddd-dddd-4ddd-8ddd-ddddddddddd3','44444444-4444-4444-8444-444444444444',-1,'order_reserved','order','22222222-2222-4222-8222-222222222222','Synthetic reservation'),
('dddddddd-dddd-4ddd-8ddd-ddddddddddd4','33333333-3333-4333-8333-333333333333',-1,'order_reserved','order','33333333-3333-4333-8333-333333333333','Synthetic reservation'),
('dddddddd-dddd-4ddd-8ddd-ddddddddddd5','33333333-3333-4333-8333-333333333333',1,'order_cancelled','order','33333333-3333-4333-8333-333333333333','Synthetic cancellation'),
('dddddddd-dddd-4ddd-8ddd-ddddddddddd6','44444444-4444-4444-8444-444444444444',-1,'order_reserved','order','44444444-4444-4444-8444-444444444444','Synthetic reservation'),
('dddddddd-dddd-4ddd-8ddd-ddddddddddd7','44444444-4444-4444-8444-444444444444',-2,'order_reserved','order','66666666-6666-4666-8666-666666666666','Synthetic reservation');

CREATE TRIGGER fail_cod_collection_audit
BEFORE INSERT ON audit_logs
WHEN NEW.action='payment.cod_collected' AND NEW.entity_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
BEGIN
  SELECT RAISE(ABORT, 'synthetic payment audit failure');
END;
