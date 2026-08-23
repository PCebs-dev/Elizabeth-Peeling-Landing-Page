"use client";

import { useEffect, useState } from "react";
import {
  loadHistory,
  saveHistory,
  type LocalHistoryItem,
} from "@/lib/studio/media-store";

interface HistoryPanelProps {
  refreshKey?: number;
  onSelect?: (item: LocalHistoryItem) => void;
}

export function HistoryPanel({ refreshKey = 0, onSelect }: HistoryPanelProps) {
  const [items, setItems] = useState<LocalHistoryItem[]>([]);

  useEffect(() => {
    setItems(loadHistory());
  }, [refreshKey]);

  function toggleFavorite(id: string) {
    const next = items.map((item) =>
      item.id === id ? { ...item, favorite: !item.favorite } : item,
    );
    setItems(next);
    saveHistory(next);
  }

  function discard(id: string) {
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    saveHistory(next);
  }

  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-[rgb(var(--brand-200))] bg-white p-4 shadow-sm">
        <h2 className="font-serif text-lg text-[rgb(var(--brand-900))]">History</h2>
        <p className="mt-2 text-sm text-[rgb(var(--brand-600))]">
          Published and drafted creatives will appear here.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[rgb(var(--brand-200))] bg-white p-4 shadow-sm">
      <h2 className="font-serif text-lg text-[rgb(var(--brand-900))]">History</h2>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-[rgb(var(--brand-100))] p-3"
          >
            <button
              type="button"
              className="flex w-full gap-3 text-left"
              onClick={() => onSelect?.(item)}
            >
              <img
                src={item.imageDataUrl}
                alt=""
                className="h-16 w-16 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <p className="font-medium text-[rgb(var(--brand-900))]">{item.title}</p>
                <p className="mt-0.5 text-xs text-[rgb(var(--brand-600))]">
                  {item.tags.join(" · ")}
                </p>
              </div>
            </button>
            <div className="mt-2 flex gap-4 text-sm">
              <button
                type="button"
                className="text-[rgb(var(--brand-700))]"
                onClick={() => toggleFavorite(item.id)}
              >
                {item.favorite ? "Unfavorite" : "Favorite"}
              </button>
              <button
                type="button"
                className="text-red-600"
                onClick={() => discard(item.id)}
              >
                Discard
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
