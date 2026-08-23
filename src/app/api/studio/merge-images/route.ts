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

  const before = form.get("before");
  const after = form.get("after");
  if (!(before instanceof File) || before.size === 0) {
    return NextResponse.json(
      { error: "Before image is required" },
      { status: 400 }
    );
  }
  if (!(after instanceof File) || after.size === 0) {
    return NextResponse.json(
      { error: "After image is required" },
      { status: 400 }
    );
  }
  if (!before.type.startsWith("image/") || !after.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Both files must be images" },
      { status: 400 }
    );
  }
  if (before.size > 12 * 1024 * 1024 || after.size > 12 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Each image must be under 12MB" },
      { status: 400 }
    );
  }

  const enhanceRaw = form.get("enhance");
  const enhance =
    typeof enhanceRaw === "string" &&
    ["true", "1", "on", "yes"].includes(enhanceRaw.trim().toLowerCase());

  try {
    const result = await mergeBeforeAfterImages({
      before: {
        bytes: new Uint8Array(await before.arrayBuffer()),
        mimeType: before.type || "image/png",
        filename: before.name || "before.png",
      },
      after: {
        bytes: new Uint8Array(await after.arrayBuffer()),
        mimeType: after.type || "image/png",
        filename: after.name || "after.png",
      },
      enhance,
    });

    return NextResponse.json({
      imageBase64: result.base64,
      mimeType: result.mimeType,
      provider: result.provider,
      model: result.model,
      enhance: result.enhance,
      promptSummary: result.enhance
        ? "Before/after merge with subtle skin & teeth polish"
        : "Before/after side-by-side merge",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Before/after merge failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
