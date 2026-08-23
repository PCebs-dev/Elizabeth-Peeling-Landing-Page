# Invisalign Local Market Intel + Ad Blueprints

Research pipeline for **Dr. Elizabeth Peeling / LE 32 Clinique Dentaire** that maps public Invisalign demand across Montreal West Island and Vaudreuil, then exports **Google Ads** and **Meta Ads** campaign blueprints.

This tool does **not** scrape individuals or build personal contact lists. It produces geos, keywords, competitor snapshots, creative angles, and import-ready files.

## Quick start

```bash
cd tools/invisalign-market-intel
npm install
cp .env.example .env   # optional API keys
npm run research
```

Open the dated folder under `output/YYYY-MM-DD/` — start with `report.md`.

## Optional API keys

| Variable | Effect |
|---|---|
| `GOOGLE_PLACES_API_KEY` | Live competitor clinics via Places API (New) |
| `SERPAPI_KEY` | Live Google SERP titles/snippets for local queries |
| `LANDING_BASE_URL` | Default `https://elizabethpeeling.ca` |

Without keys, the tool still writes a full **seed-based** blueprint pack (keywords × cities, bilingual ads, Meta briefs, UTMs).

## Output pack

```
output/YYYY-MM-DD/
  report.md
  research.json
  utms.csv
  google/
    keywords.csv
    negative-keywords.csv
    geo-targets.csv
    rsa-ads-en.csv
    rsa-ads-fr.csv
    campaign-structure.md
  meta/
    campaign-brief.md
    audience-setup.md
    ad-copy-en.md
    ad-copy-fr.md
```

## Import: Google Ads

1. Create two Search campaigns (EN + FR) as named in `google/campaign-structure.md`.
2. Set location targeting from `geo-targets.csv` — **Presence** in listed cities; optional `${radius} km` around the clinic.
3. Create the four ad groups per campaign (Core, Cost, Adult, Local).
4. Import keywords from `keywords.csv` (Google Ads Editor works well).
5. Import or paste RSA headlines/descriptions from `rsa-ads-en.csv` / `rsa-ads-fr.csv`.
6. Add campaign negatives from `negative-keywords.csv`.
7. Set Final URLs from `utms.csv` (google / cpc rows).
8. Extensions: call `(450) 424-5332`, location, sitelinks (book, SmileView, financing).

## Import: Meta Ads

1. Create campaigns under **Special Ad Category → Health**.
2. Follow `meta/audience-setup.md` for age (25–54), languages, and city/radius geos.
3. Paste primary text / headlines from `meta/ad-copy-en.md` and `ad-copy-fr.md`.
4. Destination URLs from `utms.csv` (meta / paid_social rows).
5. Do **not** upload patient lists. Lean on geo + age + creative.

## Refresh cadence

Run **monthly** (or before a budget increase):

```bash
npm run research
```

Compare new `report.md` competitor rankings and SERP titles; refresh ad creative every 2–3 weeks on Meta.

## Compliance

- Aggregate market intel only — no personal profile scraping
- No PHI in UTMs, conversion events, or uploaded audiences
- Meta copy must not assert personal medical attributes
- Quebec bilingual: keep EN and FR campaigns separate
- Not legal advice — confirm healthcare advertising rules with your counsel/ODQ guidance as needed

## Config

- Geos / FSAs: `src/config/geo.ts`
- Keyword stems: `src/config/keywords.ts`
- Clinic constants: `src/config/clinic.ts` (aligned with the landing page)
- FSA demographic snapshot: `src/data/fsa-demographics.json`
