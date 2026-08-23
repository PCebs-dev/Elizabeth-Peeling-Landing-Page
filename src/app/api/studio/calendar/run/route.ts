import { NextResponse } from "next/server";
import { assertStudioAccess } from "@/lib/studio/access";
import { runCalendarDay } from "@/lib/studio/run-calendar-day";
import { toSavedAdSummary } from "@/lib/studio/saved-ads";
import { torontoDateString } from "@/lib/studio/calendar";
import {
  isAutoPublishStoriesEnabled,
  resolveStoryPublishPlatforms,
} from "@/lib/studio/auto-publish-stories";

/** Allow long OpenAI image + copy generation + Meta Stories publish */
export const maxDuration = 300;

/**
 * POST /api/studio/calendar/run
 * Daily automation (Vercel Cron ~7am America/Toronto): generates today's
 * image + caption creatives into Saved calendar ads for manual review.
 * Auto-publish to Instagram/Facebook is OFF unless STUDIO_AUTO_PUBLISH_STORIES=true.
 *
 * Auth: studio session cookie OR Bearer STUDIO_AUTOMATION_SECRET / CRON_SECRET
 * Body (optional): { date?: "YYYY-MM-DD", force?: boolean, calendarPostId?: string, savedAdId?: string }
 */
export async function POST(request: Request) {
  const access = await assertStudioAccess(request);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: {
    date?: string;
    force?: boolean;
    calendarPostId?: string;
    savedAdId?: string;
  } = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let date = new Date();
  if (body.date) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(body.date);
    if (!m) {
      return NextResponse.json(
        { error: "date must be YYYY-MM-DD" },
        { status: 400 }
      );
    }
    date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  }

  try {
    const result = await runCalendarDay({
      date,
      force: body.force === true,
      calendarPostId:
        typeof body.calendarPostId === "string" && body.calendarPostId.trim()
          ? body.calendarPostId.trim()
          : undefined,
      savedAdId:
        typeof body.savedAdId === "string" && body.savedAdId.trim()
          ? body.savedAdId.trim()
          : undefined,
    });

    const storyPlatforms = resolveStoryPublishPlatforms();
    const autoStories = isAutoPublishStoriesEnabled();
    const publishedCount = result.published.reduce(
      (n, p) => n + p.results.length,
      0
    );

    return NextResponse.json({
      ok: true,
      published: publishedCount > 0,
      autoPublishStories: autoStories,
      storyPlatforms,
      message:
        publishedCount > 0
          ? `Calendar run complete. Auto-published ${publishedCount} Stories post(s). Other ads are saved for review.`
          : autoStories
            ? "Calendar ads saved for review. No Stories were published this run (none scheduled, already posted, or Meta not configured)."
            : "Calendar ads saved under Saved calendar ads for review. Auto-publish is off — publish from the studio when ready.",
      date: result.date || torontoDateString(date),
      generatedCount: result.generated.length,
      skippedCount: result.skipped.length,
      errorCount: result.errors.length,
      publishedCount,
      generated: result.generated.map(toSavedAdSummary),
      /** Full creatives (incl. images) for client IndexedDB on Vercel */
      generatedFull: result.generated,
      storyPublishes: result.published,
      skipped: result.skipped,
      errors: result.errors,
      warnings: result.warnings,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Calendar run failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/** Vercel Cron may invoke GET */
export async function GET(request: Request) {
  return POST(request);
}
