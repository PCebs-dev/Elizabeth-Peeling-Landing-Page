"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { STUDIO_CATEGORIES } from "@/lib/studio/categories";
import {
  addPhotoFromBase64,
  getPhoto,
  listGalleryPhotos,
  revokePreviewUrls,
} from "@/lib/studio/photos";
import {
  base64ToBlob,
  blobToBase64,
  compressImageForRetouchWithSize,
  studioImageAspect,
} from "@/lib/studio/image-client";
import {
  downloadBlobFile,
  shareOrDownloadImage,
} from "@/lib/studio/export";
import type { StudioCategoryId, StudioPhoto } from "@/lib/studio/types";
import { StudioNav } from "@/components/studio/StudioNav";
import {
  EnhanceCanvas,
  renderEnhanceMaskPng,
  type EnhanceRegion,
  type EnhanceTool,
} from "@/components/studio/EnhanceCanvas";

type EnhanceVersion = {
  id: string;
  blob: Blob;
  previewUrl: string;
  prompt: string;
  at: number;
};

function describeLocation(region: EnhanceRegion): string {
  const v = region.cy < 0.33 ? "upper" : region.cy > 0.66 ? "lower" : "middle";
  const h = region.cx < 0.33 ? "left" : region.cx > 0.66 ? "right" : "center";
  return `${v}-${h}`;
}

function composeEnhanceNotes(
  prompt: string,
  regions: EnhanceRegion[]
): string {
  const overall = prompt.trim();
  if (regions.length === 0) return overall;
  const lines = regions.map((region, i) => {
    const loc = describeLocation(region);
    const note = region.note.trim();
    return note
      ? `Area ${i + 1} (${loc}): ${note}`
      : `Area ${i + 1} (${loc}) is marked for the change above.`;
  });
  return [overall, "Targeted regions:", ...lines].filter(Boolean).join(" ");
}

function isStillPhoto(photo: StudioPhoto): boolean {
  return photo.mediaKind !== "video" && !photo.mimeType.startsWith("video/");
}

export function EnhanceStudio() {
  const searchParams = useSearchParams();
  const photoIdParam = searchParams.get("photoId");
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [library, setLibrary] = useState<StudioPhoto[]>([]);
  const [libraryReady, setLibraryReady] = useState(false);
  const [categoryId, setCategoryId] =
    useState<StudioCategoryId>("invisalign");
  const [sourcePhotoId, setSourcePhotoId] = useState<string | null>(null);
  const [filename, setFilename] = useState("photo.png");
  const [versions, setVersions] = useState<EnhanceVersion[]>([]);
  const [versionIndex, setVersionIndex] = useState(0);
  const [regions, setRegions] = useState<EnhanceRegion[]>([]);
  const [tool, setTool] = useState<EnhanceTool>("circle");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [dragging, setDragging] = useState(false);

  const current = versions[versionIndex] ?? null;

  const refreshLibrary = useCallback(async () => {
    const photos = await listGalleryPhotos();
    setLibrary((prev) => {
      revokePreviewUrls(prev);
      return photos;
    });
    setLibraryReady(true);
  }, []);

  useEffect(() => {
    void refreshLibrary();
    return () => {
      setLibrary((prev) => {
        revokePreviewUrls(prev);
        return [];
      });
    };
  }, [refreshLibrary]);

  useEffect(() => {
    return () => {
      for (const v of versions) {
        if (v.previewUrl.startsWith("blob:")) URL.revokeObjectURL(v.previewUrl);
      }
    };
    // Only on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startFromBlob = useCallback(
    (blob: Blob, name: string, libraryId: string | null) => {
      setVersions((prev) => {
        for (const v of prev) {
          if (v.previewUrl.startsWith("blob:")) URL.revokeObjectURL(v.previewUrl);
        }
        return [
          {
            id: crypto.randomUUID(),
            blob,
            previewUrl: URL.createObjectURL(blob),
            prompt: "Original",
            at: Date.now(),
          },
        ];
      });
      setVersionIndex(0);
      setRegions([]);
      setPrompt("");
      setFilename(name);
      setSourcePhotoId(libraryId);
      setError("");
      setWarning("");
    },
    []
  );

  useEffect(() => {
    if (!photoIdParam) return;
    let cancelled = false;
    void (async () => {
      const photo = await getPhoto(photoIdParam);
      if (cancelled) return;
      if (!photo?.blob) {
        setError("That library photo could not be loaded.");
        return;
      }
      if (!isStillPhoto(photo)) {
        setError("Enhance works with photos only — pick a still, not a video.");
        return;
      }
      setCategoryId(photo.categoryId);
      startFromBlob(photo.blob, photo.name, photo.enhancedFromId || photo.id);
      if (photo.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(photo.previewUrl);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [photoIdParam, startFromBlob]);

  const stills = useMemo(() => library.filter(isStillPhoto), [library]);

  async function handleFiles(files: FileList | File[] | null) {
    if (
      !files ||
      (Array.isArray(files) ? files.length === 0 : files.length === 0)
    ) {
      return;
    }
    const file = Array.isArray(files) ? files[0] : files[0];
    if (!file.type.startsWith("image/")) {
      setError("Please upload a photo (JPEG, PNG, or WebP).");
      return;
    }
    startFromBlob(file, file.name || "photo.png", null);
  }

  function pickLibraryPhoto(photo: StudioPhoto) {
    if (!isStillPhoto(photo)) {
      setError("Enhance works with photos only.");
      return;
    }
    setCategoryId(photo.categoryId);
    startFromBlob(photo.blob, photo.name, photo.enhancedFromId || photo.id);
  }

  async function runEnhance() {
    if (!current) {
      setError("Upload or pick a photo first.");
      return;
    }
    const notes = composeEnhanceNotes(prompt, regions);
    if (!notes.trim() && regions.length === 0) {
      setError("Describe what to change, or circle an area to target.");
      return;
    }

    setLoading(true);
    setError("");
    setWarning("");
    try {
      const compressed = await compressImageForRetouchWithSize(current.blob);
      if (compressed.blob.size > 2_400_000) {
        setError(
          "This photo is too large to enhance on the live site. Try a smaller still."
        );
        return;
      }
      const imageBase64 = await blobToBase64(compressed.blob);
      let maskBase64: string | undefined;
      if (regions.length > 0) {
        const mask = await renderEnhanceMaskPng(
          compressed.width,
          compressed.height,
          regions
        );
        maskBase64 = await blobToBase64(mask);
      }

      const res = await fetch("/api/studio/retouch-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          mimeType: compressed.blob.type || "image/jpeg",
          filename: filename || "photo.png",
          notes,
          maskBase64,
          aspect: studioImageAspect(compressed.width, compressed.height),
        }),
      });
      const data = (await res.json()) as {
        imageBase64?: string;
        mimeType?: string;
        error?: string;
        model?: string;
      };
      if (!res.ok || !data.imageBase64) {
        setError(data.error || "Enhance failed");
        return;
      }

      const resultBlob = base64ToBlob(
        data.imageBase64,
        data.mimeType || "image/png"
      );
      const next: EnhanceVersion = {
        id: crypto.randomUUID(),
        blob: resultBlob,
        previewUrl: URL.createObjectURL(resultBlob),
        prompt: prompt.trim() || notes,
        at: Date.now(),
      };
      setVersions((prev) => [...prev.slice(0, versionIndex + 1), next]);
      setVersionIndex((i) => i + 1);
      setRegions([]);
      setWarning(
        data.model
          ? `Enhanced with ${data.model}. You can iterate, download, or save to the library.`
          : "Enhanced. You can iterate, download, or save to the library."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enhance failed");
    } finally {
      setLoading(false);
    }
  }

  function undo() {
    if (versionIndex <= 0) return;
    setVersionIndex((i) => i - 1);
    setRegions([]);
  }

  function exportFilename(): string {
    const base = filename.replace(/\.[^.]+$/, "") || "photo";
    const suffix = versionIndex === 0 ? "" : "-enhanced";
    const mime = current?.blob.type || "image/png";
    const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";
    return `${base}${suffix}.${ext}`;
  }

  function downloadCurrent() {
    if (!current) return;
    downloadBlobFile(exportFilename(), current.blob);
    setWarning("Photo downloaded.");
  }

  async function shareOrEmailCurrent() {
    if (!current) return;
    const name = exportFilename();
    const result = await shareOrDownloadImage(name, current.blob);
    if (result === "shared") {
      setWarning(
        "Share sheet opened — choose Mail, Messages, or Files to send the photo."
      );
      return;
    }
    const subject = encodeURIComponent("Enhanced photo — Ads Studio");
    const body = encodeURIComponent(
      `Please attach the downloaded file "${name}" to this email before sending.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setWarning(
      "Photo downloaded. Attach that file in the email window that opened."
    );
  }

  async function saveToLibrary() {
    if (!current) return;
    setSaving(true);
    setError("");
    try {
      const imageBase64 = await blobToBase64(current.blob);
      const rootId = sourcePhotoId;
      const saved = await addPhotoFromBase64({
        categoryId,
        base64: imageBase64,
        mimeType: current.blob.type || "image/png",
        name: `${filename.replace(/\.[^.]+$/, "")}-enhanced.png`,
        note: prompt.trim() || current.prompt || "Digital enhance",
        promptSummary: prompt.trim()
          ? `Digital enhance: ${prompt.trim()}`
          : "Digital enhance",
        enhancedFromId: rootId || undefined,
      });
      if (!rootId) {
        setSourcePhotoId(saved.id);
      }
      await refreshLibrary();
      setWarning("Saved to the Ads media library.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save to library");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/studio/auth", { method: "DELETE" });
    window.location.href = "/studio/login";
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[rgb(var(--brand-200))] pb-5 sm:pb-6">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[rgb(var(--brand-600))]">
            Dr. Elizabeth Peeling
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-playfair)] text-2xl text-[rgb(var(--brand-900))] sm:text-4xl">
            Image Enhance
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[rgb(var(--brand-700))]">
            Upload a photo, describe the change, optionally circle target areas,
            then iterate with the same OpenAI image editor used for Ads.
          </p>
          <StudioNav />
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="min-h-11 shrink-0 rounded-lg border border-[rgb(var(--brand-300))] px-3 py-2 text-sm text-[rgb(var(--brand-800))] hover:bg-white"
        >
          Sign out
        </button>
      </header>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {warning ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {warning}
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
        <section className="rounded-2xl border border-[rgb(var(--brand-200))] bg-white p-4 sm:p-6">
          {!current ? (
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
              className={`rounded-xl border-2 border-dashed px-4 py-16 text-center text-sm ${
                dragging
                  ? "border-[rgb(var(--brand-500))] bg-[rgb(var(--brand-50))]"
                  : "border-[rgb(var(--brand-200))] text-[rgb(var(--brand-600))]"
              }`}
            >
              Drop a photo here, or upload from this device.
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
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
              </div>
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-[rgb(var(--brand-700))]">
                  Target
                </span>
                <button
                  type="button"
                  onClick={() => setTool("point")}
                  className={`min-h-9 rounded-lg px-3 text-xs font-medium ${
                    tool === "point"
                      ? "bg-[rgb(var(--brand-800))] text-white"
                      : "border border-[rgb(var(--brand-300))] text-[rgb(var(--brand-800))]"
                  }`}
                >
                  Point
                </button>
                <button
                  type="button"
                  onClick={() => setTool("circle")}
                  className={`min-h-9 rounded-lg px-3 text-xs font-medium ${
                    tool === "circle"
                      ? "bg-[rgb(var(--brand-800))] text-white"
                      : "border border-[rgb(var(--brand-300))] text-[rgb(var(--brand-800))]"
                  }`}
                >
                  Circle
                </button>
                <button
                  type="button"
                  disabled={regions.length === 0}
                  onClick={() => setRegions((prev) => prev.slice(0, -1))}
                  className="min-h-9 rounded-lg border border-[rgb(var(--brand-300))] px-3 text-xs text-[rgb(var(--brand-800))] disabled:opacity-40"
                >
                  Erase last
                </button>
                <button
                  type="button"
                  disabled={regions.length === 0}
                  onClick={() => setRegions([])}
                  className="min-h-9 rounded-lg border border-[rgb(var(--brand-300))] px-3 text-xs text-[rgb(var(--brand-800))] disabled:opacity-40"
                >
                  Clear marks
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="min-h-9 rounded-lg border border-[rgb(var(--brand-300))] px-3 text-xs text-[rgb(var(--brand-800))]"
                >
                  Replace photo
                </button>
              </div>
              <EnhanceCanvas
                imageUrl={current.previewUrl}
                regions={regions}
                tool={tool}
                disabled={loading}
                onRegionsChange={setRegions}
              />
              {regions.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {regions.map((region, i) => (
                    <li key={region.id} className="flex items-center gap-2">
                      <span className="w-6 shrink-0 text-xs font-semibold text-[rgb(var(--brand-800))]">
                        {i + 1}
                      </span>
                      <input
                        type="text"
                        value={region.note}
                        maxLength={200}
                        placeholder={`What to change in area ${i + 1} (optional)`}
                        onChange={(e) =>
                          setRegions((prev) =>
                            prev.map((r) =>
                              r.id === region.id
                                ? { ...r, note: e.target.value }
                                : r
                            )
                          )
                        }
                        className="min-h-9 w-full rounded-md border border-[rgb(var(--brand-200))] px-2 text-sm"
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-[rgb(var(--brand-600))]">
                  Optional: click to point, or drag a circle around each area
                  to change. You can mark several areas, then generate once.
                </p>
              )}
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </section>

        <aside className="flex flex-col gap-4">
          <section className="rounded-2xl border border-[rgb(var(--brand-200))] bg-white p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-[rgb(var(--brand-900))]">
              Prompt
            </h2>
            <label className="mt-3 block text-xs text-[rgb(var(--brand-700))]">
              Theme
              <select
                value={categoryId}
                onChange={(e) =>
                  setCategoryId(e.target.value as StudioCategoryId)
                }
                className="mt-1 min-h-11 w-full rounded-md border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] px-2 py-1.5 text-base sm:text-sm"
              >
                {STUDIO_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="What should change? e.g. slightly whiten teeth, soften this blemish, even the lighting on the cheek"
              className="mt-3 w-full resize-y rounded-lg border border-[rgb(var(--brand-200))] px-3 py-2 text-sm"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!current || loading}
                onClick={() => void runEnhance()}
                className="min-h-11 rounded-lg bg-[rgb(var(--brand-800))] px-4 text-sm font-medium text-white disabled:opacity-50"
              >
                {loading ? "Enhancing…" : "Generate"}
              </button>
              <button
                type="button"
                disabled={!current || versionIndex === 0 || loading}
                onClick={undo}
                className="min-h-11 rounded-lg border border-[rgb(var(--brand-300))] px-4 text-sm text-[rgb(var(--brand-800))] disabled:opacity-50"
              >
                Undo
              </button>
              <button
                type="button"
                disabled={!current || loading}
                onClick={downloadCurrent}
                className="min-h-11 rounded-lg border border-[rgb(var(--brand-300))] px-4 text-sm text-[rgb(var(--brand-800))] disabled:opacity-50"
              >
                Download
              </button>
              <button
                type="button"
                disabled={!current || loading}
                onClick={() => void shareOrEmailCurrent()}
                className="min-h-11 rounded-lg border border-[rgb(var(--brand-300))] px-4 text-sm text-[rgb(var(--brand-800))] disabled:opacity-50"
              >
                Share / Email
              </button>
              <button
                type="button"
                disabled={!current || saving || loading || versionIndex === 0}
                onClick={() => void saveToLibrary()}
                className="min-h-11 rounded-lg border border-[rgb(var(--brand-300))] px-4 text-sm text-[rgb(var(--brand-800))] disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save to library"}
              </button>
            </div>
          </section>

          {versions.length > 1 ? (
            <section className="rounded-2xl border border-[rgb(var(--brand-200))] bg-white p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-[rgb(var(--brand-900))]">
                Versions
              </h2>
              <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {versions.map((v, i) => (
                  <li key={v.id} className="w-24 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setVersionIndex(i);
                        setRegions([]);
                      }}
                      className={`block w-full overflow-hidden rounded-lg border ${
                        i === versionIndex
                          ? "border-[rgb(var(--brand-600))] ring-2 ring-[rgb(var(--brand-300))]"
                          : "border-[rgb(var(--brand-200))]"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={v.previewUrl}
                        alt={v.prompt}
                        className="aspect-square w-full object-cover"
                      />
                    </button>
                    <p className="mt-1 truncate text-[10px] text-[rgb(var(--brand-600))]">
                      {i === 0 ? "Original" : `v${i}`}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-[rgb(var(--brand-600))]">
                Tap a version to use it as the next starting photo.
              </p>
            </section>
          ) : null}

          <section className="rounded-2xl border border-[rgb(var(--brand-200))] bg-white p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-[rgb(var(--brand-900))]">
              From library
            </h2>
            {!libraryReady ? (
              <p className="mt-3 text-sm text-[rgb(var(--brand-600))]">
                Loading library…
              </p>
            ) : stills.length === 0 ? (
              <p className="mt-3 text-sm text-[rgb(var(--brand-600))]">
                No stills in the Ads library yet.
              </p>
            ) : (
              <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {stills.slice(0, 16).map((photo) => (
                  <li key={photo.id}>
                    <button
                      type="button"
                      onClick={() => pickLibraryPhoto(photo)}
                      className={`block w-full overflow-hidden rounded-lg border ${
                        sourcePhotoId === photo.id ||
                        sourcePhotoId === photo.enhancedFromId
                          ? "border-[rgb(var(--brand-600))] ring-2 ring-[rgb(var(--brand-300))]"
                          : "border-[rgb(var(--brand-200))]"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.previewUrl}
                        alt={photo.name}
                        className="aspect-square w-full object-cover"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
