"use client";

import type { StudioCategory } from "@/lib/studio/categories";
import {
  STUDIO_TTS_VOICES,
  type StudioTtsVoiceId,
} from "@/lib/studio/tts-voices";
import {
  isStudioVideoVoiceModeReady,
  type StudioCategoryId,
  type StudioVideoTone,
  type StudioVideoVoiceMode,
} from "@/lib/studio/types";

interface VideoPrepPanelProps {
  stillPreviewUrl: string | null;
  stillName: string | null;
  script: string;
  scriptLoading: boolean;
  videoLoading: boolean;
  toneLabel: string;
  videoTone?: StudioVideoTone;
  durationLabel?: string;
  voiceModeLabel?: string;
  voiceMode?: StudioVideoVoiceMode;
  ttsVoice: StudioTtsVoiceId;
  ttsPreviewLoading?: boolean;
  scriptCategoryId: StudioCategoryId;
  mediaCategoryId?: StudioCategoryId | null;
  categories: StudioCategory[];
  error?: string;
  warning?: string;
  /** Shown after API fallback so the user can open Higgsfield manually. */
  higgsfieldUrl?: string;
  motionPrompt: string;
  motionPromptLoading?: boolean;
  onMotionPromptChange: (value: string) => void;
  onRegenerateMotionPrompt?: () => void;
  onScriptChange: (script: string) => void;
  onScriptCategoryChange: (id: StudioCategoryId) => void;
  onTtsVoiceChange: (voice: StudioTtsVoiceId) => void;
  onTestTtsVoice: () => void;
  onRegenerateScript: () => void;
  onConfirmVideo: () => void;
  onCancel: () => void;
}

export function VideoPrepPanel({
  stillPreviewUrl,
  stillName,
  script,
  scriptLoading,
  videoLoading,
  toneLabel,
  videoTone = "warm",
  durationLabel = "",
  voiceModeLabel = "",
  voiceMode = "silent",
  ttsVoice,
  ttsPreviewLoading = false,
  scriptCategoryId,
  mediaCategoryId = null,
  categories,
  error = "",
  warning = "",
  higgsfieldUrl = "",
  motionPrompt,
  motionPromptLoading = false,
  onMotionPromptChange,
  onRegenerateMotionPrompt,
  onScriptChange,
  onScriptCategoryChange,
  onTtsVoiceChange,
  onTestTtsVoice,
  onRegenerateScript,
  onConfirmVideo,
  onCancel,
}: VideoPrepPanelProps) {
  const busy = scriptLoading || videoLoading || ttsPreviewLoading || motionPromptLoading;
  const needsSpokenAudio =
    voiceMode === "v1_voiceover" || voiceMode === "v2_talking_head";
  const canConfirm = Boolean(
    stillPreviewUrl && script.trim() && isStudioVideoVoiceModeReady(voiceMode)
  );
  const canTestVoice = Boolean(script.trim() && needsSpokenAudio);
  const showHiggsfieldLink = Boolean(
    higgsfieldUrl && (error || warning) && !videoLoading
  );
  const selectedVoiceHint =
    STUDIO_TTS_VOICES.find((v) => v.id === ttsVoice)?.hint || "";

  return (
    <section className="rounded-2xl border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-[rgb(var(--brand-900))]">
            Video prep
          </h2>
          <p className="mt-1 text-xs text-[rgb(var(--brand-600))]">
            {toneLabel}
            {durationLabel ? ` · ${durationLabel}` : ""}
            {voiceModeLabel ? ` · ${voiceModeLabel}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="text-sm text-[rgb(var(--brand-700))] hover:underline disabled:opacity-60"
        >
          Cancel prep
        </button>
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
      {showHiggsfieldLink ? (
        <p className="mt-2">
          <a
            href={higgsfieldUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-[rgb(var(--brand-800))] underline underline-offset-2 hover:text-[rgb(var(--brand-950))]"
          >
            Open Higgsfield
          </a>
        </p>
      ) : null}
      {videoLoading ? (
        <p className="mt-3 text-sm text-[rgb(var(--brand-700))]" role="status">
          Generating video… keep this tab open.
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr]">
        <div className="overflow-hidden rounded-xl border border-[rgb(var(--brand-200))] bg-white">
          <div className="aspect-square bg-[rgb(var(--brand-100))]">
            {stillPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={stillPreviewUrl}
                alt={stillName || "Video still"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-2 text-center text-xs text-[rgb(var(--brand-600))]">
                Preparing still…
              </div>
            )}
          </div>
          {stillName ? (
            <p className="truncate px-2 py-1.5 text-[11px] text-[rgb(var(--brand-700))]">
              {stillName}
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-medium text-[rgb(var(--brand-800))]">
            Script theme
            <select
              value={scriptCategoryId}
              onChange={(e) =>
                onScriptCategoryChange(e.target.value as StudioCategoryId)
              }
              disabled={busy}
              className="mt-1.5 w-full rounded-lg border border-[rgb(var(--brand-200))] bg-white px-3 py-2 text-sm text-[rgb(var(--brand-950))] disabled:opacity-60"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          {mediaCategoryId && mediaCategoryId !== scriptCategoryId ? (
            <p className="text-[11px] text-[rgb(var(--brand-600))]">
              Still was{" "}
              {categories.find((c) => c.id === mediaCategoryId)?.label ||
                mediaCategoryId}
              ; script is{" "}
              {categories.find((c) => c.id === scriptCategoryId)?.label ||
                scriptCategoryId}
              . Changing theme writes a new script.
            </p>
          ) : (
            <p className="text-[11px] text-[rgb(var(--brand-600))]">
              Defaults to this still&apos;s theme — change it to pair the photo
              with a different treatment script.
            </p>
          )}

          <label className="block text-xs font-medium text-[rgb(var(--brand-800))]">
            Animation prompt
            <textarea
              value={motionPrompt}
              onChange={(e) => onMotionPromptChange(e.target.value)}
              rows={4}
              disabled={busy}
              placeholder="How this still should move…"
              className="mt-1.5 w-full rounded-lg border border-[rgb(var(--brand-200))] bg-white px-3 py-2 text-sm text-[rgb(var(--brand-950))]"
            />
          </label>
          {onRegenerateMotionPrompt ? (
            <button
              type="button"
              onClick={onRegenerateMotionPrompt}
              disabled={busy}
              className="text-xs font-medium text-[rgb(var(--brand-800))] underline underline-offset-2 disabled:opacity-60"
            >
              {motionPromptLoading ? "Writing motion…" : "Rewrite animation prompt"}
            </button>
          ) : null}

          <label className="block text-xs font-medium text-[rgb(var(--brand-800))]">
            Video script (spoken)
            <textarea
              value={script}
              onChange={(e) => onScriptChange(e.target.value)}
              rows={7}
              disabled={busy && !script}
              placeholder="AI will draft a short spoken voiceover for this topic…"
              className="mt-1.5 w-full rounded-lg border border-[rgb(var(--brand-200))] bg-white px-3 py-2 text-sm text-[rgb(var(--brand-950))]"
            />
          </label>

          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-[200px] flex-1 text-xs font-medium text-[rgb(var(--brand-800))]">
              Spoken voice
              <select
                value={ttsVoice}
                onChange={(e) =>
                  onTtsVoiceChange(e.target.value as StudioTtsVoiceId)
                }
                disabled={busy || !needsSpokenAudio}
                className="mt-1.5 w-full rounded-lg border border-[rgb(var(--brand-200))] bg-white px-3 py-2 text-sm text-[rgb(var(--brand-950))] disabled:opacity-60"
              >
                {STUDIO_TTS_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={onTestTtsVoice}
              disabled={busy || !canTestVoice}
              className="min-h-11 rounded-lg border border-[rgb(var(--brand-300))] bg-white px-4 py-2.5 text-sm font-semibold text-[rgb(var(--brand-900))] hover:bg-white/80 disabled:opacity-60"
            >
              {ttsPreviewLoading ? "Playing…" : "Test voice"}
            </button>
          </div>
          <p className="text-[11px] text-[rgb(var(--brand-600))]">
            {needsSpokenAudio
              ? selectedVoiceHint ||
                "Pick a Male / Female / Neutral voice, then Test voice to hear the script before generating."
              : "Switch Video audio to V1 or V2 to choose and preview a spoken voice."}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRegenerateScript}
          disabled={busy || !stillPreviewUrl}
          className="min-h-11 rounded-lg border border-[rgb(var(--brand-300))] bg-white px-4 py-2.5 text-sm font-semibold text-[rgb(var(--brand-900))] hover:bg-white/80 disabled:opacity-60"
        >
          {scriptLoading ? "Writing script…" : "Regenerate script"}
        </button>
        <button
          type="button"
          onClick={onConfirmVideo}
          disabled={busy || !canConfirm}
          className="min-h-11 rounded-lg bg-[rgb(var(--brand-800))] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[rgb(var(--brand-900))] disabled:opacity-60"
        >
          {videoLoading
            ? voiceMode === "v1_voiceover"
              ? "Generating video + voiceover…"
              : voiceMode === "v2_talking_head"
                ? "Generating video + talking head…"
                : "Generating AI video…"
            : voiceMode === "v1_voiceover"
              ? "Generate video with V1 voiceover"
              : voiceMode === "v2_talking_head"
                ? "Generate video with V2 talking head"
                : "Generate video with this script"}
        </button>
      </div>
    </section>
  );
}
