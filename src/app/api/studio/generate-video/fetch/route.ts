import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STUDIO_COOKIE, verifySessionToken } from "@/lib/studio/auth";
import {
  isHiggsfieldConfigured,
  openStudioVideoStream,
} from "@/lib/studio/generate-video";

export const runtime = "nodejs";
/** Streams an already-rendered clip — no Higgsfield wait, so this stays short. */
export const maxDuration = 120;

/**
 * POST /api/studio/generate-video/fetch
 * JSON: { requestId }
 * Streams raw video/mp4 when the job is complete. Streaming avoids the ~6MB
 * serverless response cap that buffering a full clip would hit.
 */
export async function POST(request: Request) {
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

  let requestId = "";
  try {
    const body = (await request.json()) as { requestId?: unknown };
    requestId =
      typeof body.requestId === "string" ? body.requestId.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!requestId) {
    return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
  }

  try {
    const result = await openStudioVideoStream(requestId);
    const headers = new Headers({
      "Content-Type": result.mimeType || "video/mp4",
      "Content-Disposition": `inline; filename="studio-video-${requestId.slice(0, 8)}.mp4"`,
      "X-Studio-Request-Id": result.requestId,
      "X-Studio-Video-Url": result.videoUrl,
      "Cache-Control": "no-store",
    });
    // Deliberately no Content-Length: chunked transfer can't mismatch the
    // proxied byte count, so a clip can never arrive truncated.
    return new NextResponse(result.body, { status: 200, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    const notReady = /not ready yet/i.test(message);
    return NextResponse.json(
      { error: message },
      { status: notReady ? 409 : 502 }
    );
  }
}
