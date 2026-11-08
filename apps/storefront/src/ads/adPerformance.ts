import { detectDeviceClass } from "./adRegistry";

export type AdTelemetryEventType =
  | "slot_rendered"
  | "script_loaded"
  | "load_error"
  | "blocked_restricted"
  | "blocked_safety"
  | "timeout";

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
  slotId: string;
  format: string;
  pageType: string;
  eventType: AdTelemetryEventType;
  loadMs?: number;
  errorCode?: string;
}): void {
  if (typeof window === "undefined") return;

  // Strictly non-PII payload matching /api/v1/ad-events schema
  const payload = {
    slot_id: params.slotId.slice(0, 64),
    format: params.format.slice(0, 32),
    page_type: params.pageType.slice(0, 48),
    event_type: params.eventType,
    device_category: detectDeviceClass(),
    ...(typeof params.loadMs === "number" ? { load_ms: Math.max(0, Math.round(params.loadMs)) } : {}),
    ...(params.errorCode ? { error_code: params.errorCode.slice(0, 80) } : {})
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
