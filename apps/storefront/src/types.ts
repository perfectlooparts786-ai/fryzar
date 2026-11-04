export type Language = "en" | "ur";

export interface Category {
  id: string;
  slug: string;
  name_en: string;
  name_ur: string;
  description_en?: string;
  description_ur?: string;
  sort_order: number;
}

export interface ProductVariant {
  id: string;
  sku: string | null;
  name_en: string;
  name_ur: string;
  price_paisa: number;
  compare_at_paisa: number | null;
  stock_qty: number | null;
  is_available: number;
  sort_order: number;
}

export interface ModifierOption {
  id: string;
  group_id: string;
  name_en: string;
  name_ur: string;
  price_paisa: number;
  is_available: number;
  sort_order: number;
}

export interface ModifierGroup {
  id: string;
  name_en: string;
  name_ur: string;
  description_en: string;
  description_ur: string;
  min_selection: number;
  max_selection: number;
  is_required: number;
  sort_order: number;
  options: ModifierOption[];
}

export interface ProductDetails extends Product {
  variants?: ProductVariant[];
  modifier_groups?: ModifierGroup[];
}

export interface CartItem {
  id: string;
  product: Product;
  variant?: ProductVariant;
  selected_modifiers?: ModifierOption[];
  quantity: number;
  unit_price_paisa: number;
}

export interface AppliedCoupon {
  code: string;
  discount_paisa: number;
}

export interface Product {
  id: string;
  slug: string;
  sku: string | null;
  category_id: string | null;
  name_en: string;
  name_ur: string;
  description_en: string;
  description_ur: string;
  price_paisa: number;
  compare_at_paisa: number | null;
  image_url: string | null;
  is_available: number;
  is_featured: number;
  category_slug?: string | null;
  category_name_en?: string | null;
  category_name_ur?: string | null;
  variants?: ProductVariant[];
  modifier_groups?: ModifierGroup[];
}

export interface DeliveryZone {
  id: string;
  code: string;
  name_en: string;
  name_ur: string;
  city: string;
  region: string;
  delivery_fee_paisa: number;
  minimum_order_paisa: number;
}

export interface StoreSettings {
  store_status?: string;
  launch_ready?: boolean | string;
  currency?: string;
  default_language?: Language;
  supported_languages?: Language[];
  cod_enabled?: boolean | string;
  manual_transfer_enabled?: boolean | string;
  whatsapp_number?: string;
  store_name_en?: string;
  store_name_ur?: string;
}

export interface OrderResponse {
  order: {
    id: string;
    order_number: string;
    status: string;
    payment_method: string;
    payment_status: string;
    currency: string;
    subtotal_paisa: number;
    delivery_fee_paisa: number;
    total_paisa: number;
    created_at: string;
  };
  tracking_token: string;
  tracking_url: string;
}


export interface TrackedOrderItem {
  product_name_ur_snapshot: string;
  product_name_en_snapshot: string;
  unit_price_paisa: number;
  quantity: number;
  line_total_paisa: number;
}

export interface TrackedOrderResponse {
  order: {
    id: string;
    order_number: string;
    status: string;
    payment_method: string;
    payment_status: string;
    subtotal_paisa: number;
    delivery_fee_paisa: number;
    discount_paisa: number;
    total_paisa: number;
    customer_language: Language;
    created_at: string;
    updated_at: string;
  };
  items: TrackedOrderItem[];
}
