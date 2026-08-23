import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STUDIO_COOKIE, verifySessionToken } from "@/lib/studio/auth";
import { retouchStudioImage } from "@/lib/studio/retouch-image";

export const runtime = "nodejs";
export const maxDuration = 120;

function stripDataUrl(value: string): string {
  const trimmed = value.trim();
  const comma = trimmed.indexOf(",");
  if (trimmed.startsWith("data:") && comma >= 0) {
    return trimmed.slice(comma + 1);
  }
  return trimmed;
}

function bytesFromBase64(value: string): Uint8Array {
  const buf = Buffer.from(stripDataUrl(value), "base64");
  return new Uint8Array(buf);
}

async function readRetouchInput(request: Request): Promise<{
  bytes: Uint8Array;
  mimeType: string;
  filename: string;
  notes: string;
} | { error: string; status: number }> {
  const contentType = (request.headers.get("content-type") || "").toLowerCase();

  if (contentType.includes("application/json")) {
    let body: Record<string, unknown>;
    try {
      const parsed = await request.json();
      if (!parsed || typeof parsed !== "object") {
        return { error: "Invalid JSON body", status: 400 };
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return { error: "Invalid JSON body", status: 400 };
    }

    const raw =
      (typeof body.imageBase64 === "string" && body.imageBase64) ||
      (typeof body.base64 === "string" && body.base64) ||
      "";
    if (!raw.trim()) {
      return { error: "Image is required", status: 400 };
    }
    const bytes = bytesFromBase64(raw);
    if (bytes.byteLength === 0) {
      return { error: "Image is required", status: 400 };
    }
    if (bytes.byteLength > 12 * 1024 * 1024) {
      return { error: "Image must be under 12MB", status: 400 };
    }
    const mimeType =
      typeof body.mimeType === "string" && body.mimeType.startsWith("image/")
        ? body.mimeType
        : "image/png";
    const filename =
      typeof body.filename === "string" && body.filename.trim()
        ? body.filename.trim()
        : "photo.png";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    return { bytes, mimeType, filename, notes };
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return {
      error:
        "Could not read image body. Send JSON { imageBase64, mimeType, notes } or multipart form data.",
      status: 400,
    };
  }

  const image = form.get("image");
  if (!(image instanceof Blob) || image.size === 0) {
    return { error: "Image is required", status: 400 };
  }
  const mimeType = image.type || "image/png";
  if (!mimeType.startsWith("image/")) {
    return { error: "File must be an image", status: 400 };
  }
  if (image.size > 12 * 1024 * 1024) {
    return { error: "Image must be under 12MB", status: 400 };
  }

  const notesRaw = form.get("notes");
  const notes = typeof notesRaw === "string" ? notesRaw.trim() : "";
  const filename =
    image instanceof File && image.name ? image.name : "photo.png";

  return {
    bytes: new Uint8Array(await image.arrayBuffer()),
    mimeType,
    filename,
    notes,
  };
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDIO_COOKIE)?.value;
  if (!(await verifySessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const input = await readRetouchInput(request);
  if ("error" in input) {
    return NextResponse.json({ error: input.error }, { status: input.status });
  }

  try {
    const result = await retouchStudioImage({
      bytes: input.bytes,
      mimeType: input.mimeType,
      filename: input.filename,
      notes: input.notes,
    });
    return NextResponse.json({
      imageBase64: result.base64,
      mimeType: result.mimeType,
      model: result.model,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Retouch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
