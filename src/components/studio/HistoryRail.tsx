"use client";

import type { GeneratedAd } from "@/lib/studio/types";
import { getCategory } from "@/lib/studio/categories";

interface HistoryRailProps {
  history: GeneratedAd[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onFavorite: (id: string) => void;
  onDiscard: (id: string) => void;
}

export function HistoryRail({
  history,
  activeId,
  onSelect,
  onFavorite,
  onDiscard,
}: HistoryRailProps) {
  return (
    <aside className="rounded-2xl border border-[rgb(var(--brand-200))] bg-white p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-[rgb(var(--brand-900))]">
        History
      </h2>

      {history.length === 0 ? (
        <p className="mt-4 text-sm text-[rgb(var(--brand-600))]">
          No ads yet this session.
        </p>
      ) : (
        <ul className="mt-4 flex gap-3 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
          {history.map((ad) => {
            const active = ad.id === activeId;
            const cat = getCategory(ad.categoryId);
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
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-[rgb(var(--brand-900))] line-clamp-2">
                      {ad.favorite ? "★ " : ""}
                      {ad.headline}
                    </p>
                  </div>
                  <p className="mt-1 text-[11px] text-[rgb(var(--brand-600))]">
                    {ad.aiImage ? "AI · " : ""}
                    {cat.label} · {ad.angle} ·{" "}
                    {ad.channel === "paid" ? "Paid" : "Organic"}
                  </p>
                </button>
                <div className="mt-1 flex gap-3 px-1">
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
