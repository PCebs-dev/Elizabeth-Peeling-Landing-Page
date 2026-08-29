"use client";

import { useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import type { StudioCategory } from "@/lib/studio/categories";
import type { StudioCategoryId, StudioPhoto } from "@/lib/studio/types";

interface PhotoLibraryProps {
  photos: StudioPhoto[];
  ready: boolean;
  selectedId: string | null;
  beforeMergeId?: string | null;
  afterMergeId?: string | null;
  mergePickSlot?: "before" | "after" | "video" | null;
  videoStillId?: string | null;
  categories: StudioCategory[];
  onUpload: (files: FileList | File[], categoryId: StudioCategoryId) => Promise<void>;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
}

export function PhotoLibrary({
  photos,
  ready,
  selectedId,
  beforeMergeId = null,
  afterMergeId = null,
  mergePickSlot = null,
  videoStillId = null,
  categories,
  onUpload,
  onSelect,
  onDelete,
  onNoteChange,
}: PhotoLibraryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [uploadCategory, setUploadCategory] =
    useState<StudioCategoryId>("invisalign");
  const [filter, setFilter] = useState<StudioCategoryId | "all">("all");
  const [dragging, setDragging] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const PREVIEW_LIMIT = 24;

  const filtered =
    filter === "all" ? photos : photos.filter((p) => p.categoryId === filter);
  const visible = showAll ? filtered : filtered.slice(0, PREVIEW_LIMIT);
  const hiddenCount = Math.max(0, filtered.length - PREVIEW_LIMIT);

  async function handleFiles(files: FileList | File[] | null) {
    if (!files || (Array.isArray(files) ? files.length === 0 : files.length === 0))
      return;
    await onUpload(files, uploadCategory);
  }

  return (
    <section
      id="studio-media-library"
      className="rounded-2xl border border-[rgb(var(--brand-200))] bg-white p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[rgb(var(--brand-900))]">
          Media library
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-[rgb(var(--brand-700))]">
            Theme
            <select
              value={uploadCategory}
              onChange={(e) =>
                setUploadCategory(e.target.value as StudioCategoryId)
              }
              className="ml-2 min-h-11 rounded-md border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] px-2 py-1.5 text-base sm:text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="min-h-11 rounded-lg bg-[rgb(var(--brand-800))] px-4 py-2 text-sm font-medium text-white hover:bg-[rgb(var(--brand-900))]"
          >
            Upload
          </button>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="min-h-11 rounded-lg border border-[rgb(var(--brand-300))] px-4 py-2 text-sm font-medium text-[rgb(var(--brand-800))] hover:bg-[rgb(var(--brand-50))]"
          >
            Camera
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime,video/*"
            multiple
            className="sr-only"
            style={{ display: "none" }}
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            className="sr-only"
            style={{ display: "none" }}
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={`mt-4 hidden rounded-xl border-2 border-dashed px-4 py-8 text-center text-sm transition sm:block ${
          dragging
            ? "border-[rgb(var(--brand-500))] bg-[rgb(var(--brand-50))]"
            : "border-[rgb(var(--brand-200))] text-[rgb(var(--brand-600))]"
        }`}
      >
        Drop photos or videos here
      </div>

      <div className="mt-4 hidden flex-wrap gap-2 sm:flex">
        <FilterChip
          active={filter === "all"}
          onClick={() => {
            setFilter("all");
            setShowAll(false);
          }}
          label={`All (${photos.length})`}
        />
        {categories.map((c) => {
          const count = photos.filter((p) => p.categoryId === c.id).length;
          return (
            <FilterChip
              key={c.id}
              active={filter === c.id}
              onClick={() => {
                setFilter(c.id);
                setShowAll(false);
              }}
              label={`${c.label} (${count})`}
            />
          );
        })}
      </div>

      {!ready ? (
        <p className="mt-6 text-sm text-[rgb(var(--brand-600))]">
          Loading library…
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-6 text-sm text-[rgb(var(--brand-600))]">
          No media in this category yet.
        </p>
      ) : (
        <>
          {mergePickSlot ? (
            <p className="mt-4 rounded-lg bg-[rgb(var(--brand-100))] px-3 py-2 text-xs text-[rgb(var(--brand-800))]">
              Tap a photo to set{" "}
              {mergePickSlot === "before"
                ? "Before"
                : mergePickSlot === "after"
                  ? "After"
                  : "the video still"}
              . Tap it again to deselect.
            </p>
          ) : null}
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {visible.map((photo) => {
              const selected = selectedId === photo.id;
              const isBefore = beforeMergeId === photo.id;
              const isAfter = afterMergeId === photo.id;
              const isVideoStill = videoStillId === photo.id;
              const isVideo =
                photo.mediaKind === "video" ||
                photo.mimeType.startsWith("video/");
              return (
                <li
                  key={photo.id}
                  className={`overflow-hidden rounded-lg border transition ${
                    selected || isBefore || isAfter || isVideoStill
                      ? "border-[rgb(var(--brand-600))] ring-2 ring-[rgb(var(--brand-300))]"
                      : "border-[rgb(var(--brand-200))] hover:border-[rgb(var(--brand-400))]"
                  }`}
                >
                  {isVideo ? (
                    <LibraryVideoThumb
                      photo={photo}
                      selected={selected}
                      onSelect={() => onSelect(photo.id)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelect(photo.id)}
                      aria-pressed={selected}
                      className="relative block w-full aspect-square bg-[rgb(var(--brand-100))]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.previewUrl}
                        alt={photo.name}
                        className="h-full w-full object-cover"
                      />
                      <span
                        className={`absolute left-1 top-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          isBefore
                            ? "bg-amber-700 text-white"
                            : isAfter
                              ? "bg-emerald-700 text-white"
                              : selected
                                ? "bg-[rgb(var(--brand-800))] text-white"
                                : "bg-white/90 text-[rgb(var(--brand-800))]"
                        }`}
                      >
                        {isBefore
                          ? "Before"
                          : isAfter
                            ? "After"
                            : selected
                              ? "Selected"
                              : "Select"}
                      </span>
                      {photo.enhancedFromId ? (
                        <span className="absolute right-1 top-1 rounded bg-amber-700/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          Enhanced
                        </span>
                      ) : photo.source === "ai" ? (
                        <span className="absolute right-1 top-1 rounded bg-amber-700/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          AI
                        </span>
                      ) : (
                        <span className="absolute right-1 top-1 rounded bg-[rgb(var(--brand-800))]/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          Upload
                        </span>
                      )}
                    </button>
                  )}
                  <div
                    className="space-y-1.5 p-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="truncate text-[10px] text-[rgb(var(--brand-600))]">
                      {photo.name}
                    </p>
                    <input
                      type="text"
                      value={photo.note}
                      onChange={(e) => onNoteChange(photo.id, e.target.value)}
                      placeholder="Note"
                      className="w-full rounded border border-[rgb(var(--brand-200))] px-1.5 py-1 text-[10px]"
                    />
                    {!isVideo ? (
                      <Link
                        href={`/studio/enhance?photoId=${encodeURIComponent(photo.id)}`}
                        className="block min-h-8 w-full rounded-md border border-[rgb(var(--brand-300))] bg-white px-2 py-1 text-center text-[10px] font-medium text-[rgb(var(--brand-800))] hover:bg-[rgb(var(--brand-50))]"
                      >
                        Enhance
                      </Link>
                    ) : null}
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => onSelect(photo.id)}
                        className="text-[10px] font-medium text-[rgb(var(--brand-800))] hover:underline"
                      >
                        {selected ? "Selected" : "Use"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(photo.id)}
                        className="text-[10px] text-red-700 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {hiddenCount > 0 ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="min-h-11 rounded-lg border border-[rgb(var(--brand-300))] bg-white px-4 py-2 text-sm font-medium text-[rgb(var(--brand-800))] hover:bg-[rgb(var(--brand-50))]"
              >
                {showAll ? "Show less" : `See more (${hiddenCount})`}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function LibraryVideoThumb({
  photo,
  selected,
  onSelect,
}: {
  photo: StudioPhoto;
  selected: boolean;
  onSelect: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  async function togglePlay(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const el = videoRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
      return;
    }
    try {
      el.muted = false;
      await el.play();
      setPlaying(true);
    } catch {
      try {
        el.muted = true;
        await el.play();
        setPlaying(true);
      } catch {
        /* autoplay blocked */
      }
    }
  }

  return (
    <div className="relative aspect-square bg-[rgb(var(--brand-100))]">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        src={photo.previewUrl}
        className="h-full w-full object-cover"
        playsInline
        preload="metadata"
        controls={playing}
        onClick={(e) => {
          if (!playing) {
            e.preventDefault();
            onSelect();
          }
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      {!playing ? (
        <>
          <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            className="absolute inset-0"
            aria-label={selected ? "Selected" : `Select ${photo.name}`}
          />
          <button
            type="button"
            onClick={togglePlay}
            aria-label={`Play ${photo.name}`}
            className="absolute inset-0 z-10 m-auto flex h-12 w-12 items-center justify-center rounded-full bg-black/70 text-white shadow-md hover:bg-black/85"
          >
            <span className="ml-0.5 text-lg leading-none" aria-hidden>
              ▶
            </span>
          </button>
        </>
      ) : null}
      <span
        className={`pointer-events-none absolute left-1 top-1 z-20 rounded px-1.5 py-0.5 text-[10px] font-medium ${
          selected
            ? "bg-[rgb(var(--brand-800))] text-white"
            : "bg-white/90 text-[rgb(var(--brand-800))]"
        }`}
      >
        {selected ? "Selected" : "Select"}
      </span>
      <span className="pointer-events-none absolute bottom-1 left-1 z-20 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
        Video
      </span>
      {photo.source === "ai" ? (
        <span className="pointer-events-none absolute right-1 top-1 z-20 rounded bg-amber-700/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
          AI
        </span>
      ) : (
        <span className="pointer-events-none absolute right-1 top-1 z-20 rounded bg-[rgb(var(--brand-800))]/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
          Upload
        </span>
      )}
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        active
          ? "bg-[rgb(var(--brand-800))] text-white"
          : "bg-[rgb(var(--brand-100))] text-[rgb(var(--brand-800))] hover:bg-[rgb(var(--brand-200))]"
      }`}
    >
      {label}
    </button>
  );
}
