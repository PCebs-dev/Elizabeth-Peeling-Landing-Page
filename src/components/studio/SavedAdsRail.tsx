"use client";

import { useState } from "react";
import { STUDIO_CATEGORIES } from "@/lib/studio/categories";

const PAGE_SIZE = 4;

export interface SavedAdListItem {
  id: string;
  source: "calendar" | "manual";
  status: string;
  calendarPostId?: string;
  scheduledDate?: string;
  platforms: string[];
  format: string;
  pillar?: string;
  categoryId: string;
  channel: string;
  language?: string;
  angle: string;
  headline: string;
  createdAt: number;
  favorite?: boolean;
  imageUrl?: string;
  imageFrUrl?: string;
  hasImage?: boolean;
  hasImageFr?: boolean;
  publish?: {
    storiesPublishedAt?: number;
    results?: { platform: string; postId: string; kind: string }[];
    errors?: { platform: string; error: string }[];
  };
}

interface SavedAdsRailProps {
  ads: SavedAdListItem[];
  activeId: string | null;
  running: boolean;
  rerunningId?: string | null;
  onSelect: (id: string) => void;
  onFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onRunToday: () => void;
  onRerunToday: () => void;
  onRerunAd: (ad: SavedAdListItem) => void;
}

export function SavedAdsRail({
  ads,
  activeId,
  running,
  rerunningId = null,
  onSelect,
  onFavorite,
  onDelete,
  onRunToday,
  onRerunToday,
  onRerunAd,
}: SavedAdsRailProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = ads.slice(0, visibleCount);
  const remaining = ads.length - visible.length;

  return (
    <aside className="rounded-2xl border border-[rgb(var(--brand-200))] bg-white p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-[rgb(var(--brand-900))]">
        Saved ads
      </h2>
      <p className="mt-1 text-xs text-[rgb(var(--brand-600))]">
        Calendar ads, saved captions, and published posts — English and French
        when both exist.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={running}
          onClick={onRunToday}
          className="min-h-11 rounded-lg bg-[rgb(var(--brand-800))] px-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {running && !rerunningId ? "Generating…" : "Run today"}
        </button>
        <button
          type="button"
          disabled={running}
          onClick={onRerunToday}
          className="min-h-11 rounded-lg border border-[rgb(var(--brand-300))] px-3 text-sm text-[rgb(var(--brand-800))] hover:bg-[rgb(var(--brand-50))] disabled:opacity-60"
        >
          {running && !rerunningId ? "Rerunning…" : "Rerun"}
        </button>
        <a
          href="/studio/themes"
          className="inline-flex min-h-11 items-center rounded-lg border border-[rgb(var(--brand-300))] px-3 text-sm text-[rgb(var(--brand-800))] hover:bg-[rgb(var(--brand-50))]"
        >
          Themes
        </a>
      </div>

      {ads.length === 0 ? (
        <p className="mt-6 text-sm text-[rgb(var(--brand-600))]">
          No saved ads yet. Generate a caption and tap Save, or run today&apos;s
          calendar.
        </p>
      ) : (
        <>
          <ul className="mt-4 flex gap-3 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
            {visible.map((ad) => {
              const active = ad.id === activeId;
              const cat = STUDIO_CATEGORIES.find((c) => c.id === ad.categoryId);
              const posted = Boolean(
                ad.publish?.storiesPublishedAt || ad.publish?.results?.length
              );
              return (
                <li
                  key={ad.id}
                  className="min-w-[220px] shrink-0 lg:min-w-0 lg:shrink"
                >
                  <button
                    type="button"
                    onClick={() => onSelect(ad.id)}
                    className={`min-h-11 w-full rounded-xl border px-3 py-2.5 text-left transition ${
                      active
                        ? "border-[rgb(var(--brand-600))] bg-[rgb(var(--brand-50))]"
                        : "border-[rgb(var(--brand-200))] hover:bg-[rgb(var(--brand-50))]"
                    }`}
                  >
                    {ad.imageUrl || ad.hasImage || ad.imageFrUrl || ad.hasImageFr ? (
                      <div
                        className={`mb-2 grid gap-1 ${
                          ad.imageFrUrl || ad.hasImageFr
                            ? "grid-cols-2"
                            : "grid-cols-1"
                        }`}
                      >
                        {ad.imageUrl || ad.hasImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={
                              ad.imageUrl ||
                              `/api/studio/saved-ads/${ad.id}/image`
                            }
                            alt=""
                            className="h-24 w-full rounded-lg object-cover"
                          />
                        ) : null}
                        {ad.imageFrUrl || ad.hasImageFr ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={
                              ad.imageFrUrl ||
                              `/api/studio/saved-ads/${ad.id}/image?lang=fr`
                            }
                            alt=""
                            className="h-24 w-full rounded-lg object-cover"
                          />
                        ) : null}
                      </div>
                    ) : null}
                    <p className="line-clamp-2 text-sm font-medium text-[rgb(var(--brand-900))]">
                      {ad.favorite ? "★ " : ""}
                      {ad.headline}
                    </p>
                    <p className="mt-1 text-[11px] text-[rgb(var(--brand-600))]">
                      {ad.source === "calendar"
                        ? ad.scheduledDate || "Calendar"
                        : "Saved"}{" "}
                      · {cat?.label ?? ad.categoryId}
                      {ad.language === "both" || ad.hasImageFr
                        ? " · EN+FR"
                        : ad.language === "fr"
                          ? " · FR"
                          : " · EN"}
                      {posted ? " · Published" : " · Draft"}
                    </p>
                  </button>
                  <div className="mt-1 flex flex-wrap gap-3 px-1">
                    {ad.source === "calendar" ? (
                      <button
                        type="button"
                        disabled={running}
                        onClick={() => onRerunAd(ad)}
                        className="min-h-9 text-[11px] text-[rgb(var(--brand-700))] hover:underline disabled:opacity-50"
                      >
                        {rerunningId === ad.id ? "Rerunning…" : "Rerun"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onFavorite(ad.id)}
                      className="min-h-9 text-[11px] text-[rgb(var(--brand-700))] hover:underline"
                    >
                      {ad.favorite ? "Unfavorite" : "Favorite"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(ad.id)}
                      className="min-h-9 text-[11px] text-red-700 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {remaining > 0 ? (
            <button
              type="button"
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              className="mt-3 min-h-11 w-full rounded-lg border border-[rgb(var(--brand-300))] px-3 text-sm font-medium text-[rgb(var(--brand-800))] hover:bg-[rgb(var(--brand-50))]"
            >
              Show more
            </button>
          ) : null}
        </>
      )}
    </aside>
  );
}
