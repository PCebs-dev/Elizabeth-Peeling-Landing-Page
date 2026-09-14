"use client";

import type { SiteContent } from "@/content/types";
import { trackOutboundLink } from "@/lib/analytics";

interface StickyCtaProps {
  content: SiteContent;
  bookingHref: string;
}

export function StickyCta({ content, bookingHref }: StickyCtaProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-brand-100 bg-white/95 px-4 py-3 backdrop-blur sm:hidden">
      <a
        href={bookingHref}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full rounded-xl bg-brand-600 py-3 text-center text-sm font-semibold text-white shadow-card hover:bg-brand-700"
        onClick={() => trackOutboundLink(bookingHref, "sticky_book")}
      >
        {content.stickyCta}
      </a>
    </div>
  );
}
