import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { clinic } from "../config/clinic.js";
import {
  adGroupLabels,
  negativeKeywordsEn,
  negativeKeywordsFr,
} from "../config/keywords.js";
import { allFsas, metaAgeMax, metaAgeMin } from "../config/geo.js";
import type { ResearchBundle } from "../types.js";
import { csvFile } from "../utils/csv.js";

function campaignName(lang: "en" | "fr"): string {
  return lang === "en"
    ? "Search_Invisalign_EN_WestIsland_Vaudreuil"
    : "Search_Invisalign_FR_WestIsland_Vaudreuil";
}

function adGroupName(lang: "en" | "fr", adGroup: string): string {
  const label = adGroupLabels[adGroup as keyof typeof adGroupLabels];
  return label ? label[lang] : adGroup;
}

export async function exportGooglePack(
  outDir: string,
  research: ResearchBundle
): Promise<void> {
  const googleDir = path.join(outDir, "google");
  await mkdir(googleDir, { recursive: true });

  // Keywords — phrase + exact for each seed
  const kwRows: Array<Array<string | number>> = [];
  for (const kw of research.keywords) {
    const camp = campaignName(kw.lang);
    const group = adGroupName(kw.lang, kw.adGroup);
    for (const match of ["Phrase", "Exact"] as const) {
      const keyword =
        match === "Exact" ? `[${kw.text}]` : `"${kw.text}"`;
      kwRows.push([
        camp,
        group,
        keyword,
        match,
        kw.lang.toUpperCase(),
        "Enabled",
      ]);
    }
  }

  await writeFile(
    path.join(googleDir, "keywords.csv"),
    csvFile(
      [
        "Campaign",
        "Ad Group",
        "Keyword",
        "Match Type",
        "Language",
        "Status",
      ],
      kwRows
    ),
    "utf8"
  );

  // Negatives
  const negRows: Array<Array<string | number>> = [];
  for (const n of negativeKeywordsEn) {
    negRows.push([campaignName("en"), n, "Broad", "Campaign"]);
  }
  for (const n of negativeKeywordsFr) {
    negRows.push([campaignName("fr"), n, "Broad", "Campaign"]);
  }
  await writeFile(
    path.join(googleDir, "negative-keywords.csv"),
    csvFile(
      ["Campaign", "Keyword", "Match Type", "Level"],
      negRows
    ),
    "utf8"
  );

  // Geo targets
  const geoRows = research.geoTargets.map((g) => [
    g.name,
    g.nameFr,
    g.tier,
    g.fsas.join("; "),
    "Presence",
    clinic.address.province,
    clinic.address.country,
  ]);
  geoRows.push([
    `Radius ${clinic.radiusKm}km from clinic`,
    `Rayon ${clinic.radiusKm} km de la clinique`,
    "radius",
    allFsas.join("; "),
    "Presence",
    clinic.address.province,
    clinic.address.country,
  ]);
  await writeFile(
    path.join(googleDir, "geo-targets.csv"),
    csvFile(
      [
        "Location",
        "Location FR",
        "Tier",
        "FSAs",
        "Location Option",
        "Province",
        "Country",
      ],
      geoRows
    ),
    "utf8"
  );

  // RSA ads
  await writeFile(
    path.join(googleDir, "rsa-ads-en.csv"),
    buildRsaCsv("en", research),
    "utf8"
  );
  await writeFile(
    path.join(googleDir, "rsa-ads-fr.csv"),
    buildRsaCsv("fr", research),
    "utf8"
  );

  await writeFile(
    path.join(googleDir, "campaign-structure.md"),
    buildCampaignStructureMd(research),
    "utf8"
  );
}

function buildRsaCsv(lang: "en" | "fr", research: ResearchBundle): string {
  const base = research.landingBaseUrl;
  const path_ = lang === "en" ? "/en" : "/fr";
  const finalUrl = `${base}${path_}`;
  const camp = campaignName(lang);

  const groups =
    lang === "en"
      ? [
          {
            adGroup: adGroupLabels.core.en,
            headlines: [
              "Invisalign in Vaudreuil",
              "Dr. Elizabeth Peeling",
              "Clear Aligners Near You",
              "Preferred Invisalign Provider",
              "Book Your Consultation",
              "Bilingual Dental Care",
              "West Island & Vaudreuil",
              "SmileView Preview Available",
              "Financing Options Available",
              "LE 32 Clinique Dentaire",
              "Discreet Clear Aligners",
              "Cosmetic Dentistry Focus",
              "Start Your Smile Journey",
              "Adult Invisalign Consults",
              "Trusted Local Dentist",
            ],
            descriptions: [
              "Explore clear aligners with Dr. Elizabeth Peeling at LE 32 in Vaudreuil-Dorion. Book a consult today.",
              "Bilingual Invisalign care for West Island & Vaudreuil. Financing available. Preview with SmileView.",
              "Preferred Invisalign Provider. Gentle, evidence-based cosmetic care — schedule your visit.",
              "Serving Vaudreuil-Dorion and the West Island. Call or book online for an Invisalign consultation.",
            ],
          },
          {
            adGroup: adGroupLabels.cost.en,
            headlines: [
              "Invisalign Financing Options",
              "Flexible Payment Plans",
              "Ask About Invisalign Cost",
              "Beautifi Financing",
              "Clear Aligners Consult",
              "No Pressure Consultation",
              "Dr. Elizabeth Peeling",
              "Vaudreuil Invisalign",
              "Transparent Treatment Plans",
              "Book to Discuss Pricing",
              "West Island Clear Aligners",
              "LE 32 Clinique Dentaire",
              "Start With a Consult",
              "Payment Plans Available",
              "Invisalign Near You",
            ],
            descriptions: [
              "Wondering about Invisalign cost? Book a consult for a personalized plan and financing options.",
              "Flexible payments via Beautifi. Get clear answers on pricing at your Invisalign consultation.",
              "Transparent treatment planning in Vaudreuil-Dorion. Call or book online today.",
              "Discuss costs, timelines, and financing with Dr. Peeling — no obligation consultation.",
            ],
          },
          {
            adGroup: adGroupLabels.adult.en,
            headlines: [
              "Invisalign for Adults",
              "Discreet Clear Aligners",
              "Adult Smile Alignment",
              "Cosmetic Clear Aligners",
              "Professional-Friendly Care",
              "Dr. Elizabeth Peeling",
              "Book Adult Consult",
              "West Island Invisalign",
              "Vaudreuil Cosmetic Dentist",
              "Smile Design Options",
              "LE 32 Clinique Dentaire",
              "Bilingual Adult Care",
              "Clear Aligners Consult",
              "Modern Orthodontic Option",
              "Start Your Consultation",
            ],
            descriptions: [
              "Clear aligners designed around adult lifestyles. Discreet care in Vaudreuil-Dorion.",
              "Cosmetic Invisalign consultations with Dr. Peeling — bilingual team at LE 32.",
              "Align your smile without traditional braces. Book an adult Invisalign consult.",
              "Serving professionals across West Island & Vaudreuil. Preview with SmileView.",
            ],
          },
          {
            adGroup: adGroupLabels.local.en,
            headlines: [
              "Invisalign Near Vaudreuil",
              "West Island Invisalign",
              "Pointe-Claire Area Care",
              "Kirkland & Nearby",
              "Local Clear Aligners",
              "Dr. Elizabeth Peeling",
              "LE 32 Vaudreuil-Dorion",
              "Book Local Consult",
              "Bilingual Local Dentist",
              "Close to West Island",
              "Saint-Lazare & Hudson",
              "DDO & Pierrefonds Area",
              "Easy Clinic Access",
              "Parking On Site",
              "Call to Book Today",
            ],
            descriptions: [
              "Local Invisalign care at LE 32 Clinique Dentaire in Vaudreuil-Dorion — West Island welcome.",
              "Convenient for Pointe-Claire, Kirkland, DDO, Saint-Lazare & nearby. Book online.",
              "Bilingual Invisalign consultations close to home. Dr. Elizabeth Peeling, DMD.",
              "Serving Vaudreuil–Soulanges and Montreal West Island. Call or book your visit.",
            ],
          },
        ]
      : [
          {
            adGroup: adGroupLabels.core.fr,
            headlines: [
              "Invisalign à Vaudreuil",
              "Dre Elizabeth Peeling",
              "Aligneurs transparents",
              "Fournisseure Invisalign",
              "Prenez rendez-vous",
              "Soins bilingues",
              "West Island et Vaudreuil",
              "Aperçu SmileView",
              "Financement disponible",
              "LE 32 Clinique Dentaire",
              "Gouttières discrètes",
              "Dentisterie esthétique",
              "Commencez votre sourire",
              "Consultation Invisalign",
              "Dentiste de confiance",
            ],
            descriptions: [
              "Découvrez les aligneurs avec la Dre Peeling à LE 32, Vaudreuil-Dorion. Prenez rendez-vous.",
              "Soins Invisalign bilingues pour West Island et Vaudreuil. Financement et SmileView.",
              "Fournisseure Invisalign préférée. Soins esthétiques doux — réservez votre visite.",
              "Au service de Vaudreuil-Dorion et du West Island. Appelez ou réservez en ligne.",
            ],
          },
          {
            adGroup: adGroupLabels.cost.fr,
            headlines: [
              "Financement Invisalign",
              "Plans de paiement",
              "Prix Invisalign",
              "Financement Beautifi",
              "Consultation aligneurs",
              "Sans pression",
              "Dre Elizabeth Peeling",
              "Invisalign Vaudreuil",
              "Plan de traitement clair",
              "Discutez des coûts",
              "Aligneurs West Island",
              "LE 32 Clinique Dentaire",
              "Commencez par une consult",
              "Paiements flexibles",
              "Invisalign près de vous",
            ],
            descriptions: [
              "Questions sur le coût d'Invisalign? Réservez une consult pour un plan personnalisé.",
              "Paiements flexibles via Beautifi. Obtenez des réponses claires en consultation.",
              "Planification transparente à Vaudreuil-Dorion. Appelez ou réservez en ligne.",
              "Discutez coûts, délais et financement avec la Dre Peeling — sans obligation.",
            ],
          },
          {
            adGroup: adGroupLabels.adult.fr,
            headlines: [
              "Invisalign pour adultes",
              "Aligneurs discrets",
              "Alignement adulte",
              "Esthétique et aligneurs",
              "Soins professionnels",
              "Dre Elizabeth Peeling",
              "Consult adulte",
              "Invisalign West Island",
              "Dentiste esthétique",
              "Design du sourire",
              "LE 32 Clinique Dentaire",
              "Soins bilingues adultes",
              "Consultation aligneurs",
              "Option orthodontique moderne",
              "Prenez rendez-vous",
            ],
            descriptions: [
              "Aligneurs pensés pour le style de vie des adultes. Soins discrets à Vaudreuil-Dorion.",
              "Consultations Invisalign esthétiques avec la Dre Peeling — équipe bilingue LE 32.",
              "Alignez votre sourire sans broches traditionnelles. Réservez une consult adulte.",
              "Pour les professionnels du West Island et de Vaudreuil. Aperçu SmileView.",
            ],
          },
          {
            adGroup: adGroupLabels.local.fr,
            headlines: [
              "Invisalign près de Vaudreuil",
              "Invisalign West Island",
              "Secteur Pointe-Claire",
              "Kirkland et environs",
              "Aligneurs locaux",
              "Dre Elizabeth Peeling",
              "LE 32 Vaudreuil-Dorion",
              "Rendez-vous local",
              "Dentiste bilingue",
              "Proche du West Island",
              "Saint-Lazare et Hudson",
              "Secteur DDO Pierrefonds",
              "Accès facile",
              "Stationnement sur place",
              "Appelez aujourd'hui",
            ],
            descriptions: [
              "Soins Invisalign locaux à LE 32, Vaudreuil-Dorion — West Island bienvenu.",
              "Pratique pour Pointe-Claire, Kirkland, DDO, Saint-Lazare et environs.",
              "Consultations Invisalign bilingues près de chez vous. Dre Elizabeth Peeling.",
              "Vaudreuil–Soulanges et West Island de Montréal. Appelez ou réservez.",
            ],
          },
        ];

  const headers = [
    "Campaign",
    "Ad Group",
    "Final URL",
    "Path 1",
    "Path 2",
    ...Array.from({ length: 15 }, (_, i) => `Headline ${i + 1}`),
    ...Array.from({ length: 4 }, (_, i) => `Description ${i + 1}`),
  ];

  const rows = groups.map((g) => [
    camp,
    g.adGroup,
    finalUrl,
    "Invisalign",
    lang === "en" ? "Consult" : "Consult",
    ...g.headlines.slice(0, 15),
    ...g.descriptions.slice(0, 4),
  ]);

  return csvFile(headers, rows);
}

function buildCampaignStructureMd(research: ResearchBundle): string {
  const themes = research.reviewThemes
    .slice(0, 5)
    .map((t) => `- **${t.label}**: ${t.creativeAngleEn}`)
    .join("\n");

  return `# Google Ads — Campaign Structure

Generated: ${research.generatedAt}

## Campaigns

| Campaign | Language | Landing |
|---|---|---|
| \`${campaignName("en")}\` | English | ${research.landingBaseUrl}/en |
| \`${campaignName("fr")}\` | French | ${research.landingBaseUrl}/fr |

## Ad groups (each campaign)

1. **Core Invisalign** — brand + clear aligner intent
2. **Cost & Financing** — price / payment queries
3. **Adult & Cosmetic** — adult / discreet / cosmetic intent
4. **Local Geo** — city-modified keywords (Vaudreuil, West Island cities)

## Match types

- Import **Phrase** and **Exact** from \`keywords.csv\`
- Start with Exact + Phrase only; add Broad Match later with smart bidding if volume is thin

## Locations

- Target **Presence** (people in or regularly in) — not “interested in”
- Cities: see \`geo-targets.csv\` (primary Vaudreuil corridor + secondary West Island)
- Optional radius: **${clinic.radiusKm} km** around ${clinic.address.street}, ${clinic.address.city}
- FSAs for manual/postal planning: ${allFsas.join(", ")}

## Bidding (starting guidance)

- Strategy: Maximize conversions (or Maximize clicks → switch after 30+ conversions)
- Daily budget starter: CAD $30–60 per language campaign (adjust to capacity)
- Exclude search partners initially; enable after quality review

## Extensions

- Call: ${clinic.phoneDisplay}
- Location: ${clinic.practiceName}, ${clinic.address.city}
- Sitelinks: Book consult, SmileView, Financing, Reviews
- Callouts: Bilingual care, Preferred Invisalign Provider, On-site parking

## Creative angles from research

${themes}

## Compliance notes

- Do not promise clinical outcomes or specific prices in headlines
- Keep conversion tracking free of treatment details / PHI in URLs
- Quebec bilingual: run EN and FR as separate campaigns
`;
}
