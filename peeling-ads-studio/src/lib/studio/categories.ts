import type { StudioCategoryId } from "./ad-types";

export interface StudioCategory {
  id: StudioCategoryId;
  label: string;
  labelFr: string;
  description: string;
  defaultInterests: string[];
}

export const STUDIO_CATEGORIES: StudioCategory[] = [
  {
    id: "invisalign",
    label: "Invisalign",
    labelFr: "Invisalign",
    description: "Clear aligners and smile straightening",
    defaultInterests: [
      "Invisalign",
      "Orthodontics",
      "Cosmetic dentistry",
      "Smile makeover",
    ],
  },
  {
    id: "crowns",
    label: "Crowns",
    labelFr: "Couronnes",
    description: "Dental crowns and restorative aesthetics",
    defaultInterests: ["Cosmetic dentistry", "Dental restoration", "Smile"],
  },
  {
    id: "botox",
    label: "Botox",
    labelFr: "Botox",
    description: "Therapeutic and aesthetic botox in dental practice",
    defaultInterests: [
      "Botox",
      "Facial aesthetics",
      "Cosmetic procedures",
      "Self-care",
    ],
  },
  {
    id: "implants",
    label: "Dental Implants",
    labelFr: "Implants dentaires",
    description: "Implant-supported tooth replacement",
    defaultInterests: [
      "Dental implants",
      "Cosmetic dentistry",
      "Tooth replacement",
    ],
  },
  {
    id: "whitening",
    label: "Whitening",
    labelFr: "Blanchiment",
    description: "Professional teeth whitening",
    defaultInterests: [
      "Teeth whitening",
      "Cosmetic dentistry",
      "Smile makeover",
    ],
  },
  {
    id: "veneers",
    label: "Veneers",
    labelFr: "Facettes",
    description: "Porcelain or composite veneers",
    defaultInterests: ["Veneers", "Smile makeover", "Cosmetic dentistry"],
  },
  {
    id: "smile-makeover",
    label: "Smile Makeover",
    labelFr: "Métamorphose du sourire",
    description: "Full smile transformations",
    defaultInterests: [
      "Smile makeover",
      "Cosmetic dentistry",
      "Invisalign",
      "Veneers",
    ],
  },
];

export function getCategory(id: StudioCategoryId): StudioCategory {
  const found = STUDIO_CATEGORIES.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown category: ${id}`);
  return found;
}
