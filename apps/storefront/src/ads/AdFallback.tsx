import type { AdFormat } from "./adConfig";
import { ADSTERRA_FORMAT_SPECS } from "./adsterraFormats";

interface AdFallbackProps {
  previewMode: boolean;
  format: AdFormat;
  placementKey: string;
  language: "en" | "ur";
}

export function AdFallback({ previewMode, format, placementKey, language }: AdFallbackProps) {
  if (!previewMode) {
    return null;
  }

  const spec = ADSTERRA_FORMAT_SPECS[format];
  const isUrdu = language === "ur";

  return (
    <aside
      className="ad-slot-preview"
      data-ad-preview={placementKey}
      aria-label={isUrdu ? "اشتہاری جگہ (آزمائشی)" : "Sponsored placement preview"}
      style={{
        minHeight: `${Math.min(spec.minHeightPx, 96)}px`,
        maxWidth: `${spec.maxWidthPx}px`
      }}
    >
      <span className="ad-disclosure-badge">
        {isUrdu ? spec.disclosureUr : spec.disclosureEn} · PREVIEW
      </span>
      <p className="ad-preview-note">
        {isUrdu
          ? `اشتہاری خانہ (${placementKey}) آزمودہ موڈ میں فعال ہے۔ حقیقی پبلشر زون آئی ڈی درج ہونے تک کوئی بیرونی اسکرپٹ لوڈ نہیں ہوتا۔`
          : `Ad placement (${placementKey}) is in safe preview mode. No external Adsterra script loads until a verified publisher zone ID is configured.`}
      </p>
    </aside>
  );
}
