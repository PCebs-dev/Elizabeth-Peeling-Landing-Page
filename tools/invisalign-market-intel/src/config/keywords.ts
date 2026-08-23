export type AdGroup =
  | "core"
  | "cost"
  | "adult"
  | "local";

export type Lang = "en" | "fr";

export interface KeywordSeed {
  text: string;
  lang: Lang;
  adGroup: AdGroup;
  /** Phrase match by default; exact variants generated in exporter */
  matchPreference: "phrase" | "exact";
}

/** Core EN stems */
const enCore = [
  "Invisalign",
  "Invisalign dentist",
  "Invisalign provider",
  "clear aligners",
  "clear aligner dentist",
  "invisible braces",
  "teeth aligners",
];

const enCost = [
  "Invisalign cost",
  "Invisalign price",
  "Invisalign financing",
  "cheap Invisalign",
  "Invisalign payment plan",
  "how much does Invisalign cost",
];

const enAdult = [
  "Invisalign for adults",
  "adult Invisalign",
  "cosmetic dentist Invisalign",
  "smile makeover clear aligners",
  "discreet braces adults",
];

/** Core FR stems */
const frCore = [
  "Invisalign",
  "dentiste Invisalign",
  "fournisseur Invisalign",
  "aligneurs transparents",
  "appareil transparent",
  "gouttières Invisalign",
  "orthodontie invisible",
];

const frCost = [
  "Invisalign prix",
  "coût Invisalign",
  "Invisalign financement",
  "Invisalign pas cher",
  "combien coûte Invisalign",
];

const frAdult = [
  "Invisalign adulte",
  "Invisalign pour adultes",
  "dentiste esthétique Invisalign",
  "aligneurs adultes",
];

function toSeeds(
  texts: string[],
  lang: Lang,
  adGroup: AdGroup
): KeywordSeed[] {
  return texts.map((text) => ({
    text,
    lang,
    adGroup,
    matchPreference: "phrase" as const,
  }));
}

/**
 * Build full keyword seed list including city-modified local terms.
 */
export function buildKeywordSeeds(cities: string[]): KeywordSeed[] {
  const seeds: KeywordSeed[] = [
    ...toSeeds(enCore, "en", "core"),
    ...toSeeds(enCost, "en", "cost"),
    ...toSeeds(enAdult, "en", "adult"),
    ...toSeeds(frCore, "fr", "core"),
    ...toSeeds(frCost, "fr", "cost"),
    ...toSeeds(frAdult, "fr", "adult"),
  ];

  for (const city of cities) {
    seeds.push(
      {
        text: `Invisalign ${city}`,
        lang: "en",
        adGroup: "local",
        matchPreference: "phrase",
      },
      {
        text: `Invisalign dentist ${city}`,
        lang: "en",
        adGroup: "local",
        matchPreference: "phrase",
      },
      {
        text: `clear aligners ${city}`,
        lang: "en",
        adGroup: "local",
        matchPreference: "phrase",
      },
      {
        text: `Invisalign ${city}`,
        lang: "fr",
        adGroup: "local",
        matchPreference: "phrase",
      },
      {
        text: `dentiste Invisalign ${city}`,
        lang: "fr",
        adGroup: "local",
        matchPreference: "phrase",
      },
      {
        text: `aligneurs transparents ${city}`,
        lang: "fr",
        adGroup: "local",
        matchPreference: "phrase",
      }
    );
  }

  return seeds;
}

export const negativeKeywordsEn = [
  "job",
  "jobs",
  "career",
  "careers",
  "salary",
  "training",
  "course",
  "certification",
  "DIY",
  "at home",
  "Byte",
  "SmileDirectClub",
  "Toronto",
  "Vancouver",
  "Ottawa",
  "free",
  "Reddit",
  "lawsuit",
  "scam",
];

export const negativeKeywordsFr = [
  "emploi",
  "emplois",
  "carrière",
  "salaire",
  "formation",
  "cours",
  "DIY",
  "maison",
  "Toronto",
  "Vancouver",
  "Ottawa",
  "gratuit",
  "arnaque",
];

export const adGroupLabels: Record<
  AdGroup,
  { en: string; fr: string }
> = {
  core: { en: "Core Invisalign", fr: "Invisalign principal" },
  cost: { en: "Cost & Financing", fr: "Prix et financement" },
  adult: { en: "Adult & Cosmetic", fr: "Adulte et esthétique" },
  local: { en: "Local Geo", fr: "Géo locale" },
};
