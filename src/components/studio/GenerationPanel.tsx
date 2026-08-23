"use client";

import type { StudioCategory } from "@/lib/studio/categories";
import {
  STUDIO_VIDEO_DURATIONS,
  STUDIO_VIDEO_TONES,
  STUDIO_VIDEO_VOICE_MODES,
  type StudioCategoryId,
  type StudioVideoDuration,
  type StudioVideoTone,
  type StudioVideoVoiceMode,
} from "@/lib/studio/types";
import { parseOnImageTextLine } from "@/lib/studio/image-context";

interface GenerationPanelProps {
  categoryId: StudioCategoryId;
  categories: StudioCategory[];
  imageContext: string;
  videoTone: StudioVideoTone;
  videoSpokenLanguage: "en" | "fr";
  videoDuration: StudioVideoDuration;
  videoVoiceMode: StudioVideoVoiceMode;
  aiLoading: boolean;
  publishLoading: boolean;
  loading: boolean;
  error: string;
  warning: string;
  onCategoryChange: (id: StudioCategoryId) => void;
  onImageContextChange: (context: string) => void;
  onVideoToneChange: (tone: StudioVideoTone) => void;
  onVideoSpokenLanguageChange: (lang: "en" | "fr") => void;
  onVideoDurationChange: (duration: StudioVideoDuration) => void;
  onVideoVoiceModeChange: (mode: StudioVideoVoiceMode) => void;
  onRandomizeImageContext: (kind: "patient" | "theme" | "mixed") => void;
  onGenerateAiImage: () => void;
  onPrepareAiVideo: () => void;
  onMergeImages?: () => void;
  mergeLoading?: boolean;
  mergePickSlot?: "before" | "after" | null;
  onPickMergeSlot?: (slot: "before" | "after") => void;
  beforeMergePreviewUrl?: string | null;
  afterMergePreviewUrl?: string | null;
  onClearMergeBefore?: () => void;
  onClearMergeAfter?: () => void;
  videoLoading?: boolean;
  videoPrepLoading?: boolean;
  videoPrepActive?: boolean;
}

export function GenerationPanel({
  categoryId,
  categories,
  imageContext,
  videoTone,
  videoSpokenLanguage,
  videoDuration,
  videoVoiceMode,
  aiLoading,
  videoLoading = false,
  videoPrepLoading = false,
  videoPrepActive = false,
  publishLoading,
  loading,
  error,
  warning,
  onCategoryChange,
  onImageContextChange,
  onVideoToneChange,
  onVideoSpokenLanguageChange,
  onVideoDurationChange,
  onVideoVoiceModeChange,
  onRandomizeImageContext,
  onGenerateAiImage,
  onPrepareAiVideo,
  onMergeImages,
  mergeLoading = false,
  mergePickSlot = null,
  onPickMergeSlot,
  beforeMergePreviewUrl = null,
  afterMergePreviewUrl = null,
  onClearMergeBefore,
  onClearMergeAfter,
}: GenerationPanelProps) {
  const busy =
    loading ||
    aiLoading ||
    videoLoading ||
    videoPrepLoading ||
    publishLoading ||
    mergeLoading;
  const canMerge = Boolean(
    onMergeImages && beforeMergePreviewUrl && afterMergePreviewUrl
  );
  const { include: includeOnImageText, headline: onImageHeadline } =
    parseOnImageTextLine(imageContext);

  return (
    <section className="rounded-2xl border border-[rgb(var(--brand-200))] bg-white p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-[rgb(var(--brand-900))]">
        AI image &amp; video
      </h2>

      <label className="mt-4 block text-sm">
        <span className="font-medium text-[rgb(var(--brand-800))]">
          Category
        </span>
        <select
          value={categoryId}
          onChange={(e) =>
            onCategoryChange(e.target.value as StudioCategoryId)
          }
          className="mt-1.5 w-full max-w-md rounded-lg border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] px-3 py-2.5 text-base sm:text-sm"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-4 block text-xs font-medium text-[rgb(var(--brand-800))]">
        Prompt
        <textarea
          value={imageContext}
          onChange={(e) => onImageContextChange(e.target.value)}
          rows={5}
          placeholder={"Describe the image…\nOn-image text: none."}
          className="mt-1.5 w-full rounded-lg border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] px-3 py-2.5 text-base text-[rgb(var(--brand-950))] sm:text-sm"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onRandomizeImageContext("mixed")}
          disabled={busy}
          className="min-h-10 rounded-md border border-[rgb(var(--brand-300))] bg-white px-3 py-1.5 text-xs font-medium text-[rgb(var(--brand-800))] hover:bg-[rgb(var(--brand-100))] disabled:opacity-60"
        >
          Random
        </button>
        <button
          type="button"
          onClick={() => onRandomizeImageContext("patient")}
          disabled={busy}
          className="min-h-10 rounded-md border border-[rgb(var(--brand-300))] bg-white px-3 py-1.5 text-xs font-medium text-[rgb(var(--brand-800))] hover:bg-[rgb(var(--brand-100))] disabled:opacity-60"
        >
          Random patient
        </button>
        <button
          type="button"
          onClick={() => onRandomizeImageContext("theme")}
          disabled={busy}
          className="min-h-10 rounded-md border border-[rgb(var(--brand-300))] bg-white px-3 py-1.5 text-xs font-medium text-[rgb(var(--brand-800))] hover:bg-[rgb(var(--brand-100))] disabled:opacity-60"
        >
          Random theme
        </button>
      </div>

      <div className="mt-4 grid max-w-md gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-[rgb(var(--brand-800))]">
          Video tone
          <select
            value={videoTone}
            onChange={(e) =>
              onVideoToneChange(e.target.value as StudioVideoTone)
            }
            disabled={busy}
            className="mt-1.5 w-full rounded-lg border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] px-3 py-2.5 text-base sm:text-sm text-[rgb(var(--brand-950))]"
          >
            {STUDIO_VIDEO_TONES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-[rgb(var(--brand-800))]">
          Spoken language
          <select
            value={videoSpokenLanguage}
            onChange={(e) =>
              onVideoSpokenLanguageChange(
                e.target.value === "fr" ? "fr" : "en"
              )
            }
            disabled={busy}
            className="mt-1.5 w-full rounded-lg border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] px-3 py-2.5 text-base sm:text-sm text-[rgb(var(--brand-950))]"
          >
            <option value="en">English</option>
            <option value="fr">French</option>
          </select>
        </label>
        <label className="block text-xs font-medium text-[rgb(var(--brand-800))]">
          Length
          <select
            value={videoDuration}
            onChange={(e) =>
              onVideoDurationChange(
                Number(e.target.value) as StudioVideoDuration
              )
            }
            disabled={busy}
            className="mt-1.5 w-full rounded-lg border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] px-3 py-2.5 text-base sm:text-sm text-[rgb(var(--brand-950))]"
          >
            {STUDIO_VIDEO_DURATIONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-[rgb(var(--brand-800))]">
          Audio
          <select
            value={videoVoiceMode}
            onChange={(e) =>
              onVideoVoiceModeChange(e.target.value as StudioVideoVoiceMode)
            }
            disabled={busy}
            className="mt-1.5 w-full rounded-lg border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] px-3 py-2.5 text-base sm:text-sm text-[rgb(var(--brand-950))]"
          >
            {STUDIO_VIDEO_VOICE_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

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

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onGenerateAiImage}
          disabled={busy || (includeOnImageText && !onImageHeadline.trim())}
          className="min-h-12 rounded-lg border-2 border-[rgb(var(--brand-700))] bg-white px-4 py-3 text-sm font-semibold text-[rgb(var(--brand-900))] transition hover:bg-[rgb(var(--brand-50))] disabled:opacity-60"
        >
          {aiLoading ? "Generating…" : "Generate AI image"}
        </button>
        <button
          type="button"
          onClick={() => onMergeImages?.()}
          disabled={busy || !canMerge}
          className="min-h-12 rounded-lg border-2 border-[rgb(var(--brand-500))] bg-white px-4 py-3 text-sm font-semibold text-[rgb(var(--brand-900))] transition hover:bg-[rgb(var(--brand-50))] disabled:opacity-60"
        >
          {mergeLoading ? "Merging…" : "Merge Images"}
        </button>
        <button
          type="button"
          onClick={onPrepareAiVideo}
          disabled={busy}
          className="min-h-12 rounded-lg bg-[rgb(var(--brand-800))] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[rgb(var(--brand-900))] disabled:opacity-60 sm:col-span-2"
        >
          {videoPrepLoading
            ? "Preparing…"
            : videoPrepActive
              ? "Re-prepare video"
              : "Prepare AI video"}
        </button>
      </div>

      {onMergeImages ? (
        <div className="mt-4 rounded-xl border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] p-3">
          <p className="text-xs font-medium text-[rgb(var(--brand-800))]">
            Before / after merge
          </p>
          <p className="mt-1 text-xs text-[rgb(var(--brand-600))]">
            Tap the Before box, then a library photo. Same for After. Tap the
            photo again to deselect.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div
              className={`overflow-hidden rounded-lg border bg-white ${
                mergePickSlot === "before"
                  ? "border-[rgb(var(--brand-600))] ring-2 ring-[rgb(var(--brand-300))]"
                  : "border-[rgb(var(--brand-200))]"
              }`}
            >
              <button
                type="button"
                onClick={() => onPickMergeSlot?.("before")}
                className="block w-full aspect-square bg-[rgb(var(--brand-100))]"
              >
                {beforeMergePreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={beforeMergePreviewUrl}
                    alt="Before"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center px-2 text-xs text-[rgb(var(--brand-600))]">
                    {mergePickSlot === "before"
                      ? "Tap a library photo"
                      : "Tap to choose Before"}
                  </span>
                )}
              </button>
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-[11px] font-medium text-[rgb(var(--brand-800))]">
                  Before
                </span>
                {beforeMergePreviewUrl && onClearMergeBefore ? (
                  <button
                    type="button"
                    onClick={onClearMergeBefore}
                    className="text-[11px] text-red-700 hover:underline"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
            <div
              className={`overflow-hidden rounded-lg border bg-white ${
                mergePickSlot === "after"
                  ? "border-[rgb(var(--brand-600))] ring-2 ring-[rgb(var(--brand-300))]"
                  : "border-[rgb(var(--brand-200))]"
              }`}
            >
              <button
                type="button"
                onClick={() => onPickMergeSlot?.("after")}
                className="block w-full aspect-square bg-[rgb(var(--brand-100))]"
              >
                {afterMergePreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={afterMergePreviewUrl}
                    alt="After"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center px-2 text-xs text-[rgb(var(--brand-600))]">
                    {mergePickSlot === "after"
                      ? "Tap a library photo"
                      : "Tap to choose After"}
                  </span>
                )}
              </button>
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-[11px] font-medium text-[rgb(var(--brand-800))]">
                  After
                </span>
                {afterMergePreviewUrl && onClearMergeAfter ? (
                  <button
                    type="button"
                    onClick={onClearMergeAfter}
                    className="text-[11px] text-red-700 hover:underline"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
