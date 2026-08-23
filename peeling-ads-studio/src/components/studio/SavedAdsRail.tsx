"use client";

import { getCategory } from "@/lib/studio/categories";

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
  onDiscard: (id: string) => void;
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
  onDiscard,
  onRunToday,
  onRerunToday,
  onRerunAd,
}: SavedAdsRailProps) {
  return (
    <aside className="rounded-2xl border border-[rgb(var(--brand-200))] bg-white p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-[rgb(var(--brand-900))]">
        Calendar ads
      </h2>

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
      </div>

      {ads.length === 0 ? (
        <p className="mt-6 text-sm text-[rgb(var(--brand-600))]">
          No calendar ads yet.
        </p>
      ) : (
        <ul className="mt-4 flex gap-3 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
          {ads.map((ad) => {
            const active = ad.id === activeId;
            const cat = getCategory(ad.categoryId as never);
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
                  {ad.imageUrl || ad.hasImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        ad.imageUrl ||
                        `/api/studio/saved-ads/${ad.id}/image`
                      }
                      alt=""
                      className="mb-2 h-28 w-full rounded-lg object-cover"
                    />
                  ) : null}
                  <p className="text-sm font-medium text-[rgb(var(--brand-900))] line-clamp-2">
                    {ad.favorite ? "★ " : ""}
                    {ad.headline}
                  </p>
                  <p className="mt-1 text-[11px] text-[rgb(var(--brand-600))]">
                    {ad.scheduledDate || "—"} · {cat?.label ?? ad.categoryId} ·{" "}
                    {ad.format}
                    {ad.language === "both" || ad.hasImageFr
                      ? ad.hasImageFr
                        ? " · EN+FR"
                        : " · EN"
                      : ad.language === "fr"
                        ? " · FR"
                        : " · EN"}
                    {ad.publish?.storiesPublishedAt
                      ? " · Posted"
                      : ad.format === "story"
                        ? " · Story"
                        : ""}
                  </p>
                </button>
                <div className="mt-1 flex gap-3 px-1">
                  <button
                    type="button"
                    disabled={running}
                    onClick={() => onRerunAd(ad)}
                    className="min-h-9 text-[11px] text-[rgb(var(--brand-700))] hover:underline disabled:opacity-50"
                  >
                    {rerunningId === ad.id ? "Rerunning…" : "Rerun"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onFavorite(ad.id)}
                    className="min-h-9 text-[11px] text-[rgb(var(--brand-700))] hover:underline"
                  >
                    {ad.favorite ? "Unfavorite" : "Favorite"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDiscard(ad.id)}
                    className="min-h-9 text-[11px] text-red-700 hover:underline"
                  >
                    Discard
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
