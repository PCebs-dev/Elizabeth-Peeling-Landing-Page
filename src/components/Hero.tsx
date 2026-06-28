"use client";

import { useState } from "react";
import type { SiteContent } from "@/content/types";
import { links } from "@/config/links";
import { trackOutboundLink } from "@/lib/analytics";

interface HeroProps {
  content: SiteContent;
}

export function Hero({ content }: HeroProps) {
  const { hero } = content;
  const [photoError, setPhotoError] = useState(false);

  return (
    <header className="text-center">
      <div className="mx-auto mb-6 aspect-[4/5] w-[70%] overflow-hidden rounded-t-full rounded-b-[2rem] bg-gradient-to-br from-brand-200 to-brand-400 shadow-float">
        {photoError ? (
          <div className="flex h-full w-full items-center justify-center font-serif text-7xl text-brand-800">
            EP
          </div>
        ) : (
          // Large self-hosted portrait (Joyce Kahng-style hero).
          // Save Dr. Peeling's photo at public/elizabeth-hero.png; the monogram
          // shows until the file exists.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={links.heroPhoto}
            alt={`${hero.name}, ${hero.credentials}`}
            className="h-full w-full object-cover object-top"
            onError={() => setPhotoError(true)}
          />
        )}
      </div>
      <p className="text-sm font-medium uppercase tracking-widest text-brand-500">
        {hero.location}
      </p>
      <h1 className="mt-2 font-serif text-3xl font-semibold text-brand-950 sm:text-4xl">
        {hero.name}, {hero.credentials}
      </h1>
      <p className="mt-3 text-lg font-medium text-brand-700">{hero.tagline}</p>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-brand-600">
        {hero.bio}
      </p>

      <a
        href={links.instagram}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-1.5 text-sm font-medium text-brand-700 shadow-sm transition hover:border-brand-400 hover:bg-brand-50"
        onClick={() => trackOutboundLink(links.instagram, "instagram_handle")}
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
        {links.instagramHandle}
      </a>

      <div className="mt-5 flex items-center justify-center gap-4">
        <a
          href={links.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-500 transition hover:text-brand-700"
          aria-label="Facebook"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </a>
        <a
          href={content.locale === "en" ? links.clinicWebsite : links.clinicWebsiteFr}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-brand-600 underline hover:text-brand-800"
        >
          LE 32
        </a>
      </div>
    </header>
  );
}
