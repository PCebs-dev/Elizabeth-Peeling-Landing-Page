import { NextResponse } from "next/server";
import { isStudioAuthenticated } from "@/lib/studio/auth";
import {
  discardSavedAd,
  listSavedAds,
  toSavedAdSummary,
  updateSavedAd,
} from "@/lib/studio/saved-ads";

export async function GET() {
  if (!(await isStudioAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ads = listSavedAds().map(toSavedAdSummary);
  return NextResponse.json({ ads });
}

export async function PATCH(request: Request) {
  if (!(await isStudioAuthenticated())) {
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
  if (!(await isStudioAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  if (!discardSavedAd(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
