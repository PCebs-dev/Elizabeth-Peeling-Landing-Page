/**
 * Calls the running Next app to generate today's image-only calendar ads.
 * Saves under Saved calendar ads for review — does NOT auto-publish to Instagram.
 *
 * Env:
 *   STUDIO_BASE_URL (default http://localhost:3000)
 *   STUDIO_AUTOMATION_SECRET or CRON_SECRET
 *   DATE (optional YYYY-MM-DD)
 *   FORCE=1 (optional regenerate)
 *
 * Usage:
 *   npm run studio:calendar-daily
 *
 * Windows Task Scheduler (daily ~7:00 America/Toronto):
 *   Program: node
 *   Arguments: tools/studio-calendar-daily.mjs
 *   Start in: <project root>
 *   Trigger: Daily at 7:00 AM
 *   (Ensure the Next app is running, or set STUDIO_BASE_URL to your deployed URL.)
 */
import fs from "fs";
import path from "path";

function loadEnvFile(filePath) {
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

loadEnvFile(path.resolve(process.cwd(), ".env.local"));
loadEnvFile(path.resolve(process.cwd(), ".env"));

const base = (process.env.STUDIO_BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
);
const secret =
  process.env.STUDIO_AUTOMATION_SECRET || process.env.CRON_SECRET || "";

if (!secret) {
  console.error(
    "Set STUDIO_AUTOMATION_SECRET or CRON_SECRET (and ensure the Next app is reachable)."
  );
  process.exit(1);
}

const body = {};
if (process.env.DATE) body.date = process.env.DATE;
if (process.env.FORCE === "1" || process.env.FORCE === "true") body.force = true;

console.log(
  `[studio-calendar-daily] POST ${base}/api/studio/calendar/run`,
  body.date ? `date=${body.date}` : "date=today",
  body.force ? "force" : ""
);

const res = await fetch(`${base}/api/studio/calendar/run`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const text = await res.text();
let data;
try {
  data = JSON.parse(text);
} catch {
  data = { raw: text };
}

console.log(JSON.stringify(data, null, 2));
if (!res.ok) process.exit(1);

const generated = data.generatedCount ?? data.generated?.length ?? 0;
const skipped = data.skippedCount ?? data.skipped?.length ?? 0;
console.log(
  `[studio-calendar-daily] done — generated=${generated} skipped=${skipped} (review in /studio → Saved calendar ads)`
);
