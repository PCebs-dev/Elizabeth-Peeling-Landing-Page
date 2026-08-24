import { getCategory } from "./categories";
import {
  buildMetaTargetingBrief,
  STUDIO_CLINIC,
  utmUrl,
} from "./targeting";
import type { GeneratedAd } from "./types";

export function buildExportMarkdown(ad: GeneratedAd): string {
  const category = getCategory(ad.categoryId);
  const targeting = buildMetaTargetingBrief(ad.categoryId);
  const campaignSlug = category.id;
  const landing = utmUrl(STUDIO_CLINIC.landingUrl, {
    source: "meta",
    medium: ad.channel === "paid" ? "paid_social" : "social",
    campaign: campaignSlug,
    content: ad.id.slice(0, 8),
  });
  const booking = utmUrl(STUDIO_CLINIC.bookingUrl, {
    source: "meta",
    medium: ad.channel === "paid" ? "paid_social" : "social",
    campaign: campaignSlug,
    content: `book_${ad.id.slice(0, 8)}`,
  });

  const lines: string[] = [
    `# Ad export — ${category.label}`,
    ``,
    `- Generated: ${new Date(ad.createdAt).toISOString()}`,
    `- Channel: ${ad.channel}`,
    `- Language: ${ad.language}`,
    `- Angle: ${ad.angle}`,
    `- Photo IDs: ${ad.photoIds.join(", ") || "(none)"}`,
  ];

  if (ad.aiImage) {
    lines.push(`- Creative source: AI-generated image (not a real patient)`);
    if (ad.promptSummary) {
      lines.push(`- Prompt summary: ${ad.promptSummary}`);
    }
  }

  lines.push(
    ``,
    `## English`,
    ``,
    `### Headline`,
    ad.headline,
    ``,
    `### Caption`,
    ad.caption,
    ``,
    `### Short caption`,
    ad.shortCaption,
    ``,
    `### CTA`,
    ad.cta,
    `Instagram: link in bio (set bio to ${STUDIO_CLINIC.bookingUrl})`,
    `Facebook: ${STUDIO_CLINIC.bookingUrl}`,
    ``,
    `### Hashtags`,
    ad.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" "),
    ``
  );

  if (ad.disclaimer) {
    lines.push(`### Disclaimer`, ad.disclaimer, ``);
  }

  if (ad.paid) {
    lines.push(
      `### Meta paid fields (EN)`,
      `- Primary text: ${ad.paid.primaryText}`,
      `- Headline: ${ad.paid.headline}`,
      `- Description: ${ad.paid.description}`,
      `- Audience: ${ad.paid.audienceSuggestion}`,
      `- Budget: ${ad.paid.budgetNote}`,
      ``
    );
  }

  if (ad.fr) {
    lines.push(
      `## Français`,
      ``,
      `### Titre`,
      ad.fr.headline,
      ``,
      `### Légende`,
      ad.fr.caption,
      ``,
      `### Légende courte`,
      ad.fr.shortCaption,
      ``,
      `### CTA`,
      ad.fr.cta,
      `Instagram : lien dans la bio (bio = ${STUDIO_CLINIC.bookingUrlFr})`,
      `Facebook : ${STUDIO_CLINIC.bookingUrlFr}`,
      ``,
      `### Hashtags`,
      ad.fr.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" "),
      ``
    );
    if (ad.fr.disclaimer) {
      lines.push(`### Avertissement`, ad.fr.disclaimer, ``);
    }
    if (ad.fr.paid) {
      lines.push(
        `### Champs Meta payants (FR)`,
        `- Texte principal: ${ad.fr.paid.primaryText}`,
        `- Titre: ${ad.fr.paid.headline}`,
        `- Description: ${ad.fr.paid.description}`,
        ``
      );
    }
  }

  lines.push(
    `## Links`,
    `- Landing: ${landing}`,
    `- Booking: ${booking}`,
    `- SmileView: ${STUDIO_CLINIC.smileViewUrl}`,
    `- Phone: ${STUDIO_CLINIC.phoneDisplay}`,
    `- Instagram: ${STUDIO_CLINIC.instagram}`,
    ``,
    `## Meta local targeting brief`,
    ``,
    `- Radius: ${targeting.radiusKm} km around ${STUDIO_CLINIC.address.street}, ${STUDIO_CLINIC.address.city}`,
    `- Age: ${targeting.ageMin}–${targeting.ageMax}`,
    `- Primary cities: ${targeting.primaryCities.join(", ")}`,
    `- Secondary cities: ${targeting.secondaryCities.join(", ")}`,
    `- Interests: ${targeting.interests.join(", ")}`,
    `- Placements: ${targeting.placements.join(", ")}`,
    ``,
    `### Ads Manager checklist`,
    ...targeting.checklist.map((item, i) => `${i + 1}. ${item}`),
    ``,
    `---`,
    ad.aiImage
      ? `Compliance (Code de déontologie des dentistes, CQLR c D-3, r. 4): Identify Dr. Elizabeth Peeling, D.M.D., General Dentist / dentiste généraliste with clinic coordinates. No testimonials, no comparative ads, no guaranteed results. Regular + exceptional prices must appear in the same character size. Regular advertised fees stay in force 90 days after last publication. Keep a full copy of this ad for 5 years. Creative source is AI-generated (not a real patient). Disclose when required. Marketing review only — not medical advice.`
      : `Compliance (Code de déontologie des dentistes, CQLR c D-3, r. 4): Identify Dr. Elizabeth Peeling, D.M.D., General Dentist / dentiste généraliste with clinic coordinates. No testimonials, no comparative ads, no guaranteed results. Regular + exceptional prices must appear in the same character size. Regular advertised fees stay in force 90 days after last publication. Keep a full copy of this ad for 5 years. Marketing review only — not medical advice.`,
    ``
  );

  return lines.join("\n");
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Prefer the iOS/Android share sheet; fall back to file download. */
export async function shareOrDownloadTextFile(
  filename: string,
  content: string
): Promise<"shared" | "downloaded"> {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const file = new File([blob], filename, { type: "text/markdown" });

  try {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      const dataWithFile = { files: [file], title: filename, text: content };
      if (
        typeof navigator.canShare === "function" &&
        navigator.canShare(dataWithFile)
      ) {
        await navigator.share(dataWithFile);
        return "shared";
      }
      await navigator.share({ title: filename, text: content });
      return "shared";
    }
  } catch (err) {
    // User cancelled share — don't force a download
    if (err instanceof DOMException && err.name === "AbortError") {
      return "shared";
    }
  }

  downloadTextFile(filename, content);
  return "downloaded";
}

/** Returns false when clipboard is blocked (no focus / permission) — never throws. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function formatHashtags(tags: string[]): string {
  return tags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
}
