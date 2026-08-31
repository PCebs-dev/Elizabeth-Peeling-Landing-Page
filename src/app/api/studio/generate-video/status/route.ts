import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STUDIO_COOKIE, verifySessionToken } from "@/lib/studio/auth";
import {
  getStudioVideoJobStatus,
  isHiggsfieldConfigured,
} from "@/lib/studio/generate-video";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/studio/generate-video/status?requestId=...
 */
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDIO_COOKIE)?.value;
  if (!(await verifySessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isHiggsfieldConfigured()) {
    return NextResponse.json(
      { error: "Higgsfield is not configured." },
      { status: 503 }
    );
  }

  const requestId = new URL(request.url).searchParams.get("requestId")?.trim();
  if (!requestId) {
    return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
  }

  try {
    const job = await getStudioVideoJobStatus(requestId);
    return NextResponse.json(job);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Status check failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
