import {
  getMetaConfig,
  publishToStories,
  type PublishPlatform,
  type PublishResult,
} from "./meta-publish";
import { updateSavedAd } from "./saved-ads";
import type { SavedStudioAd } from "./saved-types";

/** Opt in with STUDIO_AUTO_PUBLISH_STORIES=true. Default: off (review & publish manually). */
export function isAutoPublishStoriesEnabled(): boolean {
  const raw = process.env.STUDIO_AUTO_PUBLISH_STORIES?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "on";
}

/** Default: both platforms when configured. Override with STUDIO_STORY_PLATFORMS=instagram,facebook */
export function resolveStoryPublishPlatforms(): PublishPlatform[] {
  const cfg = getMetaConfig();
  const fromEnv = process.env.STUDIO_STORY_PLATFORMS?.trim();
  const requested: PublishPlatform[] = fromEnv
    ? fromEnv
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((p): p is PublishPlatform => p === "facebook" || p === "instagram")
    : ["instagram", "facebook"];

  return requested.filter((p) =>
    p === "facebook" ? cfg.facebookReady : cfg.instagramReady
  );
}

export function isStoryFormat(format: string | undefined): boolean {
  return String(format || "").toLowerCase() === "story";
}

export async function autoPublishSavedStory(ad: SavedStudioAd): Promise<{
  ad: SavedStudioAd;
  results: PublishResult[];
  errors: { platform: PublishPlatform; error: string }[];
  skipped?: string;
}> {
  if (!isAutoPublishStoriesEnabled()) {
    return {
      ad,
      results: [],
      errors: [],
      skipped: "STUDIO_AUTO_PUBLISH_STORIES is disabled",
    };
  }

  if (!isStoryFormat(ad.format)) {
    return {
      ad,
      results: [],
      errors: [],
      skipped: "Not a story format post",
    };
  }

  if (ad.publish?.storiesPublishedAt && (ad.publish.results?.length ?? 0) > 0) {
    return {
      ad,
      results: [],
      errors: [],
      skipped: "Stories already published",
    };
  }

  const platforms = resolveStoryPublishPlatforms();
  if (platforms.length === 0) {
    return {
      ad,
      results: [],
      errors: [],
      skipped:
        "Meta Stories not configured (set META_PAGE_ID / META_PAGE_ACCESS_TOKEN / META_IG_USER_ID)",
    };
  }

  const bytes = Buffer.from(ad.imageBase64, "base64");
  const { results, errors } = await publishToStories({
    platforms,
    bytes: new Uint8Array(bytes),
    mimeType: ad.imageMimeType || "image/png",
    filename: `story-${ad.id.slice(0, 8)}.png`,
  });

  const next = updateSavedAd(ad.id, {
    publish: {
      ...(ad.publish || {}),
      storiesPublishedAt: results.length > 0 ? Date.now() : ad.publish?.storiesPublishedAt,
      results: [
        ...(ad.publish?.results || []),
        ...results.map((r) => ({
          platform: r.platform,
          postId: r.postId,
          kind: "story" as const,
          at: Date.now(),
        })),
      ],
      errors: errors.length
        ? errors.map((e) => ({
            platform: e.platform,
            error: e.error,
            at: Date.now(),
          }))
        : ad.publish?.errors,
    },
  });

  return {
    ad: next || ad,
    results,
    errors,
  };
}
