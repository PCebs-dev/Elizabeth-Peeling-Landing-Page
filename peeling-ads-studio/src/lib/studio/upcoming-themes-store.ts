import fs from "fs";
import path from "path";
import {
  MIN_DAYS_AHEAD,
  buildRollingUpcomingThemes,
  type UpcomingThemeRow,
  type UpcomingThemesFile,
} from "./upcoming-themes";
import { studioDataDir } from "./studio-data-dir";

const DIR = () => studioDataDir();
const FILE = () => path.join(DIR(), "upcoming-themes.json");

function ensureDir(): void {
  const dir = DIR();
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch {
    /* Vercel read-only /tmp edge cases */
  }
}

export function loadUpcomingThemesFile(): UpcomingThemesFile | null {
  const file = FILE();
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8")) as UpcomingThemesFile;
  } catch {
    return null;
  }
}

export function saveUpcomingThemesFile(data: UpcomingThemesFile): void {
  try {
    ensureDir();
    fs.writeFileSync(FILE(), JSON.stringify(data, null, 2), "utf8");
  } catch {
    /* Ephemeral / read-only — in-memory themes still work for this request */
  }
}

/**
 * Ensures at least `minDaysAhead` Toronto calendar days of themes exist from today.
 * Preserves future rows already reviewed; only fills gaps / extends the horizon.
 */
export function ensureUpcomingThemes(options?: {
  fromDate?: Date;
  minDaysAhead?: number;
}): UpcomingThemesFile {
  const minDays = options?.minDaysAhead ?? MIN_DAYS_AHEAD;
  const existing = loadUpcomingThemesFile();
  const next = buildRollingUpcomingThemes({
    fromDate: options?.fromDate,
    minDaysAhead: minDays,
    existing: existing?.themes,
  });
  saveUpcomingThemesFile(next);
  return next;
}

export function getUpcomingThemesForDate(
  dateIso: string,
  options?: { ensure?: boolean }
): UpcomingThemeRow[] {
  const file =
    options?.ensure === false
      ? loadUpcomingThemesFile()
      : ensureUpcomingThemes();
  if (!file) return [];
  return file.themes.filter((t) => t.date === dateIso);
}
