import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  STUDIO_COOKIE,
  verifySessionToken,
} from "@/lib/studio/auth";
import { STUDIO_CATEGORIES } from "@/lib/studio/categories";
import { generateAdCopy } from "@/lib/studio/generate-copy";
import type {
  GenerateRequest,
  StudioCategoryId,
  StudioChannel,
  StudioLanguage,
} from "@/lib/studio/types";

const CATEGORY_IDS = new Set(STUDIO_CATEGORIES.map((c) => c.id));

function isCategoryId(v: unknown): v is StudioCategoryId {
  return typeof v === "string" && CATEGORY_IDS.has(v as StudioCategoryId);
}

function parseRequest(body: unknown): GenerateRequest | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid body" };
  const b = body as Record<string, unknown>;

  if (!isCategoryId(b.categoryId)) return { error: "Invalid categoryId" };

  const language = b.language as StudioLanguage;
  if (language !== "en" && language !== "fr" && language !== "both") {
    return { error: "Invalid language" };
  }

  const channel = b.channel as StudioChannel;
  if (channel !== "organic" && channel !== "paid") {
    return { error: "Invalid channel" };
  }

  const notes = typeof b.notes === "string" ? b.notes.slice(0, 2000) : "";
  const imageHints = Array.isArray(b.imageHints)
    ? b.imageHints.filter((x): x is string => typeof x === "string").slice(0, 12)
    : [];
  const avoidHeadlines = Array.isArray(b.avoidHeadlines)
    ? b.avoidHeadlines
        .filter((x): x is string => typeof x === "string")
        .slice(0, 20)
    : [];
  const avoidAngles = Array.isArray(b.avoidAngles)
    ? b.avoidAngles.filter((x): x is string => typeof x === "string").slice(0, 10)
    : [];

  return {
    categoryId: b.categoryId,
    notes,
    language,
    channel,
    imageHints,
    avoidHeadlines,
    avoidAngles,
  };
}

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

  const parsed = parseRequest(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await generateAdCopy(parsed);
    return NextResponse.json({
      ad: result.ad,
      angle: result.angle,
      warning: result.warning,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
