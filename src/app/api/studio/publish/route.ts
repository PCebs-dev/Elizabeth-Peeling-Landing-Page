import { NextResponse, type NextRequest } from "next/server";
import { verifyStudioSessionValue, STUDIO_COOKIE } from "@/lib/studio/auth";
import { publishCreative } from "@/lib/studio/social";
import type { PublishPlatform, PublishResult, StudioFormat } from "@/lib/studio/types";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function asPlatform(value: FormDataEntryValue | null): PublishPlatform | null {
  if (value === "facebook" || value === "instagram") return value;
  return null;
}

function asFormat(value: FormDataEntryValue | null): StudioFormat {
  return value === "story" ? "story" : "post";
}

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get(STUDIO_COOKIE)?.value;
  if (!(await verifyStudioSessionValue(cookie))) return unauthorized();

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return badRequest("Expected multipart form data");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("Could not parse multipart form data");
  }

  const platform = asPlatform(form.get("platform"));
  if (!platform) {
    return badRequest("Missing or invalid platform (facebook | instagram)");
  }

  const caption = String(form.get("caption") ?? "").trim();
  if (!caption) {
    return badRequest("Caption is required");
  }

  const format = asFormat(form.get("format"));
  const imageEntry = form.get("image") ?? form.get("images");
  if (!(imageEntry instanceof Blob) || imageEntry.size === 0) {
    return badRequest("Image file is required");
  }

  const result = await publishCreative({
    platform,
    image: imageEntry,
    caption,
    format,
  });

  const payload: PublishResult = {
    platform,
    ok: result.ok,
    message: result.ok
      ? result.message
      : `Not sent to ${platform === "facebook" ? "Facebook" : "Instagram"}. ${result.message}`,
    postId: result.postId,
  };

  return NextResponse.json(payload, { status: result.ok ? 200 : 502 });
}
