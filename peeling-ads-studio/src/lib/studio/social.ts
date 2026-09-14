import type { PublishPlatform, StudioFormat } from "./types";

function graphBase(): string {
  return `https://graph.facebook.com/${process.env.META_GRAPH_VERSION ?? "v21.0"}`;
}

function pageAccessToken(): string | null {
  return (
    process.env.META_PAGE_ACCESS_TOKEN?.trim() ??
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim() ??
    null
  );
}

function pageId(): string | null {
  return (
    process.env.FACEBOOK_PAGE_ID?.trim() ??
    process.env.META_PAGE_ID?.trim() ??
    null
  );
}

function instagramUserId(): string | null {
  return (
    process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID?.trim() ??
    process.env.INSTAGRAM_USER_ID?.trim() ??
    null
  );
}

async function graphPost(
  path: string,
  body: FormData | URLSearchParams,
): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
  const token = pageAccessToken();
  if (!token) {
    return { ok: false, error: "Facebook page access token is not configured." };
  }

  if (body instanceof URLSearchParams) {
    body.set("access_token", token);
  } else {
    body.append("access_token", token);
  }

  const res = await fetch(`${graphBase()}${path}`, {
    method: "POST",
    body,
  });
  const data = (await res.json()) as Record<string, unknown> & {
    error?: { message?: string };
  };
  if (!res.ok) {
    return { ok: false, error: data.error?.message ?? `Graph API error (${res.status})` };
  }
  return { ok: true, data };
}

export async function publishToFacebook(params: {
  image: Blob;
  caption: string;
  format: StudioFormat;
}): Promise<{ ok: boolean; message: string; postId?: string }> {
  const pid = pageId();
  if (!pid) {
    return { ok: false, message: "FACEBOOK_PAGE_ID is not configured on the server." };
  }

  const form = new FormData();
  form.append("source", params.image, "creative.jpg");
  form.append("message", params.caption);
  if (params.format === "story") {
    form.append("published", "false");
  }

  const result = await graphPost(`/${pid}/photos`, form);
  if (!result.ok) {
    return { ok: false, message: result.error ?? "Facebook publish failed." };
  }

  const postId = String(result.data?.id ?? result.data?.post_id ?? "");
  return {
    ok: true,
    message: "Published to Facebook.",
    postId: postId || undefined,
  };
}

/** Upload photo unpublished to get a public URL for Instagram container creation. */
async function uploadFacebookPhotoForUrl(
  image: Blob,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const pid = pageId();
  if (!pid) return { ok: false, error: "FACEBOOK_PAGE_ID is not configured." };

  const form = new FormData();
  form.append("source", image, "creative.jpg");
  form.append("published", "false");

  const upload = await graphPost(`/${pid}/photos`, form);
  if (!upload.ok) return { ok: false, error: upload.error };

  const photoId = String(upload.data?.id ?? "");
  if (!photoId) return { ok: false, error: "Could not obtain Facebook photo id." };

  const token = pageAccessToken();
  const res = await fetch(
    `${graphBase()}/${photoId}?fields=images&access_token=${encodeURIComponent(token ?? "")}`,
  );
  const data = (await res.json()) as {
    images?: { source?: string }[];
    error?: { message?: string };
  };
  if (!res.ok) {
    return { ok: false, error: data.error?.message ?? "Could not read uploaded photo URL." };
  }
  const url = data.images?.[0]?.source;
  if (!url) return { ok: false, error: "Facebook did not return an image URL." };
  return { ok: true, url };
}

export async function publishToInstagram(params: {
  image: Blob;
  caption: string;
  format: StudioFormat;
}): Promise<{ ok: boolean; message: string; postId?: string }> {
  const igId = instagramUserId();
  if (!igId) {
    return {
      ok: false,
      message: "INSTAGRAM_BUSINESS_ACCOUNT_ID is not configured on the server.",
    };
  }

  const hosted = await uploadFacebookPhotoForUrl(params.image);
  if (!hosted.ok || !hosted.url) {
    return { ok: false, message: hosted.error ?? "Could not stage image for Instagram." };
  }

  const createParams = new URLSearchParams();
  createParams.set("caption", params.caption);
  if (params.format === "story") {
    createParams.set("media_type", "STORIES");
    createParams.set("image_url", hosted.url);
  } else {
    createParams.set("image_url", hosted.url);
  }

  const created = await graphPost(`/${igId}/media`, createParams);
  if (!created.ok) {
    return { ok: false, message: created.error ?? "Instagram media creation failed." };
  }

  const creationId = String(created.data?.id ?? "");
  if (!creationId) {
    return { ok: false, message: "Instagram did not return a creation id." };
  }

  const publishParams = new URLSearchParams();
  publishParams.set("creation_id", creationId);
  const published = await graphPost(`/${igId}/media_publish`, publishParams);
  if (!published.ok) {
    return { ok: false, message: published.error ?? "Instagram publish failed." };
  }

  return {
    ok: true,
    message: "Published to Instagram.",
    postId: String(published.data?.id ?? ""),
  };
}

export async function publishCreative(params: {
  platform: PublishPlatform;
  image: Blob;
  caption: string;
  format: StudioFormat;
}): Promise<{ ok: boolean; message: string; postId?: string }> {
  if (params.platform === "facebook") {
    return publishToFacebook(params);
  }
  return publishToInstagram(params);
}

export function socialConfigured(platform: PublishPlatform): boolean {
  if (!pageAccessToken()) return false;
  if (platform === "facebook") return Boolean(pageId());
  return Boolean(instagramUserId() && pageId());
}
