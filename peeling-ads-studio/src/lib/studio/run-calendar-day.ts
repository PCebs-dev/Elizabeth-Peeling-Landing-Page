import { randomUUID } from "crypto";
import { generateAdCopy } from "./generate-copy";
import {
  buildEnFrImageTwins,
  generateStudioImage,
  localizeStudioImageText,
} from "./generate-image";
import { buildImagePrompt, clipOnImageOverlay } from "./image-prompt";
import { sanitizeFrenchMarketingText } from "./sanitize-copy";
import {
  findSavedAdsByCalendarPost,
  findSavedByCalendarPost,
  getSavedAd,
  listSavedAds,
  saveAd,
  discardSavedAd,
} from "./saved-ads";
import {
  loadCalendar,
  resolvePostForRerun,
  resolvePostsForDate,
  torontoDateString,
} from "./calendar";
import { ensureUpcomingThemes } from "./upcoming-themes-store";
import {
  hydrateCalendarHistoryFromSavedAds,
  recordCalendarPost,
} from "./calendar-history";
import {
  autoPublishSavedStory,
  isAutoPublishStoriesEnabled,
  isStoryFormat,
} from "./auto-publish-stories";
import type { CalendarPost } from "./saved-types";
import type { SavedStudioAd } from "./saved-types";
import type { PublishPlatform, PublishResult } from "./meta-publish";

export interface CalendarRunResult {
  date: string;
  generated: SavedStudioAd[];
  skipped: { calendarPostId: string; reason: string }[];
  errors: { calendarPostId: string; error: string }[];
  warnings: string[];
  published: {
    calendarPostId: string;
    adId: string;
    results: PublishResult[];
    errors: { platform: PublishPlatform; error: string }[];
  }[];
}

/** Injected into every bilingual calendar generate so EN+FR captions and images are required. */
const BILINGUAL_CALENDAR_BRIEF =
  "BILINGUAL REQUIRED: Deliver English caption + French (Québec) caption, AND matching on-image creatives — English typography for the English caption, French typography for the French caption. Same photograph/layout for both; only the on-image language changes. Do not ship English-only when language is both.";

async function generateOnePost(
  post: CalendarPost,
  scheduledDate: string,
  avoidHeadlines: string[],
  avoidAngles: string[]
): Promise<{ ad: SavedStudioAd; warning?: string }> {
  const story = isStoryFormat(String(post.format));
  const lang = post.language || "both";
  const bilingual = lang === "both";

  const notes = [
    post.notes,
    bilingual ? BILINGUAL_CALENDAR_BRIEF : "",
    `Hook: ${post.hook}`,
    `CTA: ${post.cta}`,
    `Format: ${post.format} (IMAGE ONLY — no video)`,
    story ? "Aspect: vertical 9:16 Stories frame" : "",
    post.imageHints?.length
      ? `Image hints: ${post.imageHints.join("; ")}`
      : "",
    post.compliance?.length
      ? `Compliance: ${post.compliance.join("; ")}`
      : "",
  ]
    .filter(Boolean)
    .join(" | ")
    .slice(0, 2000);

  const built = buildImagePrompt({
    categoryId: post.categoryId,
    subjectMode: post.subjectMode || "service",
    notes: (post.imageHints || []).filter(Boolean).join("; "),
    aspect: story ? "story" : "square",
  });

  const copyNotes = [
    notes,
    bilingual ? BILINGUAL_CALENDAR_BRIEF : "",
    `AI creative: ${built.summary}`,
    "Image is AI-generated (not a real patient). Disclose when posting if required.",
    `Preferred angle: ${post.angle}`,
  ]
    .filter(Boolean)
    .join(" | ")
    .slice(0, 2000);

  const { ad, angle, warning: copyWarning } = await generateAdCopy({
    categoryId: post.categoryId,
    notes: copyNotes,
    language: bilingual ? "both" : lang,
    channel: post.channel || "organic",
    imageHints: [built.summary, ...(post.imageHints || [])].slice(0, 12),
    avoidHeadlines,
    avoidAngles,
  });

  const aiLine =
    "Creative uses an AI-generated image — not a real patient photo.";
  ad.disclaimer = ad.disclaimer ? `${ad.disclaimer} ${aiLine}` : aiLine;
  if (ad.fr) {
    const frLine =
      "Visuel généré par IA — ce n'est pas la photo d'un vrai patient.";
    ad.fr.disclaimer = ad.fr.disclaimer
      ? `${ad.fr.disclaimer} ${frLine}`
      : frLine;
  }

  const englishText = clipOnImageOverlay(
    ad.headline || ad.shortCaption || "Smile with confidence."
  );

  const frenchText = clipOnImageOverlay(
    sanitizeFrenchMarketingText(
      ad.fr?.headline || ad.fr?.shortCaption || ""
    )
  );

  const imageWarnings: string[] = [];
  const aspect = story ? ("story" as const) : ("square" as const);

  // Photo-first still, then a single refined headline (EN, then FR twin).
  const baseImage = await generateStudioImage(built.prompt, { aspect });
  if (baseImage.warning) imageWarnings.push(baseImage.warning);

  let imageBase64 = baseImage.base64;
  let imageMimeType = baseImage.mimeType;
  let imageFrBase64: string | undefined;
  let imageFrMimeType: string | undefined;
  let promptSummaryFr: string | undefined;
  let promptSummary = built.summary;

  if (bilingual) {
    if (!ad.fr) {
      imageWarnings.push(
        "French caption missing from copy generation — EN image saved; FR image may reuse EN until regenerated."
      );
    }

    try {
      const twins = await buildEnFrImageTwins({
        base64: baseImage.base64,
        mimeType: baseImage.mimeType || "image/png",
        filename: "calendar.png",
        englishText,
        frenchText: frenchText || undefined,
        aspect,
      });
      imageBase64 = twins.en.base64;
      imageMimeType = twins.en.mimeType;
      imageFrBase64 = twins.fr.base64;
      imageFrMimeType = twins.fr.mimeType;
      promptSummary = `${built.summary} · EN text`;
      promptSummaryFr = `${built.summary} · FR text`;
      if (twins.en.warning) imageWarnings.push(twins.en.warning);
      if (twins.fr.warning) imageWarnings.push(twins.fr.warning);
      if (twins.fr.provider === "source") {
        imageWarnings.push(
          "French on-image edit unavailable — FR preview may still show English typography."
        );
      }
    } catch (err) {
      imageFrBase64 = baseImage.base64;
      imageFrMimeType = baseImage.mimeType;
      promptSummaryFr = `${built.summary} · FR unavailable`;
      imageWarnings.push(
        err instanceof Error
          ? `French image failed: ${err.message}`
          : "French image failed"
      );
    }
  } else if (lang === "fr" && ad.fr) {
    try {
      const frOnly = await localizeStudioImageText({
        bytes: Buffer.from(baseImage.base64, "base64"),
        mimeType: baseImage.mimeType || "image/png",
        filename: "calendar.png",
        language: "fr",
        text: frenchText || englishText,
        mode: "replace",
        aspect,
      });
      imageBase64 = frOnly.base64;
      imageMimeType = frOnly.mimeType;
      promptSummary = `${built.summary} · FR text`;
      if (frOnly.warning) imageWarnings.push(frOnly.warning);
    } catch {
      /* keep photo-only generation */
    }
  } else {
    try {
      const enOnly = await localizeStudioImageText({
        bytes: Buffer.from(baseImage.base64, "base64"),
        mimeType: baseImage.mimeType || "image/png",
        filename: "calendar.png",
        language: "en",
        text: englishText,
        mode: "replace",
        aspect,
      });
      imageBase64 = enOnly.base64;
      imageMimeType = enOnly.mimeType;
      promptSummary = `${built.summary} · EN text`;
      if (enOnly.warning) imageWarnings.push(enOnly.warning);
    } catch {
      /* keep photo-only generation */
    }
  }

  const saved: SavedStudioAd = {
    id: randomUUID(),
    source: "calendar",
    status: "ready",
    calendarPostId: post.id,
    scheduledDate,
    platforms: post.platforms || ["instagram", "facebook"],
    format: String(post.format),
    pillar: post.pillar,
    funnel: post.funnel,
    hook: post.hook,
    categoryId: post.categoryId,
    channel: post.channel || "organic",
    language: lang,
    angle: angle || post.angle || ad.angle,
    headline: ad.headline,
    caption: ad.caption,
    shortCaption: ad.shortCaption,
    hashtags: ad.hashtags,
    cta: ad.cta,
    disclaimer: ad.disclaimer,
    paid: ad.paid,
    fr: ad.fr,
    imageMimeType,
    imageBase64,
    imageFrMimeType,
    imageFrBase64,
    promptSummary,
    promptSummaryFr,
    compliance: post.compliance,
    calendarPost: post,
    createdAt: Date.now(),
  };

  saveAd(saved);
  recordCalendarPost(post);

  const warning = [...imageWarnings, copyWarning].filter(Boolean).join(" ");
  return { ad: saved, warning: warning || undefined };
}

async function maybePublishStory(
  ad: SavedStudioAd,
  result: CalendarRunResult
): Promise<SavedStudioAd> {
  if (!isStoryFormat(ad.format) || !isAutoPublishStoriesEnabled()) {
    return ad;
  }

  const published = await autoPublishSavedStory(ad);
  if (published.skipped) {
    result.warnings.push(`${ad.calendarPostId || ad.id}: ${published.skipped}`);
    return published.ad;
  }

  result.published.push({
    calendarPostId: ad.calendarPostId || ad.id,
    adId: ad.id,
    results: published.results,
    errors: published.errors,
  });

  if (published.results.length > 0) {
    result.warnings.push(
      `${ad.calendarPostId || ad.id}: Stories published to ${published.results
        .map((r) => r.platform)
        .join(", ")}`
    );
  }
  if (published.errors.length > 0) {
    result.warnings.push(
      `${ad.calendarPostId || ad.id}: Story publish errors — ${published.errors
        .map((e) => `${e.platform}: ${e.error}`)
        .join(" · ")}`
    );
  }

  return published.ad;
}

/**
 * Generate IMAGE-ONLY ads for the calendar day and persist them for review.
 * Auto-publish to Meta Stories is opt-in (STUDIO_AUTO_PUBLISH_STORIES=true).
 *
 * Bilingual (`language: both`) posts always request EN + FR captions and
 * matching EN/FR on-image creatives (same photo, language of typography only).
 */
export async function runCalendarDay(options?: {
  date?: Date;
  force?: boolean;
  /** When set, only this calendar row is generated (same theme, new creative). */
  calendarPostId?: string;
  /** Rerun a specific saved ad using its original calendar brief. */
  savedAdId?: string;
}): Promise<CalendarRunResult> {
  const when = options?.date ?? new Date();
  const scheduledDate = torontoDateString(when);
  hydrateCalendarHistoryFromSavedAds();
  // Keep ≥35 days of future themes warm — past rows stay in history / theme file
  ensureUpcomingThemes();
  const calendar = loadCalendar();
  const savedAd = options?.savedAdId ? getSavedAd(options.savedAdId) : null;
  let posts: CalendarPost[] = [];

  if (options?.savedAdId || options?.calendarPostId) {
    const rerunDate = savedAd?.scheduledDate || scheduledDate;
    const post = resolvePostForRerun({
      dateIso: rerunDate,
      calendarPostId: options.calendarPostId || savedAd?.calendarPostId,
      savedAd,
    });
    if (post) posts = [{ ...post, date: rerunDate }];
  } else {
    posts = resolvePostsForDate(calendar, when);
  }

  const existing = listSavedAds();
  const avoidHeadlines = existing.map((a) => a.headline).slice(0, 20);
  const avoidAngles = existing.map((a) => a.angle).slice(0, 10);

  const result: CalendarRunResult = {
    date: posts[0]?.date || scheduledDate,
    generated: [],
    skipped: [],
    errors: [],
    warnings: [],
    published: [],
  };

  if (posts.length === 0) {
    result.warnings.push(
      options?.savedAdId || options?.calendarPostId
        ? `No matching calendar brief to rerun for ${savedAd?.scheduledDate || scheduledDate}`
        : `No image-only calendar posts for ${scheduledDate}`
    );
    return result;
  }

  for (const post of posts) {
    const dayIso = post.date || scheduledDate;
    if (!options?.force) {
      const prior = findSavedByCalendarPost(post.id, dayIso);
      if (prior) {
        if (
          isStoryFormat(prior.format) &&
          !prior.publish?.storiesPublishedAt
        ) {
          await maybePublishStory(prior, result);
        }
        result.skipped.push({
          calendarPostId: post.id,
          reason: `Already generated (${prior.id})`,
        });
        continue;
      }
    }

    try {
      const { ad, warning } = await generateOnePost(
        post,
        dayIso,
        avoidHeadlines,
        avoidAngles
      );
      const publishedAd = await maybePublishStory(ad, result);
      result.generated.push(publishedAd);
      avoidHeadlines.unshift(publishedAd.headline);
      avoidAngles.unshift(publishedAd.angle);
      if (warning) result.warnings.push(`${post.id}: ${warning}`);

      if (options?.force) {
        for (const old of findSavedAdsByCalendarPost(post.id, dayIso)) {
          if (old.id !== publishedAd.id) discardSavedAd(old.id);
        }
      }

      if (
        (post.language || "both") === "both" &&
        (!publishedAd.fr || !publishedAd.imageFrBase64)
      ) {
        result.warnings.push(
          `${post.id}: Bilingual post incomplete — missing ${[
            !publishedAd.fr ? "FR caption" : null,
            !publishedAd.imageFrBase64 ? "FR image" : null,
          ]
            .filter(Boolean)
            .join(" + ")}`
        );
      }
    } catch (err) {
      result.errors.push({
        calendarPostId: post.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
