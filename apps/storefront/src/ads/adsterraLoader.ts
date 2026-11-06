import type { AdZoneDefinition } from "./adConfig";
import { isAllowedScriptOrigin, isValidPublisherZoneId } from "./adSafety";

const LOAD_TIMEOUT_MS = 4500;

export interface AdLoadOutcome {
  ok: boolean;
  reason?: "invalid_zone" | "invalid_origin" | "timeout" | "blocked_or_error";
}

/**
 * Loads an Adsterra publisher zone inside a dedicated DOM container without
 * blocking primary page rendering or injecting arbitrary HTML.
 */
export function loadAdsterraZoneScript(
  container: HTMLElement,
  zone: AdZoneDefinition
): Promise<AdLoadOutcome> {
  if (!isValidPublisherZoneId(zone.publisher_zone_id)) {
    return Promise.resolve({ ok: false, reason: "invalid_zone" });
  }
  if (!isAllowedScriptOrigin(zone.script_origin)) {
    return Promise.resolve({ ok: false, reason: "invalid_origin" });
  }

  const origin = new URL(zone.script_origin!).origin;
  const safeZoneId = encodeURIComponent(zone.publisher_zone_id!.trim());

  return new Promise((resolve) => {
    let settled = false;
    const finish = (outcome: AdLoadOutcome) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(outcome);
    };

    container.replaceChildren();

    const mountNode = document.createElement("div");
    mountNode.id = `container-${safeZoneId}`;
    container.appendChild(mountNode);

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.dataset.cfasync = "false";
    script.referrerPolicy = "strict-origin-when-cross-origin";
    script.src = `${origin}/${safeZoneId}/invoke.js`;

    script.onload = () => finish({ ok: true });
    script.onerror = () => {
      container.replaceChildren();
      finish({ ok: false, reason: "blocked_or_error" });
    };

    const timer = window.setTimeout(() => {
      if (!settled) {
        container.replaceChildren();
        finish({ ok: false, reason: "timeout" });
      }
    }, LOAD_TIMEOUT_MS);

    container.appendChild(script);
  });
}
