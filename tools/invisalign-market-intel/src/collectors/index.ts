import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { clinic } from "../config/clinic.js";
import { geoTargets } from "../config/geo.js";
import { buildKeywordSeeds } from "../config/keywords.js";
import { collectCompetitors } from "./places.js";
import { collectSerpSnapshots } from "./serp.js";
import { extractReviewThemes } from "./themes.js";
import type { ResearchBundle } from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runCollectors(opts: {
  landingBaseUrl: string;
  placesKey?: string;
  serpKey?: string;
}): Promise<ResearchBundle> {
  console.log("Collecting market signals...");

  const [competitors, serp, fsaRaw] = await Promise.all([
    collectCompetitors(opts.placesKey),
    collectSerpSnapshots(opts.serpKey),
    readFile(
      path.join(__dirname, "../data/fsa-demographics.json"),
      "utf8"
    ).then((t) => JSON.parse(t) as { fsas: Record<string, unknown> }),
  ]);

  // Pull review-ish text from competitor names/addresses + SERP blobs
  const themeTexts = [
    ...serp.textBlobs,
    ...competitors.flatMap((c) => [c.name, c.address ?? ""]),
  ];
  const reviewThemes = extractReviewThemes(themeTexts);

  const cities = geoTargets.map((g) => g.name);
  const keywordSeeds = buildKeywordSeeds(cities);

  return {
    generatedAt: new Date().toISOString(),
    landingBaseUrl: opts.landingBaseUrl.replace(/\/$/, ""),
    hasPlacesKey: Boolean(opts.placesKey),
    hasSerpKey: Boolean(opts.serpKey),
    geoTargets,
    competitors,
    reviewThemes,
    serpSnapshots: serp.snapshots,
    keywordVolumes: serp.volumes,
    fsaDemographics: fsaRaw.fsas,
    keywords: keywordSeeds.map((k) => ({
      text: k.text,
      lang: k.lang,
      adGroup: k.adGroup,
    })),
  };
}

export { clinic };
