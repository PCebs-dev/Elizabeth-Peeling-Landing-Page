import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STUDIO_COOKIE, verifySessionToken } from "@/lib/studio/auth";
import { STUDIO_CATEGORIES } from "@/lib/studio/categories";
import { generateStudioImage } from "@/lib/studio/generate-image";
import { buildImagePrompt } from "@/lib/studio/image-prompt";
import {
  HIGGSFIELD_CLOUD_URL,
  HIGGSFIELD_WEB_URL,
  buildVideoMotionPrompt,
  generateStudioVideoFromImage,
  isHiggsfieldConfigured,
} from "@/lib/studio/generate-video";
import {
  ffmpegInstallHint,
  muxVoiceoverOntoVideo,
  resolveFfmpegPath,
} from "@/lib/studio/mux-audio";
import {
  generateSyncTalkingHead,
  isSyncLabsConfigured,
} from "@/lib/studio/sync-lipsync";
import {
  isOpenAiTtsConfigured,
  synthesizeStudioVoiceover,
} from "@/lib/studio/tts";
import { parseStudioTtsVoice, type StudioTtsVoiceId } from "@/lib/studio/tts-voices";
import {
  isStudioVideoTone,
  parseStudioVideoDuration,
  parseStudioVideoVoiceMode,
  type StudioCategoryId,
  type StudioVideoDuration,
  type StudioVideoTone,
  type StudioVideoVoiceMode,
  type SubjectMode,
} from "@/lib/studio/types";

export const runtime = "nodejs";
/** DoP + optional Sync Labs lip-sync can need 3–12+ minutes (Vercel Pro / Fluid up to 800s). */
export const maxDuration = 300;

const CATEGORY_IDS = new Set(STUDIO_CATEGORIES.map((c) => c.id));

function isCategoryId(v: unknown): v is StudioCategoryId {
  return typeof v === "string" && CATEGORY_IDS.has(v as StudioCategoryId);
}

function parseTone(raw: unknown): StudioVideoTone {
  return isStudioVideoTone(raw) ? raw : "warm";
}

function parseSpokenLanguage(raw: unknown): "en" | "fr" {
  return raw === "fr" ? "fr" : "en";
}

/**
 * POST /api/studio/generate-video
 * Multipart: optional image + categoryId, notes, subjectMode, tone, duration,
 *   voiceMode, script, spokenLanguage
 * Or JSON: same fields + imageBase64?, imageMimeType?
 *
 * Uses Higgsfield image-to-video. If no source image, generates a photo-only still
 * first, then animates it. Never burns on-image text into the video.
 *
 * voiceMode:
 * - silent (default): motion-only MP4
 * - v1_voiceover: OpenAI TTS + ffmpeg mux onto the silent clip
 * - v2_talking_head: OpenAI TTS + Sync Labs lip-sync onto the silent clip
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDIO_COOKIE)?.value;
  if (!(await verifySessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let categoryId: StudioCategoryId | null = null;
  let notes = "";
  let subjectMode: SubjectMode = "random";
  let tone: StudioVideoTone = "warm";
  let duration: StudioVideoDuration = 5;
  let voiceMode: StudioVideoVoiceMode = "silent";
  let script = "";
  let spokenLanguage: "en" | "fr" = "en";
  let ttsVoice: StudioTtsVoiceId = parseStudioTtsVoice(undefined);
  let imageBytes: Uint8Array | null = null;
  let imageMimeType = "image/png";

  const contentType = request.headers.get("content-type") || "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const cat = form.get("categoryId");
      if (!isCategoryId(cat)) {
        return NextResponse.json({ error: "Invalid categoryId" }, { status: 400 });
      }
      categoryId = cat;
      notes = String(form.get("notes") || "").slice(0, 2000);
      tone = parseTone(String(form.get("tone") || "warm"));
      duration = parseStudioVideoDuration(form.get("duration"));
      voiceMode = parseStudioVideoVoiceMode(String(form.get("voiceMode") || "silent"));
      script = String(form.get("script") || "").slice(0, 4096);
      spokenLanguage = parseSpokenLanguage(form.get("spokenLanguage"));
      ttsVoice = parseStudioTtsVoice(form.get("ttsVoice"));
      const sm = String(form.get("subjectMode") || "random");
      if (sm === "people" || sm === "service" || sm === "random") subjectMode = sm;

      const image = form.get("image");
      if (image instanceof File && image.size > 0) {
        if (!image.type.startsWith("image/")) {
          return NextResponse.json(
            { error: "Source file must be an image for image-to-video" },
            { status: 400 }
          );
        }
        imageBytes = new Uint8Array(await image.arrayBuffer());
        imageMimeType = image.type || "image/png";
      }
    } else {
      const body = (await request.json()) as Record<string, unknown>;
      if (!isCategoryId(body.categoryId)) {
        return NextResponse.json({ error: "Invalid categoryId" }, { status: 400 });
      }
      categoryId = body.categoryId;
      notes = typeof body.notes === "string" ? body.notes.slice(0, 2000) : "";
      tone = parseTone(body.tone);
      duration = parseStudioVideoDuration(body.duration);
      voiceMode = parseStudioVideoVoiceMode(body.voiceMode);
      script =
        typeof body.script === "string" ? body.script.slice(0, 4096) : "";
      spokenLanguage = parseSpokenLanguage(body.spokenLanguage);
      ttsVoice = parseStudioTtsVoice(body.ttsVoice);
      const sm = typeof body.subjectMode === "string" ? body.subjectMode : "random";
      if (sm === "people" || sm === "service" || sm === "random") subjectMode = sm;

      if (typeof body.imageBase64 === "string" && body.imageBase64.length > 100) {
        imageBytes = Buffer.from(body.imageBase64, "base64");
        imageMimeType =
          typeof body.imageMimeType === "string"
            ? body.imageMimeType
            : "image/png";
      }
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!categoryId) {
    return NextResponse.json({ error: "categoryId required" }, { status: 400 });
  }

  const needsSpokenAudio =
    voiceMode === "v1_voiceover" || voiceMode === "v2_talking_head";

  if (needsSpokenAudio) {
    if (!script.trim()) {
      return NextResponse.json(
        {
          error:
            voiceMode === "v2_talking_head"
              ? "V2 talking head requires a spoken script from video prep."
              : "V1 voiceover requires a spoken script from video prep.",
        },
        { status: 400 }
      );
    }
    if (!isOpenAiTtsConfigured()) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is required for spoken video. Add it to .env.local (same key as captions/images).",
        },
        { status: 503 }
      );
    }
  }

  const ffmpegWarm =
    voiceMode === "v1_voiceover" ? resolveFfmpegPath() : Promise.resolve(null);

  if (voiceMode === "v2_talking_head" && !isSyncLabsConfigured()) {
    return NextResponse.json(
      {
        error:
          "SYNC_API_KEY is required for V2 talking head. Add it to .env.local from https://sync.so/settings/api-keys",
        voiceMode,
        provider: "sync-labs",
      },
      { status: 503 }
    );
  }

  const brief = buildVideoMotionPrompt({
    categoryId,
    notes,
    tone,
    duration,
  });

  if (!isHiggsfieldConfigured()) {
    return NextResponse.json({
      configured: false,
      provider: "higgsfield",
      motionPrompt: brief.prompt,
      captionTheme: brief.captionTheme,
      promptSummary: brief.summary,
      higgsfieldUrl: HIGGSFIELD_WEB_URL,
      cloudUrl: HIGGSFIELD_CLOUD_URL,
      voiceMode,
      warning:
        "Higgsfield API keys are not set. Copy the motion prompt into Higgsfield (recommended for Reels/ads), download the MP4, then upload it to the media library — or add HIGGSFIELD_API_KEY_ID + HIGGSFIELD_API_KEY_SECRET to .env.local.",
    });
  }

  try {
    const warnings: string[] = [];

    if (!imageBytes) {
      const still = buildImagePrompt({
        categoryId,
        subjectMode,
        notes,
        aspect: "square",
      });
      const generated = await generateStudioImage(still.prompt, {
        aspect: "square",
      });
      imageBytes = Buffer.from(generated.base64, "base64");
      imageMimeType = generated.mimeType || "image/png";
      if (generated.warning) warnings.push(generated.warning);
      warnings.push(
        "Generated a photo-only still first, then animated it with Higgsfield (no on-video text)."
      );
    }

    // V1/V2: start TTS in parallel with Higgsfield motion (script already known).
    const videoPromise = generateStudioVideoFromImage({
      imageBytes,
      imageMimeType,
      categoryId,
      notes,
      tone,
      duration,
    });

    const ttsPromise = needsSpokenAudio
      ? synthesizeStudioVoiceover({
          script,
          language: spokenLanguage,
          voice: ttsVoice,
        })
      : null;

    let video;
    try {
      video = await videoPromise;
    } catch (err) {
      // Avoid unhandled rejection if TTS was racing the failed video job.
      if (ttsPromise) void ttsPromise.catch(() => undefined);
      throw err;
    }

    let outBytes = video.bytes;
    let outMime = video.mimeType || "video/mp4";
    let providerMeta: string = video.provider;
    let modelMeta: string = video.model;
    let voiceMeta = "";

    if (ttsPromise && voiceMode === "v1_voiceover") {
      const ffmpegPath = await ffmpegWarm;
      if (!ffmpegPath) {
        return NextResponse.json(
          { error: ffmpegInstallHint() },
          { status: 503 }
        );
      }
      const tts = await ttsPromise;
      outBytes = await muxVoiceoverOntoVideo({
        videoBytes: Buffer.from(video.bytes),
        audioBytes: tts.bytes,
      });
      voiceMeta = `v1_voiceover:${tts.model}:${tts.voice}`;
      warnings.push(
        "V1 voiceover muxed with OpenAI TTS (mouth won’t match motion)."
      );
    }

    if (ttsPromise && voiceMode === "v2_talking_head") {
      const tts = await ttsPromise;
      const synced = await generateSyncTalkingHead({
        videoBytes: video.bytes,
        audioBytes: tts.bytes,
        videoMimeType: video.mimeType || "video/mp4",
        audioMimeType: tts.mimeType || "audio/mpeg",
      });
      outBytes = synced.bytes;
      outMime = synced.mimeType || "video/mp4";
      providerMeta = `${video.provider}+${synced.provider}`;
      modelMeta = `${video.model}+${synced.model}`;
      voiceMeta = `v2_talking_head:${tts.model}:${tts.voice}:sync:${synced.generationId}`;
      warnings.push(
        "V2 talking head via Sync Labs lip-sync (OpenAI TTS + Higgsfield motion)."
      );
      if (synced.outputDuration) {
        warnings.push(`Sync output ~${synced.outputDuration.toFixed(1)}s.`);
      }
    }

    // Stream MP4 bytes — avoid multi‑MB base64 JSON that can crash/abort the browser fetch.
    const warningText = warnings.filter(Boolean).join(" ");
    const headers = new Headers({
      "Content-Type": outMime,
      "Cache-Control": "no-store",
      "X-Studio-Configured": "1",
      "X-Studio-Provider": providerMeta,
      "X-Studio-Model": modelMeta,
      "X-Studio-Duration": String(video.duration),
      "X-Studio-Voice-Mode": voiceMode,
      "X-Studio-Prompt-Summary": encodeURIComponent(video.promptSummary),
      "X-Studio-Caption-Theme": encodeURIComponent(video.captionTheme),
    });
    if (voiceMeta) {
      headers.set("X-Studio-Voice", encodeURIComponent(voiceMeta));
    }
    if (warningText) {
      headers.set("X-Studio-Warning", encodeURIComponent(warningText));
    }

    return new NextResponse(new Uint8Array(outBytes), {
      status: 200,
      headers,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Video generation failed";
    const requestIdMatch = /request_id=([^\s.]+)/i.exec(message);
    const statusUrlMatch = /status_url=(\S+)/i.exec(message);
    const isSyncErr = /sync labs/i.test(message);
    return NextResponse.json(
      {
        error: message,
        configured: true,
        provider: isSyncErr ? "sync-labs" : "higgsfield",
        voiceMode,
        motionPrompt: brief.prompt,
        captionTheme: brief.captionTheme,
        promptSummary: brief.summary,
        higgsfieldUrl: HIGGSFIELD_WEB_URL,
        cloudUrl: HIGGSFIELD_CLOUD_URL,
        ...(requestIdMatch?.[1] ? { requestId: requestIdMatch[1] } : {}),
        ...(statusUrlMatch?.[1] ? { statusUrl: statusUrlMatch[1] } : {}),
      },
      { status: 502 }
    );
  }
}
