import type { Locale } from "./types";
import { en } from "./en";
import { fr } from "./fr";

const contentMap = { en, fr } as const;

export function getContent(locale: Locale) {
  return contentMap[locale];
}

export { en, fr };
export type { Locale, SiteContent } from "./types";
