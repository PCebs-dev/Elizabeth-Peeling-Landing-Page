import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STUDIO_COOKIE, verifySessionToken } from "@/lib/studio/auth";
import { mergeBeforeAfterImages } from "@/lib/studio/merge-before-after";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDIO_COOKIE)?.value;
  if (!(await verifySessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const image = form.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json(
      { error: "Merged image is required" },
      { status: 400 }
    );
  }
  if (!image.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }
  if (image.size > 12 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Image must be under 12MB" },
      { status: 400 }
    );
  }

  const enhanceRaw = form.get("enhance");
  const enhance =
    typeof enhanceRaw === "string" &&
    ["true", "1", "on", "yes"].includes(enhanceRaw.trim().toLowerCase());

  try {
    const result = await mergeBeforeAfterImages({
      composite: {
        bytes: new Uint8Array(await image.arrayBuffer()),
        mimeType: image.type || "image/png",
        filename: image.name || "before-after.png",
      },
      enhance,
    });

    return NextResponse.json({
      imageBase64: result.base64,
      mimeType: result.mimeType,
      provider: result.provider,
      model: result.model,
      enhance: result.enhance,
      promptSummary: "Before and After as two separate photos on one still",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Before/after merge failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
