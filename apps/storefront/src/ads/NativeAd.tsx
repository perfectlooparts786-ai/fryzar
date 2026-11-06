import type { MonetizationRuntimeConfig, PageCategory } from "./adConfig";
import type { PlacementKey } from "./adPlacementMap";
import { AdSlot } from "./AdSlot";

export interface NativeAdProps {
  placementKey: PlacementKey;
  pageCategory: PageCategory;
  pathname: string;
  language: "en" | "ur";
  config: MonetizationRuntimeConfig;
}

export function NativeAd(props: NativeAdProps) {
  return (
    <div className="ad-native-region">
      <AdSlot {...props} />
    </div>
  );
}
