import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STUDIO_COOKIE, verifySessionToken } from "@/lib/studio/auth";
import { ensureUpcomingThemes } from "@/lib/studio/upcoming-themes-store";
import { themesToCsv } from "@/lib/studio/upcoming-themes";

export const runtime = "nodejs";

async function requireSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDIO_COOKIE)?.value;
  return verifySessionToken(token);
}

/** GET — JSON schedule or ?format=csv spreadsheet download */
export async function GET(request: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = ensureUpcomingThemes();
  const upcomingThemes = data.themes.filter(
    (t) => t.date >= data.meta.horizonStart
  );
  const { searchParams } = new URL(request.url);
  if (searchParams.get("format") === "csv") {
    const csv = themesToCsv(upcomingThemes);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="le32-upcoming-themes-${data.meta.horizonStart}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const uniqueDays = new Set(upcomingThemes.map((t) => t.date)).size;
  return NextResponse.json({
    ...data,
    themes: upcomingThemes,
    uniqueDays,
    categoryCounts: upcomingThemes.reduce<Record<string, number>>((acc, t) => {
      acc[t.categoryId] = (acc[t.categoryId] || 0) + 1;
      return acc;
    }, {}),
  });
}

/** POST — rebuild / extend the rolling horizon (keeps future rows when possible) */
export async function POST() {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = ensureUpcomingThemes();
  return NextResponse.json({
    ok: true,
    uniqueDays: new Set(data.themes.map((t) => t.date)).size,
    themeCount: data.themes.length,
    meta: data.meta,
  });
}
