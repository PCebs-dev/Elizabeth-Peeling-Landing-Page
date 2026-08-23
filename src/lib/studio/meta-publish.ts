const DEFAULT_GRAPH_VERSION = "v21.0";

export type PublishPlatform = "facebook" | "instagram";

export interface MetaConfig {
  pageId: string | null;
  token: string | null;
  igUserId: string | null;
  graphVersion: string;
  facebookReady: boolean;
  instagramReady: boolean;
}

export interface PublishResult {
  platform: PublishPlatform;
  postId: string;
  permalink?: string;
}

function graphBase(version: string) {
  return `https://graph.facebook.com/${version}`;
}

function cleanEnvId(value: string | undefined): string | null {
  const v = value?.trim() || null;
  if (!v) return null;
  // Treat common placeholders as unset
  if (
    v === "..." ||
    v === "your-facebook-page-id" ||
    v === "your-instagram-business-account-id" ||
    v === "your-long-lived-page-access-token" ||
    /^x+$/i.test(v)
  ) {
    return null;
  }
  return v;
}

export function getMetaConfig(): MetaConfig {
  const pageId = cleanEnvId(process.env.META_PAGE_ID);
  const token = cleanEnvId(process.env.META_PAGE_ACCESS_TOKEN);
  const igUserId = cleanEnvId(process.env.META_IG_USER_ID);
  const graphVersion =
    process.env.META_GRAPH_VERSION?.trim() || DEFAULT_GRAPH_VERSION;

  return {
    pageId,
    token,
    igUserId,
    graphVersion,
    facebookReady: Boolean(pageId && token),
    instagramReady: Boolean(pageId && token && igUserId),
  };
}

export function metaConfigStatus() {
  const cfg = getMetaConfig();
  const missing: string[] = [];
  if (!cfg.pageId) missing.push("META_PAGE_ID");
  if (!cfg.token) missing.push("META_PAGE_ACCESS_TOKEN");
  if (!cfg.igUserId) missing.push("META_IG_USER_ID");

  return {
    facebookReady: cfg.facebookReady,
    instagramReady: cfg.instagramReady,
    configured: cfg.facebookReady,
    missing,
  };
}

type GraphErrorBody = {
  error?: { message?: string; error_user_msg?: string; code?: number };
};

async function graphRequest<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, init);
  let data: T & GraphErrorBody;
  try {
    data = (await res.json()) as T & GraphErrorBody;
  } catch {
    throw new Error(`Meta API returned non-JSON (${res.status})`);
  }

  if (!res.ok || data.error) {
    const msg =
      data.error?.error_user_msg ||
      data.error?.message ||
      `Meta API error (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toBlobPart(bytes: Uint8Array): BlobPart {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

/** Upload an unpublished Page photo and return a public CDN URL for Instagram. */
export async function uploadPagePhotoForUrl(
  bytes: Uint8Array,
  mimeType: string,
  filename: string
): Promise<{ photoId: string; imageUrl: string }> {
  const cfg = getMetaConfig();
  if (!cfg.facebookReady || !cfg.pageId || !cfg.token) {
    throw new Error("Facebook Page is not configured (META_PAGE_ID / META_PAGE_ACCESS_TOKEN)");
  }

  const form = new FormData();
  form.append("published", "false");
  form.append("access_token", cfg.token);
  form.append(
    "source",
    new Blob([toBlobPart(bytes)], { type: mimeType || "image/jpeg" }),
    filename || "creative.jpg"
  );

  const created = await graphRequest<{ id: string }>(
    `${graphBase(cfg.graphVersion)}/${cfg.pageId}/photos`,
    { method: "POST", body: form }
  );

  const meta = await graphRequest<{
    images?: { source: string; width: number; height: number }[];
  }>(
    `${graphBase(cfg.graphVersion)}/${created.id}?fields=images&access_token=${encodeURIComponent(cfg.token)}`
  );

  const images = meta.images ?? [];
  if (images.length === 0) {
    throw new Error("Facebook uploaded the photo but returned no public image URL");
  }

  const best = [...images].sort((a, b) => b.width - a.width)[0];
  return { photoId: created.id, imageUrl: best.source };
}

export async function publishFacebookPhoto(params: {
  bytes: Uint8Array;
  mimeType: string;
  filename: string;
  caption: string;
}): Promise<PublishResult> {
  const cfg = getMetaConfig();
  if (!cfg.facebookReady || !cfg.pageId || !cfg.token) {
    throw new Error("Facebook Page is not configured");
  }

  const form = new FormData();
  form.append("published", "true");
  form.append("caption", params.caption.slice(0, 63206));
  form.append("access_token", cfg.token);
  form.append(
    "source",
    new Blob([toBlobPart(params.bytes)], {
      type: params.mimeType || "image/jpeg",
    }),
    params.filename || "creative.jpg"
  );

  const data = await graphRequest<{ id: string; post_id?: string }>(
    `${graphBase(cfg.graphVersion)}/${cfg.pageId}/photos`,
    { method: "POST", body: form }
  );

  const postId = data.post_id || data.id;
  return {
    platform: "facebook",
    postId,
    permalink: `https://www.facebook.com/${postId}`,
  };
}

export async function publishInstagramFeed(params: {
  imageUrl: string;
  caption: string;
}): Promise<PublishResult> {
  return publishInstagramContainer({
    imageUrl: params.imageUrl,
    caption: params.caption,
    mediaType: "IMAGE",
  });
}

/** Instagram Stories (24h). Caption is typically unused for Stories. */
export async function publishInstagramStory(params: {
  imageUrl: string;
}): Promise<PublishResult> {
  return publishInstagramContainer({
    imageUrl: params.imageUrl,
    mediaType: "STORIES",
  });
}

async function publishInstagramContainer(params: {
  imageUrl: string;
  caption?: string;
  mediaType: "IMAGE" | "STORIES";
}): Promise<PublishResult> {
  const cfg = getMetaConfig();
  if (!cfg.instagramReady || !cfg.igUserId || !cfg.token) {
    throw new Error(
      "Instagram Business account is not configured (META_IG_USER_ID + Page token)"
    );
  }

  const createBody = new URLSearchParams({
    image_url: params.imageUrl,
    access_token: cfg.token,
  });
  if (params.mediaType === "STORIES") {
    createBody.set("media_type", "STORIES");
  }
  if (params.caption) {
    createBody.set("caption", params.caption.slice(0, 2200));
  }

  const container = await graphRequest<{ id: string }>(
    `${graphBase(cfg.graphVersion)}/${cfg.igUserId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: createBody,
    }
  );

  let ready = false;
  for (let i = 0; i < 30; i++) {
    const status = await graphRequest<{ status_code?: string }>(
      `${graphBase(cfg.graphVersion)}/${container.id}?fields=status_code&access_token=${encodeURIComponent(cfg.token)}`
    );
    const code = status.status_code;
    if (code === "FINISHED") {
      ready = true;
      break;
    }
    if (code === "ERROR" || code === "EXPIRED") {
      throw new Error(`Instagram media processing failed (${code})`);
    }
    await sleep(1500);
  }

  if (!ready) {
    throw new Error("Timed out waiting for Instagram to process the image");
  }

  const published = await graphRequest<{ id: string }>(
    `${graphBase(cfg.graphVersion)}/${cfg.igUserId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        creation_id: container.id,
        access_token: cfg.token,
      }),
    }
  );

  return {
    platform: "instagram",
    postId: published.id,
  };
}

/** Facebook Page photo Story (24h). Requires unpublished Page photo id. */
export async function publishFacebookStory(params: {
  photoId: string;
}): Promise<PublishResult> {
  const cfg = getMetaConfig();
  if (!cfg.facebookReady || !cfg.pageId || !cfg.token) {
    throw new Error("Facebook Page is not configured");
  }

  const data = await graphRequest<{ success?: boolean; post_id?: string }>(
    `${graphBase(cfg.graphVersion)}/${cfg.pageId}/photo_stories`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        photo_id: params.photoId,
        access_token: cfg.token,
      }),
    }
  );

  if (!data.success && !data.post_id) {
    throw new Error("Facebook Story publish did not return success");
  }

  return {
    platform: "facebook",
    postId: data.post_id || params.photoId,
  };
}

/**
 * Publish a still as Instagram and/or Facebook Stories.
 * Uses one unpublished Page photo upload for both platforms.
 */
export async function publishToStories(params: {
  platforms: PublishPlatform[];
  bytes: Uint8Array;
  mimeType: string;
  filename: string;
}): Promise<{
  results: PublishResult[];
  errors: { platform: PublishPlatform; error: string }[];
}> {
  const platforms = [...new Set(params.platforms)];
  const results: PublishResult[] = [];
  const errors: { platform: PublishPlatform; error: string }[] = [];

  let photoId: string | null = null;
  let imageUrl: string | null = null;

  if (platforms.length > 0) {
    try {
      const uploaded = await uploadPagePhotoForUrl(
        params.bytes,
        params.mimeType,
        params.filename
      );
      photoId = uploaded.photoId;
      imageUrl = uploaded.imageUrl;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Image upload failed";
      for (const platform of platforms) {
        errors.push({ platform, error: message });
      }
      return { results, errors };
    }
  }

  for (const platform of platforms) {
    try {
      if (platform === "facebook") {
        if (!photoId) {
          errors.push({ platform, error: "Missing Facebook photo id" });
          continue;
        }
        results.push(await publishFacebookStory({ photoId }));
      } else if (platform === "instagram") {
        if (!imageUrl) {
          errors.push({
            platform,
            error: "No public image URL available for Instagram Stories",
          });
          continue;
        }
        results.push(await publishInstagramStory({ imageUrl }));
      }
    } catch (err) {
      errors.push({
        platform,
        error: err instanceof Error ? err.message : "Story publish failed",
      });
    }
  }

  return { results, errors };
}

export async function publishToSocial(params: {
  platforms: PublishPlatform[];
  caption: string;
  bytes: Uint8Array;
  mimeType: string;
  filename: string;
}): Promise<{ results: PublishResult[]; errors: { platform: PublishPlatform; error: string }[] }> {
  const platforms = [...new Set(params.platforms)];
  const results: PublishResult[] = [];
  const errors: { platform: PublishPlatform; error: string }[] = [];

  let imageUrl: string | null = null;
  if (platforms.includes("instagram")) {
    try {
      const uploaded = await uploadPagePhotoForUrl(
        params.bytes,
        params.mimeType,
        params.filename
      );
      imageUrl = uploaded.imageUrl;
    } catch (err) {
      errors.push({
        platform: "instagram",
        error: err instanceof Error ? err.message : "Image upload failed",
      });
    }
  }

  for (const platform of platforms) {
    try {
      if (platform === "facebook") {
        results.push(
          await publishFacebookPhoto({
            bytes: params.bytes,
            mimeType: params.mimeType,
            filename: params.filename,
            caption: params.caption,
          })
        );
      } else if (platform === "instagram") {
        if (!imageUrl) {
          if (!errors.some((e) => e.platform === "instagram")) {
            errors.push({
              platform: "instagram",
              error: "No public image URL available for Instagram",
            });
          }
          continue;
        }
        results.push(
          await publishInstagramFeed({
            imageUrl,
            caption: params.caption,
          })
        );
      }
    } catch (err) {
      errors.push({
        platform,
        error: err instanceof Error ? err.message : "Publish failed",
      });
    }
  }

  return { results, errors };
}

