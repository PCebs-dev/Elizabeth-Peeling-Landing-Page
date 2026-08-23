# Elizabeth Peeling — Dental Landing Page

Bilingual (EN/FR) landing page for **Dr. Elizabeth Peeling**, focused on Invisalign and cosmetic dentistry at LE 32 Clinique Dentaire in Vaudreuil-Dorion, Quebec.

## Features

- Joyce Kahng–style stacked CTA cards for booking, phone, financing, and smile simulation
- Two color options: teal (`/en`, `/fr`) and Joyce-inspired warm camel (`/v2/en`, `/v2/fr`)
- Full English and French content with language toggle
- Patient testimonials section (quote cards with star ratings, "show more" toggle)
- FAQ accordion with JSON-LD schema
- Privacy-conscious FAQ chatbot widget
- Sticky mobile booking CTA
- Google Analytics 4 conversion tracking hooks

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/en`.

## Configuration

Update integration URLs in [`src/config/links.ts`](src/config/links.ts):

| Integration | Current URL |
|-------------|-------------|
| Booking | [LE 32 contact form](https://www.le32.ca/en/contact-us) |
| Financing | [Beautifi application (LE 32)](https://beautifi-v2.vercel.app/applications/le-32-clinique-dentaire/apply) |
| Smile simulation | [Invisalign SmileView (Dr. Peeling)](https://cus-invisalign-starter-use-prd.herokuapp.com/sv/1752134) |
| Instagram | [@dr.elizabeth.peeling](https://www.instagram.com/dr.elizabeth.peeling/) |

Testimonials are verified 5-star Google reviews in [`src/data/verified-reviews.ts`](src/data/verified-reviews.ts). Only add reviews that can be verified from Google — do not fabricate testimonials.

## Hero Photo

The hero shows a self-hosted avatar. Instagram blocks downloading profile photos
programmatically, so save Dr. Peeling's Instagram profile photo as:

```
public/elizabeth-hero.jpg
```

A square image (≈400×400 or larger) works best. Until the file exists, the hero
gracefully falls back to an "EP" monogram. To change the path, edit `heroPhoto`
in [`src/config/links.ts`](src/config/links.ts).

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_GA_ID` for analytics.

## Deploy

```bash
npm run build
npm start
```

Deploy to [Vercel](https://vercel.com) or Netlify. Connect your custom domain (e.g. `elizabethpeeling.ca`).

## Ads Studio (separate app)

The private Instagram/Facebook creative studio lives in **[`peeling-ads-studio/`](peeling-ads-studio/)** and should be deployed as its **own GitHub repo and Vercel project**. See **[`docs/TWO_REPOS.md`](docs/TWO_REPOS.md)** for setup steps.

## Compliance Notes

- No medical diagnoses via chatbot
- Disclaimers on treatment suitability and financing
- Add the hero photo at `public/elizabeth-hero.jpg` (monogram shown until then)
