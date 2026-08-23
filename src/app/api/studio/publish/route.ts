import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STUDIO_COOKIE, verifySessionToken } from "@/lib/studio/auth";
import {
  metaConfigStatus,
  publishToSocial,
  publishToStories,
  type PublishPlatform,
} from "@/lib/studio/meta-publish";
import { stripHashtagsFromCaption } from "@/lib/studio/sanitize-copy";

type PublishPlacement = "post" | "story";

function parsePlacement(raw: unknown): PublishPlacement {
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return v === "story" ? "story" : "post";
}

export const runtime = "nodejs";
export const maxDuration = 60;

async function requireStudioAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDIO_COOKIE)?.value;
  return verifySessionToken(token);
}

export async function GET() {
  if (!(await requireStudioAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(metaConfigStatus());
}

function parsePlatforms(raw: unknown): PublishPlatform[] | { error: string } {
  let list: unknown[] = [];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      list = Array.isArray(parsed) ? parsed : [raw];
    } catch {
      list = raw.split(",").map((s) => s.trim());
    }
  } else if (Array.isArray(raw)) {
    list = raw;
  } else {
    return { error: "platforms is required" };
  }

  const platforms = list.filter(
    (p): p is PublishPlatform => p === "facebook" || p === "instagram"
  );
  if (platforms.length === 0) {
    return { error: "Select Facebook and/or Instagram" };
  }
  return platforms;
}

export async function POST(request: Request) {
  if (!(await requireStudioAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = metaConfigStatus();
  if (!status.configured) {
    return NextResponse.json(
      {
        error:
          "Meta publishing is not configured. Set META_PAGE_ID and META_PAGE_ACCESS_TOKEN in .env.local.",
        missing: status.missing,
      },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const placement = parsePlacement(form.get("placement"));

  const captionRaw = form.get("caption");
  const caption =
    typeof captionRaw === "string"
      ? stripHashtagsFromCaption(captionRaw)
      : "";
  if (placement === "post" && !caption) {
    return NextResponse.json({ error: "Caption is required" }, { status: 400 });
  }

  const platformsParsed = parsePlatforms(form.get("platforms"));
  if ("error" in platformsParsed) {
    return NextResponse.json({ error: platformsParsed.error }, { status: 400 });
  }

  if (
    platformsParsed.includes("instagram") &&
    !status.instagramReady
  ) {
    return NextResponse.json(
      {
        error:
          "Instagram is not configured. Set META_IG_USER_ID (Instagram Business Account ID).",
        missing: ["META_IG_USER_ID"],
      },
      { status: 503 }
    );
  }

  const image = form.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "Image file is required" }, { status: 400 });
  }
  if (!image.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }
  // Meta practical limit ~8MB for photo posts
  if (image.size > 8 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Image must be under 8MB for Meta publishing" },
      { status: 400 }
    );
  }

  const buffer = new Uint8Array(await image.arrayBuffer());
  const filename = image.name || "creative.jpg";
  const mimeType = image.type || "image/jpeg";

  try {
    const { results, errors } =
      placement === "story"
        ? await publishToStories({
            platforms: platformsParsed,
            bytes: buffer,
            mimeType,
            filename,
          })
        : await publishToSocial({
            platforms: platformsParsed,
            caption,
            bytes: buffer,
            mimeType,
            filename,
          });

    if (results.length === 0) {
      return NextResponse.json(
        {
          error: errors.map((e) => `${e.platform}: ${e.error}`).join(" · ") ||
            "Publish failed",
          errors,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      placement,
      results,
      errors: errors.length ? errors : undefined,
      warning:
        errors.length > 0
          ? `Partial success. ${errors.map((e) => `${e.platform}: ${e.error}`).join(" · ")}`
          : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
