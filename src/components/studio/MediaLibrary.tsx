"use client";

import { useRef, useState } from "react";
import type { MediaItem } from "@/lib/studio/media-store";
import {
  createMediaFromFile,
  deleteMedia,
  saveMedia,
  newMediaId,
} from "@/lib/studio/media-store";
import { enhanceImageDataUrl } from "@/lib/studio/enhance";

interface MediaLibraryProps {
  items: MediaItem[];
  onChange: () => void;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  selectionMode?: boolean;
}

export function MediaLibrary({
  items,
  onChange,
  selectedIds = [],
  onToggleSelect,
  selectionMode = false,
}: MediaLibraryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        await createMediaFromFile(file);
      }
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleEnhance(item: MediaItem) {
    const prompt = prompts[item.id]?.trim();
    setBusyId(item.id);
    setError(null);
    try {
      const enhancedUrl = await enhanceImageDataUrl(item.dataUrl, {
        prompt,
        auto: !prompt,
      });
      const now = Date.now();
      await saveMedia({
        id: newMediaId(),
        name: `${item.name} (enhanced)`,
        dataUrl: enhancedUrl,
        createdAt: now,
        updatedAt: now,
        kind: item.kind,
        enhancementPrompt: prompt || "auto enhance",
        sourceId: item.id,
      });
      setExpandedId(null);
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enhancement failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    await deleteMedia(id);
    if (expandedId === id) setExpandedId(null);
    onChange();
  }

  return (
    <section className="rounded-2xl border border-[rgb(var(--brand-200))] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-lg text-[rgb(var(--brand-900))]">Media library</h2>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="min-h-10 rounded-lg bg-[rgb(var(--brand-800))] px-3 py-2 text-sm font-medium text-white"
        >
          Upload photos
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void handleUpload(e.target.files)}
        />
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-[rgb(var(--brand-600))]">
          Upload clinical or lifestyle photos to use in before/after merges and posts.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => {
            const selected = selectedIds.includes(item.id);
            const expanded = expandedId === item.id;
            return (
              <li key={item.id} className="rounded-xl border border-[rgb(var(--brand-100))] overflow-hidden">
                <button
                  type="button"
                  className={`relative block w-full ${selectionMode ? "ring-offset-2" : ""} ${selected ? "ring-2 ring-[rgb(var(--brand-600))]" : ""}`}
                  onClick={() => {
                    if (selectionMode && onToggleSelect) onToggleSelect(item.id);
                  }}
                >
                  <img
                    src={item.dataUrl}
                    alt={item.name}
                    className="aspect-square w-full object-cover"
                  />
                  {item.enhancementPrompt ? (
                    <span className="absolute left-1 top-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">
                      Enhanced
                    </span>
                  ) : null}
                </button>
                <div className="space-y-2 p-2">
                  <p className="truncate text-xs font-medium text-[rgb(var(--brand-800))]">
                    {item.name}
                  </p>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-[rgb(var(--brand-200))] px-2 py-1.5 text-xs font-medium text-[rgb(var(--brand-800))]"
                    onClick={() => setExpandedId(expanded ? null : item.id)}
                  >
                    {expanded ? "Hide enhance" : "Enhance photo"}
                  </button>
                  {expanded ? (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={prompts[item.id] ?? ""}
                        onChange={(e) =>
                          setPrompts((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        placeholder="Describe the enhancement (e.g. whiten teeth, brighten smile, softer tones)…"
                        className="w-full rounded-lg border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] px-2 py-1.5 text-xs"
                      />
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void handleEnhance(item)}
                        className="w-full rounded-lg bg-[rgb(var(--brand-700))] px-2 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                      >
                        {busyId === item.id ? "Enhancing…" : "Apply enhancement"}
                      </button>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void handleDelete(item.id)}
                    className="text-xs text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
