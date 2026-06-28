"use client";

import type { CtaLink } from "@/content/types";
import { trackOutboundLink } from "@/lib/analytics";

interface LinkCardProps {
  link: CtaLink;
}

export function LinkCard({ link }: LinkCardProps) {
  const handleClick = () => {
    if (link.trackEvent) {
      trackOutboundLink(link.href, link.trackEvent);
    }
  };

  const className = link.primary
    ? "group block w-full rounded-2xl border border-brand-600 bg-brand-600 p-5 text-left text-white shadow-card transition hover:bg-brand-700 hover:shadow-float"
    : "group block w-full rounded-2xl border border-brand-100 bg-white p-5 text-left shadow-card transition hover:border-brand-300 hover:shadow-float";

  const titleClass = link.primary
    ? "text-lg font-semibold text-white"
    : "text-lg font-semibold text-brand-900";
  const subtitleClass = link.primary
    ? "mt-1 text-sm text-brand-100"
    : "mt-1 text-sm text-brand-600";

  const content = (
    <>
      <p className={titleClass}>{link.title}</p>
      <p className={subtitleClass}>{link.subtitle}</p>
    </>
  );

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={handleClick}
      >
        {content}
      </a>
    );
  }

  return (
    <a href={link.href} className={className} onClick={handleClick}>
      {content}
    </a>
  );
}
