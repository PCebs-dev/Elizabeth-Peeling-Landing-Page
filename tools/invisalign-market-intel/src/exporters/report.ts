import { writeFile } from "node:fs/promises";
import path from "node:path";
import { clinic } from "../config/clinic.js";
import { allFsas, metaAgeMax, metaAgeMin } from "../config/geo.js";
import type { ResearchBundle } from "../types.js";

export async function exportReport(
  outDir: string,
  research: ResearchBundle
): Promise<void> {
  const primary = research.geoTargets.filter((g) => g.tier === "primary");
  const secondary = research.geoTargets.filter((g) => g.tier === "secondary");

  const competitorLines =
    research.competitors.length === 0
      ? "- None collected"
      : research.competitors
          .slice(0, 15)
          .map((c) => {
            const bits = [
              c.name,
              c.rating != null ? `${c.rating}★` : null,
              c.reviewCount != null ? `${c.reviewCount} reviews` : null,
              c.address,
              c.source,
            ].filter(Boolean);
            return `- ${bits.join(" · ")}`;
          })
          .join("\n");

  const themeLines = research.reviewThemes
    .map(
      (t) =>
        `- **${t.label}** (hits: ${t.hits}) — ${t.creativeAngleEn}`
    )
    .join("\n");

  const serpLines = research.serpSnapshots
    .map(
      (s) =>
        `- \`${s.query}\` (${s.lang}, ${s.source}): ${s.topTitles.slice(0, 3).join(" | ") || "(no titles)"}`
    )
    .join("\n");

  const fsaLines = Object.entries(research.fsaDemographics)
    .map(([fsa, raw]) => {
      const d = raw as {
        area?: string;
        priority?: string;
        householdIncomeBand?: string;
        medianAgeBand?: string;
      };
      return `- **${fsa}** (${d.priority}): ${d.area} — age ~${d.medianAgeBand}, income ${d.householdIncomeBand}`;
    })
    .join("\n");

  const md = `# Invisalign Market Intel Report

**Generated:** ${research.generatedAt}  
**Clinic:** ${clinic.practiceName} — ${clinic.doctorName}  
**Anchor:** ${clinic.address.street}, ${clinic.address.city}, ${clinic.address.province} ${clinic.address.postal}  
**Landing base:** ${research.landingBaseUrl}

## Executive summary

This pack maps **public** demand signals and competitor presence for Invisalign across Montreal West Island and Vaudreuil–Soulanges, then exports **Google Ads** and **Meta Ads** blueprints. It does **not** identify or scrape individuals for targeting.

| Signal | Status |
|---|---|
| Google Places competitors | ${research.hasPlacesKey ? "Live API" : "Seed placeholders (add GOOGLE_PLACES_API_KEY)"} |
| SerpAPI SERP / volume hints | ${research.hasSerpKey ? "Live API" : "Seed placeholders (add SERPAPI_KEY)"} |
| Keyword seeds | ${research.keywords.length} terms (EN+FR × cities) |
| Geo targets | ${primary.length} primary + ${secondary.length} secondary cities |
| Review / creative themes | ${research.reviewThemes.length} scored themes |

## Recommended go-to-market

1. **Google Search first** — highest intent (“Invisalign Vaudreuil”, cost, local city terms). Import \`google/keywords.csv\` + RSA CSVs.
2. **Meta second** — awareness + consult offers in a ${clinic.radiusKm} km radius / city list; Special Ad Category = Health.
3. Split **EN** and **FR** always.
4. Age band for Meta: **${metaAgeMin}–${metaAgeMax}**.
5. Refresh this pack **monthly**.

## Geography

### Primary
${primary.map((g) => `- ${g.name} (FSAs: ${g.fsas.join(", ")})`).join("\n")}

### Secondary (West Island)
${secondary.map((g) => `- ${g.name} (FSAs: ${g.fsas.join(", ")})`).join("\n")}

### All FSAs
${allFsas.join(", ")}

### Demographic context (aggregate only)
${fsaLines}

## Competitors
${competitorLines}

## Creative themes
${themeLines}

## SERP snapshots
${serpLines}

## Keyword volume hints
${
  research.keywordVolumes
    .map((v) => {
      const vol =
        v.monthlySearches != null
          ? ` ~${v.monthlySearches} (engine total/proxy)`
          : " (no volume — seed)";
      return `- ${v.keyword} [${v.lang}]${vol} — ${v.source}`;
    })
    .join("\n") || "- None"
}

## Deliverables in this folder

| File | Use |
|---|---|
| \`research.json\` | Full machine-readable research |
| \`google/keywords.csv\` | Import keywords (Editor) |
| \`google/negative-keywords.csv\` | Campaign negatives |
| \`google/geo-targets.csv\` | Location checklist |
| \`google/rsa-ads-en.csv\` / \`rsa-ads-fr.csv\` | Responsive search ads |
| \`google/campaign-structure.md\` | Setup guide |
| \`meta/campaign-brief.md\` | Meta campaign plan |
| \`meta/audience-setup.md\` | Geo / age / Health category |
| \`meta/ad-copy-en.md\` / \`ad-copy-fr.md\` | Creative copy |
| \`utms.csv\` | Landing URLs with UTMs |

## Compliance (high-level — not legal advice)

- **Quebec Law 25 / privacy:** do not scrape or store personal profiles for ad targeting; use platform geo/keyword tools.
- **No PHI in ads or pixels:** keep conversion events generic (e.g. booking click), no treatment details in URLs.
- **Meta:** Health special category; avoid personal-attribute claims in copy.
- **Google:** intent keywords + location presence targeting; no patient list uploads.
- Always confirm candidacy requires a clinical exam — no outcome guarantees in ads.

## Next actions

1. Open \`google/campaign-structure.md\` and create the two Search campaigns.
2. Follow \`meta/audience-setup.md\` and paste copy from the ad-copy files.
3. Point Final URLs / destinations at rows in \`utms.csv\`.
4. Confirm GA4 sees \`outbound_click\` / booking events from the landing page.
5. Optional: add API keys to \`.env\` and re-run \`npm run research\` for live competitor + SERP enrichment.
`;

  await writeFile(path.join(outDir, "report.md"), md, "utf8");
}
