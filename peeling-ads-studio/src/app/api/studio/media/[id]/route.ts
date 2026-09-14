import { NextResponse, type NextRequest } from "next/server";
import { verifyStudioSessionValue, STUDIO_COOKIE } from "@/lib/studio/auth";
import { readStoredMediaFile } from "@/lib/studio/media-server";

function unauthorized() {
  return new NextResponse("Unauthorized", { status: 401 });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const cookie = request.cookies.get(STUDIO_COOKIE)?.value;
  if (!(await verifyStudioSessionValue(cookie))) return unauthorized();

  const { id } = await context.params;
  const file = await readStoredMediaFile(id);
  if (!file) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const cookie = request.cookies.get(STUDIO_COOKIE)?.value;
  if (!(await verifyStudioSessionValue(cookie))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const { deleteStoredMedia } = await import("@/lib/studio/media-server");
  const removed = await deleteStoredMedia(id);
  if (!removed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
