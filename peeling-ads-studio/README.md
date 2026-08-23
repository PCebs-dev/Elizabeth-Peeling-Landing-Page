# Peeling Ads Studio

Private PWA for Dr. Elizabeth Peeling — media library, before/after merges, AI captions, and Instagram/Facebook publishing.

This app is **separate** from the [Elizabeth Peeling landing page](https://github.com/PCebs-dev/Elizabeth-Peeling-Landing-Page). Deploy it as its own Vercel project.

## Quick start

```bash
npm install
cp .env.example .env.local
# Edit .env.local — at minimum set STUDIO_PASSWORD
npm run dev
```

Open [http://localhost:3000/studio](http://localhost:3000/studio).

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `STUDIO_PASSWORD` | Yes | Login password |
| `BLOB_READ_WRITE_TOKEN` | Recommended | Persist photos across devices |
| `META_PAGE_ACCESS_TOKEN` | For publish | Facebook/Instagram API |
| `FACEBOOK_PAGE_ID` | For publish | Facebook page |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | For publish | Instagram business account |
| `OPENAI_API_KEY` | Optional | AI captions (templates used if unset) |

## Deploy on Vercel

1. Create a new GitHub repo (e.g. `Peeling-Ads-Studio`) and push **this folder** as the repo root.
2. Vercel → **Add New → Project** → import the studio repo (not the landing page repo).
3. **Storage → Blob** → link to this project (sets `BLOB_READ_WRITE_TOKEN`).
4. **Settings → Environment Variables** → add `STUDIO_PASSWORD` and Meta tokens.
5. Deploy. Optional domain: `studio.elizabethpeeling.ca`.

## Repo split (first time)

If this folder still lives inside the landing-page monorepo:

```bash
cd peeling-ads-studio
git init
git add .
git commit -m "Initial commit: Peeling Ads Studio"
git remote add origin git@github.com:PCebs-dev/Peeling-Ads-Studio.git
git push -u origin main
```

Then remove studio routes from the landing-page repo (already done on `main` after the split PR merges).
