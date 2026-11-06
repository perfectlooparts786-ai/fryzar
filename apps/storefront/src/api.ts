import {
  DEFAULT_MONETIZATION_CONFIG,
  normalizeMonetizationConfig,
  type MonetizationRuntimeConfig
} from "./ads/adConfig";
import type {
  Category,
  DeliveryZone,
  EditorialArticle,
  OrderResponse,
  Product,
  ProductDetails,
  ProductImage,
  ModifierGroup,
  ProductVariant,
  PublicPromotion,
  StoreSettings,
  TrackedOrderResponse
} from "./types";

const configuredBase = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
const API_BASE = configuredBase.replace(/\/+$/, "");
const API_ROOT = API_BASE + "/api/v1";

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;

  try {
    response = await fetch(API_ROOT + path, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ApiError("The FRYZAR API could not be reached.", 0, "network_error");
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError("The API returned an unreadable response.", response.status, "invalid_response");
  }

  if (!response.ok) {
    const record = typeof body === "object" && body !== null
      ? body as Record<string, unknown>
      : {};
    const code = typeof record.error === "string" ? record.error : "request_failed";
    throw new ApiError(code, response.status, code);
  }

  return body as T;
}

export const api = {
  health: (signal?: AbortSignal) =>
    getJson<{ ok: boolean; service: string; database: string; schema: string }>("/health", signal),

  categories: (signal?: AbortSignal) =>
    getJson<{ categories: Category[] }>("/categories", signal),

  products: (signal?: AbortSignal) =>
    getJson<{ products: Product[]; limit: number }>("/products?limit=50", signal),

  storefrontConfig: (signal?: AbortSignal) =>
    getJson<{ settings: StoreSettings }>("/storefront-config", signal),

  deliveryZones: (signal?: AbortSignal) =>
    getJson<{ delivery_zones: DeliveryZone[]; currency: string }>("/delivery-zones", signal),

  promotions: async (signal?: AbortSignal): Promise<{ promotions: PublicPromotion[] }> => {
    try {
      return await getJson<{ promotions: PublicPromotion[] }>("/promotions", signal);
    } catch {
      return { promotions: [] };
    }
  },

  editorialList: async (signal?: AbortSignal): Promise<{ posts: EditorialArticle[] }> => {
    try {
      return await getJson<{ posts: EditorialArticle[] }>("/editorial", signal);
    } catch {
      return { posts: [] };
    }
  },

  editorialArticle: (slug: string, signal?: AbortSignal) =>
    getJson<{ post: EditorialArticle }>("/editorial/" + encodeURIComponent(slug), signal),

  monetizationConfig: async (signal?: AbortSignal): Promise<MonetizationRuntimeConfig> => {
    try {
      const raw = await getJson<Record<string, unknown>>("/monetization-config", signal);
      return normalizeMonetizationConfig(raw);
    } catch {
      return DEFAULT_MONETIZATION_CONFIG;
    }
  },

  productDetails: async (idOrSlug: string, signal?: AbortSignal): Promise<{ product: ProductDetails }> => {
    const raw = await getJson<{
      product: ProductDetails;
      images?: ProductImage[];
      variants?: ProductVariant[];
      modifier_groups?: ModifierGroup[];
    }>("/products/" + encodeURIComponent(idOrSlug), signal);

    return {
      product: {
        ...raw.product,
        images: raw.product.images ?? raw.images ?? [],
        variants: raw.product.variants ?? raw.variants ?? [],
        modifier_groups: raw.product.modifier_groups ?? raw.modifier_groups ?? []
      }
    };
  },

  validateCoupon: async (
    code: string,
    subtotalPaisa: number
  ): Promise<{
    valid: boolean;
    discount_paisa: number;
    coupon?: { id: string; code: string; discount_type: string; discount_value: number };
    error?: string;
  }> => {
    let response: Response;
    try {
      response = await fetch(API_ROOT + "/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ code, subtotal_paisa: subtotalPaisa })
      });
    } catch {
      throw new ApiError("Could not validate coupon.", 0, "network_error");
    }

    const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok) {
      const errCode = typeof body?.error === "string" ? body.error : "coupon_invalid";
      throw new ApiError(errCode, response.status, errCode);
    }
    return body as unknown as {
      valid: boolean;
      discount_paisa: number;
      coupon?: { id: string; code: string; discount_type: string; discount_value: number };
      error?: string;
    };
  },

  trackOrder: (token: string, signal?: AbortSignal) => {
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      throw new ApiError("Invalid tracking code.", 400, "invalid_tracking_code");
    }
    return getJson<TrackedOrderResponse>("/orders/track/" + token.toLowerCase(), signal);
  },

  createOrder: async (
    payload: {
      customer_name: string;
      customer_phone: string;
      delivery_address: string;
      delivery_zone_id: string;
      customer_language: "ur" | "en";
      payment_method: "cod";
      coupon_code?: string;
      notes: string;
      items: {
        product_id: string;
        variant_id?: string;
        selected_modifier_option_ids?: string[];
        quantity: number;
      }[];
    },
    idempotencyKey: string
  ): Promise<OrderResponse> => {
    let response: Response;

    try {
      response = await fetch(API_ROOT + "/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify(payload)
      });
    } catch {
      throw new ApiError("Your order could not reach the server. Retry using the same cart.", 0, "network_error");
    }

    const body = await response.json().catch(() => null) as unknown;

    if (!response.ok) {
      const record = typeof body === "object" && body !== null
        ? body as Record<string, unknown>
        : {};
      const code = typeof record.error === "string" ? record.error : "order_failed";
      throw new ApiError(code, response.status, code);
    }

    return body as OrderResponse;
  },

  createSupportTicket: async (payload: {
    customer_name: string;
    customer_phone: string;
    subject: string;
    message: string;
    order_id?: string;
  }): Promise<{ created: boolean; case_id: string }> => {
    let response: Response;
    try {
      response = await fetch(API_ROOT + "/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      });
    } catch {
      throw new ApiError("Could not submit support ticket.", 0, "network_error");
    }
    const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok) {
      const code = typeof body?.error === "string" ? body.error : "ticket_creation_failed";
      throw new ApiError(code, response.status, code);
    }
    return body as { created: boolean; case_id: string };
  }
};
