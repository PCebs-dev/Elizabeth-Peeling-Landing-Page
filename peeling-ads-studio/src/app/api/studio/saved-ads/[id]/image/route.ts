import { NextResponse } from "next/server";
import { isStudioAuthenticated } from "@/lib/studio/auth";
import { getSavedAd } from "@/lib/studio/saved-ads";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  if (!(await isStudioAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const ad = getSavedAd(id);
  if (!ad || ad.status === "discarded") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const wantFr =
    new URL(request.url).searchParams.get("lang")?.toLowerCase() === "fr";

  if (wantFr) {
    if (!ad.imageFrBase64) {
      return NextResponse.json(
        { error: "French image not found" },
        { status: 404 }
      );
    }
    const buffer = Buffer.from(ad.imageFrBase64, "base64");
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": ad.imageFrMimeType || "image/png",
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  if (!ad.imageBase64) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = Buffer.from(ad.imageBase64, "base64");
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": ad.imageMimeType || "image/png",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
