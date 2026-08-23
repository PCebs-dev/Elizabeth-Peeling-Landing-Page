/**
 * Local daily calendar runner — no Vercel, no Next.js server required.
 * Writes ads to data/studio/saved-ads for review in /studio.
 *
 *   npm run studio:calendar-daily
 *
 * Windows Task Scheduler calls tools/run-calendar-local.cmd at 7:00 AM.
 */
import fs from "fs";
import path from "path";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

const root = path.resolve(process.cwd());
loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

if (!process.env.OPENAI_API_KEY?.trim()) {
  console.error(
    "[studio-calendar-daily] OPENAI_API_KEY missing in .env.local — cannot generate ads."
  );
  process.exit(1);
}

const force =
  process.env.FORCE === "1" || process.env.FORCE === "true";
let date = new Date();
if (process.env.DATE) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(process.env.DATE);
  if (!m) {
    console.error("DATE must be YYYY-MM-DD");
    process.exit(1);
  }
  date = new Date(
    Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)
  );
}

async function main() {
  console.log(
    `[studio-calendar-daily] local run ${date.toISOString().slice(0, 10)}`,
    force ? "force" : ""
  );

  const { runCalendarDay } = await import("../src/lib/studio/run-calendar-day");

  const result = await runCalendarDay({ date, force });
  const summary = {
    date: result.date,
    generatedCount: result.generated.length,
    skippedCount: result.skipped.length,
    errorCount: result.errors.length,
    skipped: result.skipped,
    errors: result.errors,
    warnings: result.warnings,
    headlines: result.generated.map((a: { headline: string }) => a.headline),
  };
  console.log(JSON.stringify(summary, null, 2));

  if (result.errors.length && result.generated.length === 0) {
    process.exit(1);
  }

  console.log(
    `[studio-calendar-daily] done — generated=${result.generated.length} skipped=${result.skipped.length}. Review in /studio → Saved calendar ads.`
  );
}

main().catch((err) => {
  console.error("[studio-calendar-daily] failed", err);
  process.exit(1);
});
