import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { MonetizationRuntimeConfig, PageCategory } from "./adConfig";
import { canLoadAdsUnderConsent } from "./adConsent";
import { AD_PLACEMENT_MAP, type PlacementKey } from "./adPlacementMap";
import { observeNearViewport, reportAdTelemetry } from "./adPerformance";
import { detectDeviceClass, tryRegisterAdSlot, unregisterAdSlot } from "./adRegistry";
import { isAllowedScriptOrigin, isFormatAdSafe, isPageAdSafe, isValidPublisherZoneId } from "./adSafety";
import { ADSTERRA_FORMAT_SPECS } from "./adsterraFormats";
import { loadAdsterraZoneScript } from "./adsterraLoader";
import { AdFallback } from "./AdFallback";

export interface AdSlotProps {
  placementKey: PlacementKey;
  pageCategory: PageCategory;
  pathname: string;
  language: "en" | "ur";
  config: MonetizationRuntimeConfig;
}

export function AdSlot({
  placementKey,
  pageCategory,
  pathname,
  language,
  config
}: AdSlotProps) {
  const instanceId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"idle" | "ready" | "loaded" | "collapsed">("idle");
  const [registered, setRegistered] = useState(false);

  const placement = AD_PLACEMENT_MAP[placementKey];
  const routeSafe = useMemo(() => {
    if (!placement) return false;
    if (!placement.allowedPages.includes(pageCategory)) return false;
    return isPageAdSafe(pageCategory, pathname, config.restrictedPageTypes);
  }, [placement, pageCategory, pathname, config.restrictedPageTypes]);

  const matchingZone = useMemo(() => {
    if (!config.masterEnabled || !routeSafe) return null;
    const device = detectDeviceClass();
    return config.zones.find((z) => {
      if (z.placement_key !== placementKey) return false;
      if (!isFormatAdSafe(z.format, config.socialBarEnabled)) return false;
      if (z.device_target !== "all" && z.device_target !== device) return false;
      if (z.language_target !== "all" && z.language_target !== language) return false;
      return true;
    }) ?? null;
  }, [config, routeSafe, placementKey, language]);

  const consentAllowed = canLoadAdsUnderConsent(config.consentRequired);
  const routeKey = `${pageCategory}:${pathname}`;

  useEffect(() => {
    if (!config.masterEnabled || !routeSafe || !consentAllowed) {
      setRegistered(false);
      setStatus("idle");
      return;
    }
    if (!matchingZone && !config.previewTestMode) {
      setRegistered(false);
      setStatus("idle");
      return;
    }

    const ok = tryRegisterAdSlot(routeKey, instanceId, config.maxAdsPerPage);
    setRegistered(ok);
    if (!ok) {
      setStatus("collapsed");
    }

    return () => {
      unregisterAdSlot(routeKey, instanceId);
    };
  }, [config.masterEnabled, config.previewTestMode, config.maxAdsPerPage, routeSafe, consentAllowed, matchingZone, routeKey, instanceId]);

  useEffect(() => {
    if (!registered || !matchingZone) return;
    if (!isValidPublisherZoneId(matchingZone.publisher_zone_id) || !isAllowedScriptOrigin(matchingZone.script_origin)) {
      setStatus("collapsed");
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    const startLoad = () => {
      if (cancelled) return;
      const startedAt = performance.now();
      setStatus("ready");
      reportAdTelemetry({
        slotId: placementKey,
        format: matchingZone.format,
        pageType: pageCategory,
        eventType: "slot_rendered"
      });

      void loadAdsterraZoneScript(el, matchingZone).then((outcome) => {
        if (cancelled) return;
        const elapsed = performance.now() - startedAt;
        if (outcome.ok) {
          setStatus("loaded");
          reportAdTelemetry({
            slotId: placementKey,
            format: matchingZone.format,
            pageType: pageCategory,
            eventType: "script_loaded",
            loadMs: elapsed
          });
        } else {
          setStatus("collapsed");
          reportAdTelemetry({
            slotId: placementKey,
            format: matchingZone.format,
            pageType: pageCategory,
            eventType: outcome.reason === "timeout" ? "timeout" : "load_error",
            loadMs: elapsed,
            errorCode: outcome.reason
          });
        }
      });
    };

    if (matchingZone.lazy_load) {
      const stopObserving = observeNearViewport(el, startLoad);
      return () => {
        cancelled = true;
        stopObserving();
        el.replaceChildren();
      };
    }
    startLoad();
    return () => {
      cancelled = true;
      el.replaceChildren();
    };
  }, [registered, matchingZone, placementKey, pageCategory]);

  if (!config.masterEnabled || !routeSafe || !consentAllowed || !registered) {
    return null;
  }

  if (!matchingZone || !isValidPublisherZoneId(matchingZone.publisher_zone_id) || !isAllowedScriptOrigin(matchingZone.script_origin)) {
    if (config.previewTestMode && placement) {
      return (
        <AdFallback
          previewMode
          format={matchingZone?.format ?? placement.defaultFormat}
          placementKey={placementKey}
          language={language}
        />
      );
    }
    return null;
  }

  if (status === "collapsed") {
    return null;
  }

  const spec = ADSTERRA_FORMAT_SPECS[matchingZone.format] ?? ADSTERRA_FORMAT_SPECS.native_banner;
  const isUrdu = language === "ur";

  return (
    <aside
      className={`ad-slot-wrapper ad-format-${matchingZone.format}`}
      data-ad-placement={placementKey}
      aria-label={isUrdu ? spec.disclosureUr : spec.disclosureEn}
      style={{
        marginTop: `${placement.minDistanceFromPrimaryCtaPx}px`,
        marginBottom: "28px"
      }}
    >
      <div className="ad-slot-header">
        <span className="ad-disclosure-badge">{isUrdu ? spec.disclosureUr : spec.disclosureEn}</span>
      </div>
      <div
        ref={containerRef}
        className="ad-slot-canvas"
        style={{
          minHeight: `${spec.minHeightPx}px`,
          maxWidth: `${spec.maxWidthPx}px`
        }}
      />
    </aside>
  );
}
