import { writeFile } from "node:fs/promises";
import path from "node:path";
import type { ResearchBundle } from "../types.js";
import { csvFile } from "../utils/csv.js";

export async function exportUtms(
  outDir: string,
  research: ResearchBundle
): Promise<void> {
  const rows: Array<Array<string>> = [
    [
      "google",
      "cpc",
      "Search_Invisalign_EN_WestIsland_Vaudreuil",
      "rsa",
      `${research.landingBaseUrl}/en?utm_source=google&utm_medium=cpc&utm_campaign=Search_Invisalign_EN_WestIsland_Vaudreuil&utm_content=rsa`,
    ],
    [
      "google",
      "cpc",
      "Search_Invisalign_FR_WestIsland_Vaudreuil",
      "rsa",
      `${research.landingBaseUrl}/fr?utm_source=google&utm_medium=cpc&utm_campaign=Search_Invisalign_FR_WestIsland_Vaudreuil&utm_content=rsa`,
    ],
    [
      "meta",
      "paid_social",
      "Meta_Invisalign_EN_WestIsland_Vaudreuil",
      "feed",
      `${research.landingBaseUrl}/en?utm_source=meta&utm_medium=paid_social&utm_campaign=Meta_Invisalign_EN_WestIsland_Vaudreuil&utm_content=feed`,
    ],
    [
      "meta",
      "paid_social",
      "Meta_Invisalign_FR_WestIsland_Vaudreuil",
      "feed",
      `${research.landingBaseUrl}/fr?utm_source=meta&utm_medium=paid_social&utm_campaign=Meta_Invisalign_FR_WestIsland_Vaudreuil&utm_content=feed`,
    ],
    [
      "meta",
      "paid_social",
      "Meta_Invisalign_EN_WestIsland_Vaudreuil",
      "stories",
      `${research.landingBaseUrl}/en?utm_source=meta&utm_medium=paid_social&utm_campaign=Meta_Invisalign_EN_WestIsland_Vaudreuil&utm_content=stories`,
    ],
    [
      "meta",
      "paid_social",
      "Meta_Invisalign_FR_WestIsland_Vaudreuil",
      "stories",
      `${research.landingBaseUrl}/fr?utm_source=meta&utm_medium=paid_social&utm_campaign=Meta_Invisalign_FR_WestIsland_Vaudreuil&utm_content=stories`,
    ],
  ];

  await writeFile(
    path.join(outDir, "utms.csv"),
    csvFile(
      ["utm_source", "utm_medium", "utm_campaign", "utm_content", "full_url"],
      rows
    ),
    "utf8"
  );
}
