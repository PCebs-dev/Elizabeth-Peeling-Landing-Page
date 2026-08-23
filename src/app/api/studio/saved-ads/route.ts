import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STUDIO_COOKIE, verifySessionToken } from "@/lib/studio/auth";
import {
  discardSavedAd,
  listSavedAds,
  saveAd,
  toSavedAdSummary,
  updateSavedAd,
} from "@/lib/studio/saved-ads";
import type { SavedStudioAd } from "@/lib/studio/saved-types";
import {
  fetchSavedAdsCloud,
  mergeSavedAds,
} from "@/lib/studio/saved-ads-cloud";

async function requireSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDIO_COOKIE)?.value;
  return verifySessionToken(token);
}

export async function GET() {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ads = mergeSavedAds(listSavedAds(), await fetchSavedAdsCloud()).map(
    toSavedAdSummary
  );
  return NextResponse.json({ ads });
}

export async function POST(request: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SavedStudioAd;
  try {
    body = (await request.json()) as SavedStudioAd;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.id || typeof body.id !== "string" || !body.headline) {
    return NextResponse.json(
      { error: "id and headline are required" },
      { status: 400 }
    );
  }

  const saved = saveAd({
    ...body,
    source: body.source === "calendar" ? "calendar" : "manual",
    status: "ready",
    createdAt: body.createdAt || Date.now(),
    imageMimeType: body.imageMimeType || "image/jpeg",
    imageBase64: body.imageBase64 || "",
  });

  return NextResponse.json({ ad: toSavedAdSummary(saved) });
}

export async function PATCH(request: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: string; favorite?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const updated = updateSavedAd(body.id, {
    favorite: body.favorite === true,
  });
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ad: toSavedAdSummary(updated) });
}

export async function DELETE(request: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  discardSavedAd(id);
  return NextResponse.json({ ok: true });
}
