# Two-app setup: Landing page + Ads Studio

These are **two codebases**, **two GitHub repos**, and **two Vercel projects**.

| App | GitHub repo | Vercel project | Public URL |
|-----|-------------|----------------|------------|
| **Landing page** | [Elizabeth-Peeling-Landing-Page](https://github.com/PCebs-dev/Elizabeth-Peeling-Landing-Page) | `elizabeth-peeling-landing-page` | **https://elizabeth-peeling-landing-page.vercel.app** (`/en`, `/fr`) |
| **Ads Studio** | [Peeling-Ads-Studio](https://github.com/PCebs-dev/Peeling-Ads-Studio) | `peeling-ads-studio` | **https://studio.elizabethpeeling.ca** |

The nested `peeling-ads-studio/` folder in this landing-page repo is **not** what production deploys. Production landing page builds **this repo root**.

## Local development

**Landing page** (this repo):

```bash
npm install
npm run dev
# http://localhost:3000/en
```

**Ads Studio** (separate clone of Peeling-Ads-Studio):

```bash
npm install
cp .env.example .env.local
npm run dev
# http://localhost:3010/studio
```

Use different ports if both run at once.
