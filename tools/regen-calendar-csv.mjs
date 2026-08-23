import fs from "fs";

const json = JSON.parse(
  fs.readFileSync("content/le32-content-calendar-4wk.json", "utf8")
);
const esc = (v) => String(v).replace(/"/g, '""');
const headers = [
  "Day",
  "Week",
  "Date",
  "Platform",
  "ContentPillar",
  "PostIdeaHook",
  "Format",
  "CallToAction",
  "Funnel",
  "categoryId",
  "channel",
  "language",
  "angle",
  "notes",
  "imageHints",
  "subjectMode",
  "production",
  "compliance",
  "id",
];
const lines = [headers.join(",")];
for (const p of json.posts) {
  const row = [
    `${p.day} ${p.date}`,
    p.week,
    p.date,
    p.platforms.join("; "),
    p.pillar,
    p.hook,
    p.format,
    p.cta,
    p.funnel,
    p.categoryId,
    p.channel,
    p.language,
    p.angle,
    p.notes,
    p.imageHints.join(" | "),
    p.subjectMode,
    p.production,
    p.compliance.join("; "),
    p.id,
  ].map((v) => `"${esc(v)}"`);
  lines.push(row.join(","));
}
fs.writeFileSync(
  "content/le32-content-calendar-4wk.csv",
  "\ufeff" + lines.join("\n") + "\n"
);
console.log("csv", json.posts.length);
