import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STUDIO_COOKIE, verifySessionToken } from "@/lib/studio/auth";
import { auditAndRepairOdqCopy } from "@/lib/studio/odq-verify";
import type { GeneratedAdCopy } from "@/lib/studio/types";

function isCopy(v: unknown): v is GeneratedAdCopy {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.headline === "string" && typeof o.caption === "string";
}

/**
 * Independent ODQ / Code de déontologie verifier.
 * POST { ad, notes? } → repaired ad + issues (no model).
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDIO_COOKIE)?.value;
  if (!(await verifySessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  if (!isCopy(b.ad)) {
    return NextResponse.json({ error: "Missing ad.headline/ad.caption" }, { status: 400 });
  }
  const notes = typeof b.notes === "string" ? b.notes.slice(0, 4000) : "";
  const audit = auditAndRepairOdqCopy(b.ad, notes);
  return NextResponse.json({
    ok: audit.ok,
    issues: audit.issues,
    repairs: audit.repairs,
    priceMode: audit.priceMode,
    ad: audit.ad,
  });
}
