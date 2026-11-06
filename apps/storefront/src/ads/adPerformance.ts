import { detectDeviceClass } from "./adRegistry";

export type AdTelemetryEventType =
  | "slot_requested"
  | "slot_loaded"
  | "slot_blocked"
  | "slot_failed"
  | "slot_clicked";

const configuredBase = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");
const AD_EVENTS_URL = configuredBase + "/api/v1/ad-events";

export function observeNearViewport(
  element: HTMLElement,
  onEnter: () => void,
  rootMargin = "240px"
): () => void {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
    onEnter();
    return () => {};
  }

  let triggered = false;
  const observer = new IntersectionObserver(
    (entries) => {
      if (triggered) return;
      for (const entry of entries) {
        if (entry.isIntersecting) {
          triggered = true;
          observer.disconnect();
          onEnter();
          break;
        }
      }
    },
    { rootMargin }
  );

  observer.observe(element);
  return () => observer.disconnect();
}

export function reportAdTelemetry(params: {
  zoneId?: string | null;
  placementKey: string;
  eventType: AdTelemetryEventType;
  pageType: string;
  language: "en" | "ur";
}): void {
  if (typeof window === "undefined") return;

  // Strictly non-PII payload: never include URL query, tracking token, phone, email, name, or address.
  const payload = {
    zone_id: params.zoneId || undefined,
    placement_key: params.placementKey.slice(0, 64),
    event_type: params.eventType,
    page_type: params.pageType.slice(0, 40),
    device_type: detectDeviceClass(),
    language: params.language
  };

  try {
    void fetch(AD_EVENTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {
      // Fail silently when offline or blocked by privacy extensions.
    });
  } catch {
    // Fail silently.
  }
}
