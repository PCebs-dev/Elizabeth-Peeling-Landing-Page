import { NextResponse, type NextRequest } from "next/server";
import { verifyStudioSessionValue, STUDIO_COOKIE } from "@/lib/studio/auth";
import {
  deleteStoredMedia,
  listStoredMedia,
  saveStoredMedia,
  mediaStorageMode,
} from "@/lib/studio/media-server";
import type { MediaKind } from "@/lib/studio/media-types";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function parseKind(value: FormDataEntryValue | null): MediaKind {
  return value === "before-after" ? "before-after" : "photo";
}

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(STUDIO_COOKIE)?.value;
  if (!(await verifyStudioSessionValue(cookie))) return unauthorized();

  const items = await listStoredMedia();
  return NextResponse.json({
    items: items.map((record) => ({
      id: record.id,
      name: record.name,
      url: record.url,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      kind: record.kind,
      enhancementPrompt: record.enhancementPrompt,
      sourceId: record.sourceId,
      beforeId: record.beforeId,
      afterId: record.afterId,
    })),
    storage: mediaStorageMode(),
  });
}

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get(STUDIO_COOKIE)?.value;
  if (!(await verifyStudioSessionValue(cookie))) return unauthorized();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart form data with an image file" },
      { status: 400 },
    );
  }

  const image = form.get("image");
  if (!(image instanceof Blob) || image.size === 0) {
    return NextResponse.json({ error: "Image file is required" }, { status: 400 });
  }

  const id =
    String(form.get("id") ?? "").trim() ||
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `media_${Date.now()}`);

  const buffer = Buffer.from(await image.arrayBuffer());
  const record = await saveStoredMedia({
    id,
    name: String(form.get("name") ?? "Photo").trim() || "Photo",
    kind: parseKind(form.get("kind")),
    buffer,
    contentType: image.type || "image/jpeg",
    enhancementPrompt: String(form.get("enhancementPrompt") ?? "").trim() || undefined,
    sourceId: String(form.get("sourceId") ?? "").trim() || undefined,
    beforeId: String(form.get("beforeId") ?? "").trim() || undefined,
    afterId: String(form.get("afterId") ?? "").trim() || undefined,
  });

  const { storage: _storage, contentType: mediaType, ...item } = record;
  void _storage;
  void mediaType;
  return NextResponse.json({ item });
}

export async function DELETE(request: NextRequest) {
  const cookie = request.cookies.get(STUDIO_COOKIE)?.value;
  if (!(await verifyStudioSessionValue(cookie))) return unauthorized();

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const removed = await deleteStoredMedia(id);
  if (!removed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
