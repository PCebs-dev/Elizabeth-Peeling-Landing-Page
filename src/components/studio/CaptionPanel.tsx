"use client";

import type { StudioCategory } from "@/lib/studio/categories";
import { DEFAULT_CAPTION_PROMPT_PLACEHOLDER } from "@/lib/studio/caption-prompt";
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
  onLanguageChange: (lang: StudioLanguage) => void;
  onCategoryChange: (id: StudioCategoryId) => void;
  captionPrompt: string;
  onCaptionPromptChange: (value: string) => void;
  onRandomizeCaptionPrompt: () => void;
  onRandomizeOdqPrice: () => void;
  onGenerateAd: () => void;
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
  onLanguageChange,
  onCategoryChange,
  captionPrompt,
  onCaptionPromptChange,
  onRandomizeCaptionPrompt,
  onRandomizeOdqPrice,
  onGenerateAd,
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

      <label className="mt-4 block text-xs font-medium text-[rgb(var(--brand-800))]">
        Caption prompt
        <textarea
          value={captionPrompt}
          onChange={(e) => onCaptionPromptChange(e.target.value)}
          rows={12}
          disabled={busy}
          placeholder={DEFAULT_CAPTION_PROMPT_PLACEHOLDER}
          className="mt-1.5 w-full rounded-lg border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] px-3 py-2.5 text-base text-[rgb(var(--brand-950))] sm:text-sm"
        />
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onRandomizeCaptionPrompt}
          disabled={busy}
          className="min-h-10 rounded-md border border-[rgb(var(--brand-300))] bg-white px-3 py-1.5 text-xs font-medium text-[rgb(var(--brand-800))] hover:bg-[rgb(var(--brand-100))] disabled:opacity-60"
        >
          Random prompt
        </button>
        <button
          type="button"
          onClick={onRandomizeOdqPrice}
          disabled={busy}
          className="min-h-10 rounded-md border border-[rgb(var(--brand-300))] bg-white px-3 py-1.5 text-xs font-medium text-[rgb(var(--brand-800))] hover:bg-[rgb(var(--brand-100))] disabled:opacity-60"
        >
          Random price (ODQ)
        </button>
        <p className="text-[11px] leading-snug text-[rgb(var(--brand-600))]">
          AI still writes the caption. Leave the gray hint as-is for a random
          caption in the selected theme. Random price (ODQ) fills draft regular
          / exceptional fees and the other 3.09.07 labels - edit them before
          you publish (an advertised regular fee must hold 90 days).
        </p>
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
    </section>
  );
}
