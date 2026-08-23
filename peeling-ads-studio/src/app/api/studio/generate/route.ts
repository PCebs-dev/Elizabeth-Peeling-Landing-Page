import { NextResponse, type NextRequest } from "next/server";
import { verifyStudioSessionValue, STUDIO_COOKIE } from "@/lib/studio/auth";
import { generateCaption } from "@/lib/studio/caption";
import type { CaptionGenerateRequest } from "@/lib/studio/types";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get(STUDIO_COOKIE)?.value;
  if (!(await verifyStudioSessionValue(cookie))) return unauthorized();

  let body: CaptionGenerateRequest;
  try {
    body = (await request.json()) as CaptionGenerateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await generateCaption({
    language: body.language === "fr" ? "fr" : "en",
    format: body.format === "story" ? "story" : "post",
    topic: body.topic,
    cta: body.cta,
    imageHint: body.imageHint,
  });

  return NextResponse.json(result);
}
