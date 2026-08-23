import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STUDIO_COOKIE, verifySessionToken } from "@/lib/studio/auth";
import { STUDIO_CATEGORIES } from "@/lib/studio/categories";
import {
  generateVideoScript,
  type VideoSpokenLanguage,
} from "@/lib/studio/generate-video-script";
import {
  isStudioVideoTone,
  parseStudioVideoDuration,
  type StudioCategoryId,
  type StudioVideoTone,
} from "@/lib/studio/types";

export const runtime = "nodejs";

const CATEGORY_IDS = new Set(STUDIO_CATEGORIES.map((c) => c.id));

function isCategoryId(v: unknown): v is StudioCategoryId {
  return typeof v === "string" && CATEGORY_IDS.has(v as StudioCategoryId);
}

function parseSpokenLanguage(v: unknown): VideoSpokenLanguage {
  return v === "fr" ? "fr" : "en";
}

/**
 * POST /api/studio/generate-video-script
 * { categoryId, notes?, tone, language?: "en"|"fr", duration?, avoidScripts? }
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDIO_COOKIE)?.value;
  if (!(await verifySessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  if (!isCategoryId(b.categoryId)) {
    return NextResponse.json({ error: "Invalid categoryId" }, { status: 400 });
  }
  if (!isStudioVideoTone(b.tone)) {
    return NextResponse.json({ error: "Invalid tone" }, { status: 400 });
  }
  if (
    b.language !== undefined &&
    b.language !== "en" &&
    b.language !== "fr"
  ) {
    return NextResponse.json(
      { error: "Invalid language — use en or fr for spoken video script" },
      { status: 400 }
    );
  }

  const notes = typeof b.notes === "string" ? b.notes.slice(0, 2000) : "";
  const duration = parseStudioVideoDuration(b.duration);
  const avoidScripts = Array.isArray(b.avoidScripts)
    ? b.avoidScripts
        .filter((x): x is string => typeof x === "string")
        .slice(0, 8)
    : [];

  try {
    const result = await generateVideoScript({
      categoryId: b.categoryId,
      notes,
      tone: b.tone as StudioVideoTone,
      language: parseSpokenLanguage(b.language),
      duration,
      avoidScripts,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Script generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
