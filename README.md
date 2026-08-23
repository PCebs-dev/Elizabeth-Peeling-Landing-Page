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

## Social Ads Studio

Private tool at [`/studio`](/studio) for generating Instagram/Facebook creatives from treatment photos.

1. Set `STUDIO_PASSWORD` in `.env.local` (required to sign in).
2. Set `OPENAI_API_KEY` for AI-written ads and **Generate AI image**. Without a key, **Generate ad** still works with local template variations; AI images require a key.
3. Optional: `OPENAI_IMAGE_MODEL` (default tries `gpt-image-2` → `1.5` → `1` → mini, then a free fallback).
4. For **Generate AI video**, set `HIGGSFIELD_API_KEY_ID` + `HIGGSFIELD_API_KEY_SECRET` (Higgsfield image-to-video — strong for Reels-style dental clips). Without keys, the studio copies a motion prompt and opens Higgsfield so you can generate there and upload the MP4.
5. Optional Meta publish (manual from studio for now):
   - `META_PAGE_ID` — Facebook Page ID
   - `META_PAGE_ACCESS_TOKEN` — long-lived Page token with `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`
   - `META_IG_USER_ID` — Instagram Business Account ID linked to that Page
   - `STUDIO_AUTO_PUBLISH_STORIES` — default **off**. Daily cron only saves ads for review. Set `true` later to auto-post Story rows.
   - Optional `STUDIO_STORY_PLATFORMS=instagram,facebook`
   - Video Reels: download from the media library and post manually (one-click publish is image-only for now)
6. Open `/studio/login`, sign in, then either:
   - **Generate AI image** — adds a treatment still to your library
   - **Generate AI video** — animates a still with Higgsfield (uses the selected image when one is selected)
   - Select any photo/video → **Generate ad from photo/video** — writes caption/hashtags from that media’s theme
7. Re-click caption generation for a new variation. Review IG/FB previews, then **Copy caption**, **Share export pack**, or **Publish to social media**.

### Daily automation (7am local)

Runs on this PC via Windows Task Scheduler (`ElizabethStudio-CalendarDaily`) at **7:00 AM**. It does **not** need `next dev`, Vercel, or a published site.

Each morning the job:

1. Runs `npm run studio:calendar-daily` (`tools/run-calendar-local.ts`)
2. Ensures upcoming themes (≥35 days) and generates that day’s image + bilingual caption
3. Saves creatives under **Saved calendar ads** in `/studio` for review
4. Does **not** auto-publish to Instagram/Facebook unless `STUDIO_AUTO_PUBLISH_STORIES=true`

The PC must be on (and signed in) at 7:00 AM. Logs: `logs/calendar-daily.log`. Manual run: `npm run studio:calendar-daily`, or **Run today's calendar** in the studio.

Vercel Cron in [`vercel.json`](vercel.json) (`0 11 * * *`) is unused until you publish.

### iPhone / PWA (Add to Home Screen)

The studio is a Progressive Web App. After you deploy over **HTTPS**:

1. On iPhone, open Safari (not Chrome/Instagram in-app browsers).
2. Go to `https://your-domain/studio` and sign in.
3. Tap **Share** → **Add to Home Screen** → Add.
4. Open **Peeling Studio** from the home screen (standalone, no Safari chrome).

Includes: camera + photo library upload, AI generate, captions, share sheet export, Meta publish. Photos stay in that browser’s IndexedDB (Home Screen app has its own storage — use the same Home Screen icon consistently).

The PWA uses Dr. Elizabeth Peeling branding (warm camel/greige + **EP** monogram), matching the landing page.

Photos stay in the browser (IndexedDB). Library tiles show **Upload** or **AI**. Export packs disclose AI-generated creatives. The studio is password-gated and disallowed in `robots.txt`.

To find IDs: Meta Business Suite → your Page / Instagram professional account settings, or Graph API Explorer (`me/accounts` and `/{page-id}?fields=instagram_business_account`).

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
