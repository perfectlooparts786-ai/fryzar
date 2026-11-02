UPDATE store_settings SET value_json='"open"' WHERE setting_key='store_status';
UPDATE store_settings SET value_json='true' WHERE setting_key='launch_ready';

INSERT INTO delivery_zones (id,code,name_ur,name_en,country_code,region,city,delivery_fee_paisa,minimum_order_paisa,is_active)
VALUES ('55555555-5555-4555-8555-555555555555','CANCEL-CI','ٹیسٹ','Cancellation Test','PK','Test','Test City',25000,10000,1);

INSERT INTO products (id,sku,slug,name_ur,name_en,price_paisa,stock_qty,is_available) VALUES
('44444444-4444-4444-8444-444444444444','CANCEL-A','cancel-test-a','مصنوع الف','Cancellation Product A',15000,5,1),
('33333333-3333-4333-8333-333333333333','CANCEL-B','cancel-test-b','مصنوع ب','Cancellation Product B',17000,3,1);
