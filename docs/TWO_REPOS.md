# Two-repo setup: Landing page + Ads Studio

The marketing site and the private Ads Studio are **separate apps** so they can be developed and deployed independently.

| App | Folder / repo | Vercel project | URL |
|-----|---------------|----------------|-----|
| **Landing page** | Repo root (`Elizabeth-Peeling-Landing-Page`) | `elizabeth-peeling-landing-page` | `elizabethpeeling.ca` |
| **Ads Studio** | [`peeling-ads-studio/`](peeling-ads-studio/) → own GitHub repo | `peeling-ads-studio` (new) | `studio.elizabethpeeling.ca` (suggested) |

## 1. Create the studio GitHub repo

```bash
cd peeling-ads-studio
git init
git add .
git commit -m "Initial commit: Peeling Ads Studio"
gh repo create PCebs-dev/Peeling-Ads-Studio --private --source=. --push
```

(Or create the repo on GitHub manually, then `git remote add origin …` and `git push -u origin main`.)

## 2. Deploy studio on Vercel

1. **Add New → Project** → import **Peeling-Ads-Studio** (not the landing repo).
2. **Storage → Blob** → create and link to the studio project.
3. **Environment Variables:**
   - `STUDIO_PASSWORD`
   - `BLOB_READ_WRITE_TOKEN` (auto-added when Blob is linked)
   - Meta tokens when ready to publish
4. Deploy.
5. Optional: **Settings → Domains** → add `studio.elizabethpeeling.ca`.

## 3. Landing page Vercel project

- Keep deploying from **Elizabeth-Peeling-Landing-Page** only.
- Remove studio env vars (`STUDIO_PASSWORD`, `BLOB_*`, Meta tokens) from the landing project — they belong on the studio project.
- No code changes needed on each studio release for the landing site.

## 4. Local development

**Landing page** (repo root):

```bash
npm install
npm run dev
# http://localhost:3000/en
```

**Studio** (separate terminal):

```bash
cd peeling-ads-studio
npm install
cp .env.example .env.local
npm run dev
# http://localhost:3000/studio
```

Run only one at a time on port 3000, or use `npm run dev -- -p 3001` for the second app.

## 5. What lives where

**Landing repo:** `/en`, `/fr`, `/v2/*`, marketing components, GA, sitemap.

**Studio repo:** `/studio`, `/api/studio/*`, media library, merge, publish, PWA (`sw.js`, `/icons`).

After the split PR merges, the landing deployment will no longer serve `/studio`. Update any bookmarks or home-screen icons to the studio URL.
