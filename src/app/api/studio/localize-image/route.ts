import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STUDIO_COOKIE, verifySessionToken } from "@/lib/studio/auth";
import { localizeStudioImageText } from "@/lib/studio/generate-image";

export const runtime = "nodejs";
export const maxDuration = 90;

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

  const modeRaw = form.get("mode");
  const mode =
    typeof modeRaw === "string" && modeRaw.trim().toLowerCase() === "replace"
      ? "replace"
      : "translate";

  const textRaw = form.get("text");
  const text = typeof textRaw === "string" ? textRaw.trim() : "";
  if (mode === "replace" && !text) {
    return NextResponse.json(
      { error: "Overlay text is required for replace mode" },
      { status: 400 }
    );
  }

  const langRaw = form.get("language");
  const language =
    typeof langRaw === "string" && langRaw.trim().toLowerCase() === "en"
      ? "en"
      : "fr";

  const aspectRaw = form.get("aspect");
  const aspect = aspectRaw === "story" ? "story" : "square";

  const image = form.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "Image file is required" }, { status: 400 });
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

  try {
    const bytes = new Uint8Array(await image.arrayBuffer());
    const result = await localizeStudioImageText({
      bytes,
      mimeType: image.type || "image/png",
      filename: image.name || "creative.png",
      language,
      text: text || undefined,
      mode,
      aspect,
    });

    return NextResponse.json({
      imageBase64: result.base64,
      mimeType: result.mimeType,
      provider: result.provider,
      model: result.model,
      promptSummary:
        mode === "translate"
          ? `Translated on-image text to ${language.toUpperCase()}`
          : `Localized ${language.toUpperCase()} text on selected image`,
      warning: result.warning,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Image localization failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
