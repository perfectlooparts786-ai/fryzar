import type { AdFormat } from "./adConfig";

export interface AdFormatSpec {
  format: AdFormat;
  minHeightPx: number;
  maxWidthPx: number;
  disclosureEn: string;
  disclosureUr: string;
}

export const ADSTERRA_FORMAT_SPECS: Record<AdFormat, AdFormatSpec> = {
  native_banner: {
    format: "native_banner",
    minHeightPx: 140,
    maxWidthPx: 1120,
    disclosureEn: "Sponsored",
    disclosureUr: "اشتہار"
  },
  display_banner: {
    format: "display_banner",
    minHeightPx: 90,
    maxWidthPx: 728,
    disclosureEn: "Sponsored",
    disclosureUr: "اشتہار"
  },
  in_content: {
    format: "in_content",
    minHeightPx: 160,
    maxWidthPx: 760,
    disclosureEn: "Sponsored",
    disclosureUr: "اشتہار"
  },
  mobile_banner: {
    format: "mobile_banner",
    minHeightPx: 60,
    maxWidthPx: 360,
    disclosureEn: "Sponsored",
    disclosureUr: "اشتہار"
  },
  footer_banner: {
    format: "footer_banner",
    minHeightPx: 90,
    maxWidthPx: 970,
    disclosureEn: "Sponsored",
    disclosureUr: "اشتہار"
  },
  social_bar: {
    format: "social_bar",
    minHeightPx: 48,
    maxWidthPx: 420,
    disclosureEn: "Sponsored",
    disclosureUr: "اشتہار"
  }
};
