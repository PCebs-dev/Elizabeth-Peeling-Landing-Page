/**
 * Higgsfield video generation for studio (image-to-video).
 * Best suited for short social clips (Reels/Stories) from dental stills.
 * Docs: https://docs.higgsfield.ai/
 */

import { getCategory } from "./categories";
import {
  isUnbrandedViralVideoTone,
  mapStudioVideoDurationToApi,
  type StudioCategoryId,
  type StudioVideoDuration,
  type StudioVideoTone,
} from "./types";

const HF_BASE = "https://platform.higgsfield.ai";

/** Prefer DoP for polished marketing motion; override with HIGGSFIELD_VIDEO_MODEL */
const DEFAULT_VIDEO_MODEL = "higgsfield-ai/dop/standard";

function hfHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    Authorization: authHeader(),
    Accept: "application/json",
    "User-Agent": "ElizabethDentalStudio/1.0",
    ...extra,
  };
}

const TONE_MOTION: Record<StudioVideoTone, string> = {
  warm: "Warm, soft energy — gentle smile, inviting atmosphere.",
  humorous: "Light playful energy — bright expression, tasteful levity (never mocking).",
  random_funny:
    "Viral comedy energy — expressive reaction, punchy timing, shareable personality (never cruel or mocking appearance).",
  random_edgy:
    "Tongue-in-cheek viral energy — sharper attitude, dry smirk, bolder personality without cruelty.",
  serious: "Composed, premium, steady camera — trustworthy clinical calm.",
  inspirational: "Uplifting micro-motion — confident posture, hopeful light.",
  educational: "Clear, focused framing — calm explanatory presence.",
  soft_cta: "Approachable invitation energy — friendly eye contact, open smile.",
};

export function isHiggsfieldConfigured(): boolean {
  return Boolean(
    process.env.HIGGSFIELD_API_KEY_ID?.trim() &&
      process.env.HIGGSFIELD_API_KEY_SECRET?.trim()
  );
}

function authHeader(): string {
  const id = process.env.HIGGSFIELD_API_KEY_ID?.trim() || "";
  const secret = process.env.HIGGSFIELD_API_KEY_SECRET?.trim() || "";
  return `Key ${id}:${secret}`;
}

function videoModel(): string {
  return (
    process.env.HIGGSFIELD_VIDEO_MODEL?.trim() || DEFAULT_VIDEO_MODEL
  ).replace(/^\/+/, "");
}

export function buildVideoMotionPrompt(input: {
  categoryId: StudioCategoryId;
  notes?: string;
  tone?: StudioVideoTone;
  duration?: StudioVideoDuration;
}): { prompt: string; summary: string; captionTheme: string } {
  const category = getCategory(input.categoryId);
  const notes = input.notes?.trim().slice(0, 800) || "";
  const tone: StudioVideoTone = input.tone || "warm";
  const duration: StudioVideoDuration = input.duration ?? 5;
  const apiDuration = mapStudioVideoDurationToApi(duration);

  const viralUnbranded = isUnbrandedViralVideoTone(tone);
  const viralTopicLine =
    category.id === "botox"
      ? "Topic: Botox / facial aesthetics comedy — wrinkles, forehead expression, resting face energy. Teeth optional; do not force a dental gag."
      : category.id === "whitening"
        ? "Topic: whitening / smile-brightness comedy — stains, filters vs real life, photo confidence."
        : category.id === "invisalign"
          ? "Topic: clear-aligner comedy — trays, selfie angles, subtle smile flex."
          : `Topic: ${category.label} comedy — stay on that subject as its own viral bit; entertainment, not a clinic ad.`;

  const captionTheme = [
    `${category.label} social video`,
    `tone: ${tone}`,
    `${apiDuration}s`,
    notes
      ? notes.slice(0, 160)
      : viralUnbranded
        ? tone === "random_edgy"
          ? `edgy tongue-in-cheek ${category.label} moment`
          : `viral funny ${category.label} moment`
        : "warm cosmetic dentistry confidence moment",
  ]
    .filter(Boolean)
    .join(" — ");

  const prompt = viralUnbranded
    ? [
        tone === "random_edgy"
          ? "Create a short, tongue-in-cheek Instagram Reels / TikTok-style humor clip with a little more attitude — shareable and bold, not mean."
          : "Create a short, casually funny Instagram Reels / TikTok-style humor clip people would like and share.",
        `Target clip length: about ${apiDuration} seconds (scroll-stopping social pace).`,
        viralTopicLine,
        "Do not show clinic names, doctor names, logos, addresses, or branded signage.",
        tone === "random_edgy"
          ? "Motion: sharper expressions, dry smirk energy, punchy timing — still tasteful."
          : "Motion: expressive, personality-forward micro-reactions that feel meme-ready; keep it light.",
        `Tone / energy: ${TONE_MOTION[tone]}`,
        "No surgical gore, no needles in focus, no mocking of appearance or dental fear.",
        "Photorealistic people only if present in the source frame; not a real identifiable patient.",
        notes ? `Creative direction (do not render as on-screen text): ${notes}` : "",
        "CRITICAL: no on-screen text, slogans, captions, headlines, logos, watermarks, or burned-in typography in the video.",
        "Photo/motion only — spoken humor is added separately, not burned into the clip.",
        "Vertical or square social framing. Optimize for likes and shares, not polish-ad seriousness.",
      ]
        .filter(Boolean)
        .join(" ")
    : [
        "Create a short, tasteful Instagram Reels / Facebook video for cosmetic dentistry marketing.",
        `Target clip length: about ${apiDuration} seconds (social Reels / Stories pace).`,
        `Service focus: ${category.label} with Dr. Elizabeth Peeling at Clinique LE 32, Vaudreuil-Dorion.`,
        "Motion: slow cinematic camera move, soft natural lighting, authentic confident smile energy.",
        `Tone / energy: ${TONE_MOTION[tone]}`,
        "Keep motion subtle and premium — no rapid cuts, no surgical gore, no needles in focus.",
        "Photorealistic people only if present in the source frame; not a real identifiable patient.",
        notes ? `Creative direction (do not render as on-screen text): ${notes}` : "",
        "CRITICAL: no on-screen text, slogans, captions, headlines, logos, watermarks, or burned-in typography in the video.",
        "Photo/motion only — captions and spoken script are added separately, not in the clip.",
        "Vertical or square social framing. High engagement, calm professionalism.",
      ]
        .filter(Boolean)
        .join(" ");

  return {
    prompt: prompt.slice(0, 2000),
    summary: `AI video · ${category.label} · ${tone} · ${apiDuration}s · Higgsfield`,
    captionTheme,
  };
}

async function createUploadUrl(contentType: string): Promise<{
  public_url: string;
  upload_url: string;
  upload_headers: Record<string, string>;
}> {
  const res = await fetch(`${HF_BASE}/files/generate-upload-url`, {
    method: "POST",
    headers: hfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ content_type: contentType }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Higgsfield upload URL failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return (await res.json()) as {
    public_url: string;
    upload_url: string;
    upload_headers: Record<string, string>;
  };
}

async function uploadBytes(
  bytes: Uint8Array,
  contentType: string
): Promise<string> {
  const upload = await createUploadUrl(contentType);
  const headers = new Headers();
  for (const [k, v] of Object.entries(upload.upload_headers || {})) {
    headers.set(k, v);
  }
  if (!headers.has("Content-Type")) headers.set("Content-Type", contentType);

  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const put = await fetch(upload.upload_url, {
    method: "PUT",
    headers,
    body: copy,
  });
  if (!put.ok) {
    const text = await put.text();
    throw new Error(`Higgsfield file upload failed (${put.status}): ${text.slice(0, 300)}`);
  }
  return upload.public_url;
}

type HfStatus = {
  status: string;
  request_id?: string;
  status_url?: string;
  video?: { url?: string };
  videos?: { url?: string }[];
  images?: { url?: string }[];
  error?: string;
  detail?: string;
};

function formatHiggsfieldSubmitError(status: number, body: string): string {
  const snippet = body.slice(0, 400);
  let detail = "";
  try {
    const parsed = JSON.parse(body) as { detail?: unknown; error?: unknown };
    if (typeof parsed.detail === "string") detail = parsed.detail;
    else if (typeof parsed.error === "string") detail = parsed.error;
  } catch {
    /* plain text body */
  }

  if (
    detail === "not_enough_credits" ||
    /not_enough_credits/i.test(snippet)
  ) {
    return "Higgsfield has no credits left on this API account. Add credits at https://cloud.higgsfield.ai/ then try Generate video again. (A motion prompt was also copied for manual generate if you prefer.)";
  }

  return `Higgsfield video submit failed (${status}): ${snippet}`;
}

function extractVideoUrl(status: HfStatus): string | undefined {
  if (status.video?.url) return status.video.url;
  if (status.videos?.[0]?.url) return status.videos[0].url;
  const anyStatus = status as Record<string, unknown>;
  if (typeof anyStatus.video_url === "string") return anyStatus.video_url;
  const output = anyStatus.output;
  if (typeof output === "string" && /\.mp4(\?|$)/i.test(output)) return output;
  if (output && typeof output === "object") {
    const o = output as Record<string, unknown>;
    if (typeof o.url === "string") return o.url;
    if (typeof o.video_url === "string") return o.video_url;
  }
  return undefined;
}

/** Stay under the 300s route cap so we return JSON instead of a Vercel 504. */
export const HIGGSFIELD_POLL_MAX_WAIT_MS = 240_000;

async function pollUntilDone(
  statusUrl: string,
  options?: { maxWaitMs?: number; requestId?: string }
): Promise<HfStatus> {
  const maxWaitMs = options?.maxWaitMs ?? HIGGSFIELD_POLL_MAX_WAIT_MS;
  const start = Date.now();
  // Check soon after submit — jobs sometimes finish faster than the old 2.5s first wait.
  let delay = 1200;
  let lastRequestId = options?.requestId?.trim() || undefined;
  let lastStatus = "queued";

  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(statusUrl, {
      headers: hfHeaders(),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Higgsfield status failed (${res.status}): ${text.slice(0, 300)}`);
    }
    const data = (await res.json()) as HfStatus;
    if (data.request_id) lastRequestId = data.request_id;
    if (data.status) lastStatus = data.status;

    if (data.status === "completed") return data;
    if (
      data.status === "failed" ||
      data.status === "nsfw" ||
      data.status === "canceled"
    ) {
      const reason = (data.error || data.detail || "").trim();
      const idPart = lastRequestId ? ` (request ${lastRequestId})` : "";
      if (data.status === "nsfw") {
        throw new Error(
          `Higgsfield blocked this still as unsafe${idPart}. Use a different photo-only still (no overlay text) and try again.`
        );
      }
      if (!reason || /^generation failed$/i.test(reason)) {
        throw new Error(
          `Higgsfield could not finish this clip${idPart}. Common causes: temporary DoP outage, a still that is hard to animate, or a prompt it rejects. Try Generate video again, or pick a clearer face/shoulders still.`
        );
      }
      throw new Error(`Higgsfield generation ${data.status}: ${reason}${idPart}`);
    }
    await new Promise((r) => setTimeout(r, delay));
    // Gentle backoff; keep polling for the full window (do not give up early).
    delay = Math.min(delay + 800, 10_000);
  }

  const waitedMin = Math.round(maxWaitMs / 60_000);
  const idPart = lastRequestId ? ` request_id=${lastRequestId}` : "";
  throw new Error(
    `Higgsfield video generation timed out after ~${waitedMin} minutes (last status: ${lastStatus}).${idPart} status_url=${statusUrl} — Check the job in Higgsfield Cloud or retry; DoP can take 3–8+ minutes.`
  );
}

export function statusUrlForRequestId(requestId: string): string {
  return `${HF_BASE}/requests/${requestId.trim()}/status`;
}

/**
 * Upload still + queue DoP. Returns immediately (no long poll) so Vercel Hobby
 * does not kill the request while Higgsfield renders.
 */
export async function startStudioVideoJob(params: {
  imageBytes: Uint8Array;
  imageMimeType: string;
  categoryId: StudioCategoryId;
  notes?: string;
  /** When set, used as the DoP prompt instead of the built motion template. */
  promptOverride?: string;
  tone?: StudioVideoTone;
  duration?: StudioVideoDuration;
}): Promise<{
  requestId: string;
  statusUrl: string;
  promptSummary: string;
  captionTheme: string;
  motionPrompt: string;
  model: string;
  provider: "higgsfield";
  duration: number;
}> {
  if (!isHiggsfieldConfigured()) {
    throw new Error(
      "Higgsfield is not configured. Set HIGGSFIELD_API_KEY_ID and HIGGSFIELD_API_KEY_SECRET."
    );
  }

  const duration = params.duration ?? 5;
  const apiDuration = mapStudioVideoDurationToApi(duration);

  const built = buildVideoMotionPrompt({
    categoryId: params.categoryId,
    notes: params.notes,
    tone: params.tone,
    duration,
  });
  const prompt = (params.promptOverride?.trim() || built.prompt).slice(0, 1200);

  const mime = params.imageMimeType || "image/png";
  const imageUrl = await uploadBytes(params.imageBytes, mime);
  const model = videoModel();

  const submit = await fetch(`${HF_BASE}/${model}`, {
    method: "POST",
    headers: hfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      image_url: imageUrl,
      prompt,
      enhance_prompt: true,
      duration: apiDuration,
    }),
  });

  if (!submit.ok) {
    const text = await submit.text();
    throw new Error(formatHiggsfieldSubmitError(submit.status, text));
  }

  const queued = (await submit.json()) as HfStatus;
  const requestId = queued.request_id?.trim() || "";
  const statusUrl =
    queued.status_url ||
    (requestId ? statusUrlForRequestId(requestId) : "");
  if (!statusUrl || !requestId) {
    throw new Error("Higgsfield did not return a request id / status URL");
  }

  return {
    requestId,
    statusUrl,
    promptSummary: built.summary,
    captionTheme: built.captionTheme,
    motionPrompt: prompt,
    model,
    provider: "higgsfield",
    duration: apiDuration,
  };
}

export type StudioVideoJobStatus = {
  status: string;
  requestId?: string;
  error?: string;
  videoUrl?: string;
};

/** Single status check — for client-driven polling. */
export async function getStudioVideoJobStatus(
  requestId: string
): Promise<StudioVideoJobStatus> {
  if (!isHiggsfieldConfigured()) {
    throw new Error(
      "Higgsfield is not configured. Set HIGGSFIELD_API_KEY_ID and HIGGSFIELD_API_KEY_SECRET."
    );
  }
  const id = requestId.trim();
  if (!id) throw new Error("Missing requestId");

  const statusUrl = statusUrlForRequestId(id);
  const res = await fetch(statusUrl, { headers: hfHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Higgsfield status failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as HfStatus;
  const status = data.status || "unknown";
  const videoUrl = extractVideoUrl(data);

  if (status === "nsfw") {
    return {
      status,
      requestId: data.request_id || id,
      error:
        "Higgsfield blocked this still as unsafe. Use a different photo-only still (no overlay text) and try again.",
    };
  }
  if (status === "failed" || status === "canceled") {
    const reason = (data.error || data.detail || "").trim();
    return {
      status,
      requestId: data.request_id || id,
      error:
        !reason || /^generation failed$/i.test(reason)
          ? "Higgsfield could not finish this clip. Try a clearer face/shoulders still, or retry."
          : reason,
    };
  }

  return {
    status,
    requestId: data.request_id || id,
    videoUrl,
  };
}

/**
 * Open the finished MP4 as a stream. Streaming (not buffering) keeps clips over
 * the ~6MB serverless response payload limit working; a 5s DoP clip is often 6MB+.
 */
export async function openStudioVideoStream(requestId: string): Promise<{
  body: ReadableStream<Uint8Array>;
  mimeType: string;
  contentLength?: string;
  requestId: string;
  videoUrl: string;
}> {
  const job = await getStudioVideoJobStatus(requestId);
  if (job.status !== "completed") {
    throw new Error(
      job.error ||
        `Video is not ready yet (status: ${job.status}). Keep polling, then fetch again.`
    );
  }
  if (!job.videoUrl) {
    throw new Error("Higgsfield completed but returned no video URL");
  }

  const videoRes = await fetch(job.videoUrl);
  if (!videoRes.ok || !videoRes.body) {
    throw new Error(`Failed to download Higgsfield video (${videoRes.status})`);
  }

  return {
    body: videoRes.body,
    mimeType:
      videoRes.headers.get("content-type")?.split(";")[0]?.trim() ||
      "video/mp4",
    contentLength: videoRes.headers.get("content-length") ?? undefined,
    requestId: job.requestId || requestId.trim(),
    videoUrl: job.videoUrl,
  };
}

/** When job is completed, download the MP4 bytes (server-side use). */
export async function fetchStudioVideoResult(requestId: string): Promise<{
  bytes: Buffer;
  mimeType: string;
  requestId: string;
}> {
  const job = await getStudioVideoJobStatus(requestId);
  if (job.status !== "completed") {
    throw new Error(
      job.error ||
        `Video is not ready yet (status: ${job.status}). Keep polling, then fetch again.`
    );
  }
  if (!job.videoUrl) {
    throw new Error("Higgsfield completed but returned no video URL");
  }

  const videoRes = await fetch(job.videoUrl);
  if (!videoRes.ok) {
    throw new Error(`Failed to download Higgsfield video (${videoRes.status})`);
  }
  const buf = Buffer.from(await videoRes.arrayBuffer());
  const outMime =
    videoRes.headers.get("content-type")?.split(";")[0]?.trim() || "video/mp4";

  return {
    bytes: buf,
    mimeType: outMime,
    requestId: job.requestId || requestId.trim(),
  };
}

export async function generateStudioVideoFromImage(params: {
  imageBytes: Uint8Array;
  imageMimeType: string;
  categoryId: StudioCategoryId;
  notes?: string;
  tone?: StudioVideoTone;
  duration?: StudioVideoDuration;
}): Promise<{
  bytes: Buffer;
  mimeType: string;
  promptSummary: string;
  captionTheme: string;
  motionPrompt: string;
  model: string;
  provider: "higgsfield";
  duration: number;
}> {
  const started = await startStudioVideoJob(params);
  const done = await pollUntilDone(started.statusUrl, {
    requestId: started.requestId,
  });
  const videoUrl = extractVideoUrl(done);
  if (!videoUrl) {
    throw new Error("Higgsfield completed but returned no video URL");
  }

  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) {
    throw new Error(`Failed to download Higgsfield video (${videoRes.status})`);
  }
  const buf = Buffer.from(await videoRes.arrayBuffer());
  const outMime =
    videoRes.headers.get("content-type")?.split(";")[0]?.trim() || "video/mp4";

  return {
    bytes: buf,
    mimeType: outMime,
    promptSummary: started.promptSummary,
    captionTheme: started.captionTheme,
    motionPrompt: started.motionPrompt,
    model: started.model,
    provider: "higgsfield",
    duration: started.duration,
  };
}

export const HIGGSFIELD_WEB_URL = "https://higgsfield.ai/";
export const HIGGSFIELD_CLOUD_URL = "https://cloud.higgsfield.ai/";
