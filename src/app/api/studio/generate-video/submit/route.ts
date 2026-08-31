import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STUDIO_COOKIE, verifySessionToken } from "@/lib/studio/auth";
import { STUDIO_CATEGORIES } from "@/lib/studio/categories";
import {
  HIGGSFIELD_CLOUD_URL,
  HIGGSFIELD_WEB_URL,
  isHiggsfieldConfigured,
  startStudioVideoJob,
} from "@/lib/studio/generate-video";
import {
  isStudioVideoTone,
  parseStudioVideoDuration,
  type StudioCategoryId,
  type StudioVideoDuration,
  type StudioVideoTone,
} from "@/lib/studio/types";

export const runtime = "nodejs";
/** Submit only — upload + queue. Keep short. */
export const maxDuration = 60;

const CATEGORY_IDS = new Set(STUDIO_CATEGORIES.map((c) => c.id));

function isCategoryId(v: unknown): v is StudioCategoryId {
  return typeof v === "string" && CATEGORY_IDS.has(v as StudioCategoryId);
}

/**
 * POST /api/studio/generate-video/submit
 * Multipart: image (required), categoryId, notes?, prompt?, tone?, duration?
 * Returns requestId immediately for client-side polling.
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDIO_COOKIE)?.value;
  if (!(await verifySessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isHiggsfieldConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error:
          "Higgsfield API keys are not set. Add HIGGSFIELD_API_KEY_ID and HIGGSFIELD_API_KEY_SECRET, or generate at Higgsfield Cloud.",
        higgsfieldUrl: HIGGSFIELD_WEB_URL,
        cloudUrl: HIGGSFIELD_CLOUD_URL,
      },
      { status: 503 }
    );
  }

  try {
    const form = await request.formData();
    const cat = form.get("categoryId");
    if (!isCategoryId(cat)) {
      return NextResponse.json({ error: "Invalid categoryId" }, { status: 400 });
    }
    const notes = String(form.get("notes") || "").slice(0, 2000);
    const promptOverride = String(form.get("prompt") || "").slice(0, 2000);
    const toneRaw = String(form.get("tone") || "warm");
    const tone: StudioVideoTone = isStudioVideoTone(toneRaw) ? toneRaw : "warm";
    const duration: StudioVideoDuration = parseStudioVideoDuration(
      form.get("duration")
    );

    const image = form.get("image");
    if (!(image instanceof File) || image.size === 0) {
      return NextResponse.json(
        { error: "A still image is required for video creation." },
        { status: 400 }
      );
    }
    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Source file must be an image for image-to-video." },
        { status: 400 }
      );
    }
    // Reject before touching Higgsfield so an oversized still cannot spend credits.
    if (image.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        {
          error:
            "Still is too large to upload. Use an image under 4MB (the studio normally shrinks it for you).",
        },
        { status: 413 }
      );
    }

    const imageBytes = new Uint8Array(await image.arrayBuffer());
    const started = await startStudioVideoJob({
      imageBytes,
      imageMimeType: image.type || "image/png",
      categoryId: cat,
      notes,
      promptOverride: promptOverride || undefined,
      tone,
      duration,
    });

    return NextResponse.json({
      configured: true,
      requestId: started.requestId,
      statusUrl: started.statusUrl,
      motionPrompt: started.motionPrompt,
      promptSummary: started.promptSummary,
      captionTheme: started.captionTheme,
      model: started.model,
      duration: started.duration,
      cloudUrl: HIGGSFIELD_CLOUD_URL,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Submit failed";
    return NextResponse.json(
      {
        error: message,
        cloudUrl: HIGGSFIELD_CLOUD_URL,
        higgsfieldUrl: HIGGSFIELD_WEB_URL,
      },
      { status: 502 }
    );
  }
}
