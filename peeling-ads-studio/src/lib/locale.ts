import type { Locale } from "@/content/types";

/**
 * Pick en or fr from the browser Accept-Language header.
 * French is chosen when fr has equal or higher priority than en.
 */
export function detectLocaleFromAcceptLanguage(
  acceptLanguage: string | null
): Locale {
  if (!acceptLanguage) return "en";

  const preferences = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [langPart, ...params] = part.trim().split(";");
      const lang = langPart.split("-")[0]?.toLowerCase() ?? "";
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.split("=")[1]) : 1 - index * 0.001;
      return { lang, q: Number.isFinite(q) ? q : 0 };
    })
    .filter((p) => p.lang === "en" || p.lang === "fr")
    .sort((a, b) => b.q - a.q);

  if (preferences.length === 0) return "en";

  const top = preferences[0].lang as Locale;
  return top === "fr" ? "fr" : "en";
}
