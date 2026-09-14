/**
 * Durable log of calendar briefs that were actually used to generate ads.
 * Upcoming themes may roll forward; this file keeps past entries rerunnable.
 */

import fs from "fs";
import path from "path";
import type { CalendarPost, SavedStudioAd } from "./saved-types";
import { listSavedAds } from "./saved-ads";
import { calendarPostFromThemeRef } from "./upcoming-themes";
import { studioDataDir } from "./studio-data-dir";

const DIR = () => studioDataDir();
const FILE = () => path.join(DIR(), "calendar-history.json");

interface CalendarHistoryFile {
  posts: CalendarPost[];
}

function ensureDir(): void {
  const dir = DIR();
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch {
    /* ignore */
  }
}

function postKey(post: Pick<CalendarPost, "id" | "date">): string {
  return `${post.date}::${post.id}`;
}

function loadFile(): CalendarHistoryFile {
  const file = FILE();
  try {
    if (!fs.existsSync(file)) return { posts: [] };
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as CalendarHistoryFile;
    return { posts: Array.isArray(parsed.posts) ? parsed.posts : [] };
  } catch {
    return { posts: [] };
  }
}

function saveFile(data: CalendarHistoryFile): void {
  try {
    ensureDir();
    const posts = [...data.posts].sort((a, b) =>
      a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)
    );
    fs.writeFileSync(FILE(), JSON.stringify({ posts }, null, 2), "utf8");
  } catch {
    /* Vercel ephemeral — history for this request still comes from saved ads */
  }
}

export function reconstructCalendarPostFromSavedAd(
  ad: SavedStudioAd
): CalendarPost | null {
  if (ad.calendarPost?.id) return ad.calendarPost;
  const date = ad.scheduledDate;
  const id = ad.calendarPostId;
  if (!date || !id) return null;

  const fromTheme = calendarPostFromThemeRef(date, id, ad.hook);
  if (fromTheme) return fromTheme;

  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Toronto",
    weekday: "short",
  }).format(new Date(`${date}T12:00:00.000Z`));

  return {
    id,
    week: 1,
    date,
    day,
    platforms: ad.platforms?.length ? ad.platforms : ["instagram", "facebook"],
    pillar: ad.pillar || "",
    format: ad.format || "static",
    funnel: ad.funnel || "tof",
    categoryId: ad.categoryId,
    channel: ad.channel || "organic",
    language: ad.language || "both",
    angle: ad.angle || "confidence",
    hook: ad.hook || ad.headline,
    notes: ad.hook || ad.headline,
    cta: ad.cta,
    imageHints: [],
    subjectMode: "random",
    production: "ai-image",
    compliance: ad.compliance || [],
  };
}

export function recordCalendarPost(post: CalendarPost): void {
  const data = loadFile();
  const key = postKey(post);
  const posts = data.posts.filter((p) => postKey(p) !== key);
  posts.push(post);
  saveFile({ posts });
}

export function findHistoryPostsForDate(date: string): CalendarPost[] {
  return loadFile().posts.filter((p) => p.date === date);
}

export function findHistoryPost(
  date: string,
  calendarPostId?: string
): CalendarPost | null {
  if (!calendarPostId) return null;
  return (
    loadFile().posts.find(
      (p) => p.date === date && p.id === calendarPostId
    ) ?? null
  );
}

/** Copy briefs off existing saved ads so older rows can be rerun. */
export function hydrateCalendarHistoryFromSavedAds(): void {
  const data = loadFile();
  const seen = new Set(data.posts.map(postKey));
  let changed = false;
  for (const ad of listSavedAds()) {
    const post = reconstructCalendarPostFromSavedAd(ad);
    if (!post) continue;
    const key = postKey(post);
    if (seen.has(key)) continue;
    data.posts.push(post);
    seen.add(key);
    changed = true;
  }
  if (changed) saveFile(data);
}
