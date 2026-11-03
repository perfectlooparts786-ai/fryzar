import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, ApiError } from "./api";
import type {
  Category,
  DeliveryZone,
  Language,
  OrderResponse,
  Product,
  StoreSettings,
  TrackedOrderResponse
} from "./types";

type CopyText = { [Key in keyof typeof COPY.en]: string };

const COPY = {
  en: {
    announcement: "A simpler way to shop your neighbourhood",
    categories: "Categories",
    howItWorks: "How it works",
    support: "Support",
    searchPlaceholder: "Search food, grocery and everyday essentials",
    search: "Search",
    eyebrow: "LOCAL FINDS. EASY ORDERS.",
    heroTitle: "Good things,",
    heroAccent: "close to home.",
    heroBody: "Discover the products you need from your local store, with a clearer and easier way to order.",
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
    footerLine: "Local shopping, made more straightforward.",
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
    trackingPrivacy: "This private code only shows order progress and item totals. Customer contact details and delivery address are not displayed."
  },
  ur: {
    announcement: "اپنے علاقے کی خریداری، اب زیادہ آسان",
    categories: "اقسام",
    howItWorks: "طریقۂ کار",
    support: "مدد",
    searchPlaceholder: "کھانے، گروسری اور روزمرہ اشیا تلاش کریں",
    search: "تلاش",
    eyebrow: "آپ کے علاقے کی پسندیدہ اشیا",
    heroTitle: "اچھی چیزیں،",
    heroAccent: "آپ کے قریب۔",
    heroBody: "اپنے مقامی اسٹور کی ضروری اشیا دیکھیں اور آسان طریقے سے آرڈر کریں۔",
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
    footerLine: "مقامی خریداری، اب زیادہ آسان۔",
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
    trackingPrivacy: "یہ نجی کوڈ صرف آرڈر کی پیش رفت اور اشیا کی رقم دکھاتا ہے۔ کسٹمر کا فون نمبر اور ڈیلیوری پتہ ظاہر نہیں کیا جاتا۔"
  }
} as const;

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

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({});
  const [apiState, setApiState] = useState<"loading" | "ready" | "offline">("loading");
  const [refreshCount, setRefreshCount] = useState(0);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [orderComplete, setOrderComplete] = useState<OrderResponse | null>(null);
  const [trackingToken, setTrackingToken] = useState("");
  const [trackingResult, setTrackingResult] = useState<TrackedOrderResponse | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");
  const [copied, setCopied] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    window.localStorage.setItem("fryzar-language", language);
    document.documentElement.lang = language;
    document.documentElement.dir = isUrdu ? "rtl" : "ltr";
  }, [language, isUrdu]);

  useEffect(() => {
    const controller = new AbortController();
    setApiState("loading");

    const load = async () => {
      const results = await Promise.allSettled([
        api.health(controller.signal),
        api.categories(controller.signal),
        api.products(controller.signal),
        api.storefrontConfig(controller.signal),
        api.deliveryZones(controller.signal)
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
    };

    void load();
    return () => controller.abort();
  }, [refreshCount]);

  useEffect(() => {
    if (!selectedProduct) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedProduct(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedProduct]);

  const storeOpen = settings.store_status === "open" && isTrue(settings.launch_ready);
  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) ?? null;

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

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([productId, quantity]) => {
        const product = products.find((item) => item.id === productId);
        return product ? { product, quantity } : null;
      })
      .filter((item): item is { product: Product; quantity: number } => item !== null);
  }, [cart, products]);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price_paisa * item.quantity,
    0
  );
  const deliveryFee = selectedZone?.delivery_fee_paisa ?? 0;
  const total = subtotal + deliveryFee;
  const minimumOrder = selectedZone?.minimum_order_paisa ?? 0;
  const minimumMet = subtotal >= minimumOrder;

  function changeQuantity(productId: string, delta: number) {
    setCart((current) => {
      const next = { ...current };
      const quantity = (next[productId] ?? 0) + delta;
      if (quantity <= 0) delete next[productId];
      else next[productId] = Math.min(quantity, 20);
      return next;
    });
  }

  function openCheckout() {
    setCheckoutError("");
    setCheckoutOpen(true);
    setCartOpen(false);
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!storeOpen || !selectedZone || cartItems.length === 0 || !minimumMet) return;

    const form = new FormData(event.currentTarget);
    const payload = {
      customer_name: String(form.get("customer_name") ?? ""),
      customer_phone: String(form.get("customer_phone") ?? ""),
      delivery_address: String(form.get("delivery_address") ?? ""),
      delivery_zone_id: selectedZone.id,
      customer_language: language,
      payment_method: "cod" as const,
      notes: String(form.get("notes") ?? ""),
      items: cartItems.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity
      }))
    };

    setSubmitting(true);
    setCheckoutError("");

    try {
      const result = await api.createOrder(payload, idempotencyKey);
      setOrderComplete(result);
      setCart({});
      setCheckoutOpen(false);
      setCartOpen(false);
      setIdempotencyKey(crypto.randomUUID());
    } catch (error) {
      setCheckoutError(errorText(error, t));
    } finally {
      setSubmitting(false);
    }
  }

  async function copyTrackingCode() {
    if (!orderComplete) return;
    try {
      await navigator.clipboard.writeText(orderComplete.tracking_token);
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

  return (
    <div className="app-shell" dir={isUrdu ? "rtl" : "ltr"}>
      <div className="announcement">
        <span className="announcement-dot" />
        <span>{t.announcement}</span>
      </div>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="FRYZAR home">
          <span className="brand-mark">F</span>
          <span className="brand-copy">
            <strong>FRYZAR</strong>
            <small>{isUrdu ? "مقامی خریداری" : "LOCAL MARKETPLACE"}</small>
          </span>
        </a>

        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#shop">{t.categories}</a>
          <a href="#how-it-works">{t.howItWorks}</a>
          <a href="#track-order">{t.trackOrder}</a>
          {whatsappUrl ? <a href={whatsappUrl} target="_blank" rel="noreferrer">{t.support}</a> : null}
        </nav>

        <div className="header-actions">
          <a className="track-mobile-link" href="#track-order">{t.trackOrder}</a>
          <button
            className="language-switch"
            type="button"
            onClick={() => setLanguage((current) => current === "en" ? "ur" : "en")}
            aria-label="Switch language"
          >
            {isUrdu ? "EN" : "اردو"}
          </button>
          <button className="basket-button" type="button" onClick={() => setCartOpen(true)} aria-label={t.basket + " (" + cartCount + ")"} aria-expanded={cartOpen}>
            <Icon name="bag" />
            <span>{t.basket}</span>
            <span className="basket-count">{cartCount}</span>
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow"><span />{t.eyebrow}</div>
            <h1>{t.heroTitle}<br /><em>{t.heroAccent}</em></h1>
            <p>{t.heroBody}</p>
            <div className="hero-actions">
              <a href="#shop" className="primary-link">{t.browse}<Icon name="arrow" /></a>
              <a href="#how-it-works" className="text-link">{t.how}</a>
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

          {apiState === "loading" ? (
            <div className="catalog-state"><div className="loader" /><p>{t.loading}</p></div>
          ) : apiState === "offline" ? (
            <div className="catalog-state state-card">
              <div className="state-symbol">!</div>
              <h3>{t.apiOffline}</h3>
              <button className="outline-button" type="button" onClick={() => setRefreshCount((count) => count + 1)}>{t.tryAgain}</button>
            </div>
          ) : products.length === 0 ? (
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
          ) : visibleProducts.length === 0 ? (
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
          ) : (
            <div className="product-grid">
              {visibleProducts.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="product-image">
                    <div className="product-image-placeholder">FRYZAR</div>
                    {product.image_url ? <img src={product.image_url} alt={productName(product, language)} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
                    {product.is_featured ? <span className="product-ribbon">{t.featured}</span> : null}
                  </div>
                  <div className="product-info">
                    <small>{language === "ur" ? product.category_name_ur : product.category_name_en}</small>
                    <h3><button className="product-detail-trigger" type="button" onClick={() => setSelectedProduct(product)} aria-label={t.viewDetails + ": " + productName(product, language)}>{productName(product, language)}</button></h3>
                    <p>{productDescription(product, language)}</p>
                    <div className="product-footer">
                      <strong>{money(product.price_paisa, language)}</strong>
                      <button type="button" disabled={!storeOpen} onClick={() => changeQuantity(product.id, 1)} aria-label={t.add}><Icon name="plus" />{t.add}</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {apiState === "ready" && products.length > 0 ? (
            <div className="catalog-footnote">
              <span>{visibleProducts.length} / {products.length}</span>
              <span>{isUrdu ? "دستیاب مصنوعات" : "available products"}</span>
            </div>
          ) : null}
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


        <section className="track-section" id="track-order">
          <div className="track-intro">
            <div className="eyebrow"><span />{t.trackOrder}</div>
            <h2>{t.trackTitle}</h2>
            <p>{t.trackBody}</p>
          </div>
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
                  onChange={event => {
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
                      <span><strong>{language === "ur" ? item.product_name_ur_snapshot : item.product_name_en_snapshot}</strong><small>{item.quantity} × {money(item.unit_price_paisa, language)}</small></span>
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
        </section>

        <section className="closing-section">
          <div className="closing-mark">F.</div>
          <div>
            <span>{isUrdu ? "FRYZAR" : "YOUR LOCAL MARKETPLACE"}</span>
            <h2>{isUrdu ? "ضروری اشیا، ایک آسان تجربہ۔" : "Everyday essentials. One easier experience."}</h2>
          </div>
          <a href="#shop" aria-label={t.browse}><Icon name="arrow" /></a>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-brand">
          <span className="brand-mark">F</span>
          <div><strong>FRYZAR</strong><small>{t.footerLine}</small></div>
        </div>
        <span className="footer-currency">{t.currency} · {isUrdu ? "اردو اور انگریزی" : "English and Urdu"}</span>
        <span className="footer-copy">© {new Date().getFullYear()} FRYZAR</span>
      </footer>

      {selectedProduct ? (
        <div className="overlay product-detail-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedProduct(null); }}>
          <section className="product-detail-panel" role="dialog" aria-modal="true" aria-labelledby="product-detail-title">
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
            <strong className="product-detail-price">{money(selectedProduct.price_paisa, language)}</strong>
            <button className="primary-button full-width" type="button" disabled={!storeOpen || !selectedProduct.is_available} onClick={() => { changeQuantity(selectedProduct.id, 1); setSelectedProduct(null); }}>
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
            {cartItems.length === 0 ? (
              <div className="drawer-empty">
                <div className="drawer-bag"><Icon name="bag" /></div>
                <h3>{t.emptyBasket}</h3>
                <p>{t.emptyBasketBody}</p>
                <button className="primary-button" type="button" onClick={() => setCartOpen(false)}>{t.continueShopping}</button>
              </div>
            ) : (
              <>
                <div className="drawer-items">
                  {cartItems.map(({ product, quantity }) => (
                    <div className="drawer-item" key={product.id}>
                      <div className="drawer-item-art">F.</div>
                      <div className="drawer-item-copy">
                        <strong>{productName(product, language)}</strong>
                        <small>{money(product.price_paisa, language)}</small>
                        <div className="quantity-control">
                          <button type="button" onClick={() => changeQuantity(product.id, -1)} aria-label={t.remove}><Icon name="minus" /></button>
                          <span>{quantity}</span>
                          <button type="button" onClick={() => changeQuantity(product.id, 1)} aria-label={t.add}><Icon name="plus" /></button>
                        </div>
                      </div>
                      <strong className="drawer-line-total">{money(product.price_paisa * quantity, language)}</strong>
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
                <div className="summary-total"><span>{t.estimatedTotal}</span><strong>{money(total, language)}</strong></div>
                <small>{t.estimateNote}</small>
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
              window.location.hash = "track-order";
            }}>{t.trackOrder}</button>
            <button className="primary-button full-width" type="button" onClick={() => setOrderComplete(null)}>{t.close}</button>
          </section>
        </div>
      ) : null}

      {apiState === "ready" && !storeOpen ? (
        <div className="store-status-toast" role="status"><span />{t.storeSetup}</div>
      ) : null}
    </div>
  );
}
