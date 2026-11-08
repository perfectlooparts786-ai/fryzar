import type { EditorialArticle, Language, Product } from "./types";

const CANONICAL_BASE = "https://fryzar.com";

function upsertMeta(selector: string, attrs: Record<string, string>): void {
  if (typeof document === "undefined") return;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    document.head.appendChild(el);
  }
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
}

function upsertLink(rel: string, href: string, hreflang?: string): void {
  if (typeof document === "undefined") return;
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    if (hreflang) el.hreflang = hreflang;
    document.head.appendChild(el);
  }
  el.href = href;
}

export function applyPageSeo(params: {
  title: string;
  description: string;
  pathname: string;
  language: Language;
  noindex?: boolean;
  ogType?: "website" | "article" | "product";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}): void {
  if (typeof document === "undefined") return;

  const cleanPath = params.pathname.startsWith("/") ? params.pathname : "/" + params.pathname;
  const canonicalUrl = CANONICAL_BASE + (cleanPath === "/" ? "/" : cleanPath.replace(/\/+$/, ""));

  document.title = params.title;
  upsertMeta('meta[name="description"]', { name: "description", content: params.description });
  upsertMeta('meta[property="og:title"]', { property: "og:title", content: params.title });
  upsertMeta('meta[property="og:description"]', { property: "og:description", content: params.description });
  upsertMeta('meta[property="og:type"]', { property: "og:type", content: params.ogType ?? "website" });
  upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
  upsertMeta('meta[name="robots"]', {
    name: "robots",
    content: params.noindex ? "noindex, nofollow" : "index, follow"
  });

  upsertLink("canonical", canonicalUrl);
  upsertLink("alternate", canonicalUrl, "en");
  upsertLink("alternate", canonicalUrl, "ur");
  upsertLink("alternate", canonicalUrl, "x-default");

  const existingScript = document.getElementById("fryzar-jsonld");
  if (params.jsonLd) {
    const script = existingScript ?? document.createElement("script");
    script.id = "fryzar-jsonld";
    script.setAttribute("type", "application/ld+json");
    script.textContent = JSON.stringify(params.jsonLd);
    if (!existingScript) {
      document.head.appendChild(script);
    }
  } else if (existingScript) {
    existingScript.remove();
  }
}

export function buildStoreJsonLd(storeName: string, whatsapp?: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    name: storeName || "FRYZAR",
    url: CANONICAL_BASE,
    servesCuisine: ["Pakistani", "Fast Food", "Groceries", "Fresh Essentials"],
    currenciesAccepted: "PKR",
    paymentAccepted: "Cash on Delivery",
    areaServed: {
      "@type": "Country",
      name: "Pakistan"
    },
    ...(whatsapp ? { telephone: whatsapp } : {})
  };
}

export function buildProductJsonLd(product: Product, language: Language): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: language === "ur" ? product.name_ur : product.name_en,
    description: language === "ur" ? product.description_ur : product.description_en,
    sku: product.sku || product.slug,
    ...(product.image_url ? { image: [product.image_url] } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "PKR",
      price: (product.price_paisa / 100).toFixed(2),
      availability: product.is_available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${CANONICAL_BASE}/products/${encodeURIComponent(product.slug)}`
    }
  };
}

export function buildArticleJsonLd(post: EditorialArticle, language: Language): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: language === "ur" ? post.title_ur : post.title_en,
    description: language === "ur" ? post.excerpt_ur : post.excerpt_en,
    ...(post.cover_image_url ? { image: [post.cover_image_url] } : {}),
    ...(post.published_at ? { datePublished: post.published_at } : {}),
    ...(post.updated_at ? { dateModified: post.updated_at } : {}),
    author: {
      "@type": "Organization",
      name: "FRYZAR Editorial Kitchen"
    },
    publisher: {
      "@type": "Organization",
      name: "FRYZAR"
    },
    mainEntityOfPage: `${CANONICAL_BASE}/guides/${encodeURIComponent(post.slug)}`
  };
}

export const BUILTIN_EDITORIAL_GUIDES: EditorialArticle[] = [
  {
    id: "guide-crispy-fries-science",
    slug: "how-fryzar-keeps-fried-food-crisp-during-delivery",
    category: "Kitchen Craft",
    title_en: "How Proper Venting & Double-Frying Keep Comfort Food Crisp on Delivery",
    title_ur: "ڈیلیوری کے دوران تلی ہوئی اشیا کو خستہ اور تازہ رکھنے کے عملی اصول",
    excerpt_en: "Steam is the enemy of crispness. Learn the two-stage oil temperature method and breathable packaging principles behind restaurant-grade fried food.",
    excerpt_ur: "بھاپ خستہ پن کو ختم کرتی ہے۔ دو مرحلہ وار درجہ حرارت اور ہوا دار پیکنگ کے اہم اصول جانیں۔",
    body_en:
      "Great fried comfort food starts long before it enters the fryer. Starch surface moisture, oil recovery temperature, and post-fry steam release determine whether a burger fillet or batch of fries arrives crisp or soggy.\n\n" +
      "1. Surface Drying & Coating Rest: Allowing seasoned coatings to hydrate for 10 minutes creates a cohesive crust that resists oil absorption.\n\n" +
      "2. Two-Stage Thermal Control: Cooking the interior gently at 165°C and finishing at 190°C sets a micro-blistered exterior with minimal grease.\n\n" +
      "3. Vented Kraft Packaging: Sealed plastic traps condensation within 90 seconds. Breathable kraft liners with side vents release excess vapour while retaining core warmth during local neighbourhood dispatch.",
    body_ur:
      "بہترین اور خستہ کھانے کی تیاری کڑاہی میں جانے سے پہلے شروع ہوتی ہے۔ سطح کی نمی، تیل کا درست درجہ حرارت اور پیکنگ میں ہوا کا گزر اس بات کا تعین کرتے ہیں کہ کھانا تازہ پہنچتا ہے یا نرم پڑ جاتا ہے۔\n\n" +
      "1۔ کوٹنگ کا وقفہ: مصالحہ لگانے کے بعد چند منٹ کا وقفہ اوپری تہہ کو مضبوط بناتا ہے اور اضافی تیل جذب ہونے سے روکتا ہے۔\n\n" +
      "2۔ دو مرحلہ درجہ حرارت: پہلے درمیانی آنچ پر اندرونی پکائی اور آخر میں تیز آنچ پر سنہری رنگت بہترین خستہ پن دیتی ہے۔\n\n" +
      "3۔ ہوا دار پیکنگ: بند پلاسٹک کے بجائے ہوا دار کرافٹ باکس بھاپ کو باہر نکالتے ہیں اور گرمائش برقرار رکھتے ہیں۔",
    cover_image_url: null,
    reading_minutes: 4,
    is_featured: 1,
    published_at: "2026-11-01T09:00:00.000Z"
  },
  {
    id: "guide-pakistani-pantry-storage",
    slug: "storing-fresh-produce-and-spices-in-warm-climates",
    category: "Food Storage",
    title_en: "Smart Pantry & Produce Storage Guide for Warm Pakistani Households",
    title_ur: "گرم موسم میں تازہ سبزیوں، مصالحہ جات اور راشن کو محفوظ رکھنے کا مکمل طریقہ",
    excerpt_en: "Practical kitchen techniques to extend the freshness of whole spices, flour, cooking oils, and leafy produce through humid monsoon and summer months.",
    excerpt_ur: "گرمی اور نمی کے موسم میں آٹے، مصالحوں اور تازہ سبزیوں کا ذائقہ اور معیار برقرار رکھنے کے آزمودہ طریقے۔",
    body_en:
      "High ambient temperatures and seasonal humidity accelerate oxidation in ground spices and moisture spoilage in staples. A few disciplined storage habits dramatically improve shelf life and flavour.\n\n" +
      "1. Whole Over Ground Spices: Keep cumin, coriander, and black pepper whole in opaque airtight jars away from stove heat, grinding small batches weekly.\n\n" +
      "2. Breathable Dry Bins for Onions & Potatoes: Store alliums and potatoes separately in dark, ventilated baskets—never sealed polythene bags.\n\n" +
      "3. Herb Wrapping: Rinse fresh coriander and mint, spin thoroughly dry, and wrap in a clean cotton cloth inside a crisper box to keep leaves vibrant for up to a week.",
    body_ur:
      "زیادہ درجہ حرارت اور نمی پسے ہوئے مصالحوں کی خوشبو کم کر دیتے ہیں اور اجناس کو متاثر کرتے ہیں۔ چند سادہ عادات باورچی خانے کی اشیا کو دیر تک تازہ رکھتی ہیں۔\n\n" +
      "1۔ ثابت مصالحوں کو ترجیح دیں: زیرہ، دھنیا اور کالی مرچ کو چولہے کی گرمی سے دور ہوا بند مرتبان میں رکھیں اور ضرورت کے مطابق پیسیں۔\n\n" +
      "2۔ پیاز اور آلو الگ رکھیں: انہیں پلاسٹک کی تھیلیوں کے بجائے ہوا دار ٹوکری میں سایہ دار جگہ پر رکھیں۔\n\n" +
      "3۔ ہرا دھنیا اور پودینہ: دھو کر مکمل خشک کریں اور سوتی کپڑے میں لپیٹ کر فریج میں رکھیں۔",
    cover_image_url: null,
    reading_minutes: 5,
    is_featured: 1,
    published_at: "2026-11-02T09:00:00.000Z"
  },
  {
    id: "guide-balanced-iftar-dinner-platter",
    slug: "planning-family-platters-and-everyday-meal-combos",
    category: "Meal Planning",
    title_en: "How to Build a Balanced Family Meal Platter Without Food Waste",
    title_ur: "ضیاع کے بغیر متوازن فیملی دسترخوان اور روزمرہ کھانوں کی منصوبہ بندی",
    excerpt_en: "Portion guidelines per guest, pairing protein mains with fresh sides, and reheating methods that preserve texture.",
    excerpt_ur: "مہمانوں کے حساب سے مناسب مقدار، پروٹین اور تازہ سلاد کا امتزاج اور دوبارہ گرم کرنے کے درست طریقے۔",
    body_en:
      "Ordering for a family gathering works best when portions are anchored around realistic per-person weights rather than guesswork.\n\n" +
      "1. Portion Rule of Thumb: Plan 180–220g of cooked protein main, 120g of starch or bread, and 80g of crisp acid-brightened slaw or chutney per adult.\n\n" +
      "2. Contrast Richness with Acidity: Pair crispy fried fillets or spiced grills with mint-yogurt raita and pickled red onions to balance the palate.\n\n" +
      "3. Oven or Air-Fryer Revival: Reheat leftover breaded items on a wire rack at 185°C for 5 minutes rather than microwaving.",
    body_ur:
      "گھر کی دعوت یا فیملی ڈنر کے لیے اندازے کے بجائے متوازن مقدار میں آرڈر کرنے سے کھانا ضائع نہیں ہوتا اور ہر فرد سیر ہو کر کھاتا ہے۔\n\n" +
      "1۔ فی فرد متوازن مقدار: ہر بالغ فرد کے لیے تقریباً 200 گرام مرکزی ڈش، روٹی یا چاول اور تازہ سلاد کافی ہوتا ہے۔\n\n" +
      "2۔ ذائقوں کا توازن: تلی ہوئی یا مصالحہ دار اشیا کے ساتھ پودینے کا رائتہ اور سلاد کھانے کو ہلکا اور خوشگوار بناتے ہیں۔\n\n" +
      "3۔ دوبارہ گرم کرنے کا طریقہ: مائیکروویو کے بجائے اوون یا ایئر فرائیر میں چند منٹ گرم کرنے سے خستہ پن واپس آ جاتا ہے۔",
    cover_image_url: null,
    reading_minutes: 4,
    is_featured: 0,
    published_at: "2026-11-03T09:00:00.000Z"
  }
];
