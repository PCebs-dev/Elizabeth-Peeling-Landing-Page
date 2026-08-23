# LE 32 Local Social Strategy

**Practice:** LE 32 Clinique Dentaire (Dr. Elizabeth Peeling)  
**Geo:** Vaudreuil-Dorion, West Island, greater Montreal  
**Focus:** Cosmetic dentistry (veneers, whitening), Invisalign, dental implants  
**Audience:** Adults 30–55 (working professionals); parents of teens for Invisalign; cosmetic/implant seekers  
**Channels in use:** Instagram, Facebook + Google Business Profile  
**Production mix:** Phone stills, consented before/after photos, AI-generated images + captions via Meta Social Publish. **Image-only — no video / Reels in this calendar.**

Companion files:
- [`le32-content-calendar-4wk.json`](./le32-content-calendar-4wk.json) — studio-ready rows for AI generation
- [`le32-content-calendar-4wk.csv`](./le32-content-calendar-4wk.csv) — spreadsheet / automation export  

Calendar window: **Mon Aug 10 – Fri Sep 4, 2026**

---

## Platform recommendation (rank)

| Rank | Platform | One-line reason |
|------|----------|-----------------|
| 1 | **Instagram** | Best organic discovery for smile visuals (static, carousels, story stills) and the primary surface already wired in Meta Social Publish. |
| 2 | **Google Business Profile** | Highest local intent; posts and photos convert searchers already looking for a dentist near Vaudreuil. |
| 3 | **Facebook** | Same creative as IG via Meta; stronger for parents 35–55, community groups, and retargeting. |

TikTok / YouTube Shorts: optional later if staff capacity allows short-form volume; not in this 4-week load.

---

## Content pillars

| Pillar ID | Pillar | Purpose | Funnel role |
|-----------|--------|---------|-------------|
| `transformations` | Transformations (before/after, smile journeys) | Desire + clinical trust | Mid-funnel trust |
| `education` | Education & myth-busting | Answer objections; build authority | Top-of-funnel awareness |
| `local` | Local trust & community | Own the Vaudreuil / West Island identity | Local awareness |
| `social-proof` | Social proof (testimonials, reviews energy) | Reduce risk of booking | Trust → consult |
| `bts` | Behind-the-scenes / team culture | Humanize Dr. Peeling and the clinic | Trust-building |
| `conversion` | Soft conversion (consult, SmileView, Beautifi) | Direct next step without hard sell | Bottom-of-funnel (~20%) |

Target mix across the calendar: **~80% TOF/MOF** (pillars 1–5) / **~20% BOF** (pillar 6).

---

## Cadence (realistic)

| Surface | Frequency | Notes |
|---------|-----------|-------|
| Instagram feed | 3×/week (Mon / Wed / Fri) | Static or carousel; cross-post caption to Facebook |
| Instagram Stories | 2×/week (Tue / Thu) | **Still frames only** (polls/FAQ) — no video clips |
| Facebook feed | Same as IG feed | One creative, two platforms |
| Google Business Profile | 1×/week (Tue) | Static education / soft CTA |

~12 static + 4 carousel + 8 story-still posts over 4 weeks. Daily automation generates **image + caption** for that day's rows. **Story-format** rows auto-publish to Instagram + Facebook Stories when Meta is configured; feed/static/carousel rows stay under **Saved calendar ads** for review.

---

## Daily automation (7am Toronto)

1. Vercel Cron hits `GET/POST /api/studio/calendar/run` at **11:00 UTC** (~7am America/Toronto in daylight time). Auth: `Bearer CRON_SECRET` / `STUDIO_AUTOMATION_SECRET`.
2. Resolves today's image-only calendar rows (America/Toronto). Prefer hand-authored calendar dates; otherwise use the rolling **upcoming themes** schedule (≥35 days ahead, engagement-optimized across Invisalign, Botox, veneers, etc.). Review at `/studio/themes` (CSV download for Excel).
3. Generates AI still + bilingual caption (Stories use 9:16); for `language: both` also creates matching EN + FR on-image twins (same photo, typography language only); writes to `data/studio/saved-ads/`.
4. **Review & publish manually** from Meta Social Publish → **Saved calendar ads**. Auto-publish to Instagram is off by default (`STUDIO_AUTO_PUBLISH_STORIES`); turn on later when you want Stories to go live automatically.

---

## How to use with Meta Social Publish

1. Open a row in the JSON/CSV.
2. In the studio: set **category** = `categoryId`, **language** = `language` (usually `both`), **channel** = `organic`.
3. Paste **`notes`** into the generation brief (GenerationPanel).
4. Optionally generate an AI image using **`imageHints`** / **`subjectMode`**, or film per the hook/shot list.
5. Generate bilingual copy → preview → publish to Instagram and/or Facebook.
6. For GBP rows: adapt the short caption + still; post manually in Google Business Profile (studio publishes Meta only today).

Suggested studio angles (pin in brief if the API later supports forced angle; for now include in `notes`):  
`social-proof` | `transformation` | `soft-cta` | `myth-bust` | `local-trust` | `seasonal` | `financing-friendly` | `confidence` | `behind-the-scenes` | `question-hook`

---

## Local engagement tactics

### Geotagging & discovery
- Geotag **LE 32 / Vaudreuil-Dorion** on every Instagram feed post.
- Tag location on Facebook posts when available.
- On GBP, every post is already local; keep city + service keywords natural (e.g. “Invisalign consult in Vaudreuil-Dorion”).

### Local hashtags (mix 8–14 total; treatment + geo)
Examples: `#Invisalign` `#Veneers` `#DentalImplants` `#VaudreuilDorion` `#Vaudreuil` `#WestIsland` `#MontrealDentist` `#LE32` `#DrElizabethPeeling`  
Avoid emoji hashtags. Rotate; do not spam the same 20 every post.

### Community partnerships
- Cross-promote with local bridal shops, gyms/wellness studios, youth sports (teen Invisalign parents), Chamber / downtown Vaudreuil events.
- Tag real partners only after agreement; do not invent collaborations in captions.
- Offer a simple value exchange: clinic reel shoutout ↔ partner story tag.

### Reviews & UGC
- After visits: Story sticker or DM — “If today went well, a Google review helps neighbours find us.”
- Ask consented patients if a smile selfie (face optional) can be reshared; store written consent.
- Never invent star counts or quote fake reviews.

### Comments & DMs
- Reply to every public comment within 24 hours.
- Move clinical questions to DM / phone; do not diagnose in comments.
- Pin one FAQ reply under high-performing education posts.

### Micro-influencers / collabs
- Local photographer, wellness clinic, or parent lifestyle creator (disclose paid/gifted).
- Partners must not make clinical outcome claims; clinic owns medical messaging.

### Google Business Profile cadence
- **1 post/week** (see calendar Tue GBP rows).
- **Weekly photo upload** (clinic exterior, team, non-identifiable treatment stills).
- **Reply to all new reviews** within 48 hours (thank + invite return; never argue clinical detail in public).

---

## Repurposing plan

### Master asset A — 45–60s patient testimonial (consented)
| # | Output | Format | Where |
|---|--------|--------|-------|
| 1 | Hook + soundbite + soft CTA | Reel | IG + FB |
| 2 | 3 quote cards + clinic CTA slide | Carousel | IG + FB |
| 3 | 3 frames + “Would you book a consult?” poll | Stories | IG |
| 4 | Still frame + 2-sentence update | GBP post | Google |

### Master asset B — Procedure walkthrough (e.g. first Invisalign visit)
| # | Output | Format | Where |
|---|--------|--------|-------|
| 1 | 20–30s “day in the chair” cut | Reel | IG + FB |
| 2 | Step 1–2–3 stills with captions | Carousel | IG |
| 3 | “What surprised you?” quiz sticker | Stories | IG |
| 4 | AI bilingual captions from one `notes` brief | `language: both` | Studio |

### Master asset C — Before/after (written consent)
| # | Output | Format | Where |
|---|--------|--------|-------|
| 1 | Side-by-side + disclaimer | Carousel or static | IG + FB |
| 2 | Close-up detail Reel (no timeline claims) | Reel | IG |
| 3 | “Swipe for after” Story | Stories | IG |
| 4 | GBP “smile journey” text + after still | GBP | Google |

**Studio tip:** One `notes` brief → Generate with `language: "both"` → English feed caption + French variant for FR-leaning posts or Stories.

---

## Compliance flags (Quebec / ODQ-aware)

This is a practical checklist for marketers and staff — **not legal advice**. Final creatives should be reviewed against current **Ordre des dentistes du Québec** advertising rules before publish.

### Always
- [ ] No guaranteed results, “perfect smile,” or fixed timelines (“straight in 6 months”).
- [ ] No invented reviews, patient names, or star ratings.
- [ ] No diagnosing strangers in comments.
- [ ] Beautifi / financing: may mention availability; **no rates, approval odds, or “everyone qualifies.”**
- [ ] French claims must match English meaning (QC `vous`, natural phrasing).

### Needs written patient consent
- Identifiable face or voice
- Named testimonial
- Before/after photos
- UGC reshare of patient content

### Needs disclaimer (keep short; prefer studio `disclaimer` field, not caption spam)
- Transformation / before-after posts
- Any copy that could be read as typical or expected results

### Calendar `compliance` array values used in JSON
| Flag | Meaning |
|------|---------|
| `patient-consent` | Written consent required before filming/publishing |
| `no-timeline-promises` | Do not state treatment duration guarantees |
| `no-guaranteed-results` | Outcomes vary; no absolute claims |
| `disclaimer-results-vary` | Include short results-vary disclaimer |
| `no-invented-reviews` | Do not fabricate quotes or ratings |
| `financing-no-rates` | Beautifi OK; no rates/approval promises |
| `odq-review-before-publish` | Have dentist/office review before go-live |

---

## 4-week theme map

| Week | Dates | Theme |
|------|-------|-------|
| 1 | Aug 10–14 | Trust open — myths, education, BTS, first testimonial |
| 2 | Aug 17–21 | Desire + local — confidence, whitening myth, Vaudreuil trust, soft implant CTA |
| 3 | Aug 24–28 | Proof — consented B&A, first-visit walkthrough, community, SmileView soft CTA |
| 4 | Aug 31–Sep 4 | Convert lightly — seasonal smile, implant education, team, testimonial cutdown, consult CTA |

See the JSON/CSV for Day | Platform | Pillar | Hook | Format | CTA on every row.
