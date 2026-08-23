import { clinic } from "../config/clinic.js";
import type { CompetitorPlace } from "../types.js";

/** Known local / regional Invisalign-adjacent practices used when Places API is unavailable. */
const SEED_COMPETITORS: CompetitorPlace[] = [
  {
    name: "LE 32 Clinique Dentaire (your clinic)",
    address: "22800 Chemin Dumberry, Suite 1C, Vaudreuil-Dorion, QC",
    source: "seed",
  },
  {
    name: "West Island orthodontic / dental competitors (research manually)",
    address: "Pointe-Claire / Kirkland / DDO corridor",
    source: "seed",
  },
  {
    name: "Vaudreuil–Soulanges dental competitors (research manually)",
    address: "Vaudreuil-Dorion / Saint-Lazare / Hudson",
    source: "seed",
  },
];

interface PlacesSearchResponse {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    rating?: number;
    userRatingCount?: number;
    googleMapsUri?: string;
    types?: string[];
  }>;
  error?: { message?: string };
}

/**
 * Fetch nearby dental / Invisalign-related places via Google Places API (New).
 * Falls back to seed list when no API key.
 */
export async function collectCompetitors(
  apiKey: string | undefined
): Promise<CompetitorPlace[]> {
  if (!apiKey) {
    console.log("  [places] No GOOGLE_PLACES_API_KEY — using seed competitor placeholders");
    return SEED_COMPETITORS;
  }

  const queries = [
    "Invisalign dentist",
    "orthodontist",
    "dentiste Invisalign",
    "clinique dentaire",
  ];

  const byId = new Map<string, CompetitorPlace>();

  for (const textQuery of queries) {
    try {
      const res = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri,places.types",
          },
          body: JSON.stringify({
            textQuery: `${textQuery} near ${clinic.address.city} Quebec`,
            locationBias: {
              circle: {
                center: { latitude: clinic.lat, longitude: clinic.lng },
                radius: clinic.radiusKm * 1000,
              },
            },
            maxResultCount: 15,
            languageCode: "en",
            regionCode: "CA",
          }),
        }
      );

      if (!res.ok) {
        const body = await res.text();
        console.warn(`  [places] HTTP ${res.status} for "${textQuery}": ${body.slice(0, 200)}`);
        continue;
      }

      const data = (await res.json()) as PlacesSearchResponse;
      for (const p of data.places ?? []) {
        const id = p.id ?? p.displayName?.text ?? Math.random().toString(36);
        if (byId.has(id)) continue;
        byId.set(id, {
          name: p.displayName?.text ?? "Unknown",
          address: p.formattedAddress,
          rating: p.rating,
          reviewCount: p.userRatingCount,
          placeId: p.id,
          mapsUri: p.googleMapsUri,
          types: p.types,
          source: "places",
        });
      }
    } catch (err) {
      console.warn(`  [places] Failed query "${textQuery}":`, err);
    }
  }

  const results = [...byId.values()].sort(
    (a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0)
  );

  if (results.length === 0) {
    console.warn("  [places] No results — falling back to seeds");
    return SEED_COMPETITORS;
  }

  console.log(`  [places] Found ${results.length} unique competitors`);
  return results;
}
