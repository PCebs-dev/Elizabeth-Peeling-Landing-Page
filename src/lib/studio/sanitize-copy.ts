import type { GeneratedAdCopy } from "./types";

/** Strip common AI-writing tells so captions read more human. */
export function sanitizeHumanText(input: string): string {
  if (!input) return input;

  let text = input;

  // Remove emoji / pictographs / dingbats / variation selectors
  text = text.replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{20E3}]/gu,
    ""
  );

  // Replace long / fancy dashes with a simple hyphen or comma-friendly phrasing
  text = text.replace(/\u2014/g, " - "); // em dash —
  text = text.replace(/\u2013/g, "-"); // en dash –
  text = text.replace(/\u2212/g, "-"); // minus −
  text = text.replace(/-{2,}/g, "-"); // -- or ---

  // Straighten curly quotes / ellipsis common in AI paste
  text = text.replace(/[\u2018\u2019]/g, "'");
  text = text.replace(/[\u201C\u201D]/g, '"');
  text = text.replace(/\u2026/g, "...");

  // Remove leftover "AI creative" / synthetic disclosure language from captions
  // (keep separate disclaimer field; don't advertise AI in the post body)
  text = text.replace(/\bAI[- ]generated\b/gi, "");
  text = text.replace(/\bnot a real patient\b/gi, "");

  // Fix common brand grammar slip: "At Dr. X at Clinique Y"
  text = text.replace(
    /\bAt\s+(Dr\.?\s+Elizabeth\s+Peeling)\s+at\s+(Clinique\s+LE\s*32)\b/gi,
    "With $1 at $2"
  );
  text = text.replace(
    /\bÀ\s+(Dre\.?\s+Elizabeth\s+Peeling)\s+à\s+(Clinique\s+LE\s*32)\b/gi,
    "Avec $1 à $2"
  );
  // Soften bare "At Dr. Name," when clinic follows later in the same sentence
  text = text.replace(
    /\bAt\s+(Dr\.?\s+Elizabeth\s+Peeling)\b(?=\s*[,']?\s*(?:we|our|you'll|you|and)\b)/gi,
    "With $1"
  );

  // Drop leftover ODQ labels with no value (e.g. a lone "Regular price:")
  text = text
    .split("\n")
    .filter((line) => {
      const n = line
        .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, " ")
        .replace(/[*_`#]+/g, "")
        .replace(/^[\s>*•·\-–—\d.)]+/, "")
        .replace(/\s+/g, " ")
        .trim();
      return !/^(regular price|exceptional price|special price|prix r[ée]gulier|prix exceptionnel)\s*:?\s*$/i.test(
        n
      );
    })
    .join("\n");

  // Collapse messy whitespace left by removals (preserve newlines)
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

/** IG/FB captions should never include #tags. */
export function stripHashtagsFromCaption(input: string): string {
  return input
    .replace(/(^|\s)#[\p{L}\p{N}_]+/gu, "$1")
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * French marketing copy / on-image headlines.
 * Fixes English leftovers like "Myth:" → "Mythe :".
 */
export function sanitizeFrenchMarketingText(input: string): string {
  if (!input) return input;
  let text = sanitizeHumanText(input);

  // Label at start of headline / line
  text = text.replace(/\bMyth\s*:/gi, "Mythe :");
  text = text.replace(/\bMYTH\s*:/g, "Mythe :");
  // Standalone English "Myth" used as the myth-bust label (not inside other words)
  text = text.replace(/(^|[\n\r]|[\s(])Myth(?=[\s:.—-]|$)/gm, "$1Mythe");

  return text.trim();
}

export function sanitizeAdCopy(ad: GeneratedAdCopy): GeneratedAdCopy {
  const cleanPaid = ad.paid
    ? {
        ...ad.paid,
        primaryText: stripHashtagsFromCaption(
          sanitizeHumanText(ad.paid.primaryText)
        ),
        headline: sanitizeHumanText(ad.paid.headline),
        description: sanitizeHumanText(ad.paid.description),
        audienceSuggestion: sanitizeHumanText(ad.paid.audienceSuggestion),
        budgetNote: sanitizeHumanText(ad.paid.budgetNote),
      }
    : undefined;

  const cleanFr = ad.fr
    ? {
        ...ad.fr,
        headline: sanitizeFrenchMarketingText(ad.fr.headline),
        caption: stripHashtagsFromCaption(
          sanitizeFrenchMarketingText(ad.fr.caption)
        ),
        shortCaption: stripHashtagsFromCaption(
          sanitizeFrenchMarketingText(ad.fr.shortCaption)
        ),
        cta: sanitizeFrenchMarketingText(ad.fr.cta),
        disclaimer: sanitizeFrenchMarketingText(ad.fr.disclaimer),
        hashtags: ad.fr.hashtags.map((h) =>
          sanitizeFrenchMarketingText(h).replace(/^#+/, "")
        ),
        paid: ad.fr.paid
          ? {
              primaryText: stripHashtagsFromCaption(
                sanitizeFrenchMarketingText(ad.fr.paid.primaryText)
              ),
              headline: sanitizeFrenchMarketingText(ad.fr.paid.headline),
              description: sanitizeFrenchMarketingText(ad.fr.paid.description),
            }
          : undefined,
      }
    : undefined;

  return {
    ...ad,
    headline: sanitizeHumanText(ad.headline),
    caption: stripHashtagsFromCaption(sanitizeHumanText(ad.caption)),
    shortCaption: stripHashtagsFromCaption(sanitizeHumanText(ad.shortCaption)),
    cta: sanitizeHumanText(ad.cta),
    disclaimer: sanitizeHumanText(ad.disclaimer),
    hashtags: ad.hashtags.map((h) => sanitizeHumanText(h).replace(/^#+/, "")),
    paid: cleanPaid,
    fr: cleanFr,
  };
}
