"use client";

import Link from "next/link";
import type { Locale } from "@/content/types";

interface LanguageToggleProps {
  locale: Locale;
  basePath?: string;
}

export function LanguageToggle({ locale, basePath = "" }: LanguageToggleProps) {
  const otherLocale = locale === "en" ? "fr" : "en";
  const target = `${basePath}/${otherLocale}`;
  const label = locale === "en" ? "FR" : "EN";
  const ariaLabel = locale === "en" ? "Switch to French" : "Passer en anglais";

  return (
    <Link
      href={target}
      className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-brand-200 bg-white px-3 text-sm font-semibold text-brand-700 shadow-sm transition hover:border-brand-400 hover:bg-brand-50"
      aria-label={ariaLabel}
    >
      {label}
    </Link>
  );
}
