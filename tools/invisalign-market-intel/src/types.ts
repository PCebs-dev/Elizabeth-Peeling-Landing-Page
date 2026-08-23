import type { AdGroup, Lang } from "./config/keywords.js";
import type { GeoTarget } from "./config/geo.js";

export interface CompetitorPlace {
  name: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  placeId?: string;
  mapsUri?: string;
  types?: string[];
  source: "places" | "seed";
}

export interface ReviewTheme {
  theme: string;
  label: string;
  labelFr: string;
  hits: number;
  creativeAngleEn: string;
  creativeAngleFr: string;
}

export interface SerpSnapshot {
  query: string;
  lang: Lang;
  topTitles: string[];
  source: "serpapi" | "seed";
}

export interface KeywordVolumeHint {
  keyword: string;
  lang: Lang;
  monthlySearches?: number;
  source: "serpapi" | "seed";
}

export interface ResearchBundle {
  generatedAt: string;
  landingBaseUrl: string;
  hasPlacesKey: boolean;
  hasSerpKey: boolean;
  geoTargets: GeoTarget[];
  competitors: CompetitorPlace[];
  reviewThemes: ReviewTheme[];
  serpSnapshots: SerpSnapshot[];
  keywordVolumes: KeywordVolumeHint[];
  fsaDemographics: Record<string, unknown>;
  keywords: Array<{
    text: string;
    lang: Lang;
    adGroup: AdGroup;
  }>;
}
