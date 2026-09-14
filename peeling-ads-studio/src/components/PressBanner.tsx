"use client";

import type { SiteContent } from "@/content/types";
import { trackOutboundLink } from "@/lib/analytics";
import { JournalLogo } from "./JournalLogo";

interface PressBannerProps {
  content: SiteContent;
}

export function PressBanner({ content }: PressBannerProps) {
  const { press } = content;

  return (
    <a
      href={press.href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackOutboundLink(press.href, "press_journal_link")}
      className="group flex items-center gap-4 rounded-2xl border border-brand-200 bg-white p-4 shadow-card transition hover:border-brand-400 hover:shadow-float"
    >
      <JournalLogo className="shrink-0" />
      <span className="flex-1 text-left text-sm font-medium text-brand-800">
        {press.label}
      </span>
      <span
        className="shrink-0 text-brand-500 transition group-hover:translate-x-0.5"
        aria-hidden
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14 5l7 7m0 0l-7 7m7-7H3"
          />
        </svg>
      </span>
    </a>
  );
}
