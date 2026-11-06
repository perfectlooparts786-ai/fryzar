import type { AdFormat, PageCategory } from "./adConfig";

export type PlacementKey =
  | "home_mid_feed"
  | "category_footer"
  | "products_footer"
  | "product_below_related"
  | "search_below_results"
  | "promotions_sponsor_card"
  | "editorial_in_article"
  | "editorial_footer"
  | "about_footer";

export interface PlacementSpec {
  key: PlacementKey;
  allowedPages: readonly PageCategory[];
  defaultFormat: AdFormat;
  minDistanceFromPrimaryCtaPx: number;
  description: string;
}

export const AD_PLACEMENT_MAP: Record<PlacementKey, PlacementSpec> = {
  home_mid_feed: {
    key: "home_mid_feed",
    allowedPages: ["home"],
    defaultFormat: "native_banner",
    minDistanceFromPrimaryCtaPx: 48,
    description: "Below featured catalogue grid and above how-it-works section on Home."
  },
  category_footer: {
    key: "category_footer",
    allowedPages: ["categories"],
    defaultFormat: "display_banner",
    minDistanceFromPrimaryCtaPx: 48,
    description: "Footer sponsorship slot below category browse cards."
  },
  products_footer: {
    key: "products_footer",
    allowedPages: ["products"],
    defaultFormat: "footer_banner",
    minDistanceFromPrimaryCtaPx: 56,
    description: "Below product listing grid, clear of add-to-basket buttons."
  },
  product_below_related: {
    key: "product_below_related",
    allowedPages: ["product-detail"],
    defaultFormat: "native_banner",
    minDistanceFromPrimaryCtaPx: 64,
    description: "Below related product suggestions on standalone product detail pages (never inside modal)."
  },
  search_below_results: {
    key: "search_below_results",
    allowedPages: ["search"],
    defaultFormat: "display_banner",
    minDistanceFromPrimaryCtaPx: 48,
    description: "Below search results list."
  },
  promotions_sponsor_card: {
    key: "promotions_sponsor_card",
    allowedPages: ["promotions"],
    defaultFormat: "native_banner",
    minDistanceFromPrimaryCtaPx: 48,
    description: "Clearly labelled sponsored section below store promotions."
  },
  editorial_in_article: {
    key: "editorial_in_article",
    allowedPages: ["editorial-detail"],
    defaultFormat: "in_content",
    minDistanceFromPrimaryCtaPx: 40,
    description: "In-article sponsorship block inside food guides and recipes."
  },
  editorial_footer: {
    key: "editorial_footer",
    allowedPages: ["editorial-list", "editorial-detail"],
    defaultFormat: "footer_banner",
    minDistanceFromPrimaryCtaPx: 48,
    description: "Footer sponsorship block on editorial guides pages."
  },
  about_footer: {
    key: "about_footer",
    allowedPages: ["about"],
    defaultFormat: "footer_banner",
    minDistanceFromPrimaryCtaPx: 48,
    description: "Footer banner below brand story on About FRYZAR."
  }
};
