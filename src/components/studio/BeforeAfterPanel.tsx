"use client";

import { useMemo, useState } from "react";
import type { MediaItem } from "@/lib/studio/media-store";
import {
  createMediaFromFile,
  getMediaDisplayUrl,
  resolveMediaDataUrl,
  saveDataUrlToLibrary,
} from "@/lib/studio/media-store";
import { enhanceImageDataUrl, mergeBeforeAfterSideBySide } from "@/lib/studio/enhance";
import { ImageCompareSlider } from "./ImageCompareSlider";

interface BeforeAfterPanelProps {
  items: MediaItem[];
  onChange: () => void;
  onMerged?: (item: MediaItem) => void;
}

export function BeforeAfterPanel({ items, onChange, onMerged }: BeforeAfterPanelProps) {
  const [open, setOpen] = useState(false);
  const photos = useMemo(
    () => items.filter((i) => i.kind === "photo" || i.kind === "before-after"),
    [items],
  );
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);
  const [enhanceBefore, setEnhanceBefore] = useState(false);
  const [enhanceAfter, setEnhanceAfter] = useState(false);
  const [beforePrompt, setBeforePrompt] = useState("");
  const [afterPrompt, setAfterPrompt] = useState("");
  const [previewBefore, setPreviewBefore] = useState<string | null>(null);
  const [previewAfter, setPreviewAfter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickTarget, setPickTarget] = useState<"before" | "after" | null>(null);

  const beforeItem = photos.find((p) => p.id === beforeId) ?? null;
  const afterItem = photos.find((p) => p.id === afterId) ?? null;
  const hasSelection = beforeId !== null || afterId !== null || previewBefore !== null;

  function clearSide(side: "before" | "after") {
    if (side === "before") {
      setBeforeId(null);
      setEnhanceBefore(false);
      setBeforePrompt("");
    } else {
      setAfterId(null);
      setEnhanceAfter(false);
      setAfterPrompt("");
    }
    setPreviewBefore(null);
    setPreviewAfter(null);
    setError(null);
  }

  function clearAll() {
    setBeforeId(null);
    setAfterId(null);
    setEnhanceBefore(false);
    setEnhanceAfter(false);
    setBeforePrompt("");
    setAfterPrompt("");
    setPreviewBefore(null);
    setPreviewAfter(null);
    setPickTarget(null);
    setError(null);
  }

  async function handleUpload(target: "before" | "after", file: File) {
    setError(null);
    setPreviewBefore(null);
    setPreviewAfter(null);
    const item = await createMediaFromFile(file);
    onChange();
    if (target === "before") setBeforeId(item.id);
    else setAfterId(item.id);
  }

  function selectFromLibrary(id: string) {
    if (!pickTarget) return;

    const currentId = pickTarget === "before" ? beforeId : afterId;
    if (currentId === id) {
      clearSide(pickTarget);
    } else if (pickTarget === "before") {
      setBeforeId(id);
    } else {
      setAfterId(id);
    }

    setPreviewBefore(null);
    setPreviewAfter(null);
    setPickTarget(null);
    setError(null);
  }

  async function buildPreview(): Promise<{ before: string; after: string } | null> {
    if (!beforeItem || !afterItem) {
      setError("Choose both a before and an after photo.");
      return null;
    }
    setBusy(true);
    setError(null);
    try {
      let beforeUrl = await resolveMediaDataUrl(beforeItem);
      let afterUrl = await resolveMediaDataUrl(afterItem);
      if (enhanceBefore) {
        beforeUrl = await enhanceImageDataUrl(beforeUrl, {
          prompt: beforePrompt,
          auto: !beforePrompt.trim(),
        });
      }
      if (enhanceAfter) {
        afterUrl = await enhanceImageDataUrl(afterUrl, {
          prompt: afterPrompt,
          auto: !afterPrompt.trim(),
        });
      }
      setPreviewBefore(beforeUrl);
      setPreviewAfter(afterUrl);
      return { before: beforeUrl, after: afterUrl };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function saveMerged() {
    setBusy(true);
    setError(null);
    try {
      const preview =
        previewBefore && previewAfter
          ? { before: previewBefore, after: previewAfter }
          : await buildPreview();
      if (!preview) return;

      const mergedUrl = await mergeBeforeAfterSideBySide(preview.before, preview.after);
      const item = await saveDataUrlToLibrary({
        name: "Before / After",
        dataUrl: mergedUrl,
        kind: "before-after",
        beforeId: beforeId ?? undefined,
        afterId: afterId ?? undefined,
      });
      onChange();
      onMerged?.(item);
      clearAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save merge");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[rgb(var(--brand-200))] bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 p-4">
        <div>
          <h2 className="font-serif text-lg text-[rgb(var(--brand-900))]">Before &amp; after</h2>
          <p className="mt-1 text-sm text-[rgb(var(--brand-600))]">
            Optional — merge two photos when you need a comparison creative.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-lg border border-[rgb(var(--brand-200))] px-3 py-2 text-xs font-medium text-[rgb(var(--brand-800))]"
        >
          {open ? "Hide" : "Merge photos"}
        </button>
      </div>

      {open ? (
        <div className="space-y-4 border-t border-[rgb(var(--brand-100))] px-4 pb-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {(["before", "after"] as const).map((side) => {
              const selected = side === "before" ? beforeItem : afterItem;
              const selectedId = side === "before" ? beforeId : afterId;
              const enhanceOn = side === "before" ? enhanceBefore : enhanceAfter;
              const setEnhanceOn = side === "before" ? setEnhanceBefore : setEnhanceAfter;
              const prompt = side === "before" ? beforePrompt : afterPrompt;
              const setPrompt = side === "before" ? setBeforePrompt : setAfterPrompt;
              return (
                <div
                  key={side}
                  className="rounded-xl border border-[rgb(var(--brand-100))] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold capitalize text-[rgb(var(--brand-800))]">
                      {side}
                    </p>
                    {selected ? (
                      <button
                        type="button"
                        onClick={() => clearSide(side)}
                        className="text-xs font-medium text-[rgb(var(--brand-600))] underline"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-2 aspect-square overflow-hidden rounded-lg bg-[rgb(var(--brand-100))]">
                    {selected ? (
                      <img
                        src={getMediaDisplayUrl(selected)}
                        alt={`${side} selected`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-3 text-center text-xs text-[rgb(var(--brand-500))]">
                        No photo selected
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`rounded-lg border px-2 py-1 text-xs font-medium ${
                        pickTarget === side
                          ? "border-[rgb(var(--brand-600))] bg-[rgb(var(--brand-100))]"
                          : "border-[rgb(var(--brand-200))]"
                      }`}
                      onClick={() =>
                        setPickTarget((current) => (current === side ? null : side))
                      }
                    >
                      {pickTarget === side ? "Cancel pick" : "From library"}
                    </button>
                    <label className="cursor-pointer rounded-lg border border-[rgb(var(--brand-200))] px-2 py-1 text-xs font-medium">
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleUpload(side, file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  {selected ? (
                    <>
                      <label className="mt-3 flex items-center gap-2 text-xs font-medium text-[rgb(var(--brand-800))]">
                        <input
                          type="checkbox"
                          checked={enhanceOn}
                          onChange={(e) => setEnhanceOn(e.target.checked)}
                          className="h-4 w-4 rounded border-[rgb(var(--brand-300))]"
                        />
                        Enhance {side} photo
                      </label>
                      {enhanceOn ? (
                        <textarea
                          rows={2}
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder={`Describe how to enhance the ${side} photo. Leave blank for auto-enhance.`}
                          className="mt-2 w-full rounded-lg border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] px-2 py-1.5 text-xs"
                        />
                      ) : null}
                    </>
                  ) : null}
                  {pickTarget === side ? (
                    <p className="mt-2 text-[11px] text-[rgb(var(--brand-600))]">
                      Tap a photo below to assign it. Tap the selected photo again to clear.
                    </p>
                  ) : null}
                  {selectedId && pickTarget !== side ? (
                    <p className="mt-2 truncate text-[11px] text-[rgb(var(--brand-500))]">
                      Selected: {selected?.name}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          {pickTarget ? (
            <div className="rounded-xl border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Pick {pickTarget} photo</p>
                <button type="button" className="text-xs" onClick={() => setPickTarget(null)}>
                  Done
                </button>
              </div>
              {photos.length === 0 ? (
                <p className="mt-2 text-xs text-[rgb(var(--brand-600))]">
                  Upload photos to your library first.
                </p>
              ) : (
                <ul className="mt-2 grid grid-cols-4 gap-2">
                  {photos.map((p) => {
                    const assigned =
                      p.id === beforeId ? "before" : p.id === afterId ? "after" : null;
                    const isPickTargetSelected =
                      pickTarget === "before" ? beforeId === p.id : afterId === p.id;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => selectFromLibrary(p.id)}
                          className={`relative w-full overflow-hidden rounded ${
                            isPickTargetSelected
                              ? "ring-2 ring-[rgb(var(--brand-700))]"
                              : assigned
                                ? "ring-2 ring-[rgb(var(--brand-400))]"
                                : ""
                          }`}
                        >
                          <img
                            src={getMediaDisplayUrl(p)}
                            alt={p.name}
                            className="aspect-square w-full object-cover"
                          />
                          {assigned ? (
                            <span className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-center text-[10px] font-medium capitalize text-white">
                              {assigned}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}

          {previewBefore && previewAfter ? (
            <div>
              <ImageCompareSlider beforeSrc={previewBefore} afterSrc={previewAfter} />
            </div>
          ) : null}

          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !beforeItem || !afterItem}
              onClick={() => void buildPreview()}
              className="min-h-10 rounded-lg border border-[rgb(var(--brand-300))] px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {busy ? "Working…" : "Preview comparison"}
            </button>
            <button
              type="button"
              disabled={busy || !beforeItem || !afterItem}
              onClick={() => void saveMerged()}
              className="min-h-10 rounded-lg bg-[rgb(var(--brand-800))] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Save merge to library
            </button>
            {hasSelection ? (
              <button
                type="button"
                disabled={busy}
                onClick={clearAll}
                className="min-h-10 rounded-lg px-4 py-2 text-sm font-medium text-[rgb(var(--brand-600))] underline disabled:opacity-60"
              >
                Clear all
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
