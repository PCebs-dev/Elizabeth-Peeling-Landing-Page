#!/usr/bin/env node
import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runCollectors } from "./collectors/index.js";
import { exportAll } from "./exporters/index.js";
import { todayStamp } from "./utils/csv.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

loadEnv({ path: path.join(rootDir, ".env") });
loadEnv({ path: path.join(rootDir, ".env.local") });

async function main() {
  const landingBaseUrl =
    process.env.LANDING_BASE_URL?.trim() || "https://elizabethpeeling.ca";
  const placesKey = process.env.GOOGLE_PLACES_API_KEY?.trim() || undefined;
  const serpKey = process.env.SERPAPI_KEY?.trim() || undefined;

  console.log("\nInvisalign Local Market Intel + Ad Blueprints");
  console.log("============================================");
  console.log(`Landing: ${landingBaseUrl}`);
  console.log(`Places API: ${placesKey ? "yes" : "no (seed mode)"}`);
  console.log(`SerpAPI: ${serpKey ? "yes" : "no (seed mode)"}\n`);

  const research = await runCollectors({
    landingBaseUrl,
    placesKey,
    serpKey,
  });

  const stamp = todayStamp();
  const outDir = path.join(rootDir, "output", stamp);

  console.log("\nExporting blueprints...");
  await exportAll(outDir, research);

  console.log("\nDone.");
  console.log(`Output: ${outDir}`);
  console.log(`Report: ${path.join(outDir, "report.md")}`);
  console.log(
    `\nSummary: ${research.keywords.length} keywords · ${research.geoTargets.length} geos · ${research.competitors.length} competitors · ${research.reviewThemes.length} themes`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
