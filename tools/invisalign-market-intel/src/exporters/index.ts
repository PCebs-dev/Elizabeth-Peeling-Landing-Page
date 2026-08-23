import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ResearchBundle } from "../types.js";
import { exportGooglePack } from "./google.js";
import { exportMetaPack } from "./meta.js";
import { exportReport } from "./report.js";
import { exportUtms } from "./utms.js";

export async function exportAll(
  outDir: string,
  research: ResearchBundle
): Promise<void> {
  await mkdir(outDir, { recursive: true });

  await writeFile(
    path.join(outDir, "research.json"),
    JSON.stringify(research, null, 2),
    "utf8"
  );

  await Promise.all([
    exportGooglePack(outDir, research),
    exportMetaPack(outDir, research),
    exportUtms(outDir, research),
    exportReport(outDir, research),
  ]);
}
