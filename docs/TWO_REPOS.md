# Two-app setup: Landing page + Ads Studio

The public Vercel project (`elizabeth-peeling-landing-page`) builds **`peeling-ads-studio/`** as its Root Directory. That app now serves both:

| Path | What visitors see |
|------|-------------------|
| `/`, `/en`, `/fr` | Dr. Elizabeth Peeling marketing landing page |
| `/studio` | Private Ads Studio (password gated) |

| App | Source | Vercel project | Public URL |
|-----|--------|----------------|------------|
| **Landing + Studio** | [`peeling-ads-studio/`](../peeling-ads-studio/) in this repo | `elizabeth-peeling-landing-page` | **https://elizabeth-peeling-landing-page.vercel.app/en** |
| **Landing (repo root)** | Repo root | Optional separate project | `elizabethpeeling.ca` when DNS is set |

Keep landing copy in **both** `src/` (repo root) and `peeling-ads-studio/src/` in sync when you change marketing pages. The nested copy is what production currently deploys.

## Local development

**Production-shaped app** (landing + studio, same as Vercel):

```bash
cd peeling-ads-studio
npm install
cp .env.example .env.local
npm run dev
# Landing: http://localhost:3000/en
# Studio:  http://localhost:3000/studio
```

**Landing-only** (repo root):

```bash
npm install
npm run dev
# http://localhost:3000/en
```

Use different ports if both run at once (`npm run dev -- -p 3001`).
