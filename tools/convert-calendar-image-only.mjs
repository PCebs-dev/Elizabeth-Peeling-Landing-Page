import fs from "fs";

const path = "content/le32-content-calendar-4wk.json";
const json = JSON.parse(fs.readFileSync(path, "utf8"));

json.meta.studio.usage =
  "Image-only calendar. Automation and studio generate AI stills + captions. No video/reels.";
json.meta.imageOnly = true;
json.meta.formatsAllowed = ["static", "carousel", "story"];

for (const p of json.posts) {
  if (p.format === "reel") {
    p.format = "static";
    p.production = "ai-image";
    p.hook = p.hook
      .replace(/reel/gi, "static image")
      .replace(/on camera:/gi, "on image text:")
      .replace(/Voiceover:/gi, "Caption lead:");
    p.notes =
      "IMAGE-ONLY static feed post (no video). " +
      p.notes
        .replace(/Organic IG\/FB Reel\.?/gi, "Organic IG/FB static image.")
        .replace(/Organic Reel\.?/gi, "Organic static image.")
        .replace(/\bReel\b/gi, "static image")
        .replace(/filmed/gi, "photographed")
        .replace(/film /gi, "photograph ")
        .replace(/Shot list:/gi, "Visual brief:")
        .replace(/talking head/gi, "hero still");
    if (!/Generate AI image/i.test(p.notes)) {
      p.notes +=
        " Generate AI image from imageHints + subjectMode, then bilingual caption. Do not create video or Reels.";
    }
  } else if (p.format === "story") {
    p.production = "ai-image";
    p.notes =
      "IMAGE-ONLY Instagram Story still(s) - static frames, no video clips. " +
      p.notes
        .replace(/clips/gi, "stills")
        .replace(/phone-video/gi, "phone still or AI image")
        .replace(/Film /gi, "Photograph ");
    if (!/no video/i.test(p.notes)) {
      p.notes += " Use 1-3 static story frames. No video.";
    }
  } else if (p.format === "carousel") {
    p.production = "ai-or-design";
    if (!/IMAGE-ONLY/i.test(p.notes)) {
      p.notes = "IMAGE-ONLY carousel (still slides, no video). " + p.notes;
    }
  } else if (p.format === "static") {
    if (/video/i.test(p.production || "")) p.production = "ai-image";
    if (!/IMAGE-ONLY/i.test(p.notes)) {
      p.notes = "IMAGE-ONLY static post. " + p.notes;
    }
  }
  if (/video/i.test(p.production || "")) p.production = "ai-image";
}

fs.writeFileSync(path, JSON.stringify(json, null, 2) + "\n");

const counts = {};
for (const p of json.posts) counts[p.format] = (counts[p.format] || 0) + 1;
console.log(counts, "total", json.posts.length);
