# Deploy Peeling Ads Studio on Vercel (~3 minutes)

You do **not** need a separate GitHub repo. Import the landing-page repo and set the root directory to this folder.

## 1. Import project

1. Open **[vercel.com/new](https://vercel.com/new)**
2. Import **`PCebs-dev/Elizabeth-Peeling-Landing-Page`** (same repo as the landing site)
3. Set **Project Name** to `peeling-ads-studio`
4. Expand **Root Directory** → Edit → select **`peeling-ads-studio`**
5. Framework should detect **Next.js** automatically

## 2. Environment variables

Before clicking Deploy, add:

| Name | Value |
|------|--------|
| `STUDIO_PASSWORD` | Your studio login password (choose a strong one) |

## 3. Deploy

Click **Deploy**. Wait for the build to finish.

## 4. Blob storage (photo persistence)

1. Open the new **`peeling-ads-studio`** project in Vercel
2. **Storage** tab → **Create Database** → **Blob**
3. Link it to **`peeling-ads-studio`**
4. Vercel adds **`BLOB_READ_WRITE_TOKEN`** automatically
5. **Deployments** → **⋯** → **Redeploy** (so the token is picked up)

## 5. Public URLs

After deploy, the same project should serve:

- Landing: `https://<project>.vercel.app/en` and `/fr`
- Studio: `https://<project>.vercel.app/studio`

Optional custom domains: `elizabethpeeling.ca` (landing) and `studio.elizabethpeeling.ca` (studio).

## 6. iPhone

Remove the old PWA from your home screen, then open **`/studio`** and Add to Home Screen.
