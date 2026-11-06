import { useEffect, useMemo, useState, type FormEvent, type MouseEvent } from "react";
import { DEFAULT_MONETIZATION_CONFIG, type MonetizationRuntimeConfig, type PageCategory } from "./ads/adConfig";
import { readAdConsent, writeAdConsent, type AdConsentStatus } from "./ads/adConsent";
import { BannerAd } from "./ads/BannerAd";
import { NativeAd } from "./ads/NativeAd";
import { api, ApiError } from "./api";
import {
  applyPageSeo,
  buildArticleJsonLd,
  buildProductJsonLd,
  buildStoreJsonLd,
  BUILTIN_EDITORIAL_GUIDES
} from "./seo";
import type {
  CartItem,
  Category,
  DeliveryZone,
  EditorialArticle,
  Language,
  ModifierOption,
  OrderResponse,
  Product,
  ProductDetails,
  PublicPromotion,
  StoreSettings,
  TrackedOrderResponse
} from "./types";

type CopyText = { [Key in keyof typeof COPY.en]: string };

const COPY = {
  en: {
    announcement: "A simpler way to shop your neighbourhood",
    coverageNotice: "Fresh food & everyday essentials delivered in active Pakistani zones (PKR) · Culinary guides open worldwide",
    categories: "Categories",
    allProductsNav: "Products",
    promotionsNav: "Promotions",
    guidesNav: "Food Guides",
    aboutNav: "About",
    howItWorks: "How it works",
    support: "Support",
    searchPlaceholder: "Search food, grocery and everyday essentials",
    search: "Search",
    eyebrow: "LOCAL FINDS. EASY ORDERS.",
    heroTitle: "Good things,",
    heroAccent: "close to home.",
    heroBody: "Discover fresh prepared food, groceries and daily essentials from FRYZAR, with transparent PKR pricing and straightforward neighbourhood delivery.",
    browse: "Explore the store",
    how: "How FRYZAR works",
    promiseOne: "Thoughtful local selection",
    promiseTwo: "Clear prices and delivery",
    promiseThree: "Simple order tracking",
    shopBy: "A little of everything",
    shopTitle: "Browse the collection",
    shopBody: "Your local favourites and daily essentials, together in one place.",
    all: "All products",
    featured: "Featured",
    emptyTitle: "Your store is getting ready",
    emptyBody: "The catalogue is being prepared. Check back soon for products and delivery areas.",
    noResultsTitle: "No matching products",
    noResultsBody: "Try another search or clear your category filter to see the full catalogue.",
    clearFilters: "Clear filters",
    apiOffline: "We could not connect to the store service. Please try again shortly.",
    loading: "Preparing your store…",
    basket: "Basket",
    items: "items",
    add: "Add to basket",
    viewDetails: "View details",
    openFullPage: "Full product page",
    productDetails: "Product details",
    remove: "Remove",
    quantity: "Quantity",
    subtotal: "Subtotal",
    delivery: "Delivery",
    estimatedTotal: "Estimated total",
    estimateNote: "Final prices and delivery are confirmed by the server at checkout.",
    emptyBasket: "Your basket is empty",
    emptyBasketBody: "Add a few things from the catalogue to get started.",
    continueShopping: "Continue browsing",
    checkout: "Continue to checkout",
    checkoutTitle: "Delivery details",
    checkoutBody: "No account is needed. Add your details to place an order.",
    fullName: "Full name",
    phone: "Mobile number",
    address: "Delivery address",
    area: "Delivery area",
    selectArea: "Choose your area",
    notes: "Order note (optional)",
    placeOrder: "Place COD order",
    placing: "Placing order…",
    cod: "Cash on delivery",
    codInfo: "Pay when your order is delivered.",
    orderConfirmed: "Order received",
    orderMessage: "Your order request has been saved.",
    orderNumber: "Order number",
    trackingCode: "Private tracking code",
    trackingNote: "Keep this code safe. It is used to look up your order.",
    copy: "Copy code",
    copied: "Copied",
    close: "Close",
    tryAgain: "Try again",
    storeSetup: "Store setup in progress",
    storeClosed: "Ordering is not open yet. The catalogue and delivery areas will appear here when ready.",
    whyTitle: "A calmer way to order",
    whyBody: "FRYZAR brings your local essentials into one clear experience, from browsing to delivery updates.",
    stepOne: "Find what you need",
    stepOneBody: "Browse the available categories and products.",
    stepTwo: "Choose delivery",
    stepTwoBody: "Select an active delivery area and review the fee.",
    stepThree: "Place your order",
    stepThreeBody: "Send your order securely and keep its tracking code.",
    footerLine: "Local food & everyday shopping, made more straightforward.",
    currency: "PKR",
    genericError: "Something went wrong. Please try again.",
    notAvailable: "This item is no longer available.",
    minOrder: "Minimum order",
    zoneUnavailable: "Delivery is not configured for this area yet.",
    setupMessage: "FRYZAR is preparing its catalogue and delivery setup.",
    trackOrder: "Track order",
    trackTitle: "Your order, clearly tracked.",
    trackBody: "Enter the private tracking code you received after placing your order.",
    trackingInput: "64-character private tracking code",
    trackButton: "Find my order",
    trackLoading: "Finding your order…",
    trackNotFound: "No order matched this code. Check the code and try again.",
    trackRateLimited: "Too many tracking checks. Wait a minute before trying again.",
    trackInvalid: "Enter the complete 64-character tracking code.",
    trackGenericError: "We could not retrieve this order. Please try again.",
    trackResult: "Order details",
    trackPlaced: "Placed",
    trackUpdated: "Last updated",
    trackItems: "Items",
    trackPayment: "Payment",
    trackStatus: "Current status",
    statusPending: "Received",
    statusConfirmed: "Confirmed",
    statusPreparing: "Preparing",
    statusReady: "Ready",
    statusOutForDelivery: "Out for delivery",
    statusDelivered: "Delivered",
    statusCancelled: "Cancelled",
    statusRejected: "Rejected",
    paymentUnpaid: "Unpaid",
    paymentCollected: "Collected",
    trackingPrivacy: "This private code only shows order progress and item totals. Customer contact details and delivery address are not displayed.",
    supportModalTitle: "Need help? Contact support",
    supportName: "Your full name",
    supportPhone: "Mobile number",
    supportSubject: "Subject / Issue",
    supportMessage: "How can we help you?",
    supportOrderId: "Order ID (optional)",
    submitTicket: "Submit support request",
    ticketSubmitted: "Support request received! Our team will review your message shortly.",
    decreaseQty: "Decrease quantity",
    increaseQty: "Increase quantity",
    homeCrumb: "Home",
    menuButton: "Menu"
  },
  ur: {
    announcement: "اپنے علاقے کی خریداری، اب زیادہ آسان",
    coverageNotice: "تازہ کھانے اور روزمرہ اشیا کی ڈیلیوری پاکستان کے فعال علاقوں (PKR) میں دستیاب ہے · کھانوں کے معلوماتی مضامین دنیا بھر کے لیے",
    categories: "اقسام",
    allProductsNav: "اشیا",
    promotionsNav: "رعایتیں",
    guidesNav: "فوڈ گائیڈز",
    aboutNav: "تعارف",
    howItWorks: "طریقۂ کار",
    support: "مدد",
    searchPlaceholder: "کھانے، گروسری اور روزمرہ اشیا تلاش کریں",
    search: "تلاش",
    eyebrow: "آپ کے علاقے کی پسندیدہ اشیا",
    heroTitle: "اچھی چیزیں،",
    heroAccent: "آپ کے قریب۔",
    heroBody: "اپنے مقامی اسٹور کے تازہ کھانے اور ضروری اشیا دیکھیں اور شفاف قیمت کے ساتھ آسان طریقے سے آرڈر کریں۔",
    browse: "اسٹور دیکھیں",
    how: "FRYZAR کیسے کام کرتا ہے",
    promiseOne: "منتخب مقامی اشیا",
    promiseTwo: "واضح قیمت اور ڈیلیوری",
    promiseThree: "آسان آرڈر ٹریکنگ",
    shopBy: "ہر روز کی ضرورت",
    shopTitle: "اشیا دیکھیں",
    shopBody: "روزمرہ کی ضروری اور مقامی پسندیدہ اشیا، ایک ہی جگہ۔",
    all: "تمام اشیا",
    featured: "نمایاں",
    emptyTitle: "آپ کا اسٹور تیار ہو رہا ہے",
    emptyBody: "مصنوعات کی فہرست تیار کی جا رہی ہے۔ جلد دوبارہ تشریف لائیں۔",
    noResultsTitle: "مطلوبہ اشیا نہیں ملیں",
    noResultsBody: "دوسرا لفظ تلاش کریں یا تمام اقسام دیکھنے کے لیے فلٹر ختم کریں۔",
    clearFilters: "فلٹر ختم کریں",
    apiOffline: "اسٹور سروس سے رابطہ نہیں ہو سکا۔ کچھ دیر بعد دوبارہ کوشش کریں۔",
    loading: "اسٹور تیار ہو رہا ہے…",
    basket: "ٹوکری",
    items: "اشیا",
    add: "ٹوکری میں شامل کریں",
    viewDetails: "تفصیل دیکھیں",
    openFullPage: "مکمل صفحہ دیکھیں",
    productDetails: "مصنوعات کی تفصیل",
    remove: "ہٹائیں",
    quantity: "تعداد",
    subtotal: "ذیلی رقم",
    delivery: "ڈیلیوری",
    estimatedTotal: "اندازاً کل رقم",
    estimateNote: "حتمی قیمت اور ڈیلیوری فیس سرور چیک آؤٹ پر طے کرے گا۔",
    emptyBasket: "آپ کی ٹوکری خالی ہے",
    emptyBasketBody: "شروع کرنے کے لیے فہرست سے اشیا شامل کریں۔",
    continueShopping: "خریداری جاری رکھیں",
    checkout: "چیک آؤٹ جاری رکھیں",
    checkoutTitle: "ڈیلیوری کی تفصیل",
    checkoutBody: "آرڈر کے لیے اکاؤنٹ بنانا ضروری نہیں۔",
    fullName: "پورا نام",
    phone: "موبائل نمبر",
    address: "مکمل پتہ",
    area: "ڈیلیوری کا علاقہ",
    selectArea: "اپنا علاقہ منتخب کریں",
    notes: "آرڈر کے لیے نوٹ (اختیاری)",
    placeOrder: "کیش آن ڈیلیوری آرڈر دیں",
    placing: "آرڈر بھیجا جا رہا ہے…",
    cod: "کیش آن ڈیلیوری",
    codInfo: "آرڈر موصول ہونے پر ادائیگی کریں۔",
    orderConfirmed: "آرڈر موصول ہو گیا",
    orderMessage: "آپ کی آرڈر درخواست محفوظ کر لی گئی ہے۔",
    orderNumber: "آرڈر نمبر",
    trackingCode: "نجی ٹریکنگ کوڈ",
    trackingNote: "اس کوڈ کو محفوظ رکھیں۔ اسی سے آرڈر دیکھا جا سکے گا۔",
    copy: "کوڈ کاپی کریں",
    copied: "کاپی ہو گیا",
    close: "بند کریں",
    tryAgain: "دوبارہ کوشش کریں",
    storeSetup: "اسٹور کی تیاری جاری ہے",
    storeClosed: "آرڈر ابھی کھلے نہیں ہیں۔ کیٹلاگ اور ڈیلیوری کے علاقے تیار ہونے پر یہاں دکھائی دیں گے۔",
    whyTitle: "آرڈر کرنے کا آسان طریقہ",
    whyBody: "FRYZAR مقامی اشیا کی تلاش سے لے کر آرڈر اپ ڈیٹ تک ایک واضح تجربہ فراہم کرتا ہے۔",
    stepOne: "اپنی ضرورت تلاش کریں",
    stepOneBody: "دستیاب اقسام اور مصنوعات دیکھیں۔",
    stepTwo: "ڈیلیوری منتخب کریں",
    stepTwoBody: "فعال علاقہ منتخب کریں اور فیس دیکھیں۔",
    stepThree: "آرڈر دیں",
    stepThreeBody: "آرڈر بھیجیں اور ٹریکنگ کوڈ محفوظ رکھیں۔",
    footerLine: "مقامی کھانے اور خریداری، اب زیادہ آسان۔",
    currency: "PKR",
    genericError: "کچھ مسئلہ پیش آیا۔ دوبارہ کوشش کریں۔",
    notAvailable: "یہ چیز اب دستیاب نہیں ہے۔",
    minOrder: "کم از کم آرڈر",
    zoneUnavailable: "اس علاقے کے لیے ڈیلیوری ابھی ترتیب نہیں دی گئی۔",
    setupMessage: "FRYZAR اپنی مصنوعات اور ڈیلیوری کی تیاری کر رہا ہے۔",
    trackOrder: "آرڈر ٹریک کریں",
    trackTitle: "اپنے آرڈر کی پیش رفت دیکھیں۔",
    trackBody: "آرڈر دیتے وقت ملنے والا نجی ٹریکنگ کوڈ درج کریں۔",
    trackingInput: "64 حروف پر مشتمل نجی ٹریکنگ کوڈ",
    trackButton: "میرا آرڈر تلاش کریں",
    trackLoading: "آرڈر تلاش کیا جا رہا ہے…",
    trackNotFound: "اس کوڈ سے کوئی آرڈر نہیں ملا۔ کوڈ چیک کر کے دوبارہ کوشش کریں۔",
    trackRateLimited: "ٹریکنگ کی بہت زیادہ درخواستیں موصول ہوئیں۔ ایک منٹ بعد دوبارہ کوشش کریں۔",
    trackInvalid: "مکمل 64 حروف کا ٹریکنگ کوڈ درج کریں۔",
    trackGenericError: "آرڈر حاصل نہیں ہو سکا۔ دوبارہ کوشش کریں۔",
    trackResult: "آرڈر کی تفصیل",
    trackPlaced: "آرڈر کی تاریخ",
    trackUpdated: "آخری تازہ کاری",
    trackItems: "اشیا",
    trackPayment: "ادائیگی",
    trackStatus: "موجودہ حالت",
    statusPending: "موصول",
    statusConfirmed: "تصدیق شدہ",
    statusPreparing: "تیاری جاری",
    statusReady: "تیار",
    statusOutForDelivery: "ڈیلیوری کے لیے روانہ",
    statusDelivered: "ڈیلیور ہو گیا",
    statusCancelled: "منسوخ",
    statusRejected: "مسترد",
    paymentUnpaid: "ادا نہیں ہوا",
    paymentCollected: "وصول ہو گیا",
    trackingPrivacy: "یہ نجی کوڈ صرف آرڈر کی پیش رفت اور اشیا کی رقم دکھاتا ہے۔ کسٹمر کا فون نمبر اور ڈیلیوری پتہ ظاہر نہیں کیا جاتا۔",
    supportModalTitle: "مدد چاہیے؟ رابطہ کریں",
    supportName: "آپ کا پورا نام",
    supportPhone: "موبائل نمبر",
    supportSubject: "عنوان / مسئلہ",
    supportMessage: "ہم آپ کی کیا مدد کر سکتے ہیں؟",
    supportOrderId: "آرڈر آئی ڈی (اختیاری)",
    submitTicket: "مدد کی درخواست بھیجیں",
    ticketSubmitted: "آپ کی درخواست موصول ہو گئی ہے! عملہ جلد جائزہ لے گا۔",
    decreaseQty: "مقدار کم کریں",
    increaseQty: "مقدار بڑھائیں",
    homeCrumb: "ہوم",
    menuButton: "مینیو"
  }
} as const;

type RouteMatch =
  | { page: "home" }
  | { page: "categories"; slug?: string }
  | { page: "products" }
  | { page: "product-detail"; slug: string }
  | { page: "search" }
  | { page: "promotions" }
  | { page: "basket" }
  | { page: "checkout" }
  | { page: "order-confirmation" }
  | { page: "order-tracking"; token?: string }
  | { page: "support" }
  | { page: "about" }
  | { page: "privacy-policy" }
  | { page: "terms" }
  | { page: "refund-policy" }
  | { page: "delivery-policy" }
  | { page: "editorial-list" }
  | { page: "editorial-detail"; slug: string };

function parsePathname(rawPath: string): RouteMatch {
  const clean = (rawPath || "/").replace(/\/+$/, "") || "/";
  const parts = clean.split("/").filter(Boolean);

  if (parts.length === 0) return { page: "home" };
  const head = parts[0].toLowerCase();
  const second = parts[1] ? decodeURIComponent(parts[1]) : undefined;

  switch (head) {
    case "categories":
      return { page: "categories", slug: second };
    case "products":
      return second ? { page: "product-detail", slug: second } : { page: "products" };
    case "search":
      return { page: "search" };
    case "promotions":
      return { page: "promotions" };
    case "basket":
      return { page: "basket" };
    case "checkout":
      return { page: "checkout" };
    case "order-confirmation":
      return { page: "order-confirmation" };
    case "track":
      return { page: "order-tracking", token: second };
    case "contact":
    case "support":
      return { page: "support" };
    case "about":
      return { page: "about" };
    case "privacy":
    case "privacy-policy":
      return { page: "privacy-policy" };
    case "terms":
      return { page: "terms" };
    case "refund-policy":
      return { page: "refund-policy" };
    case "delivery-policy":
      return { page: "delivery-policy" };
    case "guides":
      return second ? { page: "editorial-detail", slug: second } : { page: "editorial-list" };
    default:
      return { page: "home" };
  }
}

function isTrue(value: unknown): boolean {
  return value === true || value === "true" || value === "yes" || value === 1;
}

function money(paisa: number, language: Language): string {
  return new Intl.NumberFormat(language === "ur" ? "ur-PK" : "en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0
  }).format(paisa / 100);
}

function productName(product: Product, language: Language): string {
  return language === "ur" ? product.name_ur : product.name_en;
}

function productDescription(product: Product, language: Language): string {
  return language === "ur" ? product.description_ur : product.description_en;
}

function errorText(
  error: unknown,
  t: Pick<CopyText, "storeClosed" | "zoneUnavailable" | "notAvailable" | "genericError">
): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "store_not_accepting_orders":
        return t.storeClosed;
      case "delivery_zone_unavailable":
        return t.zoneUnavailable;
      case "product_unavailable":
      case "insufficient_stock":
      case "product_or_stock_changed":
        return t.notAvailable;
      default:
        return t.genericError;
    }
  }
  return t.genericError;
}

function loadSavedCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem("fryzar-cart-v1");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CartItem =>
        Boolean(
          item &&
          typeof item.id === "string" &&
          item.product &&
          typeof item.product.id === "string" &&
          typeof item.quantity === "number" &&
          item.quantity >= 1 &&
          typeof item.unit_price_paisa === "number"
        )
    );
  } catch {
    return [];
  }
}

function Icon({ name }: { name: "bag" | "search" | "arrow" | "close" | "plus" | "minus" | "check" | "pin" }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const
  };

  switch (name) {
    case "bag":
      return <svg {...common}><path d="M5 8h14l1 13H4L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></svg>;
    case "search":
      return <svg {...common}><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.3 4.3" /></svg>;
    case "arrow":
      return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
    case "close":
      return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>;
    case "plus":
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case "minus":
      return <svg {...common}><path d="M5 12h14" /></svg>;
    case "check":
      return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
    case "pin":
      return <svg {...common}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.3" /></svg>;
  }
}

export default function App() {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = window.localStorage.getItem("fryzar-language");
    return saved === "ur" ? "ur" : "en";
  });
  const t = COPY[language];
  const isUrdu = language === "ur";

  const [pathname, setPathname] = useState<string>(() => window.location.pathname || "/");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({});
  const [promotions, setPromotions] = useState<PublicPromotion[]>([]);
  const [editorialPosts, setEditorialPosts] = useState<EditorialArticle[]>([]);
  const [activeArticle, setActiveArticle] = useState<EditorialArticle | null>(null);
  const [monetizationConfig, setMonetizationConfig] = useState<MonetizationRuntimeConfig>(DEFAULT_MONETIZATION_CONFIG);
  const [adConsent, setAdConsent] = useState<AdConsentStatus>(() => readAdConsent());

  const [apiState, setApiState] = useState<"loading" | "ready" | "offline">("loading");
  const [refreshCount, setRefreshCount] = useState(0);

  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>(loadSavedCart);
  const [cartOpen, setCartOpen] = useState(false);

  // Modal quick-order state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [selectedModifierOptions, setSelectedModifierOptions] = useState<Record<string, string[]>>({});
  const [modalQuantity, setModalQuantity] = useState(1);

  // Standalone product page state
  const [standaloneProduct, setStandaloneProduct] = useState<ProductDetails | null>(null);
  const [standaloneLoading, setStandaloneLoading] = useState(false);
  const [standaloneVariantId, setStandaloneVariantId] = useState<string>("");
  const [standaloneModifiers, setStandaloneModifiers] = useState<Record<string, string[]>>({});
  const [standaloneQty, setStandaloneQty] = useState(1);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [orderComplete, setOrderComplete] = useState<OrderResponse | null>(null);
  const [lastConfirmedOrder, setLastConfirmedOrder] = useState<OrderResponse | null>(null);

  const [trackingToken, setTrackingToken] = useState("");
  const [trackingResult, setTrackingResult] = useState<TrackedOrderResponse | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedPromo, setCopiedPromo] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_paisa: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const [supportOpen, setSupportOpen] = useState(false);
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);
  const [supportError, setSupportError] = useState("");

  const route = useMemo(() => parsePathname(pathname), [pathname]);
  const pageCategory: PageCategory = route.page;

  function navigate(nextPath: string, event?: MouseEvent<HTMLElement>) {
    if (event) {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
    }
    const normalized = nextPath.startsWith("/") ? nextPath : "/" + nextPath;
    if (normalized !== window.location.pathname + window.location.search) {
      window.history.pushState({}, "", normalized);
    }
    const url = new URL(normalized, window.location.origin);
    setPathname(url.pathname);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    const onPopState = () => {
      setPathname(window.location.pathname || "/");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("fryzar-language", language);
    document.documentElement.lang = language;
    document.documentElement.dir = isUrdu ? "rtl" : "ltr";
  }, [language, isUrdu]);

  useEffect(() => {
    try {
      window.localStorage.setItem("fryzar-cart-v1", JSON.stringify(cart));
    } catch {
      // Ignore quota errors
    }
  }, [cart]);

  useEffect(() => {
    const controller = new AbortController();
    setApiState("loading");

    const load = async () => {
      const results = await Promise.allSettled([
        api.health(controller.signal),
        api.categories(controller.signal),
        api.products(controller.signal),
        api.storefrontConfig(controller.signal),
        api.deliveryZones(controller.signal),
        api.promotions(controller.signal),
        api.editorialList(controller.signal),
        api.monetizationConfig(controller.signal)
      ]);

      if (controller.signal.aborted) return;

      if (results[0].status === "fulfilled" && results[0].value.ok) {
        setApiState("ready");
      } else {
        setApiState("offline");
      }

      if (results[1].status === "fulfilled") {
        setCategories(results[1].value.categories);
      }
      if (results[2].status === "fulfilled") {
        setProducts(results[2].value.products);
      }
      if (results[3].status === "fulfilled") {
        setSettings(results[3].value.settings);
      }
      if (results[4].status === "fulfilled") {
        const availableZones = results[4].value.delivery_zones;
        setZones(availableZones);
        setSelectedZoneId((current) =>
          availableZones.some((zone) => zone.id === current)
            ? current
            : availableZones[0]?.id ?? ""
        );
      }
      if (results[5].status === "fulfilled") {
        setPromotions(results[5].value.promotions);
      }
      if (results[6].status === "fulfilled") {
        setEditorialPosts(results[6].value.posts);
      }
      if (results[7].status === "fulfilled") {
        setMonetizationConfig(results[7].value);
      }
    };

    void load();
    return () => controller.abort();
  }, [refreshCount]);

  // Sync route-driven state (category slug, tracking token, standalone product, editorial post)
  useEffect(() => {
    if (route.page === "categories") {
      setSelectedCategory(route.slug || "all");
    } else if (route.page === "order-tracking" && route.token && /^[a-f0-9]{64}$/i.test(route.token)) {
      setTrackingToken(route.token.toLowerCase());
      void lookupTracking(route.token);
    } else if (route.page === "product-detail") {
      let active = true;
      setStandaloneLoading(true);
      setStandaloneProduct(null);
      setStandaloneVariantId("");
      setStandaloneModifiers({});
      setStandaloneQty(1);
      const localFallback = products.find((p) => p.slug === route.slug || p.id === route.slug) ?? null;
      api.productDetails(route.slug)
        .then((res) => {
          if (!active) return;
          setStandaloneProduct(res.product);
          if (res.product.variants && res.product.variants.length > 0) {
            const avail = res.product.variants.find((v) => v.is_available) ?? res.product.variants[0];
            setStandaloneVariantId(avail.id);
          }
        })
        .catch(() => {
          if (!active) return;
          setStandaloneProduct(localFallback);
        })
        .finally(() => {
          if (active) setStandaloneLoading(false);
        });
      return () => { active = false; };
    } else if (route.page === "editorial-detail") {
      let active = true;
      const builtin = BUILTIN_EDITORIAL_GUIDES.find((g) => g.slug === route.slug) ?? null;
      const fromList = editorialPosts.find((g) => g.slug === route.slug) ?? null;
      if (builtin && !fromList) {
        setActiveArticle(builtin);
        return;
      }
      api.editorialArticle(route.slug)
        .then((res) => {
          if (active) setActiveArticle(res.post);
        })
        .catch(() => {
          if (active) setActiveArticle(builtin ?? fromList);
        });
      return () => { active = false; };
    }
  }, [route, products, editorialPosts]);

  // Dynamic SEO metadata + JSON-LD per route
  useEffect(() => {
    const storeTitle = (isUrdu ? settings.store_name_ur : settings.store_name_en) || "FRYZAR";
    const noindexPages: PageCategory[] = [
      "basket",
      "checkout",
      "order-confirmation",
      "order-tracking"
    ];
    const noindex = noindexPages.includes(route.page);

    if (route.page === "product-detail" && standaloneProduct) {
      applyPageSeo({
        title: `${productName(standaloneProduct, language)} | ${storeTitle}`,
        description: productDescription(standaloneProduct, language) || t.heroBody,
        pathname,
        language,
        ogType: "product",
        jsonLd: buildProductJsonLd(standaloneProduct, language)
      });
      return;
    }

    if (route.page === "editorial-detail" && activeArticle) {
      applyPageSeo({
        title: `${isUrdu ? activeArticle.title_ur : activeArticle.title_en} | ${storeTitle}`,
        description: isUrdu ? activeArticle.excerpt_ur : activeArticle.excerpt_en,
        pathname,
        language,
        ogType: "article",
        jsonLd: buildArticleJsonLd(activeArticle, language)
      });
      return;
    }

    const pageTitles: Record<PageCategory, string> = {
      home: `${storeTitle} | ${isUrdu ? "تازہ کھانے اور روزمرہ اشیا" : "Fresh Food & Everyday Essentials"}`,
      categories: `${t.categories} | ${storeTitle}`,
      products: `${t.all} | ${storeTitle}`,
      "product-detail": `${t.productDetails} | ${storeTitle}`,
      search: `${t.search} | ${storeTitle}`,
      promotions: `${t.promotionsNav} | ${storeTitle}`,
      basket: `${t.basket} | ${storeTitle}`,
      checkout: `${t.checkoutTitle} | ${storeTitle}`,
      payment: `Payment | ${storeTitle}`,
      "order-confirmation": `${t.orderConfirmed} | ${storeTitle}`,
      "order-tracking": `${t.trackOrder} | ${storeTitle}`,
      account: `Account | ${storeTitle}`,
      support: `${t.support} | ${storeTitle}`,
      about: `${t.aboutNav} FRYZAR | ${storeTitle}`,
      "privacy-policy": `Privacy Policy | ${storeTitle}`,
      terms: `Terms & Conditions | ${storeTitle}`,
      "refund-policy": `Refund & Cancellation Policy | ${storeTitle}`,
      "delivery-policy": `Delivery Policy | ${storeTitle}`,
      "editorial-list": `${t.guidesNav} & Culinary Guides | ${storeTitle}`,
      "editorial-detail": `${t.guidesNav} | ${storeTitle}`,
      admin: storeTitle,
      kitchen: storeTitle,
      finance: storeTitle
    };

    applyPageSeo({
      title: pageTitles[route.page] ?? storeTitle,
      description: t.heroBody,
      pathname,
      language,
      noindex,
      jsonLd: route.page === "home" ? buildStoreJsonLd(storeTitle, settings.whatsapp_number) : undefined
    });
  }, [route, pathname, language, isUrdu, settings, standaloneProduct, activeArticle, t]);

  // Modal quick-order details loader & focus trap
  useEffect(() => {
    if (!selectedProduct) {
      setProductDetails(null);
      setSelectedVariantId("");
      setSelectedModifierOptions({});
      setModalQuantity(1);
      return;
    }

    let active = true;
    setLoadingDetails(true);
    setProductDetails(null);
    setSelectedVariantId("");
    setSelectedModifierOptions({});
    setModalQuantity(1);

    api.productDetails(selectedProduct.id)
      .then((res) => {
        if (!active) return;
        setProductDetails(res.product);
        if (res.product.variants && res.product.variants.length > 0) {
          const firstAvail = res.product.variants.find((v) => v.is_available) ?? res.product.variants[0];
          setSelectedVariantId(firstAvail.id);
        }
      })
      .catch(() => {
        if (!active) return;
        setProductDetails(selectedProduct);
      })
      .finally(() => {
        if (active) setLoadingDetails(false);
      });

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const dialog = document.querySelector<HTMLElement>(".product-detail-panel");
    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])'
    ].join(",");
    const focusableElements = () => dialog
      ? Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => element.getAttribute("aria-hidden") !== "true")
      : [];

    const initialFocus = focusableElements()[0] ?? dialog;
    initialFocus?.focus();

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedProduct(null);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const elements = focusableElements();
      if (elements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleDialogKeyDown);
    return () => {
      active = false;
      window.removeEventListener("keydown", handleDialogKeyDown);
      previouslyFocused?.focus();
    };
  }, [selectedProduct]);

  const storeOpen = settings.store_status === "open" && isTrue(settings.launch_ready);
  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) ?? null;

  const allGuides = useMemo(() => {
    if (editorialPosts.length === 0) return BUILTIN_EDITORIAL_GUIDES;
    const slugs = new Set(editorialPosts.map((p) => p.slug));
    return [...editorialPosts, ...BUILTIN_EDITORIAL_GUIDES.filter((b) => !slugs.has(b.slug))];
  }, [editorialPosts]);

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return products.filter((product) => {
      const matchesCategory = selectedCategory === "all" || product.category_slug === selectedCategory;
      const searchable = [
        product.name_en,
        product.name_ur,
        product.description_en,
        product.description_ur,
        product.sku ?? ""
      ].join(" ").toLocaleLowerCase();
      return matchesCategory && (!normalizedSearch || searchable.includes(normalizedSearch));
    });
  }, [products, search, selectedCategory]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.unit_price_paisa * item.quantity, 0);
  const discountPaisa = appliedCoupon?.discount_paisa ?? 0;
  const deliveryFee = selectedZone?.delivery_fee_paisa ?? 0;
  const total = Math.max(0, subtotal - discountPaisa) + deliveryFee;
  const minimumOrder = selectedZone?.minimum_order_paisa ?? 0;
  const minimumMet = subtotal >= minimumOrder;

  function toggleOptionMap(
    setter: React.Dispatch<React.SetStateAction<Record<string, string[]>>>,
    groupId: string,
    optionId: string,
    maxSelection: number
  ) {
    setter((current) => {
      const existing = current[groupId] ?? [];
      if (maxSelection === 1) {
        return { ...current, [groupId]: existing.includes(optionId) ? [] : [optionId] };
      }
      if (existing.includes(optionId)) {
        return { ...current, [groupId]: existing.filter((id) => id !== optionId) };
      }
      if (existing.length >= maxSelection) {
        return current;
      }
      return { ...current, [groupId]: [...existing, optionId] };
    });
  }

  const modifierGroups = productDetails?.modifier_groups ?? [];
  const selectedVariant = productDetails?.variants?.find((v) => v.id === selectedVariantId) ?? null;

  const isModalValid = useMemo(() => {
    for (const group of modifierGroups) {
      const selectedCount = (selectedModifierOptions[group.id] ?? []).length;
      if (group.is_required && selectedCount < Math.max(1, group.min_selection)) return false;
      if (group.min_selection > 0 && selectedCount < group.min_selection) return false;
    }
    return true;
  }, [modifierGroups, selectedModifierOptions]);

  const modalUnitPrice = useMemo(() => {
    const base = selectedVariant ? selectedVariant.price_paisa : (selectedProduct?.price_paisa ?? 0);
    let modTotal = 0;
    for (const group of modifierGroups) {
      const selectedIds = selectedModifierOptions[group.id] ?? [];
      for (const opt of group.options || []) {
        if (selectedIds.includes(opt.id)) modTotal += opt.price_paisa;
      }
    }
    return base + modTotal;
  }, [selectedVariant, selectedProduct, modifierGroups, selectedModifierOptions]);

  function addConfiguredItemToCart(
    product: Product,
    details: ProductDetails | null,
    variantId: string,
    modifierMap: Record<string, string[]>,
    qty: number
  ) {
    const variant = details?.variants?.find((v) => v.id === variantId);
    const selectedMods: ModifierOption[] = [];
    for (const group of details?.modifier_groups ?? []) {
      const ids = modifierMap[group.id] ?? [];
      for (const opt of group.options || []) {
        if (ids.includes(opt.id)) selectedMods.push(opt);
      }
    }
    const unitPrice = (variant ? variant.price_paisa : product.price_paisa) +
      selectedMods.reduce((s, m) => s + m.price_paisa, 0);
    const modIds = selectedMods.map((m) => m.id).sort().join(",");
    const itemId = product.id + (variant ? ":" + variant.id : "") + ":" + modIds;

    setCart((current) => {
      const idx = current.findIndex((item) => item.id === itemId);
      if (idx >= 0) {
        const copy = [...current];
        copy[idx] = { ...copy[idx], quantity: Math.min(20, copy[idx].quantity + qty) };
        return copy;
      }
      return [
        ...current,
        {
          id: itemId,
          product,
          variant: variant ?? undefined,
          selected_modifiers: selectedMods,
          quantity: qty,
          unit_price_paisa: unitPrice
        }
      ];
    });
  }

  function handleAddModalToBasket() {
    if (!selectedProduct || !isModalValid) return;
    addConfiguredItemToCart(selectedProduct, productDetails, selectedVariantId, selectedModifierOptions, modalQuantity);
    setSelectedProduct(null);
  }

  function changeCartQuantity(itemId: string, delta: number) {
    setCart((current) =>
      current
        .map((item) => {
          if (item.id === itemId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: Math.min(20, nextQty) } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  }

  async function handleApplyCoupon(codeOverride?: string) {
    const code = (codeOverride ?? couponInput).trim();
    if (!code) return;
    setValidatingCoupon(true);
    setCouponError("");
    try {
      const res = await api.validateCoupon(code, subtotal);
      if (res.valid) {
        setAppliedCoupon({ code: code.toUpperCase(), discount_paisa: res.discount_paisa });
        setCouponInput("");
      } else {
        setCouponError(isUrdu ? "کوپن غیر فعال یا معیاد ختم ہو چکی ہے" : "Coupon invalid or expired");
      }
    } catch {
      setCouponError(isUrdu ? "کوپن چیک کرنے میں ناکامی" : "Could not validate coupon code");
    } finally {
      setValidatingCoupon(false);
    }
  }

  function openCheckout() {
    setCheckoutError("");
    setCheckoutOpen(true);
    setCartOpen(false);
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!storeOpen || !selectedZone || cart.length === 0 || !minimumMet) return;

    const form = new FormData(event.currentTarget);
    const payload = {
      customer_name: String(form.get("customer_name") ?? ""),
      customer_phone: String(form.get("customer_phone") ?? ""),
      delivery_address: String(form.get("delivery_address") ?? ""),
      delivery_zone_id: selectedZone.id,
      customer_language: language,
      payment_method: "cod" as const,
      coupon_code: appliedCoupon?.code,
      notes: String(form.get("notes") ?? ""),
      items: cart.map((item) => ({
        product_id: item.product.id,
        variant_id: item.variant?.id,
        selected_modifier_option_ids: item.selected_modifiers?.map((m) => m.id),
        quantity: item.quantity
      }))
    };

    setSubmitting(true);
    setCheckoutError("");

    try {
      const result = await api.createOrder(payload, idempotencyKey);
      setOrderComplete(result);
      setLastConfirmedOrder(result);
      setCart([]);
      setAppliedCoupon(null);
      setCheckoutOpen(false);
      setCartOpen(false);
      setIdempotencyKey(crypto.randomUUID());
      if (route.page === "checkout") {
        navigate("/order-confirmation");
      }
    } catch (error) {
      setCheckoutError(errorText(error, t));
    } finally {
      setSubmitting(false);
    }
  }

  async function copyTrackingCode(tokenToCopy?: string) {
    const token = tokenToCopy ?? orderComplete?.tracking_token ?? lastConfirmedOrder?.tracking_token;
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function lookupTracking(token = trackingToken) {
    const normalized = token.trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(normalized)) {
      setTrackingError(t.trackInvalid);
      setTrackingResult(null);
      return;
    }
    setTrackingLoading(true);
    setTrackingError("");
    setTrackingResult(null);
    try {
      const result = await api.trackOrder(normalized);
      setTrackingToken(normalized);
      setTrackingResult(result);
    } catch (error) {
      if (error instanceof ApiError && error.code === "order_not_found") {
        setTrackingError(t.trackNotFound);
      } else if (error instanceof ApiError && error.code === "rate_limit_exceeded") {
        setTrackingError(t.trackRateLimited);
      } else {
        setTrackingError(t.trackGenericError);
      }
    } finally {
      setTrackingLoading(false);
    }
  }

  async function handleSupportSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const customer_name = String(form.get("customer_name") ?? "").trim();
    const customer_phone = String(form.get("customer_phone") ?? "").trim();
    const subject = String(form.get("subject") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();
    const order_id = String(form.get("order_id") ?? "").trim() || undefined;

    if (!customer_name || !customer_phone || !subject || !message) return;

    setSupportSubmitting(true);
    setSupportError("");
    setSupportSuccess(false);

    try {
      await api.createSupportTicket({ customer_name, customer_phone, subject, message, order_id });
      setSupportSuccess(true);
      event.currentTarget.reset();
    } catch {
      setSupportError(isUrdu ? "درخواست جمع کرانے میں ناکامی۔ بعد میں کوشش کریں۔" : "Could not submit support request. Try again shortly.");
    } finally {
      setSupportSubmitting(false);
    }
  }

  function submitTracking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void lookupTracking();
  }

  function trackingStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: t.statusPending,
      confirmed: t.statusConfirmed,
      preparing: t.statusPreparing,
      ready: t.statusReady,
      out_for_delivery: t.statusOutForDelivery,
      delivered: t.statusDelivered,
      cancelled: t.statusCancelled,
      rejected: t.statusRejected
    };
    return labels[status] ?? status.replaceAll("_", " ");
  }

  const supportNumber = (settings.whatsapp_number ?? "").replace(/\D/g, "");
  const whatsappUrl = supportNumber.length >= 8 ? "https://wa.me/" + supportNumber : "";

  function renderProductGridSection(list: Product[]) {
    if (apiState === "loading") {
      return <div className="catalog-state"><div className="loader" /><p>{t.loading}</p></div>;
    }
    if (apiState === "offline") {
      return (
        <div className="catalog-state state-card">
          <div className="state-symbol">!</div>
          <h3>{t.apiOffline}</h3>
          <button className="outline-button" type="button" onClick={() => setRefreshCount((count) => count + 1)}>{t.tryAgain}</button>
        </div>
      );
    }
    if (products.length === 0) {
      return (
        <div className="empty-catalog">
          <div className="empty-catalog-art">
            <div className="empty-plate"><span /><i /><b /></div>
            <div className="empty-spark spark-a">✳</div>
            <div className="empty-spark spark-b">✦</div>
          </div>
          <div className="empty-catalog-copy">
            <span className="status-pill"><i />{t.storeSetup}</span>
            <h3>{t.emptyTitle}</h3>
            <p>{t.emptyBody}</p>
            <small>{t.setupMessage}</small>
          </div>
        </div>
      );
    }
    if (list.length === 0) {
      return (
        <div className="catalog-state catalog-no-results" role="status">
          <div className="no-results-icon"><Icon name="search" /></div>
          <h3>{t.noResultsTitle}</h3>
          <p>{t.noResultsBody}</p>
          <button
            className="outline-button"
            type="button"
            onClick={() => { setSearch(""); setSelectedCategory("all"); }}
          >
            {t.clearFilters}
          </button>
        </div>
      );
    }
    return (
      <div className="product-grid">
        {list.map((product) => (
          <article className="product-card" data-testid="product-card" key={product.id}>
            <div className="product-image">
              <div className="product-image-placeholder">FRYZAR</div>
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={productName(product, language)}
                  loading="lazy"
                  onError={(event) => { event.currentTarget.style.display = "none"; }}
                />
              ) : null}
              {product.is_featured ? <span className="product-ribbon">{t.featured}</span> : null}
            </div>
            <div className="product-info">
              <small>{language === "ur" ? product.category_name_ur : product.category_name_en}</small>
              <h3>
                <button
                  className="product-detail-trigger"
                  type="button"
                  onClick={() => setSelectedProduct(product)}
                  aria-label={t.viewDetails + ": " + productName(product, language)}
                >
                  {productName(product, language)}
                </button>
              </h3>
              <p>{productDescription(product, language)}</p>
              <div className="product-footer">
                <strong>{money(product.price_paisa, language)}</strong>
                <button type="button" disabled={!storeOpen} onClick={() => setSelectedProduct(product)} aria-label={t.add}>
                  <Icon name="plus" />{t.add}
                </button>
              </div>
              <div style={{ marginTop: "8px" }}>
                <a
                  href={`/products/${encodeURIComponent(product.slug)}`}
                  onClick={(e) => navigate(`/products/${encodeURIComponent(product.slug)}`, e)}
                  style={{ fontSize: "10px", color: "var(--moss)", fontWeight: 700 }}
                >
                  {t.openFullPage} →
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    );
  }

  function renderTrackingWidget() {
    return (
      <div className="track-card">
        <form className="track-form" onSubmit={submitTracking}>
          <label htmlFor="tracking-token">{t.trackingInput}</label>
          <div className="track-input-row">
            <input
              id="tracking-token"
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={64}
              pattern="[a-fA-F0-9]{64}"
              value={trackingToken}
              onChange={(event) => {
                setTrackingToken(event.target.value.replace(/\s/g, ""));
                setTrackingError("");
                setTrackingResult(null);
              }}
              placeholder={t.trackingInput}
              required
            />
            <button type="submit" className="primary-button" disabled={trackingLoading}>
              {trackingLoading ? t.trackLoading : t.trackButton}
              {!trackingLoading ? <Icon name="arrow" /> : null}
            </button>
          </div>
        </form>
        {trackingError ? <div className="inline-error" role="alert">{trackingError}</div> : null}
        <p className="track-privacy"><Icon name="check" />{t.trackingPrivacy}</p>
        {trackingResult ? (
          <div className="tracking-result" aria-live="polite">
            <div className="tracking-result-head">
              <div><span className="success-label">{t.trackResult}</span><h3>{trackingResult.order.order_number}</h3></div>
              <span className={"tracking-current-status status-" + trackingResult.order.status}>
                {trackingStatusLabel(trackingResult.order.status)}
              </span>
            </div>
            <div className="tracking-meta">
              <div><small>{t.trackPlaced}</small><strong>{new Date(trackingResult.order.created_at).toLocaleString(language === "ur" ? "ur-PK" : "en-PK")}</strong></div>
              <div><small>{t.trackUpdated}</small><strong>{new Date(trackingResult.order.updated_at).toLocaleString(language === "ur" ? "ur-PK" : "en-PK")}</strong></div>
            </div>
            {trackingResult.order.status === "cancelled" || trackingResult.order.status === "rejected" ? (
              <div className="tracking-terminal-status">{trackingStatusLabel(trackingResult.order.status)}</div>
            ) : (
              <ol className="tracking-timeline">
                {(["pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered"] as const).map((status, index, all) => {
                  const currentIndex = all.indexOf(trackingResult.order.status as typeof all[number]);
                  const isCurrent = status === trackingResult.order.status;
                  const isComplete = currentIndex >= 0 && index <= currentIndex;
                  return (
                    <li key={status} className={(isComplete ? "complete" : "") + (isCurrent ? " current" : "")}>
                      <span className="timeline-dot">{isComplete ? <Icon name="check" /> : null}</span>
                      <span>{trackingStatusLabel(status)}</span>
                    </li>
                  );
                })}
              </ol>
            )}
            <div className="tracking-items">
              <h4>{t.trackItems}</h4>
              {trackingResult.items.map((item, index) => (
                <div className="tracking-item" key={trackingResult.order.id + "-" + index}>
                  <span>
                    <strong>{language === "ur" ? item.product_name_ur_snapshot : item.product_name_en_snapshot}</strong>
                    <small>{item.quantity} × {money(item.unit_price_paisa, language)}</small>
                  </span>
                  <strong>{money(item.line_total_paisa, language)}</strong>
                </div>
              ))}
            </div>
            <div className="tracking-totals">
              <div><span>{t.subtotal}</span><strong>{money(trackingResult.order.subtotal_paisa, language)}</strong></div>
              <div><span>{t.delivery}</span><strong>{money(trackingResult.order.delivery_fee_paisa, language)}</strong></div>
              {trackingResult.order.discount_paisa > 0 ? <div><span>Discount</span><strong>-{money(trackingResult.order.discount_paisa, language)}</strong></div> : null}
              <div className="tracking-total"><span>{t.estimatedTotal}</span><strong>{money(trackingResult.order.total_paisa, language)}</strong></div>
              <div><span>{t.trackPayment}</span><strong>{trackingResult.order.payment_method.replaceAll("_", " ")} · {trackingResult.order.payment_status === "collected" ? t.paymentCollected : t.paymentUnpaid}</strong></div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  function renderSupportFormCard() {
    if (supportSuccess) {
      return (
        <div className="support-success-box" style={{ padding: "1.5rem 0", textAlign: "center" }}>
          <div className="success-icon" style={{ margin: "0 auto 1rem" }}><Icon name="check" /></div>
          <p style={{ fontWeight: 600, color: "#059669" }}>{t.ticketSubmitted}</p>
          <button
            className="primary-button"
            type="button"
            onClick={() => { setSupportSuccess(false); setSupportOpen(false); }}
            style={{ marginTop: "1rem" }}
          >
            {t.close}
          </button>
        </div>
      );
    }
    return (
      <form className="checkout-form" onSubmit={(e) => void handleSupportSubmit(e)}>
        <label className="form-field">
          <span>{t.supportName}</span>
          <input name="customer_name" type="text" required maxLength={100} placeholder="e.g. Ali Khan" />
        </label>
        <label className="form-field">
          <span>{t.supportPhone}</span>
          <input name="customer_phone" type="tel" required placeholder="+923001234567" />
        </label>
        <label className="form-field">
          <span>{t.supportOrderId}</span>
          <input name="order_id" type="text" placeholder="Optional order UUID" />
        </label>
        <label className="form-field">
          <span>{t.supportSubject}</span>
          <input name="subject" type="text" required maxLength={150} placeholder="e.g. Order Status Inquiry" />
        </label>
        <label className="form-field">
          <span>{t.supportMessage}</span>
          <textarea name="message" required maxLength={1000} rows={4} />
        </label>
        {supportError ? <div className="inline-error" role="alert">{supportError}</div> : null}
        <button className="primary-button full-width" type="submit" disabled={supportSubmitting}>
          {supportSubmitting ? "..." : t.submitTicket}
        </button>
      </form>
    );
  }

  function renderMainView() {
    switch (route.page) {
      case "categories": {
        return (
          <div className="page-container">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <a href="/" onClick={(e) => navigate("/", e)}>{t.homeCrumb}</a>
              <span>/</span>
              <span>{t.categories}</span>
            </nav>
            <div className="page-hero-head">
              <div className="eyebrow"><span />{t.shopBy}</div>
              <h1>{t.categories}</h1>
              <p>{isUrdu ? "اقسام کے لحاظ سے تازہ کھانے اور روزمرہ کی اشیا دیکھیں۔" : "Explore FRYZAR departments and curated food & pantry categories."}</p>
            </div>
            {categories.length > 0 ? (
              <div className="category-cards-grid" style={{ marginBottom: "38px" }}>
                {categories.map((cat) => (
                  <a
                    key={cat.id}
                    href={`/categories/${encodeURIComponent(cat.slug)}`}
                    onClick={(e) => {
                      setSelectedCategory(cat.slug);
                      navigate(`/categories/${encodeURIComponent(cat.slug)}`, e);
                    }}
                    className="category-card-tile"
                  >
                    <div>
                      <h3>{isUrdu ? cat.name_ur : cat.name_en}</h3>
                      <p>{(isUrdu ? cat.description_ur : cat.description_en) || (isUrdu ? "اس قسم کی اشیا دیکھیں" : "Browse available items in this category")}</p>
                    </div>
                    <span className="text-link" style={{ alignSelf: "flex-start" }}>{t.browse} →</span>
                  </a>
                ))}
              </div>
            ) : null}
            <div className="category-row" aria-label={t.categories}>
              <button
                type="button"
                className={selectedCategory === "all" ? "category-chip active" : "category-chip"}
                onClick={() => { setSelectedCategory("all"); navigate("/categories"); }}
              >
                {t.all}
              </button>
              {categories.map((category) => (
                <button
                  type="button"
                  key={category.id}
                  className={selectedCategory === category.slug ? "category-chip active" : "category-chip"}
                  onClick={() => { setSelectedCategory(category.slug); navigate(`/categories/${encodeURIComponent(category.slug)}`); }}
                >
                  {isUrdu ? category.name_ur : category.name_en}
                </button>
              ))}
            </div>
            {renderProductGridSection(visibleProducts)}
            <BannerAd
              placementKey="category_footer"
              pageCategory="categories"
              pathname={pathname}
              language={language}
              config={monetizationConfig}
            />
          </div>
        );
      }

      case "products": {
        return (
          <div className="page-container">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <a href="/" onClick={(e) => navigate("/", e)}>{t.homeCrumb}</a>
              <span>/</span>
              <span>{t.all}</span>
            </nav>
            <div className="page-hero-head">
              <div className="eyebrow"><span />FRYZAR CATALOGUE</div>
              <h1>{t.all}</h1>
              <p>{t.shopBody}</p>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "14px", marginBottom: "24px" }}>
              <div className="category-row" style={{ margin: 0 }}>
                <button
                  type="button"
                  className={selectedCategory === "all" ? "category-chip active" : "category-chip"}
                  onClick={() => setSelectedCategory("all")}
                >
                  {t.all}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={selectedCategory === cat.slug ? "category-chip active" : "category-chip"}
                    onClick={() => setSelectedCategory(cat.slug)}
                  >
                    {isUrdu ? cat.name_ur : cat.name_en}
                  </button>
                ))}
              </div>
              <div className="search-box">
                <Icon name="search" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  aria-label={t.search}
                />
              </div>
            </div>
            {renderProductGridSection(visibleProducts)}
            <BannerAd
              placementKey="products_footer"
              pageCategory="products"
              pathname={pathname}
              language={language}
              config={monetizationConfig}
            />
          </div>
        );
      }

      case "product-detail": {
        const spVariant = standaloneProduct?.variants?.find((v) => v.id === standaloneVariantId) ?? null;
        const spGroups = standaloneProduct?.modifier_groups ?? [];
        const spValid = spGroups.every((g) => {
          const count = (standaloneModifiers[g.id] ?? []).length;
          if (g.is_required && count < Math.max(1, g.min_selection)) return false;
          if (g.min_selection > 0 && count < g.min_selection) return false;
          return true;
        });
        const spUnitPrice = (spVariant ? spVariant.price_paisa : (standaloneProduct?.price_paisa ?? 0)) +
          spGroups.reduce((sum, g) => {
            const ids = standaloneModifiers[g.id] ?? [];
            return sum + (g.options || []).filter((o) => ids.includes(o.id)).reduce((s, o) => s + o.price_paisa, 0);
          }, 0);
        const related = products.filter((p) => p.id !== standaloneProduct?.id).slice(0, 4);

        return (
          <div className="page-container">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <a href="/" onClick={(e) => navigate("/", e)}>{t.homeCrumb}</a>
              <span>/</span>
              <a href="/products" onClick={(e) => navigate("/products", e)}>{t.all}</a>
              <span>/</span>
              <span>{standaloneProduct ? productName(standaloneProduct, language) : route.slug}</span>
            </nav>

            {standaloneLoading ? (
              <div className="catalog-state"><div className="loader" /><p>{t.loading}</p></div>
            ) : !standaloneProduct ? (
              <div className="catalog-state state-card">
                <h3>{t.notAvailable}</h3>
                <a href="/products" onClick={(e) => navigate("/products", e)} className="primary-link">{t.browse}</a>
              </div>
            ) : (
              <>
                <div className="standalone-product-layout">
                  <div className="standalone-product-media">
                    <div className="product-image-placeholder">FRYZAR</div>
                    {standaloneProduct.image_url ? (
                      <img
                        src={standaloneProduct.image_url}
                        alt={productName(standaloneProduct, language)}
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    ) : null}
                  </div>
                  <div>
                    <small style={{ color: "var(--moss)", fontWeight: 700 }}>
                      {isUrdu ? standaloneProduct.category_name_ur : standaloneProduct.category_name_en}
                    </small>
                    <h1 style={{ margin: "8px 0 12px", font: "700 32px var(--display)", color: "var(--forest-deep)" }}>
                      {productName(standaloneProduct, language)}
                    </h1>
                    <p style={{ color: "var(--muted)", fontSize: "14px", lineHeight: 1.75 }}>
                      {productDescription(standaloneProduct, language)}
                    </p>
                    <strong style={{ display: "block", margin: "18px 0", font: "800 24px var(--display)", color: "var(--forest)" }}>
                      {money(spUnitPrice * standaloneQty, language)}
                    </strong>

                    {standaloneProduct.variants && standaloneProduct.variants.length > 0 ? (
                      <div style={{ margin: "16px 0" }}>
                        <strong style={{ display: "block", fontSize: "12px", marginBottom: "8px" }}>
                          {isUrdu ? "سائز / قسم" : "Select Size / Variant"}
                        </strong>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          {standaloneProduct.variants.map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              className={standaloneVariantId === v.id ? "primary-button" : "outline-button"}
                              disabled={!v.is_available}
                              onClick={() => setStandaloneVariantId(v.id)}
                            >
                              {isUrdu ? v.name_ur : v.name_en} · {money(v.price_paisa, language)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {spGroups.map((group) => {
                      const selectedIds = standaloneModifiers[group.id] ?? [];
                      return (
                        <div key={group.id} style={{ margin: "16px 0" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                            <strong>{isUrdu ? group.name_ur : group.name_en}</strong>
                            <span>{group.is_required || group.min_selection > 0 ? (isUrdu ? "* لازمی" : "* Required") : (isUrdu ? "(اختیاری)" : "(Optional)")}</span>
                          </div>
                          <div style={{ display: "grid", gap: "6px", marginTop: "8px" }}>
                            {(group.options || []).map((opt) => (
                              <label key={opt.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: "8px" }}>
                                <span style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                  <input
                                    type={group.max_selection === 1 ? "radio" : "checkbox"}
                                    checked={selectedIds.includes(opt.id)}
                                    disabled={!opt.is_available}
                                    onChange={() => toggleOptionMap(setStandaloneModifiers, group.id, opt.id, group.max_selection)}
                                  />
                                  <span>{isUrdu ? opt.name_ur : opt.name_en}</span>
                                </span>
                                <small>+{money(opt.price_paisa, language)}</small>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "22px" }}>
                      <div className="quantity-control" style={{ marginTop: 0 }}>
                        <button type="button" onClick={() => setStandaloneQty((q) => Math.max(1, q - 1))} aria-label={t.decreaseQty}><Icon name="minus" /></button>
                        <span>{standaloneQty}</span>
                        <button type="button" onClick={() => setStandaloneQty((q) => Math.min(20, q + 1))} aria-label={t.increaseQty}><Icon name="plus" /></button>
                      </div>
                      <button
                        type="button"
                        className="primary-button"
                        disabled={!storeOpen || !standaloneProduct.is_available || !spValid}
                        onClick={() => {
                          addConfiguredItemToCart(standaloneProduct, standaloneProduct, standaloneVariantId, standaloneModifiers, standaloneQty);
                          setCartOpen(true);
                        }}
                      >
                        <Icon name="plus" />{t.add}
                      </button>
                    </div>
                  </div>
                </div>

                {related.length > 0 ? (
                  <section style={{ marginTop: "48px" }}>
                    <h2 style={{ font: "700 24px var(--display)", color: "var(--forest-deep)", marginBottom: "18px" }}>
                      {isUrdu ? "مزید اشیا" : "More from FRYZAR"}
                    </h2>
                    {renderProductGridSection(related)}
                  </section>
                ) : null}

                <NativeAd
                  placementKey="product_below_related"
                  pageCategory="product-detail"
                  pathname={pathname}
                  language={language}
                  config={monetizationConfig}
                />
              </>
            )}
          </div>
        );
      }

      case "search": {
        return (
          <div className="page-container">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <a href="/" onClick={(e) => navigate("/", e)}>{t.homeCrumb}</a>
              <span>/</span>
              <span>{t.search}</span>
            </nav>
            <div className="page-hero-head">
              <div className="eyebrow"><span />{t.search}</div>
              <h1>{isUrdu ? "اشیا تلاش کریں" : "Search FRYZAR"}</h1>
              <div className="search-box" style={{ width: "min(520px, 100%)", marginTop: "18px" }}>
                <Icon name="search" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  aria-label={t.search}
                  autoFocus
                />
                {search ? <button type="button" onClick={() => setSearch("")} aria-label={t.close}><Icon name="close" /></button> : null}
              </div>
            </div>
            {renderProductGridSection(visibleProducts)}
            <BannerAd
              placementKey="search_below_results"
              pageCategory="search"
              pathname={pathname}
              language={language}
              config={monetizationConfig}
            />
          </div>
        );
      }

      case "promotions": {
        const featuredProducts = products.filter((p) => p.is_featured === 1);
        return (
          <div className="page-container">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <a href="/" onClick={(e) => navigate("/", e)}>{t.homeCrumb}</a>
              <span>/</span>
              <span>{t.promotionsNav}</span>
            </nav>
            <div className="page-hero-head">
              <div className="eyebrow"><span />VALUE &amp; OFFERS</div>
              <h1>{isUrdu ? "موجودہ رعایتیں اور کوپن" : "Promotions & Active Offers"}</h1>
              <p>{isUrdu ? "چیک آؤٹ پر درست کوپن کوڈ استعمال کر کے رعایت حاصل کریں۔ تمام قیمتوں اور رعایتوں کی حتمی تصدیق سرور پر کی جاتی ہے۔" : "Apply active FRYZAR coupon codes at checkout. Every discount and minimum-order threshold is verified server-side in PKR."}</p>
            </div>

            {promotions.length === 0 ? (
              <div className="catalog-state state-card" style={{ marginBottom: "36px" }}>
                <h3>{isUrdu ? "اس وقت کوئی کوپن مہم فعال نہیں ہے" : "No public coupon campaigns active right now"}</h3>
                <p>{isUrdu ? "ہماری نمایاں اشیا نیچے دیکھیں۔" : "Check back during seasonal specials or browse our featured items below."}</p>
              </div>
            ) : (
              <div className="promo-grid" style={{ marginBottom: "40px" }}>
                {promotions.map((promo) => (
                  <article className="promo-card" key={promo.id}>
                    <div>
                      <span className="promo-badge">
                        {promo.discount_type === "percentage"
                          ? `${promo.discount_value}% OFF`
                          : `${money(promo.discount_value, language)} OFF`}
                      </span>
                      <h3 style={{ margin: "12px 0 6px", color: "var(--forest-deep)" }}>{promo.code}</h3>
                      <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>
                        {(isUrdu ? promo.description_ur : promo.description_en) ||
                          (promo.min_order_paisa > 0 ? `${t.minOrder}: ${money(promo.min_order_paisa, language)}` : "Valid on eligible orders")}
                      </p>
                    </div>
                    <div className="promo-code-row">
                      <code>{promo.code}</code>
                      <button
                        type="button"
                        className="outline-button"
                        onClick={() => {
                          setCouponInput(promo.code);
                          setCopiedPromo(promo.code);
                          void navigator.clipboard?.writeText(promo.code).catch(() => {});
                          window.setTimeout(() => setCopiedPromo(""), 1800);
                        }}
                      >
                        {copiedPromo === promo.code ? t.copied : t.copy}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {featuredProducts.length > 0 ? (
              <section>
                <h2 style={{ font: "700 24px var(--display)", color: "var(--forest-deep)", marginBottom: "18px" }}>
                  {t.featured}
                </h2>
                {renderProductGridSection(featuredProducts)}
              </section>
            ) : null}

            <NativeAd
              placementKey="promotions_sponsor_card"
              pageCategory="promotions"
              pathname={pathname}
              language={language}
              config={monetizationConfig}
            />
          </div>
        );
      }

      case "basket": {
        return (
          <div className="page-container">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <a href="/" onClick={(e) => navigate("/", e)}>{t.homeCrumb}</a>
              <span>/</span>
              <span>{t.basket}</span>
            </nav>
            <div className="standalone-card">
              <h1 style={{ margin: "0 0 18px", font: "700 28px var(--display)", color: "var(--forest-deep)" }}>{t.basket}</h1>
              {cart.length === 0 ? (
                <div className="drawer-empty" style={{ padding: "28px 0" }}>
                  <div className="drawer-bag"><Icon name="bag" /></div>
                  <h3>{t.emptyBasket}</h3>
                  <p>{t.emptyBasketBody}</p>
                  <a href="/products" onClick={(e) => navigate("/products", e)} className="primary-link">{t.continueShopping}</a>
                </div>
              ) : (
                <>
                  <div className="drawer-items">
                    {cart.map((item) => (
                      <div className="drawer-item" key={item.id}>
                        <div className="drawer-item-art">F.</div>
                        <div className="drawer-item-copy">
                          <strong>{productName(item.product, language)}</strong>
                          {item.variant ? <small>{isUrdu ? item.variant.name_ur : item.variant.name_en}</small> : null}
                          {item.selected_modifiers && item.selected_modifiers.length > 0 ? (
                            <small>{item.selected_modifiers.map((m) => (isUrdu ? m.name_ur : m.name_en)).join(", ")}</small>
                          ) : null}
                          <small>{money(item.unit_price_paisa, language)}</small>
                          <div className="quantity-control">
                            <button type="button" onClick={() => changeCartQuantity(item.id, -1)} aria-label={t.remove}><Icon name="minus" /></button>
                            <span>{item.quantity}</span>
                            <button type="button" onClick={() => changeCartQuantity(item.id, 1)} aria-label={t.add}><Icon name="plus" /></button>
                          </div>
                        </div>
                        <strong className="drawer-line-total">{money(item.unit_price_paisa * item.quantity, language)}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="drawer-summary">
                    <div><span>{t.subtotal}</span><strong>{money(subtotal, language)}</strong></div>
                    <div><span>{t.delivery}</span><strong>{selectedZone ? money(deliveryFee, language) : "—"}</strong></div>
                    <div className="summary-total"><span>{t.estimatedTotal}</span><strong>{money(total, language)}</strong></div>
                    <small>{t.estimateNote}</small>
                    {selectedZone && !minimumMet ? <small className="form-error">{t.minOrder}: {money(minimumOrder, language)}</small> : null}
                    <button
                      className="primary-button full-width"
                      type="button"
                      disabled={!storeOpen || !selectedZone || !minimumMet}
                      onClick={() => navigate("/checkout")}
                    >
                      {t.checkout}<Icon name="arrow" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      }

      case "checkout": {
        return (
          <div className="page-container">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <a href="/" onClick={(e) => navigate("/", e)}>{t.homeCrumb}</a>
              <span>/</span>
              <a href="/basket" onClick={(e) => navigate("/basket", e)}>{t.basket}</a>
              <span>/</span>
              <span>{t.checkoutTitle}</span>
            </nav>
            <div className="standalone-card">
              <h1 style={{ margin: "0 0 8px", font: "700 28px var(--display)", color: "var(--forest-deep)" }}>{t.checkoutTitle}</h1>
              <p className="checkout-intro">{t.checkoutBody}</p>
              {cart.length === 0 ? (
                <div className="drawer-empty">
                  <h3>{t.emptyBasket}</h3>
                  <a href="/products" onClick={(e) => navigate("/products", e)} className="primary-link">{t.continueShopping}</a>
                </div>
              ) : (
                <form className="checkout-form" onSubmit={submitOrder}>
                  <label>{t.fullName}<input name="customer_name" type="text" minLength={2} maxLength={100} autoComplete="name" required /></label>
                  <label>{t.phone}<input name="customer_phone" type="tel" minLength={10} maxLength={20} autoComplete="tel" required /></label>
                  <label>{t.address}<textarea name="delivery_address" minLength={8} maxLength={500} autoComplete="street-address" rows={3} required /></label>
                  <label>{t.area}
                    <select name="delivery_zone_id" value={selectedZoneId} onChange={(e) => setSelectedZoneId(e.target.value)} required>
                      <option value="">{t.selectArea}</option>
                      {zones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {isUrdu ? zone.name_ur : zone.name_en} · {money(zone.delivery_fee_paisa, language)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>{t.notes}<textarea name="notes" maxLength={500} rows={2} /></label>
                  <div className="payment-choice">
                    <span className="payment-choice-mark"><Icon name="check" /></span>
                    <span><strong>{t.cod}</strong><small>{t.codInfo}</small></span>
                  </div>
                  <div className="checkout-summary">
                    <div><span>{t.subtotal}</span><strong>{money(subtotal, language)}</strong></div>
                    <div><span>{t.delivery}</span><strong>{money(deliveryFee, language)}</strong></div>
                    {appliedCoupon ? (
                      <div style={{ color: "#059669" }}>
                        <span>Discount ({appliedCoupon.code})</span>
                        <strong>-{money(appliedCoupon.discount_paisa, language)}</strong>
                      </div>
                    ) : null}
                    <div className="summary-total"><span>{t.estimatedTotal}</span><strong>{money(total, language)}</strong></div>
                    <small>{t.estimateNote}</small>
                  </div>
                  {checkoutError ? <div className="inline-error" role="alert">{checkoutError}</div> : null}
                  <button className="primary-button full-width" type="submit" disabled={submitting || !storeOpen || !selectedZone || !minimumMet}>
                    {submitting ? t.placing : t.placeOrder}
                    {!submitting ? <Icon name="arrow" /> : null}
                  </button>
                </form>
              )}
            </div>
          </div>
        );
      }

      case "order-confirmation": {
        const confirmed = lastConfirmedOrder ?? orderComplete;
        return (
          <div className="page-container">
            <div className="standalone-card" style={{ textAlign: "center" }}>
              <div className="success-icon"><Icon name="check" /></div>
              <span className="success-label">FRYZAR</span>
              <h1 style={{ margin: "10px 0 8px", font: "700 28px var(--display)", color: "var(--forest-deep)" }}>{t.orderConfirmed}</h1>
              {confirmed ? (
                <>
                  <p>{t.orderMessage}</p>
                  <div className="order-number-box"><small>{t.orderNumber}</small><strong>{confirmed.order.order_number}</strong></div>
                  <div className="tracking-box">
                    <small>{t.trackingCode}</small>
                    <code>{confirmed.tracking_token}</code>
                    <p>{t.trackingNote}</p>
                    <button className="outline-button full-width" type="button" onClick={() => void copyTrackingCode(confirmed.tracking_token)}>
                      {copied ? t.copied : t.copy}
                    </button>
                  </div>
                  <div style={{ display: "grid", gap: "10px", marginTop: "16px" }}>
                    <button
                      type="button"
                      className="primary-button full-width"
                      onClick={() => navigate(`/track/${confirmed.tracking_token}`)}
                    >
                      {t.trackOrder}
                    </button>
                  </div>
                </>
              ) : (
                <p>{isUrdu ? "آپ اپنے 64 حروف کے ٹریکنگ کوڈ کے ذریعے اپنا آرڈر دیکھ سکتے ہیں۔" : "Use your 64-character private tracking code to view order status at any time."}</p>
              )}
            </div>
          </div>
        );
      }

      case "order-tracking": {
        return (
          <div className="page-container">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <a href="/" onClick={(e) => navigate("/", e)}>{t.homeCrumb}</a>
              <span>/</span>
              <span>{t.trackOrder}</span>
            </nav>
            <div className="page-hero-head">
              <div className="eyebrow"><span />{t.trackOrder}</div>
              <h1>{t.trackTitle}</h1>
              <p>{t.trackBody}</p>
            </div>
            {renderTrackingWidget()}
          </div>
        );
      }

      case "support": {
        return (
          <div className="page-container">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <a href="/" onClick={(e) => navigate("/", e)}>{t.homeCrumb}</a>
              <span>/</span>
              <span>{t.support}</span>
            </nav>
            <div className="page-hero-head">
              <div className="eyebrow"><span />CUSTOMER CARE</div>
              <h1>{t.supportModalTitle}</h1>
              <p>{isUrdu ? "آرڈر، ڈیلیوری زون یا معیار کے بارے میں کسی بھی سوال کے لیے نیچے فارم پُر کریں۔" : "Have a question about an order, delivery zone, or menu item? Send our operations team a direct support ticket."}</p>
            </div>
            <div className="standalone-card">
              {whatsappUrl ? (
                <div style={{ marginBottom: "20px", padding: "12px 14px", borderRadius: "8px", background: "#eef5ec", fontSize: "13px" }}>
                  <strong>WhatsApp Support: </strong>
                  <a href={whatsappUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "underline", color: "var(--forest)" }}>
                    Chat with FRYZAR on WhatsApp
                  </a>
                </div>
              ) : null}
              {renderSupportFormCard()}
            </div>
          </div>
        );
      }

      case "about": {
        return (
          <div className="page-container">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <a href="/" onClick={(e) => navigate("/", e)}>{t.homeCrumb}</a>
              <span>/</span>
              <span>{t.aboutNav}</span>
            </nav>
            <div className="page-hero-head">
              <div className="eyebrow"><span />ABOUT FRYZAR</div>
              <h1>{isUrdu ? "تازہ معیار، شفاف قیمت، مقامی بھروسہ" : "Built for Fresh Neighbourhood Food & Everyday Essentials"}</h1>
              <p>{isUrdu ? "FRYZAR ایک جدید دو لسانی پلیٹ فارم ہے جو تازہ کھانوں اور روزمرہ کی اشیا کو سادہ، محفوظ اور واضح طریقے سے آپ تک پہنچاتا ہے۔" : "FRYZAR combines prepared kitchen favourites, groceries, and practical culinary guides in a calm, bilingual English and Urdu ordering experience."}</p>
            </div>
            <div className="policy-prose">
              <h2>{isUrdu ? "ہمارا مقصد" : "Our Approach"}</h2>
              <p>{isUrdu ? "ہم بے جا اکاؤنٹ رجسٹریشن اور پیچیدہ مراحل کے بغیر صاف ستھرا آرڈرنگ نظام فراہم کرتے ہیں۔ ہر آرڈر کی قیمت، ڈیلیوری فیس اور اسٹاک کی تصدیق براہِ راست سرور پر کی جاتی ہے۔" : "Ordering local food and household essentials should never require forced sign-ups or confusing hidden charges. Every product price, variant option, coupon rule, and delivery zone fee on FRYZAR is calculated authoritatively in PKR before confirmation."}</p>
              <h2>{isUrdu ? "کچن اور اسٹاک کا معیار" : "Kitchen & Inventory Discipline"}</h2>
              <p>{isUrdu ? "ہماری ٹیم ہر آرڈر کو مرحلہ وار ٹریک کرتی ہے—تصدیق، کچن کی تیاری، رائیڈر ڈسپیچ اور حوالگی تک—تاکہ آپ کو ہمیشہ تازہ اشیا ملیں۔" : "Every order moves through structured preparation stages—from confirmation and kitchen prep to rider dispatch—while recipe ingredients and stock quantities are tracked accurately behind the scenes."}</p>
              <h2>{isUrdu ? "ڈیلیوری کوریج" : "Where We Deliver"}</h2>
              <p>{isUrdu ? "کھانے اور گروسری کی ڈیلیوری اس وقت پاکستان کے منتخب فعال علاقوں میں پاکستانی روپے (PKR) میں دستیاب ہے، جبکہ ہماری فوڈ گائیڈز دنیا بھر کے قارئین کے لیے مفت دستیاب ہیں۔" : "Physical food and grocery delivery currently serves our active Pakistani delivery zones priced in Pakistani Rupees (PKR), while our bilingual food guides and kitchen storage articles are open to readers worldwide."}</p>
            </div>
            <BannerAd
              placementKey="about_footer"
              pageCategory="about"
              pathname={pathname}
              language={language}
              config={monetizationConfig}
            />
          </div>
        );
      }

      case "privacy-policy": {
        return (
          <div className="page-container">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <a href="/" onClick={(e) => navigate("/", e)}>{t.homeCrumb}</a>
              <span>/</span>
              <span>Privacy Policy</span>
            </nav>
            <div className="policy-prose">
              <h1 style={{ marginTop: 0, font: "700 32px var(--display)", color: "var(--forest-deep)" }}>Privacy Policy</h1>
              <p>FRYZAR collects only the minimum information required to prepare, deliver, and support your order.</p>
              <h2>1. Information Collected at Checkout &amp; Support</h2>
              <ul>
                <li>Full name, mobile number, delivery zone, and street delivery address submitted voluntarily when placing an order.</li>
                <li>Optional order notes and customer support messages.</li>
              </ul>
              <h2>2. Private Order Tracking Protection</h2>
              <p>Each order generates a cryptographically random 64-character hexadecimal tracking code. Only its SHA-256 hash is stored in our database, and public tracking lookups never display your phone number or street address.</p>
              <h2>3. Role-Based Staff Privacy</h2>
              <p>Kitchen preparation screens only display order numbers, items, and preparation notes—never customer phone numbers or addresses.</p>
              <h2>4. Advertising &amp; Non-PII Telemetry</h2>
              <p>Transactional pages (basket, checkout, order confirmation, tracking, support, and policy pages) never load third-party ad scripts. On public browse and editorial pages where sponsored placements may appear when enabled, FRYZAR never shares customer names, phone numbers, addresses, or order tokens with ad networks.</p>
              <div style={{ marginTop: "20px", padding: "16px", border: "1px solid var(--line)", borderRadius: "10px", background: "#f7faf5" }}>
                <strong style={{ display: "block", marginBottom: "8px" }}>Advertising Cookie / Script Preference</strong>
                <p style={{ margin: "0 0 12px", fontSize: "12px" }}>
                  Current preference: <strong>{adConsent}</strong>
                </p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="outline-button"
                    onClick={() => { writeAdConsent("granted"); setAdConsent("granted"); }}
                  >
                    Allow Sponsored Placements
                  </button>
                  <button
                    type="button"
                    className="outline-button"
                    onClick={() => { writeAdConsent("declined"); setAdConsent("declined"); }}
                  >
                    Opt Out of Consent-Gated Ads
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case "terms": {
        return (
          <div className="page-container">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <a href="/" onClick={(e) => navigate("/", e)}>{t.homeCrumb}</a>
              <span>/</span>
              <span>Terms &amp; Conditions</span>
            </nav>
            <div className="policy-prose">
              <h1 style={{ marginTop: 0, font: "700 32px var(--display)", color: "var(--forest-deep)" }}>Terms &amp; Conditions</h1>
              <h2>1. Service Scope &amp; Currency</h2>
              <p>FRYZAR operates food and everyday essentials ordering within active Pakistani delivery zones. All prices, delivery fees, and discounts are denominated in Pakistani Rupees (PKR) using server-verified integer paisa arithmetic.</p>
              <h2>2. Guest Ordering &amp; Accuracy</h2>
              <p>Customers must provide a reachable Pakistani mobile number and accurate street address within the selected delivery zone. Orders with unreachable contact details or outside active zones may be cancelled.</p>
              <h2>3. Server-Authoritative Pricing &amp; Availability</h2>
              <p>Basket totals shown in the browser are estimates until verified by the FRYZAR API at checkout against live product availability, stock levels, modifier rules, and zone minimums.</p>
              <h2>4. Payment Terms</h2>
              <p>Cash on Delivery (COD) is payable in full upon order handoff to our rider. Manual bank transfer remains disabled unless verified private receipt storage is active.</p>
            </div>
          </div>
        );
      }

      case "refund-policy": {
        return (
          <div className="page-container">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <a href="/" onClick={(e) => navigate("/", e)}>{t.homeCrumb}</a>
              <span>/</span>
              <span>Refund &amp; Cancellation Policy</span>
            </nav>
            <div className="policy-prose">
              <h1 style={{ marginTop: 0, font: "700 32px var(--display)", color: "var(--forest-deep)" }}>Refund &amp; Cancellation Policy</h1>
              <h2>1. Order Cancellations</h2>
              <p>Orders may be cancelled prior to kitchen preparation by contacting FRYZAR support with your order number. Once fresh food preparation or dispatch has started, cancellation may not be possible.</p>
              <h2>2. Missing, Incorrect, or Damaged Items</h2>
              <p>If an item arrives damaged, incomplete, or materially different from what was ordered, submit a support request on our Contact page within 2 hours of delivery.</p>
              <h2>3. Refund Verification &amp; Settlement</h2>
              <p>Approved full or partial refunds are recorded in our audited financial ledger and settled through our customer care team in PKR.</p>
            </div>
          </div>
        );
      }

      case "delivery-policy": {
        return (
          <div className="page-container">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <a href="/" onClick={(e) => navigate("/", e)}>{t.homeCrumb}</a>
              <span>/</span>
              <span>Delivery Policy</span>
            </nav>
            <div className="policy-prose">
              <h1 style={{ marginTop: 0, font: "700 32px var(--display)", color: "var(--forest-deep)" }}>Delivery Policy &amp; Coverage</h1>
              <p>FRYZAR delivers fresh prepared meals and everyday groceries exclusively within active Pakistani delivery zones configured below. International visitors are welcome to browse our catalogue and read our culinary guides, while checkout requires an active local zone.</p>
              <h2>Active Delivery Zones</h2>
              {zones.length === 0 ? (
                <p>Delivery zones are currently being configured prior to store opening.</p>
              ) : (
                <div className="zones-table-wrap">
                  <table className="zones-table">
                    <thead>
                      <tr>
                        <th>Zone</th>
                        <th>City</th>
                        <th>Delivery Fee</th>
                        <th>Minimum Order</th>
                        <th>Estimated Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {zones.map((z) => (
                        <tr key={z.id}>
                          <td><strong>{isUrdu ? z.name_ur : z.name_en}</strong></td>
                          <td>{z.city}</td>
                          <td>{money(z.delivery_fee_paisa, language)}</td>
                          <td>{money(z.minimum_order_paisa, language)}</td>
                          <td>{z.estimated_mins_min ?? 30}–{z.estimated_mins_max ?? 50} mins</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      }

      case "editorial-list": {
        return (
          <div className="page-container">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <a href="/" onClick={(e) => navigate("/", e)}>{t.homeCrumb}</a>
              <span>/</span>
              <span>{t.guidesNav}</span>
            </nav>
            <div className="page-hero-head">
              <div className="eyebrow"><span />FRYZAR EDITORIAL KITCHEN</div>
              <h1>{isUrdu ? "فوڈ گائیڈز، ترکیبیں اور کچن کے اصول" : "Food Guides, Storage Tips & Kitchen Craft"}</h1>
              <p>{isUrdu ? "کھانوں کے معیار، ذخیرہ اندوزی اور متوازن دسترخوان کے لیے مستند دو لسانی مضامین۔" : "Practical bilingual guides on crisp food science, warm-climate pantry storage, and zero-waste family meal planning."}</p>
            </div>
            <div className="editorial-grid">
              {allGuides.map((post) => (
                <article className="editorial-card" key={post.id}>
                  <div>
                    <div className="editorial-meta">
                      <span>{post.category}</span>
                      <span>·</span>
                      <span>{post.reading_minutes} min read</span>
                    </div>
                    <h3>{isUrdu ? post.title_ur : post.title_en}</h3>
                    <p>{isUrdu ? post.excerpt_ur : post.excerpt_en}</p>
                  </div>
                  <a
                    href={`/guides/${encodeURIComponent(post.slug)}`}
                    onClick={(e) => navigate(`/guides/${encodeURIComponent(post.slug)}`, e)}
                    className="text-link"
                    style={{ alignSelf: "flex-start" }}
                  >
                    {isUrdu ? "مکمل مضمون پڑھیں ←" : "Read full guide →"}
                  </a>
                </article>
              ))}
            </div>
            <BannerAd
              placementKey="editorial_footer"
              pageCategory="editorial-list"
              pathname={pathname}
              language={language}
              config={monetizationConfig}
            />
          </div>
        );
      }

      case "editorial-detail": {
        const post = activeArticle ?? BUILTIN_EDITORIAL_GUIDES.find((g) => g.slug === route.slug) ?? null;
        const paragraphs = ((isUrdu ? post?.body_ur : post?.body_en) ?? "").split(/\n\n+/).filter(Boolean);
        return (
          <div className="page-container">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <a href="/" onClick={(e) => navigate("/", e)}>{t.homeCrumb}</a>
              <span>/</span>
              <a href="/guides" onClick={(e) => navigate("/guides", e)}>{t.guidesNav}</a>
              <span>/</span>
              <span>{post ? (isUrdu ? post.title_ur : post.title_en) : route.slug}</span>
            </nav>
            {!post ? (
              <div className="catalog-state state-card">
                <h3>{isUrdu ? "مضمون نہیں ملا" : "Guide not found"}</h3>
                <a href="/guides" onClick={(e) => navigate("/guides", e)} className="primary-link">{t.guidesNav}</a>
              </div>
            ) : (
              <article className="article-reader">
                <div className="editorial-meta">
                  <span>{post.category}</span>
                  <span>·</span>
                  <span>{post.reading_minutes} min read</span>
                </div>
                <h1>{isUrdu ? post.title_ur : post.title_en}</h1>
                <p className="article-lead">{isUrdu ? post.excerpt_ur : post.excerpt_en}</p>
                <div className="article-body">
                  {paragraphs.map((para, idx) => (
                    <div key={idx}>
                      <p>{para}</p>
                      {idx === 0 ? (
                        <NativeAd
                          placementKey="editorial_in_article"
                          pageCategory="editorial-detail"
                          pathname={pathname}
                          language={language}
                          config={monetizationConfig}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                  <a href="/guides" onClick={(e) => navigate("/guides", e)} className="outline-button" style={{ display: "inline-flex", alignItems: "center" }}>
                    ← {t.guidesNav}
                  </a>
                  <a href="/products" onClick={(e) => navigate("/products", e)} className="primary-link">
                    {t.browse}<Icon name="arrow" />
                  </a>
                </div>
              </article>
            )}
            <BannerAd
              placementKey="editorial_footer"
              pageCategory="editorial-detail"
              pathname={pathname}
              language={language}
              config={monetizationConfig}
            />
          </div>
        );
      }

      case "home":
      default: {
        return (
          <>
            <section className="hero-section">
              <div className="hero-copy">
                <div className="eyebrow"><span />{t.eyebrow}</div>
                <h1>{t.heroTitle}<br /><em>{t.heroAccent}</em></h1>
                <p>{t.heroBody}</p>
                <div className="hero-actions">
                  <a href="#shop" className="primary-link">{t.browse}<Icon name="arrow" /></a>
                  <a href="/guides" onClick={(e) => navigate("/guides", e)} className="text-link">{t.guidesNav}</a>
                </div>

                <div className="hero-promises">
                  <span><Icon name="check" />{t.promiseOne}</span>
                  <span><Icon name="check" />{t.promiseTwo}</span>
                  <span><Icon name="check" />{t.promiseThree}</span>
                </div>
              </div>

              <div className="hero-art" aria-label="Illustration of a local market basket">
                <div className="hero-art-halo" />
                <div className="hero-art-orbit orbit-one" />
                <div className="hero-art-orbit orbit-two" />
                <div className="market-card">
                  <div className="market-card-top">
                    <span className="mini-brand">F.</span>
                    <span className="market-status"><span />{isUrdu ? "مقامی اسٹور" : "LOCAL STORE"}</span>
                  </div>
                  <div className="basket-illustration">
                    <div className="basket-handle" />
                    <div className="basket-fruit fruit-one" />
                    <div className="basket-fruit fruit-two" />
                    <div className="basket-fruit fruit-three" />
                    <div className="basket-fruit fruit-four" />
                    <div className="basket-leaf leaf-one" />
                    <div className="basket-leaf leaf-two" />
                    <div className="basket-body"><span /></div>
                  </div>
                  <div className="market-card-bottom">
                    <strong>{isUrdu ? "آپ کے قریب، ہر روز" : "Close to home, every day"}</strong>
                    <small>{isUrdu ? "ضروری اشیا ایک جگہ" : "Everyday things in one place"}</small>
                  </div>
                </div>
                <div className="floating-note note-top"><span className="note-icon"><Icon name="pin" /></span><span>{isUrdu ? "مقامی انتخاب" : "Local selection"}</span></div>
                <div className="floating-note note-bottom"><span className="note-check"><Icon name="check" /></span><span>{isUrdu ? "آسان آرڈر" : "Easy ordering"}</span></div>
                <div className="hero-art-spark spark-one">✳</div>
                <div className="hero-art-spark spark-two">✦</div>
              </div>

              <div className="hero-bottom">
                <span className="hero-index">01 / 03</span>
                <span className="hero-bottom-line" />
                <span>{isUrdu ? "مقامی طور پر بہتر خریداری" : "A better local shopping experience"}</span>
              </div>
            </section>

            <section className="shop-section" id="shop">
              <div className="section-heading">
                <div>
                  <div className="eyebrow"><span />{t.shopBy}</div>
                  <h2>{t.shopTitle}</h2>
                  <p>{t.shopBody}</p>
                </div>
                <div className="search-box">
                  <Icon name="search" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t.searchPlaceholder}
                    aria-label={t.search}
                  />
                  {search ? <button type="button" onClick={() => setSearch("")} aria-label={t.close}><Icon name="close" /></button> : null}
                </div>
              </div>

              <div className="category-row" aria-label={t.categories}>
                <button
                  type="button"
                  className={selectedCategory === "all" ? "category-chip active" : "category-chip"}
                  aria-pressed={selectedCategory === "all"}
                  onClick={() => setSelectedCategory("all")}
                >
                  {t.all}
                </button>
                {categories.map((category) => (
                  <button
                    type="button"
                    key={category.id}
                    className={selectedCategory === category.slug ? "category-chip active" : "category-chip"}
                    aria-pressed={selectedCategory === category.slug}
                    onClick={() => setSelectedCategory(category.slug)}
                  >
                    {language === "ur" ? category.name_ur : category.name_en}
                  </button>
                ))}
              </div>

              {renderProductGridSection(visibleProducts)}

              {apiState === "ready" && products.length > 0 ? (
                <div className="catalog-footnote">
                  <span>{visibleProducts.length} / {products.length}</span>
                  <span>{isUrdu ? "دستیاب مصنوعات" : "available products"}</span>
                </div>
              ) : null}

              <NativeAd
                placementKey="home_mid_feed"
                pageCategory="home"
                pathname={pathname}
                language={language}
                config={monetizationConfig}
              />
            </section>

            <section className="how-section" id="how-it-works">
              <div className="how-intro">
                <div className="eyebrow"><span />{isUrdu ? "سادہ اور واضح" : "SIMPLE BY DESIGN"}</div>
                <h2>{t.whyTitle}</h2>
                <p>{t.whyBody}</p>
              </div>
              <div className="steps-grid">
                <article className="step-card">
                  <span className="step-number">01</span>
                  <div className="step-icon icon-browse"><span /><i /><b /></div>
                  <h3>{t.stepOne}</h3>
                  <p>{t.stepOneBody}</p>
                </article>
                <article className="step-card">
                  <span className="step-number">02</span>
                  <div className="step-icon icon-delivery"><Icon name="pin" /></div>
                  <h3>{t.stepTwo}</h3>
                  <p>{t.stepTwoBody}</p>
                </article>
                <article className="step-card">
                  <span className="step-number">03</span>
                  <div className="step-icon icon-order"><Icon name="check" /></div>
                  <h3>{t.stepThree}</h3>
                  <p>{t.stepThreeBody}</p>
                </article>
              </div>
            </section>

            <section className="shop-section" style={{ paddingTop: "56px", paddingBottom: "48px" }}>
              <div className="section-heading" style={{ marginBottom: "28px" }}>
                <div>
                  <div className="eyebrow"><span />EDITORIAL &amp; GUIDES</div>
                  <h2>{isUrdu ? "کچن اور خوراک کی گائیڈز" : "From the FRYZAR Kitchen Journal"}</h2>
                  <p>{isUrdu ? "کھانوں کو تازہ رکھنے اور متوازن دسترخوان کے عملی مشورے۔" : "Practical reads on food crispness, spice storage, and family platters."}</p>
                </div>
                <a href="/guides" onClick={(e) => navigate("/guides", e)} className="outline-button" style={{ display: "inline-flex", alignItems: "center" }}>
                  {t.guidesNav} →
                </a>
              </div>
              <div className="editorial-grid">
                {allGuides.slice(0, 3).map((post) => (
                  <article className="editorial-card" key={post.id}>
                    <div>
                      <div className="editorial-meta">
                        <span>{post.category}</span>
                        <span>·</span>
                        <span>{post.reading_minutes} min</span>
                      </div>
                      <h3>{isUrdu ? post.title_ur : post.title_en}</h3>
                      <p>{isUrdu ? post.excerpt_ur : post.excerpt_en}</p>
                    </div>
                    <a href={`/guides/${encodeURIComponent(post.slug)}`} onClick={(e) => navigate(`/guides/${encodeURIComponent(post.slug)}`, e)} className="text-link" style={{ alignSelf: "flex-start" }}>
                      {isUrdu ? "پڑھیں ←" : "Read guide →"}
                    </a>
                  </article>
                ))}
              </div>
            </section>

            <section className="track-section" id="track-order">
              <div className="track-intro">
                <div className="eyebrow"><span />{t.trackOrder}</div>
                <h2>{t.trackTitle}</h2>
                <p>{t.trackBody}</p>
              </div>
              {renderTrackingWidget()}
            </section>

            <section className="closing-section">
              <div className="closing-mark">F.</div>
              <div>
                <span>{isUrdu ? "FRYZAR" : "YOUR LOCAL MARKETPLACE"}</span>
                <h2>{isUrdu ? "ضروری اشیا، ایک آسان تجربہ۔" : "Everyday essentials. One easier experience."}</h2>
              </div>
              <a href="/products" onClick={(e) => navigate("/products", e)} aria-label={t.browse}><Icon name="arrow" /></a>
            </section>
          </>
        );
      }
    }
  }

  return (
    <div className="app-shell" dir={isUrdu ? "rtl" : "ltr"}>
      <div className="announcement">
        <span className="announcement-dot" />
        <span>{t.announcement}</span>
      </div>
      <div className="coverage-strip">
        <span>{t.coverageNotice}</span>
      </div>

      <header className="site-header">
        <a className="brand" href="/" onClick={(e) => navigate("/", e)} aria-label="FRYZAR home">
          <span className="brand-mark">F</span>
          <span className="brand-copy">
            <strong>FRYZAR</strong>
            <small>{isUrdu ? "مقامی خریداری" : "LOCAL MARKETPLACE"}</small>
          </span>
        </a>

        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="/categories" onClick={(e) => navigate("/categories", e)} className={route.page === "categories" ? "nav-active" : ""}>{t.categories}</a>
          <a href="/products" onClick={(e) => navigate("/products", e)} className={route.page === "products" || route.page === "product-detail" ? "nav-active" : ""}>{t.allProductsNav}</a>
          <a href="/promotions" onClick={(e) => navigate("/promotions", e)} className={route.page === "promotions" ? "nav-active" : ""}>{t.promotionsNav}</a>
          <a href="/guides" onClick={(e) => navigate("/guides", e)} className={route.page === "editorial-list" || route.page === "editorial-detail" ? "nav-active" : ""}>{t.guidesNav}</a>
          <a href="/track" onClick={(e) => navigate("/track", e)} className={route.page === "order-tracking" ? "nav-active" : ""}>{t.trackOrder}</a>
          <a href="/contact" onClick={(e) => navigate("/contact", e)} className={route.page === "support" ? "nav-active" : ""}>{t.support}</a>
        </nav>

        <div className="header-actions">
          <button
            className="mobile-menu-toggle"
            type="button"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            {t.menuButton}
          </button>
          <a className="track-mobile-link" href="/track" onClick={(e) => navigate("/track", e)}>{t.trackOrder}</a>
          <button
            className="language-switch"
            type="button"
            onClick={() => setLanguage((current) => (current === "en" ? "ur" : "en"))}
            aria-label="Switch language"
          >
            {isUrdu ? "EN" : "اردو"}
          </button>
          <button
            className="basket-button"
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={t.basket + " (" + cartCount + ")"}
            aria-expanded={cartOpen}
          >
            <Icon name="bag" />
            <span>{t.basket}</span>
            <span className="basket-count">{cartCount}</span>
          </button>
        </div>
      </header>

      <nav className={mobileMenuOpen ? "mobile-nav-bar open" : "mobile-nav-bar"} aria-label="Mobile navigation">
        <a href="/" onClick={(e) => navigate("/", e)} className={route.page === "home" ? "nav-active" : ""}>{t.homeCrumb}</a>
        <a href="/categories" onClick={(e) => navigate("/categories", e)} className={route.page === "categories" ? "nav-active" : ""}>{t.categories}</a>
        <a href="/products" onClick={(e) => navigate("/products", e)} className={route.page === "products" ? "nav-active" : ""}>{t.allProductsNav}</a>
        <a href="/search" onClick={(e) => navigate("/search", e)} className={route.page === "search" ? "nav-active" : ""}>{t.search}</a>
        <a href="/promotions" onClick={(e) => navigate("/promotions", e)} className={route.page === "promotions" ? "nav-active" : ""}>{t.promotionsNav}</a>
        <a href="/guides" onClick={(e) => navigate("/guides", e)} className={route.page === "editorial-list" ? "nav-active" : ""}>{t.guidesNav}</a>
        <a href="/contact" onClick={(e) => navigate("/contact", e)} className={route.page === "support" ? "nav-active" : ""}>{t.support}</a>
      </nav>

      <main id="top">{renderMainView()}</main>

      <footer className="site-footer-extended">
        <div className="footer-columns">
          <div className="footer-col">
            <div className="footer-brand" style={{ marginBottom: "10px" }}>
              <span className="brand-mark">F</span>
              <div><strong>FRYZAR</strong><small>{t.footerLine}</small></div>
            </div>
            <p style={{ fontSize: "12px", color: "#68776c", lineHeight: 1.7, margin: "8px 0 0" }}>
              {isUrdu
                ? "پاکستان میں مقامی ڈیلیوری (PKR) اور دنیا بھر کے لیے دو لسانی فوڈ گائیڈز۔"
                : "Neighbourhood food & essentials delivery in Pakistan (PKR) with bilingual culinary guides worldwide."}
            </p>
          </div>

          <div className="footer-col">
            <h4>{isUrdu ? "خریداری" : "Shop & Order"}</h4>
            <ul>
              <li><a href="/categories" onClick={(e) => navigate("/categories", e)}>{t.categories}</a></li>
              <li><a href="/products" onClick={(e) => navigate("/products", e)}>{t.all}</a></li>
              <li><a href="/search" onClick={(e) => navigate("/search", e)}>{t.search}</a></li>
              <li><a href="/promotions" onClick={(e) => navigate("/promotions", e)}>{t.promotionsNav}</a></li>
              <li><a href="/basket" onClick={(e) => navigate("/basket", e)}>{t.basket}</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>{isUrdu ? "کسٹمر سروس" : "Customer Care"}</h4>
            <ul>
              <li><a href="/track" onClick={(e) => navigate("/track", e)}>{t.trackOrder}</a></li>
              <li><a href="/contact" onClick={(e) => navigate("/contact", e)}>{t.support}</a></li>
              <li><a href="/guides" onClick={(e) => navigate("/guides", e)}>{t.guidesNav}</a></li>
              <li><a href="/about" onClick={(e) => navigate("/about", e)}>{t.aboutNav} FRYZAR</a></li>
              {whatsappUrl ? <li><a href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a></li> : null}
            </ul>
          </div>

          <div className="footer-col">
            <h4>{isUrdu ? "پالیسیاں" : "Policies"}</h4>
            <ul>
              <li><a href="/delivery-policy" onClick={(e) => navigate("/delivery-policy", e)}>Delivery Policy</a></li>
              <li><a href="/refund-policy" onClick={(e) => navigate("/refund-policy", e)}>Refund &amp; Cancellation</a></li>
              <li><a href="/privacy" onClick={(e) => navigate("/privacy", e)}>Privacy Policy</a></li>
              <li><a href="/terms" onClick={(e) => navigate("/terms", e)}>Terms &amp; Conditions</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-row">
          <span>{t.currency} · {isUrdu ? "اردو اور انگریزی" : "English & Urdu"}</span>
          <span>© {new Date().getFullYear()} FRYZAR</span>
        </div>
      </footer>

      {selectedProduct ? (
        <div className="overlay product-detail-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedProduct(null); }}>
          <section className="product-detail-panel" role="dialog" aria-modal="true" aria-labelledby="product-detail-title" tabIndex={-1}>
            <div className="drawer-header">
              <div><small>FRYZAR</small><h2 id="product-detail-title">{t.productDetails}</h2></div>
              <button className="icon-button" type="button" onClick={() => setSelectedProduct(null)} aria-label={t.close}><Icon name="close" /></button>
            </div>
            <div className="product-detail-image">
              <div className="product-image-placeholder">FRYZAR</div>
              {selectedProduct.image_url ? <img src={selectedProduct.image_url} alt={productName(selectedProduct, language)} onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
            </div>
            <small className="product-detail-category">{language === "ur" ? selectedProduct.category_name_ur : selectedProduct.category_name_en}</small>
            <h3>{productName(selectedProduct, language)}</h3>
            <p>{productDescription(selectedProduct, language)}</p>

            {loadingDetails ? (
              <div style={{ margin: "1rem 0", color: "#6b7280" }}>{isUrdu ? "تفصیلات حاصل کی جا رہی ہیں…" : "Loading options…"}</div>
            ) : (
              <>
                {productDetails?.variants && productDetails.variants.length > 0 ? (
                  <div className="variant-section" style={{ margin: "1rem 0" }}>
                    <label style={{ fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
                      {isUrdu ? "سائز / قسم" : "Select Option / Size"}
                    </label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      {productDetails.variants.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          className={selectedVariantId === v.id ? "primary-button" : "outline-button"}
                          disabled={!v.is_available}
                          onClick={() => setSelectedVariantId(v.id)}
                          style={{ padding: "0.4rem 0.8rem", fontSize: "0.875rem" }}
                        >
                          {language === "ur" ? v.name_ur : v.name_en} · {money(v.price_paisa, language)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {modifierGroups.length > 0 ? (
                  <div className="modifiers-section" style={{ margin: "1rem 0" }}>
                    {modifierGroups.map((group) => {
                      const selectedIds = selectedModifierOptions[group.id] ?? [];
                      return (
                        <div key={group.id} style={{ marginBottom: "1rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <strong>{language === "ur" ? group.name_ur : group.name_en}</strong>
                            {group.is_required || group.min_selection > 0 ? (
                              <small style={{ color: "#dc2626", fontWeight: 600 }}>{isUrdu ? "* لازمی" : "* Required"}</small>
                            ) : (
                              <small style={{ color: "#6b7280" }}>{isUrdu ? "(اختیاری)" : "(Optional)"}</small>
                            )}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginTop: "0.5rem" }}>
                            {(group.options || []).map((opt) => {
                              const checked = selectedIds.includes(opt.id);
                              return (
                                <label
                                  key={opt.id}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "0.5rem 0.75rem",
                                    borderRadius: "8px",
                                    border: checked ? "1px solid #164c3b" : "1px solid #e5e7eb",
                                    cursor: opt.is_available ? "pointer" : "not-allowed",
                                    opacity: opt.is_available ? 1 : 0.5
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <input
                                      type={group.max_selection === 1 ? "radio" : "checkbox"}
                                      checked={checked}
                                      disabled={!opt.is_available}
                                      onChange={() => toggleOptionMap(setSelectedModifierOptions, group.id, opt.id, group.max_selection)}
                                    />
                                    <span>{language === "ur" ? opt.name_ur : opt.name_en}</span>
                                  </div>
                                  <small>+{money(opt.price_paisa, language)}</small>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "1rem 0" }}>
              <div className="quantity-control">
                <button type="button" onClick={() => setModalQuantity((q) => Math.max(1, q - 1))} aria-label={t.decreaseQty}><Icon name="minus" /></button>
                <span>{modalQuantity}</span>
                <button type="button" onClick={() => setModalQuantity((q) => Math.min(20, q + 1))} aria-label={t.increaseQty}><Icon name="plus" /></button>
              </div>
              <strong className="product-detail-price">{money(modalUnitPrice * modalQuantity, language)}</strong>
            </div>

            <button
              className="primary-button full-width"
              type="button"
              disabled={!storeOpen || !selectedProduct.is_available || !isModalValid || loadingDetails}
              onClick={handleAddModalToBasket}
            >
              <Icon name="plus" />{t.add}
            </button>
          </section>
        </div>
      ) : null}

      {cartOpen ? (
        <div className="overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}>
          <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="basket-title">
            <div className="drawer-header">
              <div><small>FRYZAR</small><h2 id="basket-title">{t.basket}</h2></div>
              <button className="icon-button" type="button" onClick={() => setCartOpen(false)} aria-label={t.close}><Icon name="close" /></button>
            </div>
            {cart.length === 0 ? (
              <div className="drawer-empty">
                <div className="drawer-bag"><Icon name="bag" /></div>
                <h3>{t.emptyBasket}</h3>
                <p>{t.emptyBasketBody}</p>
                <button className="primary-button" type="button" onClick={() => setCartOpen(false)}>{t.continueShopping}</button>
              </div>
            ) : (
              <>
                <div className="drawer-items">
                  {cart.map((item) => (
                    <div className="drawer-item" key={item.id}>
                      <div className="drawer-item-art">F.</div>
                      <div className="drawer-item-copy">
                        <strong>{productName(item.product, language)}</strong>
                        {item.variant ? (
                          <small style={{ display: "block", color: "#4b5563" }}>
                            {language === "ur" ? item.variant.name_ur : item.variant.name_en}
                          </small>
                        ) : null}
                        {item.selected_modifiers && item.selected_modifiers.length > 0 ? (
                          <small style={{ display: "block", color: "#6b7280" }}>
                            {item.selected_modifiers.map((m) => (language === "ur" ? m.name_ur : m.name_en)).join(", ")}
                          </small>
                        ) : null}
                        <small>{money(item.unit_price_paisa, language)}</small>
                        <div className="quantity-control">
                          <button type="button" onClick={() => changeCartQuantity(item.id, -1)} aria-label={t.remove}><Icon name="minus" /></button>
                          <span>{item.quantity}</span>
                          <button type="button" onClick={() => changeCartQuantity(item.id, 1)} aria-label={t.add}><Icon name="plus" /></button>
                        </div>
                      </div>
                      <strong className="drawer-line-total">{money(item.unit_price_paisa * item.quantity, language)}</strong>
                    </div>
                  ))}
                </div>
                <div className="drawer-summary">
                  <div><span>{t.subtotal}</span><strong>{money(subtotal, language)}</strong></div>
                  <div><span>{t.delivery}</span><strong>{selectedZone ? money(deliveryFee, language) : "—"}</strong></div>
                  <div className="summary-total"><span>{t.estimatedTotal}</span><strong>{money(total, language)}</strong></div>
                  <small>{t.estimateNote}</small>
                  {selectedZone && !minimumMet ? <small className="form-error">{t.minOrder}: {money(minimumOrder, language)}</small> : null}
                  <button className="primary-button full-width" type="button" disabled={!storeOpen || !selectedZone || !minimumMet} onClick={openCheckout}>{t.checkout}<Icon name="arrow" /></button>
                </div>
              </>
            )}
          </aside>
        </div>
      ) : null}

      {checkoutOpen ? (
        <div className="overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) setCheckoutOpen(false); }}>
          <section className="checkout-panel" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
            <div className="drawer-header">
              <div><small>FRYZAR · {t.cod}</small><h2 id="checkout-title">{t.checkoutTitle}</h2></div>
              <button className="icon-button" type="button" onClick={() => setCheckoutOpen(false)} disabled={submitting} aria-label={t.close}><Icon name="close" /></button>
            </div>
            <p className="checkout-intro">{t.checkoutBody}</p>
            <form className="checkout-form" onSubmit={submitOrder}>
              <label>{t.fullName}<input name="customer_name" type="text" minLength={2} maxLength={100} autoComplete="name" required /></label>
              <label>{t.phone}<input name="customer_phone" type="tel" minLength={10} maxLength={20} autoComplete="tel" required /></label>
              <label>{t.address}<textarea name="delivery_address" minLength={8} maxLength={500} autoComplete="street-address" rows={3} required /></label>
              <label>{t.area}
                <select name="delivery_zone_id" value={selectedZoneId} onChange={(event) => setSelectedZoneId(event.target.value)} required>
                  <option value="">{t.selectArea}</option>
                  {zones.map((zone) => <option key={zone.id} value={zone.id}>{language === "ur" ? zone.name_ur : zone.name_en} · {money(zone.delivery_fee_paisa, language)}</option>)}
                </select>
              </label>
              <label>{t.notes}<textarea name="notes" maxLength={500} rows={2} /></label>
              <div className="payment-choice">
                <span className="payment-choice-mark"><Icon name="check" /></span>
                <span><strong>{t.cod}</strong><small>{t.codInfo}</small></span>
              </div>
              <div className="checkout-summary">
                <div><span>{t.subtotal}</span><strong>{money(subtotal, language)}</strong></div>
                <div><span>{t.delivery}</span><strong>{money(deliveryFee, language)}</strong></div>
                {appliedCoupon ? (
                  <div style={{ color: "#059669", display: "flex", justifyContent: "space-between" }}>
                    <span>{isUrdu ? "کوپن رعایت" : "Coupon Discount"} ({appliedCoupon.code})</span>
                    <strong>-{money(appliedCoupon.discount_paisa, language)}</strong>
                  </div>
                ) : null}
                <div className="summary-total"><span>{t.estimatedTotal}</span><strong>{money(total, language)}</strong></div>
                <small>{t.estimateNote}</small>
              </div>
              <div style={{ marginTop: "0.5rem", marginBottom: "0.5rem" }}>
                <label style={{ fontSize: "0.875rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                  {isUrdu ? "کوپن کوڈ" : "Coupon Code"}
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => { setCouponInput(e.target.value); setCouponError(""); }}
                    placeholder={isUrdu ? "کوپن درج کریں" : "Enter coupon code"}
                    style={{ flex: 1 }}
                  />
                  <button
                    className="outline-button"
                    type="button"
                    onClick={() => void handleApplyCoupon()}
                    disabled={validatingCoupon || !couponInput.trim()}
                  >
                    {validatingCoupon ? "..." : (isUrdu ? "لگائیں" : "Apply")}
                  </button>
                </div>
                {couponError ? <small className="form-error" style={{ color: "#dc2626", display: "block", marginTop: "0.25rem" }}>{couponError}</small> : null}
                {appliedCoupon ? (
                  <small style={{ color: "#059669", display: "block", marginTop: "0.25rem" }}>
                    ✓ {isUrdu ? "کوپن لگ گیا:" : "Coupon applied:"} {appliedCoupon.code}
                    <button type="button" onClick={() => setAppliedCoupon(null)} style={{ background: "none", border: "none", color: "#dc2626", marginLeft: "0.5rem", cursor: "pointer", textDecoration: "underline" }}>
                      {isUrdu ? "ہٹائیں" : "Remove"}
                    </button>
                  </small>
                ) : null}
              </div>
              {checkoutError ? <div className="inline-error" role="alert">{checkoutError}</div> : null}
              <button className="primary-button full-width" type="submit" disabled={submitting || !storeOpen || !selectedZone || !minimumMet}>
                {submitting ? t.placing : t.placeOrder}
                {!submitting ? <Icon name="arrow" /> : null}
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {orderComplete ? (
        <div className="overlay" role="presentation">
          <section className="success-panel" role="dialog" aria-modal="true" aria-labelledby="order-success-title">
            <div className="success-icon"><Icon name="check" /></div>
            <span className="success-label">FRYZAR</span>
            <h2 id="order-success-title">{t.orderConfirmed}</h2>
            <p>{t.orderMessage}</p>
            <div className="order-number-box"><small>{t.orderNumber}</small><strong>{orderComplete.order.order_number}</strong></div>
            <div className="tracking-box">
              <small>{t.trackingCode}</small>
              <code>{orderComplete.tracking_token}</code>
              <p>{t.trackingNote}</p>
              <button className="outline-button full-width" type="button" onClick={() => void copyTrackingCode()}>{copied ? t.copied : t.copy}</button>
            </div>
            <button className="outline-button full-width track-success-button" type="button" onClick={() => {
              const token = orderComplete.tracking_token;
              setOrderComplete(null);
              setTrackingToken(token);
              void lookupTracking(token);
              navigate(`/track/${token}`);
            }}>{t.trackOrder}</button>
            <button className="primary-button full-width" type="button" onClick={() => setOrderComplete(null)}>{t.close}</button>
          </section>
        </div>
      ) : null}

      {supportOpen ? (
        <div className="overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSupportOpen(false); }}>
          <section className="checkout-panel" role="dialog" aria-modal="true" aria-labelledby="support-modal-title">
            <div className="drawer-header">
              <div><small>FRYZAR</small><h2 id="support-modal-title">{t.supportModalTitle}</h2></div>
              <button className="icon-button" type="button" onClick={() => setSupportOpen(false)} aria-label={t.close}><Icon name="close" /></button>
            </div>
            {renderSupportFormCard()}
          </section>
        </div>
      ) : null}

      {apiState === "ready" && !storeOpen ? (
        <div className="store-status-toast" role="status"><span />{t.storeSetup}</div>
      ) : null}
    </div>
  );
}
