import fs from "fs";
import path from "path";
import type { CalendarFile, CalendarPost, SavedStudioAd } from "./saved-types";
import { ensureUpcomingThemes } from "./upcoming-themes-store";
import {
  calendarPostFromThemeRef,
  upcomingThemeToCalendarPost,
} from "./upcoming-themes";
import {
  findHistoryPost,
  findHistoryPostsForDate,
  reconstructCalendarPostFromSavedAd,
} from "./calendar-history";

const IMAGE_FORMATS = new Set(["static", "carousel", "story"]);

export function getCalendarPath(): string {
  return path.join(process.cwd(), "content", "le32-content-calendar-4wk.json");
}

export function loadCalendar(): CalendarFile {
  const raw = fs.readFileSync(getCalendarPath(), "utf8");
  return JSON.parse(raw) as CalendarFile;
}

export function isImageOnlyPost(post: CalendarPost): boolean {
  return IMAGE_FORMATS.has(String(post.format).toLowerCase());
}

/** America/Toronto calendar date YYYY-MM-DD */
export function torontoDateString(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function torontoWeekdayShort(date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Toronto",
    weekday: "short",
  }).format(date);
}

/**
 * Resolve image-only posts for a date.
 * 1) Exact hand-authored calendar date match
 * 2) Saved history for that date (so past days stay rerunnable)
 * 3) Rolling upcoming engagement themes
 * 4) Recurring weekday fallback from the 4-week template
 */
export function resolvePostsForDate(
  calendar: CalendarFile,
  date = new Date()
): CalendarPost[] {
  const imagePosts = calendar.posts.filter(isImageOnlyPost);
  const iso = torontoDateString(date);
  const exact = imagePosts.filter((p) => p.date === iso);
  if (exact.length > 0) return exact;

  const history = findHistoryPostsForDate(iso);
  if (history.length > 0) return history;

  const upcoming = ensureUpcomingThemes();
  const themePosts = (upcoming.themes || [])
    .filter((t) => t.date === iso)
    .map(upcomingThemeToCalendarPost);
  if (themePosts.length > 0) return themePosts;

  const day = torontoWeekdayShort(date);
  const dayIndex = Math.floor(date.getTime() / 86_400_000);
  const week = (Math.abs(dayIndex) % 4) + 1;
  const recurring = imagePosts.filter((p) => p.day === day && p.week === week);
  if (recurring.length > 0) return recurring;

  return imagePosts.filter((p) => p.day === day && p.week === 1);
}

/** Rebuild the original calendar brief for a saved ad rerun. */
export function resolvePostForRerun(input: {
  dateIso: string;
  calendarPostId?: string;
  savedAd?: SavedStudioAd | null;
}): CalendarPost | null {
  const { dateIso, calendarPostId, savedAd } = input;
  const id = calendarPostId || savedAd?.calendarPostId;

  // Prefer the live authored calendar so language/platform edits apply on rerun
  if (id) {
    const authored = loadCalendar().posts.find((p) => p.id === id);
    if (authored) return { ...authored, date: dateIso };
  }

  if (savedAd?.calendarPost?.id) return savedAd.calendarPost;

  if (savedAd) {
    const fromAd = reconstructCalendarPostFromSavedAd(savedAd);
    if (fromAd) return fromAd;
  }
  if (id) {
    const hist = findHistoryPost(dateIso, id);
    if (hist) return hist;
    const fromTheme = calendarPostFromThemeRef(dateIso, id, savedAd?.hook);
    if (fromTheme) return fromTheme;
  }

  const date = new Date(`${dateIso}T12:00:00.000Z`);
  const resolved = resolvePostsForDate(loadCalendar(), date);
  if (id) {
    return resolved.find((p) => p.id === id) || null;
  }
  return resolved[0] || null;
}
