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
