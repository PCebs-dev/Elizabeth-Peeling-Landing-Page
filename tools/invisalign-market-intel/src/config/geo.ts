export type GeoTier = "primary" | "secondary";

export interface GeoTarget {
  name: string;
  nameFr: string;
  tier: GeoTier;
  /** Forward sortation areas for postal targeting notes */
  fsas: string[];
}

/**
 * West Island / Vaudreuil geo scope for Invisalign campaigns.
 */
export const geoTargets: GeoTarget[] = [
  // Primary — Vaudreuil–Soulanges corridor
  {
    name: "Vaudreuil-Dorion",
    nameFr: "Vaudreuil-Dorion",
    tier: "primary",
    fsas: ["J7V"],
  },
  {
    name: "Saint-Lazare",
    nameFr: "Saint-Lazare",
    tier: "primary",
    fsas: ["J7T"],
  },
  {
    name: "Hudson",
    nameFr: "Hudson",
    tier: "primary",
    fsas: ["J0P"],
  },
  {
    name: "Pincourt",
    nameFr: "Pincourt",
    tier: "primary",
    fsas: ["J7W"],
  },
  {
    name: "L'Île-Perrot",
    nameFr: "L'Île-Perrot",
    tier: "primary",
    fsas: ["J7V"],
  },
  {
    name: "Notre-Dame-de-l'Île-Perrot",
    nameFr: "Notre-Dame-de-l'Île-Perrot",
    tier: "primary",
    fsas: ["J7V"],
  },
  // Secondary — Montreal West Island
  {
    name: "Pointe-Claire",
    nameFr: "Pointe-Claire",
    tier: "secondary",
    fsas: ["H9R", "H9S"],
  },
  {
    name: "Kirkland",
    nameFr: "Kirkland",
    tier: "secondary",
    fsas: ["H9J", "H9H"],
  },
  {
    name: "Beaconsfield",
    nameFr: "Beaconsfield",
    tier: "secondary",
    fsas: ["H9W"],
  },
  {
    name: "Dollard-des-Ormeaux",
    nameFr: "Dollard-des-Ormeaux",
    tier: "secondary",
    fsas: ["H9A", "H9B", "H9G"],
  },
  {
    name: "Dorval",
    nameFr: "Dorval",
    tier: "secondary",
    fsas: ["H9P", "H9S"],
  },
  {
    name: "Pierrefonds",
    nameFr: "Pierrefonds",
    tier: "secondary",
    fsas: ["H8Y", "H8Z", "H9H"],
  },
  {
    name: "Sainte-Anne-de-Bellevue",
    nameFr: "Sainte-Anne-de-Bellevue",
    tier: "secondary",
    fsas: ["H9X"],
  },
  {
    name: "Baie-d'Urfé",
    nameFr: "Baie-d'Urfé",
    tier: "secondary",
    fsas: ["H9X"],
  },
];

/** Unique FSAs across all targets */
export const allFsas: string[] = [
  ...new Set(geoTargets.flatMap((g) => g.fsas)),
].sort();

export const metaAgeMin = 25;
export const metaAgeMax = 54;
