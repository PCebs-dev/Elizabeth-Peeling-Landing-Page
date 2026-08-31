# Two-repo setup: Landing page + Ads Studio

| App | Folder / GitHub | Vercel project | Primary URL |
|-----|-----------------|----------------|-------------|
| **Ads Studio** | [`peeling-ads-studio/`](../peeling-ads-studio/) → [Peeling-Ads-Studio](https://github.com/PCebs-dev/Peeling-Ads-Studio) | `elizabeth-peeling-landing-page` | **https://elizabeth-peeling-landing-page.vercel.app/studio** |
| **Landing page** | Repo root → [Elizabeth-Peeling-Landing-Page](https://github.com/PCebs-dev/Elizabeth-Peeling-Landing-Page) | Deploy separately (marketing only) | `elizabethpeeling.ca` (when DNS is set) |

Studio edits happen only in **Peeling-Ads-Studio**. This landing repo no longer contains `/studio` code — requests to `/studio` redirect to the studio URL above.

## Local development

**Studio** (separate folder / repo):

```bash
cd peeling-ads-studio
npm install
cp .env.example .env.local
npm run dev
# http://localhost:3000/studio/video
```

**Landing page** (this repo root):

```bash
npm install
npm run dev
# http://localhost:3000/en
```

Use different ports if both run at once (`npm run dev -- -p 3001`).
