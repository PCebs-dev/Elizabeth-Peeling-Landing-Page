import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STUDIO_COOKIE, verifySessionToken } from "@/lib/studio/auth";
import { getSavedAd } from "@/lib/studio/saved-ads";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDIO_COOKIE)?.value;
  if (!(await verifySessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const ad = getSavedAd(id);
  if (!ad || ad.status === "discarded") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { imageBase64: _omit, imageFrBase64: _omitFr, ...rest } = ad;
  return NextResponse.json({
    ad: {
      ...rest,
      hasImage: Boolean(ad.imageBase64),
      hasImageFr: Boolean(ad.imageFrBase64),
      imageUrl: `/api/studio/saved-ads/${ad.id}/image`,
      imageFrUrl: ad.imageFrBase64
        ? `/api/studio/saved-ads/${ad.id}/image?lang=fr`
        : undefined,
    },
  });
}
