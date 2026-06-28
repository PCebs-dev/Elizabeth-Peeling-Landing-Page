"use client";

import { useState } from "react";
import type { SiteContent, Testimonial } from "@/content/types";
import { googleReviewsUrl } from "@/data/verified-reviews";

function Stars({ rating = 5 }: { rating?: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`h-4 w-4 ${i < rating ? "text-brand-700" : "text-brand-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.075 9.801c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ))}
    </div>
  );
}

function TestimonialCard({ item }: { item: Testimonial }) {
  return (
    <figure className="rounded-2xl border border-brand-100 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <Stars rating={item.rating} />
        {item.source && (
          <span className="text-xs font-medium uppercase tracking-wide text-brand-500">
            {item.source}
          </span>
        )}
      </div>
      <blockquote className="mt-3 text-sm leading-relaxed text-brand-700">
        “{item.quote}”
      </blockquote>
      <figcaption className="mt-4 text-sm font-semibold text-brand-900">
        {item.name}
      </figcaption>
    </figure>
  );
}

interface ReviewsProps {
  content: SiteContent;
}

export function Reviews({ content }: ReviewsProps) {
  const { reviews } = content;
  const [expanded, setExpanded] = useState(false);

  const initialCount = reviews.initialCount;
  const hasMoreOnPage = reviews.items.length > initialCount;
  const visible = expanded ? reviews.items : reviews.items.slice(0, initialCount);

  return (
    <section id="reviews" className="text-center" aria-labelledby="reviews-heading">
      <p className="text-sm font-medium uppercase tracking-widest text-brand-500">
        {reviews.label}
      </p>
      <h2
        id="reviews-heading"
        className="mt-2 font-serif text-3xl font-semibold text-brand-950"
      >
        {reviews.heading}
      </h2>

      <div className="mt-8 grid gap-4 text-left sm:grid-cols-2">
        {visible.map((item) => (
          <TestimonialCard key={item.name + item.quote.slice(0, 12)} item={item} />
        ))}
      </div>

      {hasMoreOnPage && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-6 py-3 text-sm font-medium text-brand-800 shadow-sm transition hover:border-brand-400 hover:bg-brand-50"
          aria-expanded={expanded}
        >
          {expanded ? reviews.showLess : reviews.showMore}
          <svg
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {expanded && (
        <a
          href={googleReviewsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm font-medium text-brand-600 underline hover:text-brand-800"
        >
          {reviews.viewAllLabel}
        </a>
      )}

      <p className="mt-6 text-xs leading-relaxed text-brand-500">{reviews.disclaimer}</p>
    </section>
  );
}
