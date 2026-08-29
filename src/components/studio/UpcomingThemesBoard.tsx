"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getCategory } from "@/lib/studio/categories";
import type { StudioCategoryId } from "@/lib/studio/types";
import { StudioNav } from "@/components/studio/StudioNav";

interface ThemeRow {
  id: string;
  date: string;
  day: string;
  categoryId: StudioCategoryId;
  format: string;
  funnel: string;
  angle: string;
  hook: string;
  engagementWhy: string;
  cta: string;
  platforms: string[];
  subjectMode: string;
  imageHints: string[];
  compliance: string[];
}

interface ThemesPayload {
  meta: {
    horizonStart: string;
    horizonEnd: string;
    minDaysAhead: number;
    note: string;
    generatedAt: string;
  };
  themes: ThemeRow[];
  uniqueDays?: number;
  categoryCounts?: Record<string, number>;
  error?: string;
}

export function UpcomingThemesBoard() {
  const [data, setData] = useState<ThemesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/studio/upcoming-themes");
      const json = (await res.json()) as ThemesPayload;
      if (!res.ok) {
        setError(json.error || "Could not load themes");
        return;
      }
      setData(json);
    } catch {
      setError("Network error loading themes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const list = data?.themes || [];
    if (categoryFilter === "all") return list;
    return list.filter((t) => t.categoryId === categoryFilter);
  }, [data, categoryFilter]);

  const categories = useMemo(() => {
    const ids = new Set((data?.themes || []).map((t) => t.categoryId));
    return [...ids].sort();
  }, [data]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[rgb(var(--brand-600))]">
            Automation
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-playfair)] text-2xl text-[rgb(var(--brand-900))] sm:text-3xl">
            Themes
          </h1>
          <p className="mt-2 hidden max-w-2xl text-sm text-[rgb(var(--brand-700))] sm:block">
            Rolling {data?.meta.minDaysAhead ?? 35}+ day plan used when the
            calendar has no hand-authored row for a day.
          </p>
          <StudioNav />
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/studio/upcoming-themes?format=csv"
            className="min-h-10 rounded-lg bg-[rgb(var(--brand-800))] px-3 py-2 text-sm font-medium text-white hover:bg-[rgb(var(--brand-900))]"
          >
            Download Excel CSV
          </a>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="min-h-10 rounded-lg border border-[rgb(var(--brand-300))] bg-white px-3 py-2 text-sm text-[rgb(var(--brand-800))] hover:bg-[rgb(var(--brand-50))] disabled:opacity-60"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {data ? (
        <div className="mt-6 flex flex-wrap gap-3 text-xs text-[rgb(var(--brand-700))]">
          <span className="rounded-md bg-white px-2.5 py-1.5 ring-1 ring-[rgb(var(--brand-200))]">
            Horizon: {data.meta.horizonStart} → {data.meta.horizonEnd}
          </span>
          <span className="rounded-md bg-white px-2.5 py-1.5 ring-1 ring-[rgb(var(--brand-200))]">
            {data.uniqueDays ?? "—"} days · {data.themes.length} creatives
          </span>
          {Object.entries(data.categoryCounts || {}).map(([id, n]) => (
            <span
              key={id}
              className="rounded-md bg-white px-2.5 py-1.5 ring-1 ring-[rgb(var(--brand-200))]"
            >
              {getCategory(id as StudioCategoryId).label}: {n}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="text-xs font-medium text-[rgb(var(--brand-800))]">
          Filter category
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="ml-2 rounded-lg border border-[rgb(var(--brand-200))] bg-white px-2 py-1.5 text-sm"
          >
            <option value="all">All</option>
            {categories.map((id) => (
              <option key={id} value={id}>
                {getCategory(id as StudioCategoryId).label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-xl border border-[rgb(var(--brand-200))] bg-white shadow-sm">
        <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] text-xs uppercase tracking-wide text-[rgb(var(--brand-700))]">
              <th className="sticky left-0 z-10 bg-[rgb(var(--brand-50))] px-3 py-3 font-semibold">
                Date
              </th>
              <th className="px-3 py-3 font-semibold">Category</th>
              <th className="px-3 py-3 font-semibold">Format</th>
              <th className="px-3 py-3 font-semibold">Angle</th>
              <th className="px-3 py-3 font-semibold">Hook</th>
              <th className="px-3 py-3 font-semibold">Why it engages</th>
              <th className="px-3 py-3 font-semibold">CTA</th>
              <th className="px-3 py-3 font-semibold">Funnel</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-10 text-center text-[rgb(var(--brand-600))]"
                >
                  Loading themes…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-10 text-center text-[rgb(var(--brand-600))]"
                >
                  No themes in this filter.
                </td>
              </tr>
            ) : (
              rows.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-[rgb(var(--brand-100))] align-top hover:bg-[rgb(var(--brand-50))]/60"
                >
                  <td className="sticky left-0 z-10 bg-white px-3 py-3 whitespace-nowrap">
                    <div className="font-medium text-[rgb(var(--brand-900))]">
                      {t.date}
                    </div>
                    <div className="text-xs text-[rgb(var(--brand-600))]">
                      {t.day}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-[rgb(var(--brand-800))]">
                    {getCategory(t.categoryId).label}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-[rgb(var(--brand-700))]">
                    {t.format}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-[rgb(var(--brand-700))]">
                    {t.angle}
                  </td>
                  <td className="px-3 py-3 max-w-[280px] text-[rgb(var(--brand-900))]">
                    {t.hook}
                  </td>
                  <td className="px-3 py-3 max-w-[320px] text-[rgb(var(--brand-700))]">
                    {t.engagementWhy}
                  </td>
                  <td className="px-3 py-3 max-w-[200px] text-[rgb(var(--brand-800))]">
                    {t.cta}
                  </td>
                  <td className="px-3 py-3 uppercase text-xs text-[rgb(var(--brand-600))]">
                    {t.funnel}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-[rgb(var(--brand-600))]">
        {data?.meta.note} Open the CSV in Excel or Google Sheets for filtering
        and comments with the team.
      </p>
    </div>
  );
}
