"use client";

import type { StudioCategory } from "@/lib/studio/categories";
import type { StudioCategoryId, StudioLanguage } from "@/lib/studio/types";

interface CaptionPanelProps {
  language: StudioLanguage;
  /** Caption theme — defaults from selected media, overridable for mix-and-match */
  categoryId: StudioCategoryId;
  categories: StudioCategory[];
  selectedPhotoName: string | null;
  selectedIsAi: boolean;
  selectedIsVideo?: boolean;
  /** Theme stored on the selected media (for “default from image” hint) */
  mediaCategoryLabel?: string | null;
  loading: boolean;
  aiLoading: boolean;
  publishLoading: boolean;
  error: string;
  warning: string;
  hasActive: boolean;
  favorite?: boolean;
  onLanguageChange: (lang: StudioLanguage) => void;
  onCategoryChange: (id: StudioCategoryId) => void;
  onGenerateAd: () => void;
  onCopyCaption: () => void;
  onCopyHashtags: () => void;
  onDownloadPack: () => void;
  onToggleFavorite?: () => void;
  onDiscard?: () => void;
}

export function CaptionPanel({
  language,
  categoryId,
  categories,
  selectedPhotoName,
  selectedIsAi,
  selectedIsVideo = false,
  mediaCategoryLabel = null,
  loading,
  aiLoading,
  publishLoading,
  error,
  warning,
  hasActive,
  favorite,
  onLanguageChange,
  onCategoryChange,
  onGenerateAd,
  onCopyCaption,
  onCopyHashtags,
  onDownloadPack,
  onToggleFavorite,
  onDiscard,
}: CaptionPanelProps) {
  const busy = loading || aiLoading || publishLoading;
  const canGenerateAd = Boolean(selectedPhotoName);

  return (
    <section className="rounded-2xl border border-[rgb(var(--brand-200))] bg-white p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-[rgb(var(--brand-900))]">
        Caption
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 sm:max-w-xl">
        <label className="block text-sm">
          <span className="font-medium text-[rgb(var(--brand-800))]">
            Theme
          </span>
          <select
            value={categoryId}
            onChange={(e) =>
              onCategoryChange(e.target.value as StudioCategoryId)
            }
            disabled={busy}
            className="mt-1.5 w-full rounded-lg border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] px-3 py-2.5 text-base sm:text-sm text-[rgb(var(--brand-950))]"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-[rgb(var(--brand-800))]">
            Language
          </span>
          <select
            value={language}
            onChange={(e) =>
              onLanguageChange(e.target.value as StudioLanguage)
            }
            disabled={busy}
            className="mt-1.5 w-full rounded-lg border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] px-3 py-2.5 text-base sm:text-sm text-[rgb(var(--brand-950))]"
          >
            <option value="en">English</option>
            <option value="fr">French</option>
            <option value="both">English + French</option>
          </select>
        </label>
      </div>

      <p className="mt-3 text-xs text-[rgb(var(--brand-600))]">
        {selectedPhotoName
          ? `Selected: ${selectedPhotoName}${selectedIsAi ? " · AI" : ""}${selectedIsVideo ? " · video" : ""}${
              mediaCategoryLabel ? ` · ${mediaCategoryLabel}` : ""
            }`
          : "Select a photo or video above."}
      </p>

      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {warning ? (
        <p className="mt-3 text-sm text-amber-800" role="status">
          {warning}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onGenerateAd}
        disabled={busy || !canGenerateAd}
        className="mt-4 min-h-12 w-full rounded-lg bg-[rgb(var(--brand-800))] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[rgb(var(--brand-900))] disabled:opacity-60 sm:max-w-md"
      >
        {loading
          ? "Writing…"
          : hasActive
            ? "New caption"
            : "Generate caption"}
      </button>

      {hasActive ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onCopyCaption}
            className="min-h-11 rounded-lg border border-[rgb(var(--brand-300))] px-3 py-2 text-sm hover:bg-[rgb(var(--brand-50))]"
          >
            Copy caption
          </button>
          <button
            type="button"
            onClick={onCopyHashtags}
            className="min-h-11 rounded-lg border border-[rgb(var(--brand-300))] px-3 py-2 text-sm hover:bg-[rgb(var(--brand-50))]"
          >
            Copy hashtags
          </button>
          <button
            type="button"
            onClick={onDownloadPack}
            className="min-h-11 rounded-lg border border-[rgb(var(--brand-300))] px-3 py-2 text-sm hover:bg-[rgb(var(--brand-50))]"
          >
            Share pack
          </button>
          {onToggleFavorite ? (
            <button
              type="button"
              onClick={onToggleFavorite}
              className="min-h-11 rounded-lg border border-[rgb(var(--brand-300))] px-3 py-2 text-sm hover:bg-[rgb(var(--brand-50))]"
            >
              {favorite ? "★ Favorited" : "☆ Favorite"}
            </button>
          ) : null}
          {onDiscard ? (
            <button
              type="button"
              onClick={onDiscard}
              className="min-h-11 rounded-lg px-3 py-2 text-sm text-red-700 hover:underline"
            >
              Discard
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
