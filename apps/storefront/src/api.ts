import type {
  Category,
  DeliveryZone,
  OrderResponse,
  Product,
  StoreSettings
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

  createOrder: async (
    payload: {
      customer_name: string;
      customer_phone: string;
      delivery_address: string;
      delivery_zone_id: string;
      customer_language: "ur" | "en";
      payment_method: "cod";
      notes: string;
      items: { product_id: string; quantity: number }[];
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
  }
};
