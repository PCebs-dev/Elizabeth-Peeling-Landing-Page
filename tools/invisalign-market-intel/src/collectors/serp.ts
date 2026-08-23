import type { Lang } from "../config/keywords.js";
import type { KeywordVolumeHint, SerpSnapshot } from "../types.js";

interface SerpOrganic {
  title?: string;
  snippet?: string;
}

interface SerpResponse {
  organic_results?: SerpOrganic[];
  search_information?: { total_results?: number };
  error?: string;
}

const SEED_QUERIES: Array<{ query: string; lang: Lang }> = [
  { query: "Invisalign Vaudreuil", lang: "en" },
  { query: "Invisalign West Island", lang: "en" },
  { query: "Invisalign Pointe-Claire", lang: "en" },
  { query: "Invisalign Vaudreuil-Dorion", lang: "fr" },
  { query: "dentiste Invisalign Vaudreuil", lang: "fr" },
  { query: "aligneurs transparents West Island", lang: "fr" },
];

/**
 * Optional SerpAPI local SERP snapshots. Without a key, returns seed placeholders.
 */
export async function collectSerpSnapshots(
  apiKey: string | undefined
): Promise<{ snapshots: SerpSnapshot[]; textBlobs: string[]; volumes: KeywordVolumeHint[] }> {
  if (!apiKey) {
    console.log("  [serp] No SERPAPI_KEY — using seed SERP placeholders");
    const snapshots: SerpSnapshot[] = SEED_QUERIES.map((q) => ({
      query: q.query,
      lang: q.lang,
      topTitles: [
        "(Add SERPAPI_KEY for live titles)",
        "Local dental / Invisalign listings typically dominate these queries",
      ],
      source: "seed",
    }));
    const volumes: KeywordVolumeHint[] = SEED_QUERIES.map((q) => ({
      keyword: q.query,
      lang: q.lang,
      source: "seed",
    }));
    return { snapshots, textBlobs: [], volumes };
  }

  const snapshots: SerpSnapshot[] = [];
  const textBlobs: string[] = [];
  const volumes: KeywordVolumeHint[] = [];

  for (const q of SEED_QUERIES) {
    try {
      const url = new URL("https://serpapi.com/search.json");
      url.searchParams.set("engine", "google");
      url.searchParams.set("q", q.query);
      url.searchParams.set("location", "Montreal, Quebec, Canada");
      url.searchParams.set("google_domain", "google.ca");
      url.searchParams.set("gl", "ca");
      url.searchParams.set("hl", q.lang === "fr" ? "fr" : "en");
      url.searchParams.set("api_key", apiKey);
      url.searchParams.set("num", "10");

      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`  [serp] HTTP ${res.status} for "${q.query}"`);
        continue;
      }

      const data = (await res.json()) as SerpResponse;
      if (data.error) {
        console.warn(`  [serp] Error for "${q.query}": ${data.error}`);
        continue;
      }

      const organics = data.organic_results ?? [];
      const titles = organics
        .map((o) => o.title)
        .filter((t): t is string => Boolean(t))
        .slice(0, 8);

      snapshots.push({
        query: q.query,
        lang: q.lang,
        topTitles: titles,
        source: "serpapi",
      });

      for (const o of organics) {
        if (o.title) textBlobs.push(o.title);
        if (o.snippet) textBlobs.push(o.snippet);
      }

      volumes.push({
        keyword: q.query,
        lang: q.lang,
        monthlySearches: data.search_information?.total_results,
        source: "serpapi",
      });
    } catch (err) {
      console.warn(`  [serp] Failed "${q.query}":`, err);
    }
  }

  console.log(`  [serp] Collected ${snapshots.length} SERP snapshots`);
  return { snapshots, textBlobs, volumes };
}
