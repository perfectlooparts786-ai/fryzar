-- FRYZAR Migration 0009: Platform Completion — Archive/Category Media, Variant Order Tracking,
-- Delivery Windows, Recipe BOM Consumption, Editorial/Food Guides CMS, Safe Adsterra Monetization & Observability

ALTER TABLE categories ADD COLUMN image_url TEXT;

ALTER TABLE products ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1));

ALTER TABLE order_items ADD COLUMN variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL;

ALTER TABLE delivery_zones ADD COLUMN estimated_mins_min INTEGER NOT NULL DEFAULT 30 CHECK (estimated_mins_min >= 0);
ALTER TABLE delivery_zones ADD COLUMN estimated_mins_max INTEGER NOT NULL DEFAULT 50 CHECK (estimated_mins_max >= 0);

ALTER TABLE support_messages ADD COLUMN is_internal INTEGER NOT NULL DEFAULT 0 CHECK (is_internal IN (0, 1));

CREATE TABLE recipe_consumptions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity_consumed REAL NOT NULL CHECK (quantity_consumed > 0),
  cost_paisa INTEGER NOT NULL DEFAULT 0 CHECK (cost_paisa >= 0),
  actor_staff_id TEXT REFERENCES staff_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (order_id, ingredient_id)
);

CREATE INDEX idx_recipe_consumptions_order ON recipe_consumptions(order_id);

CREATE TABLE editorial_posts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL DEFAULT 'guide' CHECK (content_type IN ('article', 'recipe', 'guide', 'announcement', 'policy')),
  title_en TEXT NOT NULL,
  title_ur TEXT NOT NULL,
  summary_en TEXT NOT NULL DEFAULT '',
  summary_ur TEXT NOT NULL DEFAULT '',
  body_en TEXT NOT NULL,
  body_ur TEXT NOT NULL,
  image_url TEXT,
  image_alt_en TEXT NOT NULL DEFAULT '',
  image_alt_ur TEXT NOT NULL DEFAULT '',
  meta_title_en TEXT NOT NULL DEFAULT '',
  meta_title_ur TEXT NOT NULL DEFAULT '',
  meta_description_en TEXT NOT NULL DEFAULT '',
  meta_description_ur TEXT NOT NULL DEFAULT '',
  prep_time_mins INTEGER CHECK (prep_time_mins IS NULL OR prep_time_mins >= 0),
  cook_time_mins INTEGER CHECK (cook_time_mins IS NULL OR cook_time_mins >= 0),
  servings INTEGER CHECK (servings IS NULL OR servings > 0),
  is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
  published_at TEXT,
  author_staff_id TEXT REFERENCES staff_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_editorial_published_slug ON editorial_posts(is_published, content_type, slug);

CREATE TABLE monetization_settings (
  config_key TEXT PRIMARY KEY,
  config_json TEXT NOT NULL,
  updated_by_staff_id TEXT REFERENCES staff_users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO monetization_settings (config_key, config_json) VALUES (
  'adsterra_config',
  '{"masterEnabled":false,"provider":"adsterra","productionApproved":false,"previewEnabled":false,"siteId":"","publisherStatus":"unverified","formats":{"banner":false,"native":false,"socialBar":false,"inPagePush":false,"popunder":false,"interstitial":false,"smartlink":false},"safety":{"safeAdsOnly":true,"restrictedCategoriesBlocked":true,"allowUnknownInventory":false},"placements":{"home_below_hero":false,"home_editorial_mid":false,"catalogue_grid_after":false,"editorial_inline_native":false,"editorial_footer_banner":false}}'
);

CREATE TABLE ad_zones (
  id TEXT PRIMARY KEY,
  zone_key TEXT NOT NULL UNIQUE,
  publisher_zone_id TEXT NOT NULL DEFAULT '',
  format TEXT NOT NULL CHECK (format IN ('banner', 'native', 'social_bar', 'in_page_push', 'popunder', 'interstitial', 'smartlink')),
  placement_slot TEXT NOT NULL,
  script_origin TEXT NOT NULL DEFAULT '',
  width INTEGER,
  height INTEGER,
  is_enabled INTEGER NOT NULL DEFAULT 0 CHECK (is_enabled IN (0, 1)),
  status_note TEXT NOT NULL DEFAULT 'Disabled until verified Adsterra publisher zone ID and site approval are configured.',
  updated_by_staff_id TEXT REFERENCES staff_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ad_zones_slot_enabled ON ad_zones(placement_slot, is_enabled);

INSERT OR IGNORE INTO ad_zones (id, zone_key, publisher_zone_id, format, placement_slot, width, height, is_enabled, status_note) VALUES
  ('10000000-0000-4000-8000-000000000001', 'ADSTERRA_BANNER_ZONE_ID', '', 'banner', 'home_below_hero', 728, 90, 0, 'Eligible format — disabled until real Adsterra zone ID is configured'),
  ('10000000-0000-4000-8000-000000000002', 'ADSTERRA_CATALOGUE_BANNER_ZONE_ID', '', 'banner', 'catalogue_grid_after', 300, 250, 0, 'Eligible format — disabled until real Adsterra zone ID is configured'),
  ('10000000-0000-4000-8000-000000000003', 'ADSTERRA_NATIVE_ZONE_ID', '', 'native', 'editorial_inline_native', NULL, NULL, 0, 'Eligible native format for food guides — disabled until real Adsterra zone ID is configured'),
  ('10000000-0000-4000-8000-000000000004', 'ADSTERRA_SOCIAL_BAR_ZONE_ID', '', 'social_bar', 'editorial_footer_banner', NULL, NULL, 0, 'Restricted evaluation format — off by default'),
  ('10000000-0000-4000-8000-000000000005', 'ADSTERRA_INPAGE_PUSH_ZONE_ID', '', 'in_page_push', 'home_editorial_mid', NULL, NULL, 0, 'Restricted evaluation format — off by default');

CREATE TABLE ad_performance_reports (
  id TEXT PRIMARY KEY,
  report_date TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('network_reported', 'local_estimate')),
  format TEXT NOT NULL DEFAULT 'banner',
  country_code TEXT NOT NULL DEFAULT 'ALL',
  device_type TEXT NOT NULL DEFAULT 'all' CHECK (device_type IN ('all', 'mobile', 'desktop', 'tablet')),
  impressions INTEGER NOT NULL DEFAULT 0 CHECK (impressions >= 0),
  clicks INTEGER NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  fill_rate_bps INTEGER CHECK (fill_rate_bps IS NULL OR (fill_rate_bps >= 0 AND fill_rate_bps <= 10000)),
  ecpm_micros_usd INTEGER NOT NULL DEFAULT 0 CHECK (ecpm_micros_usd >= 0),
  revenue_micros_usd INTEGER NOT NULL DEFAULT 0 CHECK (revenue_micros_usd >= 0),
  payout_status TEXT NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('estimated', 'pending', 'finalized', 'paid')),
  recorded_by_staff_id TEXT REFERENCES staff_users(id) ON DELETE SET NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ad_reports_date_source ON ad_performance_reports(report_date DESC, source_type);

CREATE TABLE ad_events (
  id TEXT PRIMARY KEY,
  slot_id TEXT NOT NULL,
  format TEXT NOT NULL,
  page_type TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('slot_rendered', 'script_loaded', 'load_error', 'blocked_restricted', 'blocked_safety', 'timeout')),
  load_ms INTEGER CHECK (load_ms IS NULL OR load_ms >= 0),
  error_code TEXT NOT NULL DEFAULT '',
  device_category TEXT NOT NULL DEFAULT 'unknown' CHECK (device_category IN ('mobile', 'desktop', 'tablet', 'unknown')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ad_events_created_type ON ad_events(created_at DESC, event_type);

CREATE TABLE system_events (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('api_error', 'app_error', 'checkout_failure', 'db_failure', 'auth_failure', 'deployment', 'queue_failure', 'ad_error')),
  severity TEXT NOT NULL DEFAULT 'warn' CHECK (severity IN ('info', 'warn', 'error', 'critical')),
  code TEXT NOT NULL,
  path TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_events_created_cat ON system_events(created_at DESC, category);

INSERT OR IGNORE INTO store_settings (setting_key, value_json, is_public) VALUES
  ('store_email', '""', 1),
  ('store_address_en', '"Verified Local Delivery Areas, Pakistan"', 1),
  ('store_address_ur', '"تصدیق شدہ مقامی ڈیلیوری علاقے، پاکستان"', 1),
  ('operating_hours_en', '"Daily 12:00 PM – 11:30 PM PKT"', 1),
  ('operating_hours_ur', '"روزانہ دوپہر 12:00 تا رات 11:30 بجے"', 1),
  ('tax_rate_bps', '0', 1),
  ('seo_title_en', '"FRYZAR — Fresh Burgers, Crispy Fries & Local Food Delivery in Pakistan"', 1),
  ('seo_title_ur', '"فرائزَر — تازہ برگر، کرسپی فرائز اور تیز مقامی فوڈ ڈیلیوری"', 1),
  ('seo_description_en', '"Order freshly prepared burgers, grilled wraps, golden fries and chilled drinks in PKR across verified Pakistani delivery zones, or explore original bilingual culinary guides."', 1),
  ('seo_description_ur', '"تصدیق شدہ پاکستانی ڈیلیوری علاقوں میں تازہ برگر، گرلڈ ریپ، گولڈن فرائز اور مشروبات آرڈر کریں اور مستند فوڈ گائیڈز پڑھیں۔"', 1),
  ('canonical_domain', '"https://fryzar.com"', 1),
  ('robots_index_storefront', 'true', 1);

INSERT OR IGNORE INTO editorial_posts (
  id, slug, content_type, title_en, title_ur, summary_en, summary_ur, body_en, body_ur,
  image_alt_en, image_alt_ur, meta_title_en, meta_title_ur, meta_description_en, meta_description_ur,
  prep_time_mins, cook_time_mins, servings, is_published, published_at
) VALUES
(
  '20000000-0000-4000-8000-000000000001',
  'double-fry-golden-potato-fries-guide',
  'guide',
  'The Double-Fry Method: How Crispy Golden Fries Keep Their Crunch During Delivery',
  'ڈبل فرائی طریقہ: ڈیلیوری کے دوران گولڈن فرائز کرسپی کیسے رہتے ہیں',
  'Why starch rinsing, two-stage frying temperatures, and vented kraft packaging make all the difference for crisp French fries.',
  'آلو کا نشاستہ دھونے، دو مرحلوں میں تلنے اور ہوادار پیکنگ سے فرائز دیر تک خستہ کیسے رہتے ہیں۔',
  'Great French fries fail most often between the kitchen pass and the front door. At FRYZAR, crispness begins with selecting high-solids potatoes with lower moisture content.\n\n### 1. Cold-Water Starch Rinse\nCut batons evenly at 9–10 mm so every piece cooks at the same rate. Rinsing in cold water removes excess surface glucose and free starch that would otherwise burn before the interior cooks.\n\n### 2. Two-Stage Temperature Control\nA gentle blanch at 160°C cooks the potato interior until fluffy while forming a microscopic starch gel on the exterior. After a brief rest that lets steam escape, a second flash fry at 190°C crisps that outer shell into a light, golden crust.\n\n### 3. Vented Delivery Packaging\nSealed plastic traps steam and softens fries within four minutes. Using breathable food-grade paper and vented Kraft cartons lets moisture escape while preserving core warmth during local delivery.',
  'بہترین فرائز اکثر کچن سے دروازے تک پہنچتے ہوئے نرم پڑ جاتے ہیں۔ فرائزَر میں خستہ فرائز کا آغاز کم نمی والے معیاری آلوؤں کے انتخاب سے ہوتا ہے۔\n\n### 1. ٹھنڈے پانی سے نشاستہ صاف کرنا\nآلو کے ٹکڑے یکساں سائز (9 تا 10 ملی میٹر) میں کاٹے جاتے ہیں تاکہ ہر ٹکڑا برابر پکے۔ ٹھنڈے پانی سے دھونے سے اضافی سطحی نشاستہ نکل جاتا ہے۔\n\n### 2. دو مرحلوں میں درجہ حرارت کا توازن\nپہلے مرحلے میں 160 ڈگری سینٹی گریڈ پر آلو اندر سے نرم ہوتا ہے، پھر تھوڑے وقفے کے بعد 190 ڈگری پر دوسری بار تلنے سے بیرونی تہہ سنہری اور خستہ ہو جاتی ہے۔\n\n### 3. ہوادار فوڈ گریڈ پیکنگ\nبند پلاسٹک بھاپ روک کر فرائز کو نرم کر دیتا ہے، اس لیے ہوادار کرافٹ پیکنگ استعمال کی جاتی ہے تاکہ تازگی برقرار رہے۔',
  'Golden crispy potato fries in breathable kraft paper',
  'ہوادار کرافٹ پیپر میں سنہری خستہ فرائز',
  'Double-Fry Crispy Golden Fries Guide | FRYZAR Food Guides',
  'ڈبل فرائی کرسپی گولڈن فرائز گائیڈ | فرائزَر فوڈ گائیڈز',
  'Learn the food science behind double-fried golden potato fries, temperature stages, and vented packaging for delivery crunch.',
  'ڈبل فرائی گولڈن فرائز کے درجہ حرارت اور ہوادار پیکنگ کے اصول جانیں۔',
  15, 12, 4, 1, '2026-11-05T10:00:00.000Z'
),
(
  '20000000-0000-4000-8000-000000000002',
  'homestyle-roasted-garlic-herb-dip-recipe',
  'recipe',
  'Homestyle Roasted Garlic & Fresh Herb Dip Recipe for Burgers and Wraps',
  'برگر اور ریپ کے لیے گھر پر روسٹڈ گارلک اور ہرب ڈپ بنانے کی ترکیب',
  'A balanced, creamy roasted garlic sauce using slow-caramelized garlic cloves, lemon juice, black pepper, and fresh coriander.',
  'ہلکی آنچ پر بھنے لہسن، لیموں کے رس، کالی مرچ اور تازہ دھنیے سے تیار کردہ مزیدار سوس کی آسان ترکیب۔',
  'Raw garlic can overpower a grilled chicken wrap or beef burger, whereas slow-roasted garlic turns mellow, nutty, and naturally sweet.\n\n### Ingredients\n- 1 whole bulb of fresh garlic\n- 1 tbsp olive or neutral cooking oil\n- 120 g thick yogurt (strained) or classic mayonnaise\n- 1 tsp fresh lemon juice\n- 1/2 tsp freshly cracked black pepper\n- 1 tbsp finely chopped fresh coriander and chives\n- Pinch of sea salt\n\n### Preparation Steps\n1. Slice the top tip off the garlic bulb, drizzle with oil, wrap tightly in foil, and roast at 190°C for 30–35 minutes until golden and soft.\n2. Squeeze the cooled garlic cloves into a bowl and mash into a smooth paste.\n3. Whisk in strained yogurt (or mayonnaise), lemon juice, black pepper, and herbs.\n4. Chill for 20 minutes before serving alongside crispy fries or grilled wraps.',
  'کچا لہسن بعض اوقات برگر یا ریپ کے اصل ذائقے پر غالب آ جاتا ہے، جبکہ ہلکی آنچ پر بھنا ہوا لہسن میٹھا اور متوازن ذائقہ دیتا ہے۔\n\n### اجزا\n- لہسن کی ایک پوری پوتھی\n- ایک کھانے کا چمچ تیل\n- آدھا کپ گاڑھا دہی یا مایونیز\n- ایک چائے کا چمچ تازہ لیموں کا رس\n- آدھا چائے کا چمچ تازہ کٹی کالی مرچ\n- ایک کھانے کا چمچ باریک کٹا ہرا دھنیا\n- حسبِ ذائقہ نمک\n\n### ترکیب\n1. لہسن کے اوپری سرے کو ہلکا کاٹ کر تیل لگائیں، فوائل میں لپیٹ کر 190 ڈگری پر 30 سے 35 منٹ بیک کریں۔\n2. ٹھنڈا ہونے پر نرم لہسن نکال کر پیسٹ بنا لیں۔\n3. دہی یا مایونیز، لیموں کا رس، کالی مرچ اور ہرا دھنیا شامل کر کے اچھی طرح مکس کریں۔\n4. پیش کرنے سے پہلے 20 منٹ فریج میں ٹھنڈا کریں۔',
  'Bowl of creamy roasted garlic and fresh herb dipping sauce',
  'روسٹڈ گارلک اور ہرب ڈپ سوس کا پیالہ',
  'Roasted Garlic & Fresh Herb Dip Recipe | FRYZAR Kitchen',
  'روسٹڈ گارلک اور ہرب ڈپ کی ترکیب | فرائزَر کچن',
  'Step-by-step recipe for mellow roasted garlic and herb dipping sauce that pairs with smash burgers, grilled wraps, and fries.',
  'سمیش برگر، گرلڈ ریپ اور فرائز کے ساتھ پیش کرنے کے لیے روسٹڈ گارلک ڈپ کی مکمل ترکیب۔',
  10, 35, 4, 1, '2026-11-05T12:00:00.000Z'
),
(
  '20000000-0000-4000-8000-000000000003',
  'smash-burger-maillard-crust-science',
  'article',
  'Why Smashing a Burger Patty on Dry Cast Iron Creates Superior Flavour',
  'گرم آئرن توے پر سمیش برگر پیٹی زیادہ ذائقے دار کیوں بنتی ہے',
  'Understanding the Maillard reaction, bun toasting barriers, and why timing matters when assembling hot burgers.',
  'میلیرڈ ری ایکشن، ٹوسٹ شدہ بن اور درست وقت پر اسمبلنگ برگر کا ذائقہ کیسے بڑھاتی ہے۔',
  'The difference between a steamed diner patty and a true smash burger comes down to surface contact and heat transfer.\n\n### The Maillard Reaction Explained\nWhen freshly ground beef hits an ungreased steel griddle above 200°C and is pressed firmly within the first ten seconds, amino acids and natural sugars caramelize rapidly into hundreds of savoury aroma compounds. Pressing later in the cook squeezes out juices—pressing immediately locks crust onto the steel.\n\n### Protecting the Bun\nA butter-toasted brioche or potato bun acts as a moisture barrier so sauces and meat juices enhance every bite without turning soggy on the ride to your home.',
  'عام برگر اور حقیقی سمیش برگر میں اصل فرق گرم توے کے ساتھ مکمل سطحی رابطے اور درجہ حرارت کا ہے۔\n\n### میلیرڈ ری ایکشن کیا ہے؟\nجب تازہ قیمہ 200 ڈگری سینٹی گریڈ سے زیادہ گرم اسٹیل گرڈل پر رکھتے ہی ابتدائی دس سیکنڈ میں دبایا جاتا ہے تو قدرتی پروٹین اور شکر مل کر سنہری کرسٹ اور شاندار خوشبو پیدا کرتے ہیں۔ بعد میں دبانے سے رس ضائع ہوتا ہے، اس لیے صرف شروع میں سمیش کیا جاتا ہے۔\n\n### ٹوسٹ شدہ بن کی اہمیت\nمکھن سے ہلکا ٹوسٹ کیا گیا بن سوس اور گوشت کے رس کو جذب ہونے سے روکتا ہے تاکہ برگر گھر پہنچنے تک تازہ رہے۔',
  'Searing smash burger patty on a hot flat-top griddle',
  'گرم گرڈل پر تیار ہوتا سمیش برگر',
  'The Science of Smash Burger Crust & Bun Toasting | FRYZAR',
  'سمیش برگر کرسٹ اور بن ٹوسٹنگ کے اصول | فرائزَر',
  'Explore how high-heat griddle searing, immediate smashing, and toasted buns create juicy burgers built for local delivery.',
  'جانیں کہ تیز آنچ پر سمیش برگر اور ٹوسٹ شدہ بن بہترین ذائقہ کیسے دیتے ہیں۔',
  10, 6, 2, 1, '2026-11-06T09:00:00.000Z'
),
(
  '20000000-0000-4000-8000-000000000004',
  'kitchen-hygiene-oil-quality-and-allergen-care',
  'guide',
  'Kitchen Hygiene, Cooking Oil Freshness & Ingredient Care Standards',
  'کچن کی صفائی، کوکنگ آئل کے معیار اور تازہ اجزا کی حفاظت کے اصول',
  'Practical food-safety practices for temperature monitoring, cold-chain storage, and clean frying oil management.',
  'درجہ حرارت کی نگرانی، کولڈ اسٹوریج اور صاف کوکنگ آئل کے عملی اصول۔',
  'Consistent food quality depends on disciplined kitchen routines before a single order arrives.\n\n### Cold-Chain Discipline\nRaw poultry, beef, and dairy sauces must stay chilled between 1°C and 4°C on dedicated shelves below ready-to-eat garnishes, preventing cross-contamination.\n\n### Oil Filtration & Smoke-Point Care\nOverheated or degraded oil dulls flavour and darkens breading prematurely. Filtering crumbs between rushes and keeping fryers at calibrated temperatures below the oil smoke point ensures clean, light tasting food.\n\n### Clear Allergen Awareness\nBuns, sauces, and marinades frequently contain gluten, dairy, eggs, sesame, or soy. Customers with dietary sensitivities should always check item descriptions or contact support before ordering.',
  'معیاری کھانے کی بنیاد آرڈر آنے سے پہلے کچن کے نظم و ضبط پر ہوتی ہے۔\n\n### کولڈ چین اور الگ اسٹوریج\nکچا چکن، بیف اور ڈیری سوس ہمیشہ 1 سے 4 ڈگری سینٹی گریڈ کے درمیان مخصوص شیلف پر رکھے جاتے ہیں تاکہ تیار اشیا سے الگ رہیں۔\n\n### کوکنگ آئل کی صفائی اور درجہ حرارت\nزیادہ جلا ہوا تیل ذائقہ خراب کرتا ہے۔ ہر مصروف اوقات کے بعد تیل کو فلٹر کرنا اور درست درجہ حرارت برقرار رکھنا ہلکے اور صاف ذائقے کی ضمانت ہے۔\n\n### الرجی سے متعلق آگاہی\nبن، سوس اور مصالحہ جات میں گلوٹین، دودھ، انڈا یا تل شامل ہو سکتے ہیں۔ مخصوص غذائی احتیاط رکھنے والے صارفین آرڈر سے پہلے تفصیلات ضرور دیکھیں۔',
  'Clean stainless steel commercial kitchen prep station',
  'صاف ستھرا سٹین لیس سٹیل کچن اسٹیشن',
  'Kitchen Hygiene & Cooking Oil Quality Guide | FRYZAR',
  'کچن ہائیجین اور کوکنگ آئل کوالٹی گائیڈ | فرائزَر',
  'How cold-chain storage, calibrated fryer filtration, and allergen care keep freshly prepared meals clean and reliable.',
  'کولڈ اسٹوریج، صاف کوکنگ آئل اور غذائی احتیاط کے عملی معیارات۔',
  NULL, NULL, NULL, 1, '2026-11-06T14:00:00.000Z'
);
