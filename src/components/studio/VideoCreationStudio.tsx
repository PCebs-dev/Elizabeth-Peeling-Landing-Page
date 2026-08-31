"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STUDIO_CATEGORIES } from "@/lib/studio/categories";
import {
  addPhoto,
  listGalleryPhotos,
  revokePreviewUrls,
} from "@/lib/studio/photos";
import { downloadBlobFile } from "@/lib/studio/export";
import { compressImageForVideoStill } from "@/lib/studio/image-client";
import type {
  StudioCategoryId,
  StudioPhoto,
  StudioVideoDuration,
} from "@/lib/studio/types";
import { StudioNav } from "@/components/studio/StudioNav";

const HIGGSFIELD_CLOUD_URL = "https://cloud.higgsfield.ai/";

/** Wall-clock budget for one render before we hand the job back to the user. */
const MAX_POLL_MS = 25 * 60 * 1000;
/** Transient status failures tolerated in a row before pausing (job is kept). */
const MAX_STATUS_RETRIES = 8;
const FETCH_ATTEMPTS = 3;
const JOB_KEY = "studio.video.activeJob";
/** A queued job older than this is stale; Higgsfield links expire. */
const JOB_MAX_AGE_MS = 6 * 60 * 60 * 1000;

type ActiveJob = {
  requestId: string;
  categoryId: StudioCategoryId;
  prompt: string;
  duration: StudioVideoDuration;
  startedAt: number;
  model?: string;
};

function isStillPhoto(photo: StudioPhoto): boolean {
  return photo.mediaKind !== "video" && !photo.mimeType.startsWith("video/");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Poll fast early, then ease off so a long render does not hammer the API. */
function pollDelay(elapsedMs: number): number {
  if (elapsedMs < 60_000) return 4000;
  if (elapsedMs < 4 * 60_000) return 6000;
  return 10_000;
}

function readStoredJob(): ActiveJob | null {
  try {
    const raw = window.localStorage.getItem(JOB_KEY);
    if (!raw) return null;
    const job = JSON.parse(raw) as ActiveJob;
    if (!job?.requestId) return null;
    if (Date.now() - (job.startedAt || 0) > JOB_MAX_AGE_MS) {
      window.localStorage.removeItem(JOB_KEY);
      return null;
    }
    return job;
  } catch {
    return null;
  }
}

function writeStoredJob(job: ActiveJob | null) {
  try {
    if (job) window.localStorage.setItem(JOB_KEY, JSON.stringify(job));
    else window.localStorage.removeItem(JOB_KEY);
  } catch {
    /* private mode — in-memory state still works for this tab */
  }
}

export function VideoCreationStudio() {
  const fileRef = useRef<HTMLInputElement>(null);
  const pollAbortRef = useRef<AbortController | null>(null);
  const submitLockRef = useRef(false);
  const libraryRef = useRef<StudioPhoto[]>([]);
  const localStillUrlRef = useRef<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const resumedRef = useRef(false);

  const [library, setLibrary] = useState<StudioPhoto[]>([]);
  const [libraryReady, setLibraryReady] = useState(false);
  const [categoryId, setCategoryId] = useState<StudioCategoryId>("invisalign");
  const [still, setStill] = useState<StudioPhoto | null>(null);
  const [localStillUrl, setLocalStillUrl] = useState<string | null>(null);
  const [localStillBlob, setLocalStillBlob] = useState<Blob | null>(null);
  const [localStillName, setLocalStillName] = useState("still.png");

  const [prompt, setPrompt] = useState(
    "Gentle natural smile and soft head motion, warm dental clinic lighting, photorealistic, no text, no logos"
  );
  const [duration, setDuration] = useState<StudioVideoDuration>(5);

  const [generating, setGenerating] = useState(false);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [pendingJob, setPendingJob] = useState<ActiveJob | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [retryNote, setRetryNote] = useState("");
  const [recoverId, setRecoverId] = useState("");

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultName, setResultName] = useState("studio-video.mp4");
  const [directVideoUrl, setDirectVideoUrl] = useState<string | null>(null);
  const [savedLibraryId, setSavedLibraryId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [dragging, setDragging] = useState(false);

  const stillPreviewUrl = still?.previewUrl || localStillUrl;
  const stillBlob = still?.blob || localStillBlob;

  const stillPhotos = useMemo(
    () => library.filter(isStillPhoto).slice(0, 24),
    [library]
  );

  const refreshLibrary = useCallback(async () => {
    const photos = await listGalleryPhotos();
    libraryRef.current = photos;
    setLibrary(photos);
    setLibraryReady(true);
  }, []);

  const setLocalStillUrlSafe = useCallback((url: string | null) => {
    if (localStillUrlRef.current) URL.revokeObjectURL(localStillUrlRef.current);
    localStillUrlRef.current = url;
    setLocalStillUrl(url);
  }, []);

  const setResultUrlSafe = useCallback((url: string | null) => {
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = url;
    setResultUrl(url);
  }, []);

  const clearResult = useCallback(() => {
    setResultUrlSafe(null);
    setResultBlob(null);
    setDirectVideoUrl(null);
    setSavedLibraryId(null);
  }, [setResultUrlSafe]);

  /**
   * Watch a queued Higgsfield job to completion and pull the MP4 down.
   * Survives transient network/status errors; on any unrecoverable pause the
   * job stays on disk so the render can be claimed later without new credits.
   */
  const watchJob = useCallback(
    async (job: ActiveJob) => {
      pollAbortRef.current?.abort();
      const abort = new AbortController();
      pollAbortRef.current = abort;

      setGenerating(true);
      setError("");
      setRetryNote("");
      setPendingJob(job);
      writeStoredJob(job);

      const watchStartedAt = Date.now();
      const tick = window.setInterval(() => {
        setElapsedSec(Math.round((Date.now() - job.startedAt) / 1000));
      }, 1000);

      try {
        let status = "queued";
        let videoUrl: string | null = null;
        let statusErrors = 0;

        while (!abort.signal.aborted) {
          const watching = Date.now() - watchStartedAt;
          if (watching > MAX_POLL_MS) {
            setError(
              `Higgsfield is still rendering after ${Math.round(MAX_POLL_MS / 60000)} minutes. Nothing is lost — the job is saved, so press “Resume job” or check request ${job.requestId} in Higgsfield Cloud.`
            );
            return;
          }

          let payload: {
            status?: string;
            error?: string;
            videoUrl?: string | null;
          };
          try {
            const res = await fetch(
              `/api/studio/generate-video/status?requestId=${encodeURIComponent(job.requestId)}`,
              { signal: abort.signal, cache: "no-store" }
            );
            if (res.status === 401) {
              setError(
                "Your studio session expired while the video was rendering. Sign in again and press “Resume job” — the render is saved and costs nothing extra."
              );
              return;
            }
            payload = (await res.json()) as typeof payload;
            if (!res.ok) throw new Error(payload.error || `HTTP ${res.status}`);
            statusErrors = 0;
            setRetryNote("");
          } catch (err) {
            if (abort.signal.aborted) return;
            statusErrors += 1;
            if (statusErrors >= MAX_STATUS_RETRIES) {
              setError(
                `Lost contact with Higgsfield after ${statusErrors} tries (${err instanceof Error ? err.message : "network error"}). The job is saved — press “Resume job” to pick the render back up without spending credits again.`
              );
              return;
            }
            setRetryNote(
              `Status check failed (${statusErrors}/${MAX_STATUS_RETRIES}) — retrying, the render keeps going.`
            );
            await sleep(2000 * statusErrors);
            continue;
          }

          status = payload.status || "unknown";
          setJobStatus(status);
          if (payload.videoUrl) videoUrl = payload.videoUrl;

          if (status === "completed") break;
          if (status === "failed" || status === "nsfw" || status === "canceled") {
            setError(
              status === "nsfw"
                ? "Higgsfield flagged this still or prompt as unsafe and stopped the render. Try a clear head-and-shoulders photo and plainer wording."
                : payload.error ||
                  `Higgsfield reported the job as ${status}. Adjust the still or prompt and try again.`
            );
            writeStoredJob(null);
            setPendingJob(null);
            return;
          }

          await sleep(pollDelay(Date.now() - watchStartedAt));
        }

        if (abort.signal.aborted) return;
        if (status !== "completed") return;

        setDirectVideoUrl(videoUrl);
        setJobStatus("downloading");

        let blob: Blob | null = null;
        let lastFetchError = "";
        for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
          if (abort.signal.aborted) return;
          try {
            const res = await fetch("/api/studio/generate-video/fetch", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ requestId: job.requestId }),
              signal: abort.signal,
            });
            if (!res.ok) {
              const body = (await res.json().catch(() => ({}))) as {
                error?: string;
              };
              throw new Error(body.error || `HTTP ${res.status}`);
            }
            const candidate = await res.blob();
            if (!candidate.size) throw new Error("empty file");
            blob = candidate;
            break;
          } catch (err) {
            if (abort.signal.aborted) return;
            lastFetchError =
              err instanceof Error ? err.message : "download failed";
            setRetryNote(
              `Download attempt ${attempt}/${FETCH_ATTEMPTS} failed — retrying.`
            );
            await sleep(3000);
          }
        }

        if (!blob) {
          setError(
            `The video rendered but the download failed (${lastFetchError}). The clip is finished and already paid for — press “Resume job”${videoUrl ? " or use the direct Higgsfield link below" : ""}.`
          );
          return;
        }

        const name = `ai-video-${job.categoryId}-${Date.now()}.mp4`;
        setResultBlob(blob);
        setResultUrlSafe(URL.createObjectURL(blob));
        setResultName(name);
        setJobStatus("completed");
        setRetryNote("");

        try {
          const saved = await addPhoto({
            categoryId: job.categoryId,
            file: blob,
            name,
            note: [
              "AI video — Higgsfield Video Creation",
              job.prompt ? `Prompt: ${job.prompt}` : "",
              `request ${job.requestId}`,
            ]
              .filter(Boolean)
              .join("\n\n"),
            source: "ai",
            promptSummary: job.prompt.slice(0, 200),
          });
          setSavedLibraryId(saved.id);
          await refreshLibrary();
        } catch {
          setRetryNote(
            "Video is ready here, but saving to the media library failed — download it now to keep it."
          );
        }

        writeStoredJob(null);
        setPendingJob(null);
        setWarning(
          "Video ready. Download it, email it, or use it from the Ads media library."
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          `${err instanceof Error ? err.message : "Video generation failed"} — the job is saved, so “Resume job” can still claim the render.`
        );
      } finally {
        window.clearInterval(tick);
        setGenerating(false);
      }
    },
    [refreshLibrary, setResultUrlSafe]
  );

  useEffect(() => {
    void refreshLibrary();
    return () => {
      pollAbortRef.current?.abort();
      revokePreviewUrls(libraryRef.current);
      if (localStillUrlRef.current)
        URL.revokeObjectURL(localStillUrlRef.current);
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + unmount only
  }, []);

  /** Re-attach to a render that was in flight when the tab closed or reloaded. */
  useEffect(() => {
    if (resumedRef.current) return;
    resumedRef.current = true;
    const job = readStoredJob();
    if (!job) return;
    setPendingJob(job);
    setCategoryId(job.categoryId);
    setPrompt(job.prompt);
    setDuration(job.duration);
    setJobStatus("resuming");
    setWarning(
      `Reconnected to the video you already paid for (request ${job.requestId.slice(0, 8)}…). Watching it finish — no new credits used.`
    );
    void watchJob(job);
  }, [watchJob]);

  /** Stop an accidental reload from orphaning a paid render. */
  useEffect(() => {
    if (!generating) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [generating]);

  function clearLocalStill() {
    setLocalStillUrlSafe(null);
    setLocalStillBlob(null);
  }

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image still (not a video).");
      return;
    }
    setError("");
    setStill(null);
    clearLocalStill();
    clearResult();
    setLocalStillUrlSafe(URL.createObjectURL(file));
    setLocalStillBlob(file);
    setLocalStillName(file.name || "still.png");
  }

  function pickLibraryStill(photo: StudioPhoto) {
    clearLocalStill();
    clearResult();
    setStill(photo);
    setCategoryId(photo.categoryId);
    setError("");
  }

  async function logout() {
    pollAbortRef.current?.abort();
    await fetch("/api/studio/auth", { method: "DELETE" });
    window.location.href = "/studio/login";
  }

  async function generateVideo() {
    if (submitLockRef.current) return;
    if (pendingJob) {
      setError(
        `Request ${pendingJob.requestId.slice(0, 8)}… is already rendering and paid for. Resume or discard it before starting a new one.`
      );
      return;
    }
    if (!stillBlob) {
      setError("Choose a library photo or upload a still first.");
      return;
    }
    if (!prompt.trim()) {
      setError("Enter a motion prompt for Higgsfield.");
      return;
    }

    submitLockRef.current = true;
    setGenerating(true);
    setError("");
    setWarning("");
    setRetryNote("");
    setJobStatus("submitting");
    setElapsedSec(0);
    clearResult();

    try {
      const upload = await compressImageForVideoStill(stillBlob);
      const form = new FormData();
      form.append("categoryId", categoryId);
      form.append("prompt", prompt.trim());
      form.append("notes", prompt.trim());
      form.append("tone", "warm");
      form.append("duration", String(duration));
      form.append(
        "image",
        upload,
        still?.name || localStillName || "still.png"
      );

      const res = await fetch("/api/studio/generate-video/submit", {
        method: "POST",
        body: form,
      });
      const data = (await res.json().catch(() => ({}))) as {
        configured?: boolean;
        requestId?: string;
        error?: string;
        model?: string;
      };

      if (!res.ok || !data.requestId) {
        setError(
          data.error ||
            (data.configured === false
              ? "Higgsfield API keys are missing. Set HIGGSFIELD_API_KEY_ID and HIGGSFIELD_API_KEY_SECRET, or open Higgsfield Cloud."
              : "Could not start the video job — no credits were used.")
        );
        setJobStatus(null);
        setGenerating(false);
        return;
      }

      setWarning(
        `Queued on Higgsfield${data.model ? ` (${data.model})` : ""}. Rendering takes several minutes; this page keeps watching and remembers the job even if you reload.`
      );

      const job: ActiveJob = {
        requestId: data.requestId,
        categoryId,
        prompt: prompt.trim(),
        duration,
        startedAt: Date.now(),
        model: data.model,
      };
      writeStoredJob(job);
      await watchJob(job);
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} — no Higgsfield job was queued, so no credits were used.`
          : "Could not start the video job."
      );
      setJobStatus(null);
      setGenerating(false);
    } finally {
      submitLockRef.current = false;
    }
  }

  function pauseWatching() {
    pollAbortRef.current?.abort();
    setGenerating(false);
    setWarning(
      pendingJob
        ? `Stopped watching. Request ${pendingJob.requestId.slice(0, 8)}… keeps rendering on Higgsfield — press “Resume job” any time to claim it.`
        : "Stopped watching."
    );
  }

  function discardJob() {
    pollAbortRef.current?.abort();
    writeStoredJob(null);
    setPendingJob(null);
    setGenerating(false);
    setJobStatus(null);
    setRetryNote("");
    setWarning(
      "Job forgotten here. If it finishes on Higgsfield you can still download it from Higgsfield Cloud."
    );
  }

  function recoverByRequestId() {
    const id = recoverId.trim();
    if (!id) {
      setError("Paste the Higgsfield request ID you want to recover.");
      return;
    }
    setRecoverId("");
    void watchJob({
      requestId: id,
      categoryId,
      prompt: prompt.trim(),
      duration,
      startedAt: Date.now(),
    });
  }

  function downloadVideo() {
    if (!resultBlob) return;
    downloadBlobFile(resultName, resultBlob);
    setWarning("Video downloaded.");
  }

  function emailVideo() {
    if (!resultBlob) return;
    downloadBlobFile(resultName, resultBlob);
    const subject = encodeURIComponent("Studio video — Ads Studio");
    const body = encodeURIComponent(
      `Please attach the downloaded file "${resultName}" to this email before sending.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setWarning(
      "Video downloaded. Attach that file in the email window that opened."
    );
  }

  const canRetryDownload = Boolean(pendingJob && !generating && !resultBlob);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[rgb(var(--brand-200))] pb-5 sm:pb-6">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[rgb(var(--brand-600))]">
            Dr. Elizabeth Peeling
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-playfair)] text-2xl text-[rgb(var(--brand-900))] sm:text-4xl">
            Video Creation
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[rgb(var(--brand-700))]">
            Animate a still with your Higgsfield API credits. The render runs on
            Higgsfield and this page keeps watching it — reloading, a dropped
            connection, or the 5-minute Vercel limit will not lose the clip.
          </p>
          <StudioNav />
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={HIGGSFIELD_CLOUD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-11 shrink-0 rounded-lg border border-[rgb(var(--brand-300))] px-3 py-2 text-sm text-[rgb(var(--brand-800))] hover:bg-white"
          >
            Open Higgsfield Cloud
          </a>
          <button
            type="button"
            onClick={() => void logout()}
            className="min-h-11 shrink-0 rounded-lg border border-[rgb(var(--brand-300))] px-3 py-2 text-sm text-[rgb(var(--brand-800))] hover:bg-white"
          >
            Sign out
          </button>
        </div>
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
      {retryNote ? (
        <p className="mt-2 rounded-lg border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] px-3 py-2 text-sm text-[rgb(var(--brand-800))]">
          {retryNote}
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="space-y-4 rounded-2xl border border-[rgb(var(--brand-200))] bg-white p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-[rgb(var(--brand-900))]">
            Still
          </h2>
          {!stillPreviewUrl ? (
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
              className={`rounded-xl border-2 border-dashed px-4 py-12 text-center text-sm ${
                dragging
                  ? "border-[rgb(var(--brand-500))] bg-[rgb(var(--brand-50))]"
                  : "border-[rgb(var(--brand-200))] text-[rgb(var(--brand-600))]"
              }`}
            >
              Drop a photo, upload, or pick from the library.
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="min-h-11 rounded-lg bg-[rgb(var(--brand-800))] px-4 py-2 text-sm font-medium text-white hover:bg-[rgb(var(--brand-900))]"
                >
                  Upload
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={stillPreviewUrl}
                alt="Video still"
                className="mx-auto max-h-[420px] w-auto rounded-lg object-contain"
              />
              <button
                type="button"
                disabled={generating}
                onClick={() => {
                  setStill(null);
                  clearLocalStill();
                  fileRef.current?.click();
                }}
                className="min-h-9 rounded-lg border border-[rgb(var(--brand-300))] px-3 text-xs text-[rgb(var(--brand-800))] disabled:opacity-40"
              >
                Replace still
              </button>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />

          <div>
            <p className="mb-2 text-xs font-medium text-[rgb(var(--brand-700))]">
              Library stills
            </p>
            {!libraryReady ? (
              <p className="text-xs text-[rgb(var(--brand-600))]">Loading…</p>
            ) : stillPhotos.length === 0 ? (
              <p className="text-xs text-[rgb(var(--brand-600))]">
                No stills in the media library yet.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {stillPhotos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={generating}
                    onClick={() => pickLibraryStill(p)}
                    className={`overflow-hidden rounded-lg border-2 disabled:opacity-50 ${
                      still?.id === p.id
                        ? "border-[rgb(var(--brand-800))]"
                        : "border-transparent hover:border-[rgb(var(--brand-300))]"
                    }`}
                    title={p.name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.previewUrl}
                      alt=""
                      className="aspect-square w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {resultUrl ? (
            <div className="border-t border-[rgb(var(--brand-100))] pt-4">
              <h2 className="mb-2 text-sm font-semibold text-[rgb(var(--brand-900))]">
                Result
              </h2>
              <video
                src={resultUrl}
                controls
                playsInline
                className="mx-auto max-h-[420px] w-full rounded-lg bg-black"
              />
              {savedLibraryId ? (
                <p className="mt-2 text-xs text-[rgb(var(--brand-600))]">
                  Saved to media library.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="space-y-4 rounded-2xl border border-[rgb(var(--brand-200))] bg-white p-4 sm:p-6">
          <label className="block">
            <span className="text-sm font-semibold text-[rgb(var(--brand-900))]">
              Theme
            </span>
            <select
              value={categoryId}
              onChange={(e) =>
                setCategoryId(e.target.value as StudioCategoryId)
              }
              disabled={generating}
              className="mt-1 w-full rounded-lg border border-[rgb(var(--brand-300))] bg-white px-3 py-2 text-sm text-[rgb(var(--brand-900))]"
            >
              {STUDIO_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[rgb(var(--brand-900))]">
              Length
            </span>
            <div className="mt-1 flex gap-2">
              {([5, 10] as StudioVideoDuration[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={generating}
                  onClick={() => setDuration(d)}
                  className={`min-h-10 flex-1 rounded-lg px-3 text-sm font-medium ${
                    duration === d
                      ? "bg-[rgb(var(--brand-800))] text-white"
                      : "border border-[rgb(var(--brand-300))] text-[rgb(var(--brand-800))]"
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[rgb(var(--brand-900))]">
              Prompt
            </span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={generating}
              rows={8}
              maxLength={2000}
              placeholder="Describe the motion and mood for Higgsfield…"
              className="mt-1 w-full rounded-lg border border-[rgb(var(--brand-300))] bg-white px-3 py-2 text-sm text-[rgb(var(--brand-900))] placeholder:text-[rgb(var(--brand-400))]"
            />
            <span className="mt-1 block text-[11px] text-[rgb(var(--brand-600))]">
              Sent to Higgsfield DoP with your API keys. Credits are only spent
              once, when the job is queued.
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            {generating ? (
              <button
                type="button"
                onClick={pauseWatching}
                className="min-h-11 flex-1 rounded-lg border border-[rgb(var(--brand-300))] px-4 py-2 text-sm font-medium text-[rgb(var(--brand-800))]"
              >
                Stop watching
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void generateVideo()}
                disabled={!stillBlob || !prompt.trim() || Boolean(pendingJob)}
                className="min-h-11 flex-1 rounded-lg bg-[rgb(var(--brand-800))] px-4 py-2 text-sm font-medium text-white hover:bg-[rgb(var(--brand-900))] disabled:opacity-50"
              >
                Generate video
              </button>
            )}
          </div>

          {generating || jobStatus ? (
            <p className="text-xs text-[rgb(var(--brand-700))]">
              Status: <span className="font-medium">{jobStatus || "…"}</span>
              {elapsedSec > 0
                ? ` · ${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`
                : ""}
            </p>
          ) : null}

          {pendingJob ? (
            <div className="space-y-2 rounded-lg border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] p-3">
              <p className="text-xs text-[rgb(var(--brand-800))]">
                Paid render in progress —{" "}
                <code className="break-all font-mono text-[11px]">
                  {pendingJob.requestId}
                </code>
              </p>
              <div className="flex flex-wrap gap-2">
                {canRetryDownload ? (
                  <button
                    type="button"
                    onClick={() => void watchJob(pendingJob)}
                    className="min-h-9 rounded-lg bg-[rgb(var(--brand-800))] px-3 text-xs font-medium text-white"
                  >
                    Resume job
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={discardJob}
                  className="min-h-9 rounded-lg border border-[rgb(var(--brand-300))] px-3 text-xs text-[rgb(var(--brand-800))]"
                >
                  Forget job
                </button>
              </div>
            </div>
          ) : null}

          {directVideoUrl && !resultBlob ? (
            <a
              href={directVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs underline text-[rgb(var(--brand-800))]"
            >
              Open the finished clip directly on Higgsfield
            </a>
          ) : null}

          <div className="flex flex-wrap gap-2 border-t border-[rgb(var(--brand-100))] pt-4">
            <button
              type="button"
              disabled={!resultBlob}
              onClick={downloadVideo}
              className="min-h-11 flex-1 rounded-lg border border-[rgb(var(--brand-300))] px-3 py-2 text-sm font-medium text-[rgb(var(--brand-800))] hover:bg-[rgb(var(--brand-50))] disabled:opacity-40"
            >
              Download
            </button>
            <button
              type="button"
              disabled={!resultBlob}
              onClick={emailVideo}
              className="min-h-11 flex-1 rounded-lg border border-[rgb(var(--brand-300))] px-3 py-2 text-sm font-medium text-[rgb(var(--brand-800))] hover:bg-[rgb(var(--brand-50))] disabled:opacity-40"
            >
              Email
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-[rgb(var(--brand-600))]">
            Email downloads the MP4 first, then opens your mail app so you can
            attach that file (same as Image Enhance).
          </p>

          <details className="border-t border-[rgb(var(--brand-100))] pt-4">
            <summary className="cursor-pointer text-xs font-medium text-[rgb(var(--brand-800))]">
              Recover a video by request ID
            </summary>
            <p className="mt-2 text-[11px] leading-relaxed text-[rgb(var(--brand-600))]">
              Already paid for a render in Higgsfield Cloud? Paste its request
              ID to download it here instead of generating again.
            </p>
            <div className="mt-2 flex gap-2">
              <input
                value={recoverId}
                onChange={(e) => setRecoverId(e.target.value)}
                disabled={generating}
                placeholder="Higgsfield request ID"
                className="min-h-10 flex-1 rounded-lg border border-[rgb(var(--brand-300))] px-3 text-xs text-[rgb(var(--brand-900))]"
              />
              <button
                type="button"
                onClick={recoverByRequestId}
                disabled={generating || !recoverId.trim()}
                className="min-h-10 rounded-lg border border-[rgb(var(--brand-300))] px-3 text-xs font-medium text-[rgb(var(--brand-800))] disabled:opacity-40"
              >
                Recover
              </button>
            </div>
          </details>
        </section>
      </div>
    </div>
  );
}
