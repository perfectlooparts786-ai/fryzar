import type { MonetizationRuntimeConfig, PageCategory } from "./adConfig";
import type { PlacementKey } from "./adPlacementMap";
import { AdSlot } from "./AdSlot";

export interface BannerAdProps {
  placementKey: PlacementKey;
  pageCategory: PageCategory;
  pathname: string;
  language: "en" | "ur";
  config: MonetizationRuntimeConfig;
}

export function BannerAd(props: BannerAdProps) {
  return (
    <div className="ad-banner-region">
      <AdSlot {...props} />
    </div>
  );
}
