import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STUDIO_COOKIE, verifySessionToken } from "@/lib/studio/auth";
import {
  deleteCloudPhoto,
  hasBlobStorage,
  listCloudPhotos,
  patchCloudPhotoMeta,
  saveCloudPhoto,
  type CloudPhotoMeta,
} from "@/lib/studio/library-store";
import type { PhotoSource, StudioCategoryId, StudioMediaKind } from "@/lib/studio/types";

export const runtime = "nodejs";
export const maxDuration = 120;

async function requireSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDIO_COOKIE)?.value;
  return verifySessionToken(token);
}

export async function GET() {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasBlobStorage()) {
    return NextResponse.json({ enabled: false, items: [] });
  }
  const items = await listCloudPhotos();
  return NextResponse.json({ enabled: true, items });
}

export async function POST(request: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasBlobStorage()) {
    return NextResponse.json(
      { error: "Cloud storage is not configured on this deployment" },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart form data" },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 20MB" }, { status: 400 });
  }

  const id = String(form.get("id") ?? "").trim() || crypto.randomUUID();
  const categoryId = String(form.get("categoryId") ?? "invisalign").trim() as StudioCategoryId;
  const mimeType = file.type || "image/jpeg";
  const mediaKind: StudioMediaKind = mimeType.startsWith("video/")
    ? "video"
    : "image";
  const bytes = new Uint8Array(await file.arrayBuffer());

  const meta: Omit<CloudPhotoMeta, "fileUrl"> = {
    id,
    categoryId,
    name: String(form.get("name") ?? file.name ?? "media").trim() || "media",
    mimeType,
    mediaKind,
    note: String(form.get("note") ?? ""),
    createdAt: Number(form.get("createdAt")) || Date.now(),
    source: (String(form.get("source") ?? "upload") as PhotoSource) || "upload",
    promptSummary: String(form.get("promptSummary") ?? "") || undefined,
    galleryHidden: String(form.get("galleryHidden") ?? "") === "true",
    linkedFrPhotoId: String(form.get("linkedFrPhotoId") ?? "") || undefined,
    pairOfPhotoId: String(form.get("pairOfPhotoId") ?? "") || undefined,
    hasOnImageText: String(form.get("hasOnImageText") ?? "") === "true",
    enhancedFromId: String(form.get("enhancedFromId") ?? "") || undefined,
  };

  const item = await saveCloudPhoto({ meta, bytes });
  return NextResponse.json({ item, enabled: true });
}

export async function PATCH(request: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: Partial<CloudPhotoMeta> & { id?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const { id, ...patch } = body;
  const item = await patchCloudPhotoMeta(id, patch);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item });
}

export async function DELETE(request: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await deleteCloudPhoto(id);
  return NextResponse.json({ ok: true });
}
