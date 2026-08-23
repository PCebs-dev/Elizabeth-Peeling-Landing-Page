import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { clinic } from "../config/clinic.js";
import { metaAgeMax, metaAgeMin } from "../config/geo.js";
import type { ResearchBundle } from "../types.js";

export async function exportMetaPack(
  outDir: string,
  research: ResearchBundle
): Promise<void> {
  const metaDir = path.join(outDir, "meta");
  await mkdir(metaDir, { recursive: true });

  await writeFile(
    path.join(metaDir, "campaign-brief.md"),
    buildCampaignBrief(research),
    "utf8"
  );
  await writeFile(
    path.join(metaDir, "audience-setup.md"),
    buildAudienceSetup(research),
    "utf8"
  );
  await writeFile(
    path.join(metaDir, "ad-copy-en.md"),
    buildAdCopy("en", research),
    "utf8"
  );
  await writeFile(
    path.join(metaDir, "ad-copy-fr.md"),
    buildAdCopy("fr", research),
    "utf8"
  );
}

function primaryCities(research: ResearchBundle): string {
  return research.geoTargets
    .filter((g) => g.tier === "primary")
    .map((g) => g.name)
    .join(", ");
}

function secondaryCities(research: ResearchBundle): string {
  return research.geoTargets
    .filter((g) => g.tier === "secondary")
    .map((g) => g.name)
    .join(", ");
}

function buildCampaignBrief(research: ResearchBundle): string {
  const topThemes = research.reviewThemes
    .slice(0, 4)
    .map((t) => `- ${t.label}: ${t.creativeAngleEn}`)
    .join("\n");

  return `# Meta Ads — Campaign Brief

Generated: ${research.generatedAt}

## Objective

**Traffic** or **Leads** (consult booking clicks) → landing pages:
- EN: ${research.landingBaseUrl}/en
- FR: ${research.landingBaseUrl}/fr

Recommended start: **Traffic** (landing page views) until pixel/events are stable, then **Leads** or **Conversions** on outbound booking clicks.

## Special Ad Category

Select **Health** (required for dental / Invisalign). This limits detailed interest targeting — lean on **geo + age + language + creative**.

## Campaign structure

| Campaign | Ad sets | Notes |
|---|---|---|
| \`Meta_Invisalign_EN_WestIsland_Vaudreuil\` | EN Primary geo, EN Secondary geo | Age ${metaAgeMin}–${metaAgeMax} |
| \`Meta_Invisalign_FR_WestIsland_Vaudreuil\` | FR Primary geo, FR Secondary geo | Age ${metaAgeMin}–${metaAgeMax} |

## Placements

- Advantage+ placements OK after creative review
- Or manual: Instagram Feed, Instagram Stories, Facebook Feed
- Avoid Audience Network initially

## Budget starter

- CAD $15–40/day per language campaign
- Optimize for landing page views / link clicks
- Creative refresh every 2–3 weeks

## Creative angles (from research)

${topThemes}

## Compliance

- Do **not** assert personal attributes (“your crooked teeth”, “you need braces”)
- Describe the **service**, not the viewer’s condition
- No guaranteed treatment outcomes; candidacy requires clinical exam
- Do **not** upload patient lists or CRM audiences with health data
- Quebec: run EN and FR separately with matching creative language

## Clinic details for creative

- ${clinic.doctorName} / ${clinic.doctorNameFr}
- ${clinic.practiceName}
- ${clinic.address.street}, ${clinic.address.city}, ${clinic.address.province} ${clinic.address.postal}
- Phone: ${clinic.phoneDisplay}
- Instagram: ${clinic.instagram}
`;
}

function buildAudienceSetup(research: ResearchBundle): string {
  return `# Meta Ads — Audience Setup

Generated: ${research.generatedAt}

## Special category

**Health** — detailed targeting options will be restricted. Prefer geo + age + language.

## Age

- Default: **${metaAgeMin}–${metaAgeMax}**
- Optional split test: 25–34 vs 35–54 if budget allows

## Languages

- EN ad sets: English
- FR ad sets: French
- Do not mix languages in one ad set

## Geography

### Primary (priority budget)

Cities: ${primaryCities(research)}

Also: drop a **${clinic.radiusKm} km radius** pin on:
\`${clinic.address.street}, ${clinic.address.city}, ${clinic.address.province}\`
(approx. ${clinic.lat}, ${clinic.lng})

### Secondary (expansion)

Cities: ${secondaryCities(research)}

### Location type

People **living in or recently in** this location (not “traveling in” alone).

## Exclusions

- Exclude existing website converters if you have a clean non-PHI custom audience of site visitors only (generic page visitors — not “Invisalign patients”)
- Exclude employees if relevant
- Do **not** build audiences from treatment status

## Interest / detailed targeting

Under Health special category, many health interests are unavailable. If any broad lifestyle interests remain allowed, treat them as optional — **geo + creative do the work**.

## Advantage+ audience

You may test Advantage+ with the same geo/age constraints; keep Special Ad Category = Health.

## What not to do

- No scraped social profile lists
- No patient phone/email uploads for lookalikes
- No copy that implies the viewer has a medical condition
`;
}

function buildAdCopy(
  lang: "en" | "fr",
  research: ResearchBundle
): string {
  const url = `${research.landingBaseUrl}/${lang}`;
  const top = research.reviewThemes[0];

  if (lang === "en") {
    return `# Meta Ad Copy — English

Destination: ${url}

Use UTM from \`utms.csv\` (meta / paid_social).

## Primary texts (pick 3–5 to test)

1. Clear aligners with a Preferred Invisalign Provider in Vaudreuil-Dorion. Bilingual care for West Island & Vaudreuil — book a consultation with ${clinic.doctorName}.

2. Curious about Invisalign? Preview your smile with SmileView, then meet ${clinic.doctorName} at ${clinic.practiceName} for a personalized consult. Financing available.

3. Discreet clear aligners for busy adults. Serving Vaudreuil-Dorion, Saint-Lazare, Hudson, and the West Island. Book online or call ${clinic.phoneDisplay}.

4. Local Invisalign consultations — gentle, evidence-based cosmetic care. ${clinic.practiceName}, minutes from the West Island.

5. ${top ? top.creativeAngleEn : "Lead with consult + financing."} Start with a no-pressure visit at LE 32.

## Headlines

- Invisalign in Vaudreuil
- Book Your Consult
- Clear Aligners Near You
- Preferred Invisalign Provider
- Bilingual Dental Care
- West Island Welcome
- Financing Available
- SmileView Preview

## Descriptions / CTAs

- Learn more → Landing page
- Book now → Booking sitelink / landing CTA
- Call now → ${clinic.phoneDisplay}

## Creative checklist

- [ ] Photo of doctor or clinic atmosphere (authorized assets only)
- [ ] No before/after medical claims without required disclaimers / policy review
- [ ] Text overlay ≤20% if using older placement rules; prefer clean imagery + caption
- [ ] French campaign uses FR creative only

## Compliance reminder

Speak about the **service** (“Invisalign consultations in Vaudreuil”), not the person (“Fix your crooked teeth”).
`;
  }

  return `# Meta Ad Copy — Français

Destination: ${url}

Utilisez les UTM de \`utms.csv\` (meta / paid_social).

## Textes principales (tester 3 à 5)

1. Aligneurs transparents avec une fournisseure Invisalign préférée à Vaudreuil-Dorion. Soins bilingues pour le West Island et Vaudreuil — consultation avec ${clinic.doctorNameFr}.

2. Curieux d'Invisalign? Aperçu SmileView, puis rencontrez ${clinic.doctorNameFr} à ${clinic.practiceName}. Financement disponible.

3. Aligneurs discrets pour adultes actifs. Vaudreuil-Dorion, Saint-Lazare, Hudson et West Island. Réservez en ligne ou composez le ${clinic.phoneDisplay}.

4. Consultations Invisalign locales — soins esthétiques doux et fondés sur les données. ${clinic.practiceName}, à proximité du West Island.

5. ${top ? top.creativeAngleFr : "Misez sur la consult et le financement."} Commencez par une visite sans pression à LE 32.

## Titres

- Invisalign à Vaudreuil
- Prenez rendez-vous
- Aligneurs près de vous
- Fournisseure Invisalign
- Soins bilingues
- West Island bienvenu
- Financement disponible
- Aperçu SmileView

## Descriptions / CTA

- En savoir plus → Page d'atterrissage
- Réserver → CTA de réservation
- Appeler → ${clinic.phoneDisplay}

## Liste créative

- [ ] Photo autorisée (docteure ou clinique)
- [ ] Pas de promesses de résultats médicaux
- [ ] Campagne FR = créatifs FR seulement

## Conformité

Parlez du **service** (« consultations Invisalign à Vaudreuil »), pas de la personne (« corrigez vos dents croches »).
`;
}
