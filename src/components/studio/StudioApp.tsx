"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STUDIO_CATEGORIES } from "@/lib/studio/categories";
import {
  addPhoto,
  addPhotoFromBase64,
  deletePhoto,
  linkFrTwin,
  listPhotos,
  revokePreviewUrls,
  updatePhotoNote,
} from "@/lib/studio/photos";
import {
  buildExportMarkdown,
  copyToClipboard,
  formatHashtags,
  shareOrDownloadTextFile,
} from "@/lib/studio/export";
import {
  parseOnImageTextLine,
  randomImageContext,
  rollIncludeOnImageText,
  withOnImageTextLine,
} from "@/lib/studio/image-context";
import {
  effectiveCaptionPrompt,
  randomCaptionPrompt,
  randomOdqPricePrompt,
} from "@/lib/studio/caption-prompt";
import { pickShortOnImageHeadline } from "@/lib/studio/image-prompt";
import { stripHashtagsFromCaption } from "@/lib/studio/sanitize-copy";
import { withClinicBookingLink } from "@/lib/studio/targeting";
import type {
  GeneratedAd,
  GeneratedAdCopy,
  StudioCategoryId,
  StudioChannel,
  StudioLanguage,
  StudioPhoto,
  StudioVideoDuration,
  StudioVideoTone,
  StudioVideoVoiceMode,
} from "@/lib/studio/types";
import {
  STUDIO_VIDEO_TONES,
  studioVideoDurationLabel,
  studioVideoVoiceModeLabel,
} from "@/lib/studio/types";
import {
  DEFAULT_STUDIO_TTS_VOICE,
  type StudioTtsVoiceId,
} from "@/lib/studio/tts-voices";
import { PhotoLibrary } from "@/components/studio/PhotoLibrary";
import { AdPreview } from "@/components/studio/AdPreview";
import { GenerationPanel } from "@/components/studio/GenerationPanel";
import { CaptionPanel } from "@/components/studio/CaptionPanel";
import { VideoPrepPanel } from "@/components/studio/VideoPrepPanel";
import {
  SavedAdsRail,
  type SavedAdListItem,
} from "@/components/studio/SavedAdsRail";
import type { SavedStudioAd } from "@/lib/studio/saved-types";
import {
  base64ToBlob,
  discardLocalSavedAd,
  getLocalSavedAd,
  listLocalSavedAds,
  localSavedAdToListItem,
  putLocalSavedAds,
  updateLocalSavedFavorite,
} from "@/lib/studio/saved-ads-local";

const HISTORY_LIMIT = 12;

function decodeStudioHeader(value: string | null): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function compressImageForRetouch(blob: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(blob);
    const max = 1024;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return blob;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const compressed = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.88)
    );
    return compressed && compressed.size > 0 ? compressed : blob;
  } catch {
    return blob;
  }
}

async function readResponseJson<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function videoGatewayTimeoutMessage(status: number, contentType?: string): string {
  const kind = contentType?.split(";")[0]?.trim();
  const extra = kind ? `, ${kind}` : "";
  return `AI video generation timed out (${status}${extra}). The host stopped waiting before Higgsfield finished rendering — this is not a credits/keys error. Wait a minute and tap Generate video again (DoP often takes 3–8 minutes), or check the job in Higgsfield Cloud.`;
}

function studioFetchErrorMessage(err: unknown, fallbackStatus?: number): string {
  if (err instanceof DOMException && err.name === "AbortError") {
    return "Request was cancelled — try again.";
  }
  if (err instanceof SyntaxError) {
    return "Server returned an unreadable response — try again.";
  }
  if (err instanceof TypeError) {
    return "Network error — check the connection and try again.";
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return fallbackStatus
    ? `Request failed (${fallbackStatus}) — try again.`
    : "Network error — try again";
}

function makeEphemeralPhoto(input: {
  id: string;
  categoryId: StudioCategoryId;
  blob: Blob;
  name: string;
  note?: string;
  promptSummary?: string;
}): StudioPhoto {
  return {
    id: input.id,
    categoryId: input.categoryId,
    name: input.name,
    mimeType: input.blob.type || "image/png",
    blob: input.blob,
    note: input.note ?? "",
    createdAt: Date.now(),
    source: "ai",
    promptSummary: input.promptSummary,
    previewUrl: URL.createObjectURL(input.blob),
  };
}

function revokeEphemeralPhoto(photo: StudioPhoto | null) {
  if (photo?.previewUrl) URL.revokeObjectURL(photo.previewUrl);
}

export function StudioApp() {
  const [photos, setPhotos] = useState<StudioPhoto[]>([]);
  /** Single selected photo used for ad/caption generation + preview */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [beforeMergeId, setBeforeMergeId] = useState<string | null>(null);
  const [afterMergeId, setAfterMergeId] = useState<string | null>(null);
  const [mergePickSlot, setMergePickSlot] = useState<
    "before" | "after" | "video" | null
  >(null);
  const [videoStillSource, setVideoStillSource] = useState<"ai" | "library">(
    "ai"
  );
  const [videoStillId, setVideoStillId] = useState<string | null>(null);
  const [videoMotionPrompt, setVideoMotionPrompt] = useState("");
  const [videoMotionLoading, setVideoMotionLoading] = useState(false);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [enhancingId, setEnhancingId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<StudioCategoryId>("invisalign");
  /** Caption theme — defaults from selected/created media; overridable for mix-and-match */
  const [captionCategoryId, setCaptionCategoryId] =
    useState<StudioCategoryId>("invisalign");
  const [imageContext, setImageContext] = useState(() => {
    const base = randomImageContext("invisalign", "mixed");
    const include = rollIncludeOnImageText();
    return withOnImageTextLine(
      base,
      include ? pickShortOnImageHeadline("invisalign") : null
    );
  });
  const [language, setLanguage] = useState<StudioLanguage>("both");
  const [captionPrompt, setCaptionPrompt] = useState("");
  const channel: StudioChannel = "organic";
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoPrepLoading, setVideoPrepLoading] = useState(false);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [videoTone, setVideoTone] = useState<StudioVideoTone>("warm");
  const [videoSpokenLanguage, setVideoSpokenLanguage] = useState<"en" | "fr">(
    "en"
  );
  const [videoDuration, setVideoDuration] = useState<StudioVideoDuration>(5);
  const [videoVoiceMode, setVideoVoiceMode] =
    useState<StudioVideoVoiceMode>("silent");
  const [ttsVoice, setTtsVoice] = useState<StudioTtsVoiceId>(
    DEFAULT_STUDIO_TTS_VOICE
  );
  const [ttsPreviewLoading, setTtsPreviewLoading] = useState(false);
  const ttsPreviewAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsPreviewUrlRef = useRef<string | null>(null);
  const [videoPrep, setVideoPrep] = useState<{
    photoId: string;
    script: string;
    motionPrompt: string;
    /** Script / motion theme — defaults to the still, overridable for mix-and-match */
    categoryId: StudioCategoryId;
    /** Original still theme (for the override hint) */
    mediaCategoryId: StudioCategoryId;
  } | null>(null);
  const [scriptHistory, setScriptHistory] = useState<string[]>([]);
  const [publishLoading, setPublishLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [odqAudit, setOdqAudit] = useState<{
    ok: boolean;
    issues: { article: string; message: string }[];
    repairs: string[];
    priceMode: string;
  } | null>(null);
  const [higgsfieldFallbackUrl, setHiggsfieldFallbackUrl] = useState("");
  const [history, setHistory] = useState<GeneratedAd[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [savedAds, setSavedAds] = useState<SavedAdListItem[]>([]);
  const [savedActiveId, setSavedActiveId] = useState<string | null>(null);
  const [savedViewAd, setSavedViewAd] = useState<GeneratedAd | null>(null);
  /** In-memory previews for calendar ads — never written to the photo gallery */
  const [savedPreviewEn, setSavedPreviewEn] = useState<StudioPhoto | null>(null);
  const [savedPreviewFr, setSavedPreviewFr] = useState<StudioPhoto | null>(null);
  const [calendarRunning, setCalendarRunning] = useState(false);
  const [calendarRerunningId, setCalendarRerunningId] = useState<string | null>(
    null
  );
  const [libraryReady, setLibraryReady] = useState(false);
  const [libraryCloudOk, setLibraryCloudOk] = useState<boolean | null>(null);
  const [metaFacebookReady, setMetaFacebookReady] = useState(false);
  const [metaInstagramReady, setMetaInstagramReady] = useState(false);
  const [publishLang, setPublishLang] = useState<"en" | "fr">("en");
  const [publishPlacement, setPublishPlacement] = useState<"post" | "story">(
    "post"
  );
  const [publishTarget, setPublishTarget] = useState<"facebook" | "instagram" | null>(
    null
  );
  const [publishStatus, setPublishStatus] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [savingAd, setSavingAd] = useState(false);
  const photosRef = useRef<StudioPhoto[]>([]);

  const refreshPhotos = useCallback(async () => {
    try {
      const {
        hydratePhotosFromCloud,
        requestPersistentStorage,
        syncLocalPhotosToCloud,
      } = await import("@/lib/studio/library-sync");
      await requestPersistentStorage();
      await hydratePhotosFromCloud();
      const local = await listPhotos();
      const cloudOk = await syncLocalPhotosToCloud(local);
      setLibraryCloudOk(cloudOk);
    } catch {
      setLibraryCloudOk(false);
    }
    const next = await listPhotos();
    revokePreviewUrls(photosRef.current);
    photosRef.current = next;
    setPhotos(next);
    setLibraryReady(true);
    return next;
  }, []);

  useEffect(() => {
    void refreshPhotos();
    return () => {
      revokePreviewUrls(photosRef.current);
    };
  }, [refreshPhotos]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/studio/publish");
        if (!res.ok) return;
        const data = (await res.json()) as {
          facebookReady?: boolean;
          instagramReady?: boolean;
        };
        setMetaFacebookReady(Boolean(data.facebookReady));
        setMetaInstagramReady(Boolean(data.instagramReady));
      } catch {
        /* Meta status optional until configured */
      }
    })();
  }, []);

  const refreshSavedAds = useCallback(async () => {
    let serverAds: SavedAdListItem[] = [];
    try {
      const res = await fetch("/api/studio/saved-ads");
      if (res.ok) {
        const data = (await res.json()) as { ads?: SavedAdListItem[] };
        serverAds = data.ads ?? [];
      }
    } catch {
      /* server optional on Vercel */
    }
    let localAds: SavedAdListItem[] = [];
    try {
      localAds = (await listLocalSavedAds()).map(localSavedAdToListItem);
    } catch {
      /* IndexedDB optional */
    }
    const byId = new Map<string, SavedAdListItem>();
    for (const ad of serverAds) byId.set(ad.id, ad);
    // Local wins for images (data URLs) when server FS is ephemeral
    for (const ad of localAds) byId.set(ad.id, { ...byId.get(ad.id), ...ad });
    setSavedAds(
      [...byId.values()].sort((a, b) => b.createdAt - a.createdAt)
    );
  }, []);

  useEffect(() => {
    void refreshSavedAds();
  }, [refreshSavedAds]);

  useEffect(() => {
    return () => {
      revokeEphemeralPhoto(savedPreviewEn);
      revokeEphemeralPhoto(savedPreviewFr);
    };
    // Only on unmount — URLs are revoked when replaced via setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const viewingSavedAd = Boolean(
    savedViewAd && savedActiveId === savedViewAd.id
  );

  const selectedPhoto = useMemo(
    () => photos.find((p) => p.id === selectedId) ?? null,
    [photos, selectedId]
  );

  const galleryPhotos = useMemo(
    () => photos.filter((p) => !p.galleryHidden),
    [photos]
  );

  const activeAd = useMemo(() => {
    if (viewingSavedAd && savedViewAd) return savedViewAd;
    return history.find((h) => h.id === activeId) ?? history[0] ?? null;
  }, [viewingSavedAd, savedViewAd, history, activeId]);

  /**
   * EN preview media. For language "both", always the EN creative so dual
   * phones stay paired. For language "fr", prefer the FR twin.
   */
  const previewPhoto = useMemo(() => {
    if (viewingSavedAd && savedPreviewEn) {
      if (language === "fr" && savedPreviewFr) return savedPreviewFr;
      return savedPreviewEn;
    }
    if (language === "both") return selectedPhoto;
    if (language === "fr") {
      const twinId =
        activeAd?.photoIdFr || selectedPhoto?.linkedFrPhotoId || null;
      if (twinId) {
        return photos.find((p) => p.id === twinId) ?? selectedPhoto;
      }
    }
    return selectedPhoto;
  }, [
    viewingSavedAd,
    savedPreviewEn,
    savedPreviewFr,
    language,
    activeAd,
    photos,
    selectedPhoto,
  ]);

  /** FR twin for dual Review & edit — tracks selected EN photo, not a stale ad id. */
  const previewPhotoFr = useMemo(() => {
    if (viewingSavedAd) return savedPreviewFr;

    if (selectedPhoto?.linkedFrPhotoId) {
      const twin = photos.find((p) => p.id === selectedPhoto.linkedFrPhotoId);
      if (twin) return twin;
    }

    // Selected a hidden FR twin directly — use it as FR and resolve EN via pairOfPhotoId
    if (selectedPhoto?.pairOfPhotoId) {
      return selectedPhoto;
    }

    if (activeAd?.photoIdFr) {
      const fromAd = photos.find((p) => p.id === activeAd.photoIdFr) ?? null;
      if (!fromAd) return null;
      const enId = selectedPhoto?.id;
      if (
        !enId ||
        fromAd.pairOfPhotoId === enId ||
        activeAd.photoIds?.[0] === enId ||
        fromAd.id === enId
      ) {
        return fromAd;
      }
    }
    return null;
  }, [
    viewingSavedAd,
    savedPreviewFr,
    selectedPhoto,
    photos,
    activeAd,
  ]);

  const publishPhotoSource = viewingSavedAd
    ? savedPreviewEn
    : selectedPhoto;

  function clearSavedPreview() {
    setSavedPreviewEn((prev) => {
      revokeEphemeralPhoto(prev);
      return null;
    });
    setSavedPreviewFr((prev) => {
      revokeEphemeralPhoto(prev);
      return null;
    });
    setSavedViewAd(null);
    setSavedActiveId(null);
  }

  function selectPhoto(id: string) {
    clearSavedPreview();
    let photo = photos.find((p) => p.id === id) ?? null;

    // Always anchor selection on the EN gallery photo when a FR twin is clicked
    if (photo?.pairOfPhotoId) {
      const en = photos.find((p) => p.id === photo!.pairOfPhotoId);
      if (en) photo = en;
    }

    if (photo) {
      setSelectedId(photo.id);
      setCategoryId(photo.categoryId);
      setCaptionCategoryId(photo.categoryId);
    } else {
      setSelectedId(id);
    }

    const pickId = photo?.id ?? id;
    const isVideo =
      photo &&
      (photo.mediaKind === "video" || photo.mimeType.startsWith("video/"));

    if (!isVideo) {
      if (mergePickSlot === "before") {
        if (beforeMergeId === pickId) setBeforeMergeId(null);
        else {
          setBeforeMergeId(pickId);
          if (afterMergeId === pickId) setAfterMergeId(null);
        }
        setMergePickSlot(null);
      } else if (mergePickSlot === "after") {
        if (afterMergeId === pickId) setAfterMergeId(null);
        else {
          setAfterMergeId(pickId);
          if (beforeMergeId === pickId) setBeforeMergeId(null);
        }
        setMergePickSlot(null);
      } else if (mergePickSlot === "video") {
        if (videoStillId === pickId) setVideoStillId(null);
        else setVideoStillId(pickId);
        setVideoStillSource("library");
        setMergePickSlot(null);
      } else if (beforeMergeId === pickId) {
        setBeforeMergeId(null);
      } else if (afterMergeId === pickId) {
        setAfterMergeId(null);
      } else if (videoStillId === pickId) {
        setVideoStillId(null);
      }
    } else if (mergePickSlot) {
      setError(
        mergePickSlot === "video"
          ? "Video still must be a photo, not a clip"
          : "Merge uses photos only, not videos"
      );
      setMergePickSlot(null);
    }

    // Keep Review & edit EN/FR media in sync with the library selection
    const enId = photo?.id ?? id;
    const frId = photo?.linkedFrPhotoId;
    setHistory((prev) => {
      if (!prev.length) return prev;
      const targetId = activeId ?? prev[0]?.id;
      if (!targetId) return prev;
      return prev.map((h) =>
        h.id === targetId
          ? {
              ...h,
              photoIds: [enId],
              photoIdFr: frId || undefined,
            }
          : h
      );
    });
  }

  async function handleUpload(files: FileList | File[], cat: StudioCategoryId) {
    const list = Array.from(files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    if (list.length === 0) return;

    let lastId: string | null = null;
    for (const file of list) {
      const saved = await addPhoto({ categoryId: cat, file });
      lastId = saved.id;
    }
    const next = await refreshPhotos();
    setCategoryId(cat);
    setCaptionCategoryId(cat);
    if (lastId && next.some((p) => p.id === lastId)) {
      setSelectedId(lastId);
    } else if (next[0]) {
      setSelectedId(next[0].id);
    }
  }

  async function handleDeletePhoto(id: string) {
    await deletePhoto(id);
    if (selectedId === id) setSelectedId(null);
    if (beforeMergeId === id) setBeforeMergeId(null);
    if (afterMergeId === id) setAfterMergeId(null);
    await refreshPhotos();
  }

  async function handleNoteChange(id: string, note: string) {
    await updatePhotoNote(id, note);
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, note } : p))
    );
  }

  async function handleDigitalEnhance(id: string, notes: string) {
    setError("");
    setWarning("");
    const photo = photos.find((p) => p.id === id);
    if (!photo?.blob) {
      setError("Photo is missing — reselect it from the library");
      return;
    }
    if (
      photo.mediaKind === "video" ||
      photo.mimeType.startsWith("video/")
    ) {
      setError("Digital enhance works with photos only");
      return;
    }

    setEnhancingId(id);
    try {
      const uploadBlob = await compressImageForRetouch(photo.blob);
      if (uploadBlob.size > 2_400_000) {
        setError(
          "This photo is too large to enhance on the live site. Try a smaller still."
        );
        return;
      }
      const imageBase64 = await blobToBase64(uploadBlob);
      const res = await fetch("/api/studio/retouch-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          mimeType: uploadBlob.type || "image/jpeg",
          filename: photo.name || "photo.png",
          notes,
        }),
      });
      const data = (await res.json()) as {
        imageBase64?: string;
        mimeType?: string;
        error?: string;
      };
      if (!res.ok || !data.imageBase64) {
        setError(data.error || "Digital enhance failed");
        return;
      }

      const rootId = photo.enhancedFromId || photo.id;
      const family = photos.filter(
        (p) => p.id === rootId || p.enhancedFromId === rootId
      );
      const createdAt =
        Math.min(...family.map((p) => p.createdAt), photo.createdAt) - 1;

      const saved = await addPhotoFromBase64({
        categoryId: photo.categoryId,
        base64: data.imageBase64,
        mimeType: data.mimeType || "image/png",
        name: `${photo.name.replace(/\.[^.]+$/, "")}-enhanced.png`,
        note: notes.trim() || "Digital enhance",
        promptSummary: notes.trim()
          ? `Digital enhance: ${notes.trim()}`
          : "Digital enhance",
        enhancedFromId: rootId,
        createdAt,
      });
      await refreshPhotos();
      setSelectedId(saved.id);
      setWarning("Enhanced copy saved next to the original in the library.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Digital enhance failed");
    } finally {
      setEnhancingId(null);
    }
  }

  async function generateAdFromPhoto() {
    setError("");
    setWarning("");
    setOdqAudit(null);

    if (!selectedPhoto) {
      setError(
        "Select a photo or video in the library first, then generate a caption."
      );
      return;
    }

    setLoading(true);
    try {
      const imageHints = [
        [selectedPhoto.name, selectedPhoto.note].filter(Boolean).join(" — "),
      ];

      const avoidHeadlines = history
        .filter((h) => h.categoryId === captionCategoryId)
        .map((h) => h.headline)
        .slice(0, 8);

      const avoidAngles = history
        .filter((h) => h.categoryId === captionCategoryId)
        .map((h) => h.angle)
        .slice(0, 5);

      const photoContext =
        selectedPhoto.note ||
        (selectedPhoto.mediaKind === "video" ||
        selectedPhoto.mimeType.startsWith("video/")
          ? `Ad based on AI/social video: ${selectedPhoto.name}`
          : `Ad based on uploaded photo: ${selectedPhoto.name}`);
      const notes = [
        effectiveCaptionPrompt(captionPrompt, captionCategoryId),
        photoContext,
      ]
        .filter(Boolean)
        .join("\n\n");

      const res = await fetch("/api/studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: captionCategoryId,
          notes,
          language,
          channel,
          imageHints,
          avoidHeadlines,
          avoidAngles,
        }),
      });

      const data = (await res.json()) as {
        ad?: GeneratedAdCopy;
        warning?: string;
        error?: string;
        odq?: {
          ok: boolean;
          issues: { article: string; message: string }[];
          repairs: string[];
          priceMode: string;
        };
      };

      if (!res.ok || !data.ad) {
        setError(data.error || "Generation failed");
        return;
      }

      if (data.warning) setWarning(data.warning);
      if (data.odq) setOdqAudit(data.odq);

      let photoIdFr: string | undefined;
      const selectedIsVideo =
        selectedPhoto.mediaKind === "video" ||
        selectedPhoto.mimeType.startsWith("video/");

      // Prefer the hidden FR twin created with the AI image pair (images only)
      if (
        !selectedIsVideo &&
        (language === "both" || language === "fr") &&
        selectedPhoto.linkedFrPhotoId &&
        photos.some((p) => p.id === selectedPhoto.linkedFrPhotoId)
      ) {
        photoIdFr = selectedPhoto.linkedFrPhotoId;
      } else if (
        !selectedIsVideo &&
        (language === "both" || language === "fr") &&
        data.ad.fr
      ) {
        const likelyHasText =
          selectedPhoto.hasOnImageText === true ||
          /\bEN text\b/i.test(selectedPhoto.promptSummary || "") ||
          /wording/i.test(selectedPhoto.note || "");

        if (!likelyHasText) {
          // Textless photo: reuse identical bytes — do not ask the model to "translate"
          // (that often invents a new French infographic layout).
          photoIdFr = selectedPhoto.id;
        } else {
          try {
            const frHeadline = (
              data.ad.fr?.headline ||
              data.ad.fr?.shortCaption ||
              ""
            ).trim();
            const frForm = new FormData();
            frForm.append(
              "image",
              selectedPhoto.blob,
              selectedPhoto.name || "creative.png"
            );
            frForm.append("language", "fr");
            frForm.append("aspect", "square");
            if (frHeadline) {
              frForm.append("mode", "replace");
              frForm.append("text", frHeadline.slice(0, 100));
            } else {
              frForm.append("mode", "translate");
            }

            const frRes = await fetch("/api/studio/localize-image", {
              method: "POST",
              body: frForm,
            });
            const frData = (await frRes.json()) as {
              imageBase64?: string;
              mimeType?: string;
              promptSummary?: string;
              warning?: string;
              error?: string;
            };
            if (frRes.ok && frData.imageBase64) {
              const frPhoto = await addPhotoFromBase64({
                categoryId: selectedPhoto.categoryId || categoryId,
                base64: frData.imageBase64,
                mimeType: frData.mimeType || "image/png",
                name: `fr-${selectedPhoto.name || categoryId}-${Date.now()}.png`,
                note: "Same photo — on-image text translated to French",
                promptSummary: frData.promptSummary,
                galleryHidden: true,
                pairOfPhotoId: selectedPhoto.id,
                hasOnImageText: true,
              });
              await linkFrTwin(selectedPhoto.id, frPhoto.id);
              photoIdFr = frPhoto.id;
              await refreshPhotos();
              if (frData.warning) {
                setWarning((w) =>
                  [w, frData.warning].filter(Boolean).join(" ")
                );
              }
            } else {
              photoIdFr = selectedPhoto.id;
              setWarning((w) =>
                [
                  w,
                  `French translation unavailable${frData.error ? ` (${frData.error})` : ""}. Using the same image for EN and FR.`,
                ]
                  .filter(Boolean)
                  .join(" ")
              );
            }
          } catch {
            photoIdFr = selectedPhoto.id;
            setWarning((w) =>
              [
                w,
                "French translation failed — using the same image for EN and FR.",
              ]
                .filter(Boolean)
                .join(" ")
            );
          }
        }
      }

      const entry: GeneratedAd = {
        ...data.ad,
        id: crypto.randomUUID(),
        categoryId: captionCategoryId,
        channel,
        language,
        photoIds: [selectedPhoto.id],
        photoIdFr,
        createdAt: Date.now(),
        aiImage: selectedPhoto.source === "ai",
        promptSummary: selectedPhoto.promptSummary,
      };

      setHistory((prev) => [entry, ...prev].slice(0, HISTORY_LIMIT));
      setActiveId(entry.id);
      clearSavedPreview();
      if (photoIdFr && photoIdFr !== selectedPhoto.id) {
        setWarning((w) =>
          [
            w,
            selectedPhoto.linkedFrPhotoId
              ? "Using linked EN/FR image pair for captions."
              : "French preview uses the same photo with translated on-image text.",
          ]
            .filter(Boolean)
            .join(" ")
        );
      }
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  async function generateAiImage() {
    setError("");
    setWarning("");
    setAiLoading(true);
    try {
      const { notes, include, headline } = parseOnImageTextLine(imageContext);
      const res = await fetch("/api/studio/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          notes,
          language: language === "fr" ? "fr" : "both",
          channel,
          subjectMode: "random",
          withCaption: false,
          bilingualPair: true,
          includeOnImageText: include,
          ...(include && headline
            ? {
                onImageText: headline,
                onImageLanguage: "en",
              }
            : {}),
        }),
      });

      const data = (await res.json()) as {
        imageBase64?: string;
        mimeType?: string;
        imageFrBase64?: string;
        imageFrMimeType?: string;
        promptSummary?: string;
        promptSummaryFr?: string;
        hasOnImageText?: boolean;
        warning?: string;
        error?: string;
      };

      if (!res.ok || !data.imageBase64) {
        setError(data.error || "AI image generation failed");
        return;
      }

      if (data.warning) setWarning(data.warning);

      const hasText =
        data.hasOnImageText === true ||
        /\bEN text\b/i.test(data.promptSummary || "");

      const savedEn = await addPhotoFromBase64({
        categoryId,
        base64: data.imageBase64,
        mimeType: data.mimeType || "image/png",
        name: `ai-en-${categoryId}-${Date.now()}.png`,
        note: hasText
          ? "AI EN wording — not a real patient"
          : "AI image — not a real patient",
        promptSummary: data.promptSummary,
        hasOnImageText: hasText,
      });

      if (data.imageFrBase64) {
        const savedFr = await addPhotoFromBase64({
          categoryId,
          base64: data.imageFrBase64,
          mimeType: data.imageFrMimeType || data.mimeType || "image/png",
          name: `ai-fr-${categoryId}-${Date.now()}.png`,
          note: hasText
            ? "AI FR wording — same photo as EN twin"
            : "AI FR twin — same photo as EN",
          promptSummary: data.promptSummaryFr,
          galleryHidden: true,
          pairOfPhotoId: savedEn.id,
          hasOnImageText: hasText,
        });
        await linkFrTwin(savedEn.id, savedFr.id);
      }

      await refreshPhotos();
      setSelectedId(savedEn.id);
      setCaptionCategoryId(categoryId);
      clearSavedPreview();
      setWarning((w) =>
        [
          w,
          data.imageFrBase64
            ? "Saved EN image with a linked FR twin (FR stays hidden in the gallery until you generate a bilingual caption)."
            : "AI image saved and selected.",
        ]
          .filter(Boolean)
          .join(" ")
      );
    } catch {
      setError("Network error — try again");
    } finally {
      setAiLoading(false);
    }
  }

  async function mergeBeforeAfterImages() {
    setError("");
    setWarning("");
    if (!beforeMergeId || !afterMergeId) {
      setError("Select a Before photo, then an After photo in the library");
      return;
    }
    const before = photos.find((p) => p.id === beforeMergeId);
    const after = photos.find((p) => p.id === afterMergeId);
    if (!before?.blob || !after?.blob) {
      setError("Before/After photos are missing — reselect them");
      return;
    }
    if (
      before.mimeType.startsWith("video/") ||
      after.mimeType.startsWith("video/")
    ) {
      setError("Merge works with photos only, not videos");
      return;
    }

    setMergeLoading(true);
    try {
      const { stitchBeforeAfterToPng } = await import(
        "@/lib/studio/stitch-before-after"
      );
      const compositeEn = await stitchBeforeAfterToPng(
        before.blob,
        after.blob,
        "en"
      );
      const compositeFr = await stitchBeforeAfterToPng(
        before.blob,
        after.blob,
        "fr"
      );

      const savedEn = await addPhoto({
        categoryId,
        file: compositeEn,
        name: `before-after-${Date.now()}.png`,
        note: "Before/after merge",
        source: "ai",
        hasOnImageText: true,
        promptSummary:
          "EN text · Before and After as two separate photos on one still",
      });
      const savedFr = await addPhoto({
        categoryId,
        file: compositeFr,
        name: `avant-apres-${Date.now()}.png`,
        note: "Fusion avant/après",
        source: "ai",
        hasOnImageText: true,
        galleryHidden: true,
        pairOfPhotoId: savedEn.id,
        promptSummary:
          "FR text · Avant et Après comme deux photos distinctes",
      });
      await linkFrTwin(savedEn.id, savedFr.id);
      await refreshPhotos();
      setSelectedId(savedEn.id);
      setCaptionCategoryId(categoryId);
      clearSavedPreview();
      setBeforeMergeId(null);
      setAfterMergeId(null);
      setWarning(
        "Merged before/after saved (English labels in the library; French AVANT/APRÈS twin is attached for FR Instagram)."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error — try again");
    } finally {
      setMergeLoading(false);
    }
  }

  async function fetchVideoScript(opts?: {
    avoid?: string[];
    categoryId?: StudioCategoryId;
  }): Promise<{ script: string; warning?: string } | null> {
    const { notes } = parseOnImageTextLine(imageContext);
    const res = await fetch("/api/studio/generate-video-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: opts?.categoryId || categoryId,
        notes,
        tone: videoTone,
        language: videoSpokenLanguage,
        duration: videoDuration,
        avoidScripts: opts?.avoid || scriptHistory.slice(0, 5),
      }),
    });
    const data = (await res.json()) as {
      script?: string;
      warning?: string;
      error?: string;
    };
    if (!res.ok || !data.script) {
      setError(data.error || "Video script generation failed");
      return null;
    }
    return { script: data.script, warning: data.warning };
  }

  async function fetchVideoMotionPrompt(opts?: {
    photoNote?: string;
  }): Promise<string | null> {
    const { notes } = parseOnImageTextLine(imageContext);
    setVideoMotionLoading(true);
    try {
      const res = await fetch("/api/studio/generate-video-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "motion",
          categoryId,
          notes,
          photoNote: opts?.photoNote || "",
          tone: videoTone,
          duration: videoDuration,
        }),
      });
      const data = (await res.json()) as {
        prompt?: string;
        warning?: string;
        error?: string;
      };
      if (!res.ok || !data.prompt) {
        setError(data.error || "Could not write an animation prompt");
        return null;
      }
      if (data.warning) {
        setWarning((w) => [w, data.warning].filter(Boolean).join(" "));
      }
      setVideoMotionPrompt(data.prompt);
      return data.prompt;
    } catch (err) {
      setError(studioFetchErrorMessage(err));
      return null;
    } finally {
      setVideoMotionLoading(false);
    }
  }

  async function prepareAiVideo() {
    setError("");
    setWarning("");
    setVideoPrepLoading(true);
    try {
      const { notes } = parseOnImageTextLine(imageContext);
      let photoId: string | null = null;
      let stillCategory: StudioCategoryId = categoryId;

      if (videoStillSource === "library") {
        const libraryStill = photos.find((p) => p.id === videoStillId) || null;
        const isClip =
          libraryStill &&
          (libraryStill.mediaKind === "video" ||
            libraryStill.mimeType.startsWith("video/"));
        if (!libraryStill || isClip) {
          setError("Pick a library photo to animate, then Prepare AI video.");
          return;
        }
        photoId = libraryStill.id;
        stillCategory = libraryStill.categoryId;
      } else {
        const reusableAiStill =
          selectedPhoto &&
          selectedPhoto.source === "ai" &&
          selectedPhoto.mediaKind !== "video" &&
          !selectedPhoto.mimeType.startsWith("video/") &&
          !selectedPhoto.hasOnImageText
            ? selectedPhoto
            : null;

        if (reusableAiStill) {
          photoId = reusableAiStill.id;
          stillCategory = reusableAiStill.categoryId;
        } else {
          if (selectedPhoto?.hasOnImageText) {
            setWarning(
              "Selected still has on-image text — creating a photo-only still for video prep."
            );
          }
          const res = await fetch("/api/studio/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              categoryId,
              notes,
              language: language === "fr" ? "fr" : "both",
              channel,
              subjectMode: "random",
              withCaption: false,
              bilingualPair: false,
              includeOnImageText: false,
            }),
          });
          const data = (await res.json()) as {
            imageBase64?: string;
            mimeType?: string;
            promptSummary?: string;
            warning?: string;
            error?: string;
          };
          if (data.warning) {
            setWarning((w) => [w, data.warning].filter(Boolean).join(" "));
          }
          if (!res.ok || !data.imageBase64) {
            setError(data.error || "Could not create a still for video prep");
            return;
          }
          const saved = await addPhotoFromBase64({
            categoryId,
            base64: data.imageBase64,
            mimeType: data.mimeType || "image/png",
            name: `ai-video-still-${categoryId}-${Date.now()}.png`,
            note: "Photo-only still for AI video (no on-image text)",
            promptSummary: data.promptSummary,
            hasOnImageText: false,
          });
          photoId = saved.id;
          await refreshPhotos();
          setSelectedId(saved.id);
          clearSavedPreview();
        }
      }

      if (!photoId) {
        setError("No still available for video prep");
        return;
      }

      const stillForMotion = photos.find((p) => p.id === photoId);
      let motion = videoMotionPrompt.trim();
      if (!motion) {
        motion =
          (await fetchVideoMotionPrompt({
            photoNote: stillForMotion?.note || stillForMotion?.name,
          })) || "";
      }

      setScriptLoading(true);
      const scriptResult = await fetchVideoScript({
        categoryId: stillCategory,
      });
      if (!scriptResult) return;

      if (scriptResult.warning) {
        setWarning((w) =>
          [w, scriptResult.warning].filter(Boolean).join(" ")
        );
      }

      setScriptHistory((prev) =>
        [scriptResult.script, ...prev].slice(0, 8)
      );
      setVideoPrep({
        photoId,
        script: scriptResult.script,
        motionPrompt: motion || videoMotionPrompt,
        categoryId: stillCategory,
        mediaCategoryId: stillCategory,
      });
      setWarning((w) =>
        [
          w,
          "Video prep ready — review the still, animation prompt, and spoken script, then generate the clip.",
        ]
          .filter(Boolean)
          .join(" ")
      );
    } catch (err) {
      setError(studioFetchErrorMessage(err));
    } finally {
      setScriptLoading(false);
      setVideoPrepLoading(false);
    }
  }

  async function regenerateVideoScript(theme?: StudioCategoryId) {
    if (!videoPrep) return;
    const category = theme || videoPrep.categoryId;
    setError("");
    setScriptLoading(true);
    try {
      const scriptResult = await fetchVideoScript({
        avoid: [videoPrep.script, ...scriptHistory].slice(0, 5),
        categoryId: category,
      });
      if (!scriptResult) return;
      if (scriptResult.warning) setWarning(scriptResult.warning);
      setScriptHistory((prev) =>
        [scriptResult.script, ...prev].slice(0, 8)
      );
      setVideoPrep({
        ...videoPrep,
        script: scriptResult.script,
        categoryId: category,
      });
    } catch (err) {
      setError(studioFetchErrorMessage(err));
    } finally {
      setScriptLoading(false);
    }
  }

  function stopTtsPreview() {
    const audio = ttsPreviewAudioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      ttsPreviewAudioRef.current = null;
    }
    if (ttsPreviewUrlRef.current) {
      URL.revokeObjectURL(ttsPreviewUrlRef.current);
      ttsPreviewUrlRef.current = null;
    }
  }

  async function previewTtsVoice() {
    if (!videoPrep?.script.trim()) {
      setError("Add a spoken script before testing a voice.");
      return;
    }
    if (
      videoVoiceMode !== "v1_voiceover" &&
      videoVoiceMode !== "v2_talking_head"
    ) {
      setError("Switch Video audio to V1 or V2 to preview a spoken voice.");
      return;
    }

    setError("");
    setTtsPreviewLoading(true);
    stopTtsPreview();
    try {
      const res = await fetch("/api/studio/preview-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: videoPrep.script.trim(),
          voice: ttsVoice,
          language: videoSpokenLanguage,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(data.error || "Voice preview failed");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      ttsPreviewUrlRef.current = url;
      const audio = new Audio(url);
      ttsPreviewAudioRef.current = audio;
      audio.onended = () => {
        stopTtsPreview();
        setTtsPreviewLoading(false);
      };
      audio.onerror = () => {
        stopTtsPreview();
        setTtsPreviewLoading(false);
        setError("Could not play the voice preview.");
      };
      await audio.play();
    } catch (err) {
      stopTtsPreview();
      setError(studioFetchErrorMessage(err));
      setTtsPreviewLoading(false);
      return;
    }
    // Keep "Playing…" until audio ends (onended clears loading)
  }

  async function confirmAiVideo() {
    if (!videoPrep) return;
    setError("");
    setWarning("");
    setHiggsfieldFallbackUrl("");
    setVideoLoading(true);
    try {
      const { notes } = parseOnImageTextLine(imageContext);
      const still =
        photos.find((p) => p.id === videoPrep.photoId) ||
        (selectedPhoto?.id === videoPrep.photoId ? selectedPhoto : null);

      if (!still || still.mimeType.startsWith("video/")) {
        setError("Video prep still is missing — prepare again.");
        setVideoPrep(null);
        return;
      }

      const form = new FormData();
      form.append("categoryId", videoPrep.categoryId || categoryId);
      form.append(
        "notes",
        videoPrep.motionPrompt.trim() || videoMotionPrompt.trim() || notes
      );
      form.append("subjectMode", "random");
      form.append("tone", videoTone);
      form.append("duration", String(videoDuration));
      form.append("voiceMode", videoVoiceMode);
      form.append("spokenLanguage", videoSpokenLanguage);
      form.append("script", videoPrep.script.trim());
      form.append("ttsVoice", ttsVoice);
      form.append("image", still.blob, still.name || "source.png");

      const res = await fetch("/api/studio/generate-video", {
        method: "POST",
        body: form,
      });

      const contentType = res.headers.get("content-type") || "";

      // Success path: raw MP4 body (avoids huge base64 JSON).
      if (res.ok && contentType.includes("video/")) {
        const blob = await res.blob();
        if (!blob.size) {
          setError("AI video generation returned an empty file — try again.");
          return;
        }
        const headerWarning = decodeStudioHeader(
          res.headers.get("X-Studio-Warning")
        );
        if (headerWarning) setWarning(headerWarning);

        const model =
          res.headers.get("X-Studio-Model")?.trim() || undefined;
        const promptSummary =
          decodeStudioHeader(res.headers.get("X-Studio-Prompt-Summary")) ||
          undefined;
        const captionTheme =
          decodeStudioHeader(res.headers.get("X-Studio-Caption-Theme")) ||
          undefined;
        const scriptNote = videoPrep.script.trim();
        const saved = await addPhoto({
          categoryId,
          file: blob,
          name: `ai-video-${categoryId}-${Date.now()}.mp4`,
          note: [
            captionTheme || "AI video — Higgsfield, not a real patient",
            scriptNote ? `Spoken script: ${scriptNote}` : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
          source: "ai",
          promptSummary,
        });

        await refreshPhotos();
        setSelectedId(saved.id);
        setCaptionCategoryId(categoryId);
        clearSavedPreview();
        setVideoPrep(null);
        setWarning((w) =>
          [
            w,
            `AI video saved${model ? ` (${model})` : ""}${
              videoVoiceMode === "v1_voiceover"
                ? " with V1 voiceover"
                : videoVoiceMode === "v2_talking_head"
                  ? " with V2 talking head"
                  : ""
            }. Caption theme defaults to ${
              STUDIO_CATEGORIES.find((c) => c.id === categoryId)?.label ||
              categoryId
            } — change it under Generate caption if you want a different angle.`,
          ]
            .filter(Boolean)
            .join(" ")
        );
        return;
      }

      const data = await readResponseJson<{
        configured?: boolean;
        videoBase64?: string;
        mimeType?: string;
        promptSummary?: string;
        captionTheme?: string;
        motionPrompt?: string;
        higgsfieldUrl?: string;
        cloudUrl?: string;
        requestId?: string;
        statusUrl?: string;
        warning?: string;
        error?: string;
        model?: string;
      }>(res);

      if (!data) {
        setError(
          res.status === 504 || res.status === 524 || res.status === 502
            ? videoGatewayTimeoutMessage(res.status, contentType)
            : `AI video generation failed (${res.status}${
                contentType ? `, ${contentType.split(";")[0]}` : ""
              }). The clip was not saved — check Higgsfield credits/keys and try again.`
        );
        return;
      }

      if (data.warning) setWarning(data.warning);
      if (data.higgsfieldUrl) setHiggsfieldFallbackUrl(data.higgsfieldUrl);

      // Keys missing → manual Higgsfield fallback
      if (data.configured === false) {
        if (data.motionPrompt) {
          const copied = await copyToClipboard(data.motionPrompt);
          setWarning(
            data.warning ||
              (copied
                ? "Higgsfield API keys missing. Motion prompt copied — paste in Higgsfield, download the MP4, then upload to the media library."
                : "Higgsfield API keys missing. Clipboard copy was blocked — open Higgsfield and paste a motion prompt manually, or set API keys in .env.local.")
          );
          if (data.higgsfieldUrl) {
            setHiggsfieldFallbackUrl(data.higgsfieldUrl);
            window.open(data.higgsfieldUrl, "_blank", "noopener,noreferrer");
          }
          return;
        }
        setError(data.error || "AI video generation is not configured");
        return;
      }

      // Legacy JSON success (base64) — keep for older servers / proxies
      if (res.ok && data.videoBase64) {
        const scriptNote = videoPrep.script.trim();
        const saved = await addPhotoFromBase64({
          categoryId,
          base64: data.videoBase64,
          mimeType: data.mimeType || "video/mp4",
          name: `ai-video-${categoryId}-${Date.now()}.mp4`,
          note: [
            data.captionTheme || "AI video — Higgsfield, not a real patient",
            scriptNote ? `Spoken script: ${scriptNote}` : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
          promptSummary: data.promptSummary,
        });

        await refreshPhotos();
        setSelectedId(saved.id);
        setCaptionCategoryId(categoryId);
        clearSavedPreview();
        setVideoPrep(null);
        setWarning((w) =>
          [
            w,
            `AI video saved${data.model ? ` (${data.model})` : ""}. Caption theme defaults to the video’s treatment — change under Generate caption to mix-and-match.`,
          ]
            .filter(Boolean)
            .join(" ")
        );
        return;
      }

      setError(
        data.error ||
          (res.status === 504 || res.status === 524 || res.status === 502
            ? videoGatewayTimeoutMessage(res.status)
            : `AI video generation failed (${res.status}). The clip was not saved — check Higgsfield credits/keys and try again.`)
      );
      if (data.motionPrompt) {
        const copied = await copyToClipboard(data.motionPrompt);
        const timedOut = /timed out/i.test(data.error || "");
        setWarning((w) =>
          [
            w,
            copied
              ? "Fallback motion prompt copied to clipboard — paste it in Higgsfield if you want to generate manually."
              : "Fallback motion prompt is available — clipboard copy was blocked; use Open Higgsfield below to generate manually.",
            timedOut && data.requestId
              ? `You can also look up request ${data.requestId} in Higgsfield Cloud.`
              : "",
          ]
            .filter(Boolean)
            .join(" ")
        );
        if (data.higgsfieldUrl) {
          setHiggsfieldFallbackUrl(data.higgsfieldUrl);
        }
      }
    } catch (err) {
      setError(studioFetchErrorMessage(err));
    } finally {
      setVideoLoading(false);
    }
  }

  function cancelVideoPrep() {
    stopTtsPreview();
    setTtsPreviewLoading(false);
    setVideoPrep(null);
    setScriptLoading(false);
    setVideoPrepLoading(false);
    setHiggsfieldFallbackUrl("");
  }

  function updateActiveAd(next: GeneratedAd) {
    if (savedViewAd && savedViewAd.id === next.id) {
      setSavedViewAd(next);
      return;
    }
    setHistory((prev) => prev.map((h) => (h.id === next.id ? next : h)));
  }

  function toggleFavorite(id: string) {
    setHistory((prev) =>
      prev.map((h) =>
        h.id === id ? { ...h, favorite: !h.favorite } : h
      )
    );
  }

  function discardAd(id: string) {
    setHistory((prev) => {
      const next = prev.filter((h) => h.id !== id);
      if (activeId === id) setActiveId(next[0]?.id ?? null);
      return next;
    });
  }

  function onSelectHistory(id: string) {
    clearSavedPreview();
    setActiveId(id);
    const ad = history.find((h) => h.id === id);
    const photoId = ad?.photoIds?.[0];
    if (photoId) setSelectedId(photoId);
    if (ad?.categoryId) setCaptionCategoryId(ad.categoryId);
  }

  async function onSelectSavedAd(id: string) {
    setError("");
    setWarning("");
    try {
      const local = await getLocalSavedAd(id);
      type SavedAdMeta = {
        id: string;
        categoryId: StudioCategoryId;
        channel: StudioChannel;
        language: StudioLanguage;
        headline: string;
        caption: string;
        shortCaption: string;
        hashtags: string[];
        cta: string;
        disclaimer: string;
        angle: string;
        paid?: GeneratedAd["paid"];
        fr?: GeneratedAd["fr"];
        createdAt: number;
        favorite?: boolean;
        promptSummary?: string;
        promptSummaryFr?: string;
        imageUrl?: string;
        imageFrUrl?: string;
        hasImageFr?: boolean;
      };
      let meta: SavedAdMeta | null = null;
      let enBlob: Blob | null = null;
      let frBlob: Blob | null = null;

      if (local?.imageBase64) {
        meta = {
          id: local.id,
          categoryId: local.categoryId,
          channel: local.channel,
          language: local.language,
          headline: local.headline,
          caption: local.caption,
          shortCaption: local.shortCaption,
          hashtags: local.hashtags,
          cta: local.cta,
          disclaimer: local.disclaimer,
          angle: local.angle,
          paid: local.paid,
          fr: local.fr,
          createdAt: local.createdAt,
          favorite: local.favorite,
          promptSummary: local.promptSummary,
          promptSummaryFr: local.promptSummaryFr,
          hasImageFr: Boolean(local.imageFrBase64),
        };
        enBlob = base64ToBlob(
          local.imageBase64,
          local.imageMimeType || "image/png"
        );
        if (local.imageFrBase64) {
          frBlob = base64ToBlob(
            local.imageFrBase64,
            local.imageFrMimeType || "image/png"
          );
        }
      } else {
        const res = await fetch(`/api/studio/saved-ads/${id}`);
        const data = (await res.json()) as {
          ad?: SavedAdMeta;
          error?: string;
        };
        if (!res.ok || !data.ad) {
          setError(data.error || "Could not load saved ad");
          return;
        }
        meta = data.ad;
        const imgRes = await fetch(
          data.ad.imageUrl || `/api/studio/saved-ads/${id}/image`
        );
        if (!imgRes.ok) {
          setError("Could not load saved ad image");
          return;
        }
        const mimeType = imgRes.headers.get("content-type") || "image/png";
        enBlob = new Blob([await imgRes.arrayBuffer()], { type: mimeType });

        if (data.ad.hasImageFr && data.ad.imageFrUrl) {
          try {
            const frImgRes = await fetch(data.ad.imageFrUrl);
            if (frImgRes.ok) {
              frBlob = new Blob([await frImgRes.arrayBuffer()], {
                type: frImgRes.headers.get("content-type") || "image/png",
              });
            }
          } catch {
            /* FR twin optional */
          }
        }
      }

      if (!meta || !enBlob) {
        setError("Could not load saved ad");
        return;
      }

      const enId = `saved-en-${id}`;
      const frId = frBlob ? `saved-fr-${id}` : undefined;
      const enPhoto = makeEphemeralPhoto({
        id: enId,
        categoryId: meta.categoryId,
        blob: enBlob,
        name: `calendar-${id.slice(0, 8)}.png`,
        note: "Saved calendar ad preview",
        promptSummary: meta.promptSummary,
      });
      const frPhoto = frBlob
        ? makeEphemeralPhoto({
            id: frId!,
            categoryId: meta.categoryId,
            blob: frBlob,
            name: `calendar-fr-${id.slice(0, 8)}.png`,
            note: "Saved calendar ad — French preview",
            promptSummary: meta.promptSummaryFr,
          })
        : null;

      setSavedPreviewEn((prev) => {
        revokeEphemeralPhoto(prev);
        return enPhoto;
      });
      setSavedPreviewFr((prev) => {
        revokeEphemeralPhoto(prev);
        return frPhoto;
      });
      setCategoryId(meta.categoryId);
      setCaptionCategoryId(meta.categoryId);
      setLanguage(meta.language);

      const view: GeneratedAd = {
        id: meta.id,
        categoryId: meta.categoryId,
        channel: meta.channel,
        language: meta.language,
        photoIds: [enId],
        photoIdFr: frId,
        createdAt: meta.createdAt,
        favorite: meta.favorite,
        aiImage: true,
        promptSummary: meta.promptSummary,
        headline: meta.headline,
        caption: meta.caption,
        shortCaption: meta.shortCaption,
        hashtags: meta.hashtags,
        cta: meta.cta,
        disclaimer: meta.disclaimer,
        angle: meta.angle,
        paid: meta.paid,
        fr: meta.fr,
      };
      setSavedViewAd(view);
      setSavedActiveId(id);
      setActiveId(null);
    } catch {
      setError("Network error loading saved ad");
    }
  }

  async function toggleSavedFavorite(id: string) {
    const current = savedAds.find((a) => a.id === id);
    const nextFav = !current?.favorite;
    setSavedAds((prev) =>
      prev.map((a) => (a.id === id ? { ...a, favorite: nextFav } : a))
    );
    await updateLocalSavedFavorite(id, nextFav).catch(() => undefined);
    await fetch("/api/studio/saved-ads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, favorite: nextFav }),
    }).catch(() => undefined);
  }

  async function discardSaved(id: string) {
    await discardLocalSavedAd(id).catch(() => undefined);
    await fetch(`/api/studio/saved-ads?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch(() => undefined);
    if (savedActiveId === id) {
      clearSavedPreview();
    }
    await refreshSavedAds();
  }

  async function saveCurrentAd() {
    if (!activeAd) return;
    if (savedAds.some((a) => a.id === activeAd.id)) {
      setWarning("This ad is already in Saved ads.");
      return;
    }

    const enPhoto = viewingSavedAd ? savedPreviewEn : selectedPhoto;
    const frPhoto = viewingSavedAd ? savedPreviewFr : previewPhotoFr;
    if (!enPhoto?.blob || enPhoto.mimeType.startsWith("video/")) {
      setError(
        "Save needs a still photo. Pick the image for this caption, then tap Save."
      );
      return;
    }

    setSavingAd(true);
    setError("");
    try {
      const enBlob = await compressImageForRetouch(enPhoto.blob);
      const imageBase64 = await blobToBase64(enBlob);
      let imageFrBase64: string | undefined;
      let imageFrMimeType: string | undefined;
      if (frPhoto?.blob && frPhoto.mimeType.startsWith("image/")) {
        const frBlob = await compressImageForRetouch(frPhoto.blob);
        imageFrBase64 = await blobToBase64(frBlob);
        imageFrMimeType = frBlob.type || "image/jpeg";
      }

      const record: SavedStudioAd = {
        id: activeAd.id,
        source: "manual",
        status: "ready",
        platforms: ["instagram", "facebook"],
        format: "static",
        categoryId: activeAd.categoryId,
        channel: activeAd.channel,
        language: activeAd.language,
        angle: activeAd.angle,
        headline: activeAd.headline,
        caption: activeAd.caption,
        shortCaption: activeAd.shortCaption,
        hashtags: activeAd.hashtags,
        cta: activeAd.cta,
        disclaimer: activeAd.disclaimer,
        paid: activeAd.paid,
        fr: activeAd.fr,
        imageMimeType: enBlob.type || "image/jpeg",
        imageBase64,
        imageFrMimeType,
        imageFrBase64,
        promptSummary: activeAd.promptSummary,
        createdAt: activeAd.createdAt,
        favorite: activeAd.favorite,
      };

      await putLocalSavedAds([record]);
      const res = await fetch("/api/studio/saved-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
      if (!res.ok) {
        const data = await readResponseJson<{ error?: string }>(res);
        throw new Error(data?.error || "Save failed");
      }
      await refreshSavedAds();
      setSavedActiveId(record.id);
      setWarning("Saved. Find it under Saved ads.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save this ad — try again."
      );
    } finally {
      setSavingAd(false);
    }
  }

  async function runCalendar(options?: {
    force?: boolean;
    date?: string;
    calendarPostId?: string;
    replaceAdId?: string;
  }) {
    setCalendarRunning(true);
    if (options?.replaceAdId) setCalendarRerunningId(options.replaceAdId);
    setError("");
    setWarning("");
    try {
      const res = await fetch("/api/studio/calendar/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          force: options?.force === true,
          date: options?.date,
          calendarPostId: options?.calendarPostId,
          savedAdId: options?.replaceAdId,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        generatedCount?: number;
        skippedCount?: number;
        publishedCount?: number;
        published?: boolean;
        generated?: { id: string }[];
        generatedFull?: SavedStudioAd[];
        storyPublishes?: {
          results?: { platform: string; postId: string }[];
          errors?: { platform: string; error: string }[];
        }[];
        warnings?: string[];
        errors?: { calendarPostId: string; error: string }[];
      };
      if (!res.ok) {
        setError(data.error || "Calendar run failed");
        return;
      }

      if (data.generatedFull?.length) {
        await putLocalSavedAds(data.generatedFull).catch(() => undefined);
      }

      const platformsSent = [
        ...new Set(
          (data.storyPublishes ?? []).flatMap(
            (p) => p.results?.map((r) => r.platform) ?? []
          )
        ),
      ];
      const storyConfirm =
        (data.publishedCount ?? 0) > 0 && platformsSent.length > 0
          ? ` Stories sent to ${platformsSent
              .map((p) => (p === "facebook" ? "Facebook" : "Instagram"))
              .join(" and ")}.`
          : "";

      const reran = options?.force === true;
      setWarning(
        (reran
          ? `Reran with the same calendar theme — generated ${data.generatedCount ?? 0} new ad(s).`
          : data.message ||
            `Generated ${data.generatedCount ?? 0} ad(s); skipped ${data.skippedCount ?? 0}.`) +
          storyConfirm
      );
      if (data.warnings?.length) {
        setWarning((w) => `${w} ${data.warnings!.join(" ")}`.trim());
      }
      if (data.errors?.length) {
        setError(
          data.errors.map((e) => `${e.calendarPostId}: ${e.error}`).join(" · ")
        );
      }
      await refreshSavedAds();
      const nextId = data.generated?.[0]?.id || data.generatedFull?.[0]?.id;
      if (nextId) {
        await onSelectSavedAd(nextId);
      } else if (options?.replaceAdId && savedActiveId === options.replaceAdId) {
        clearSavedPreview();
      }
    } catch {
      setError("Calendar run failed — network error");
    } finally {
      setCalendarRunning(false);
      setCalendarRerunningId(null);
    }
  }

  async function runTodaysCalendar() {
    await runCalendar();
  }

  async function logout() {
    await fetch("/api/studio/auth", { method: "DELETE" });
    window.location.href = "/studio/login";
  }

  async function onCopyCaption() {
    if (!activeAd) return;
    const text = stripHashtagsFromCaption(
      language === "fr" && activeAd.fr
        ? activeAd.fr.caption
        : activeAd.caption
    );
    await copyToClipboard(text);
  }

  async function onCopyHashtags() {
    if (!activeAd) return;
    const tags =
      language === "fr" && activeAd.fr
        ? activeAd.fr.hashtags
        : activeAd.hashtags;
    await copyToClipboard(formatHashtags(tags));
  }

  async function onDownloadPack() {
    if (!activeAd) return;
    const md = buildExportMarkdown(activeAd);
    const cat = STUDIO_CATEGORIES.find((c) => c.id === activeAd.categoryId);
    const filename = `ad-${cat?.id ?? "export"}-${activeAd.id.slice(0, 8)}.md`;
    const result = await shareOrDownloadTextFile(filename, md);
    if (result === "shared") {
      setWarning("Export shared — save to Files or send to yourself if needed.");
    }
  }

  async function onPublish(platform: "facebook" | "instagram") {
    if (!activeAd) {
      setError("Generate a caption first, then publish to Instagram or Facebook.");
      return;
    }
    if (!publishPhotoSource) {
      setError("Select a photo in the library first.");
      return;
    }

    if (
      publishPhotoSource.mediaKind === "video" ||
      publishPhotoSource.mimeType.startsWith("video/")
    ) {
      setError(
        "One-click Meta publish is image-only for now. Download the video from the media library and post the Reel manually with your caption."
      );
      return;
    }

    const useFr = publishLang === "fr";
    const copy = useFr && activeAd.fr ? activeAd.fr : activeAd;
    const caption = withClinicBookingLink(
      stripHashtagsFromCaption(copy.caption),
      copy.cta,
      useFr,
      { forFacebook: platform === "facebook" }
    );
    const liveFrPhoto =
      (activeAd.photoIdFr &&
        photos.find((p) => p.id === activeAd.photoIdFr)) ||
      (selectedPhoto?.linkedFrPhotoId &&
        photos.find((p) => p.id === selectedPhoto.linkedFrPhotoId)) ||
      null;
    const publishPhoto = viewingSavedAd
      ? useFr && savedPreviewFr
        ? savedPreviewFr
        : savedPreviewEn!
      : useFr && liveFrPhoto
        ? liveFrPhoto
        : selectedPhoto!;

    const label = platform === "facebook" ? "Facebook" : "Instagram";
    const placementLabel = publishPlacement === "story" ? "Story" : "feed post";
    const confirmed = window.confirm(
      `Publish this as a ${placementLabel} on ${label} now?\n\nThis goes to your live business account.`
    );
    if (!confirmed) return;

    setPublishLoading(true);
    setPublishTarget(platform);
    setError("");
    setWarning("");
    setPublishStatus(null);
    try {
      const form = new FormData();
      form.append(
        "image",
        publishPhoto.blob,
        publishPhoto.name || "creative.jpg"
      );
      form.append("caption", caption);
      form.append("platforms", JSON.stringify([platform]));
      form.append("placement", publishPlacement);

      const res = await fetch("/api/studio/publish", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as {
        error?: string;
        warning?: string;
        placement?: string;
        results?: { platform: string; postId: string; permalink?: string }[];
      };

      if (!res.ok) {
        const failMsg = data.error || `${label} publish failed`;
        setError(failMsg);
        setPublishStatus({
          kind: "error",
          message: `Not sent to ${label}. ${failMsg}`,
        });
        return;
      }

      const postId = data.results?.[0]?.postId;
      const sentAs = publishPlacement === "story" ? "Story" : "post";
      const successMsg = postId
        ? `Sent ${sentAs} to ${label}. ID: ${postId}. Open ${label} to confirm it appears.`
        : `Sent ${sentAs} to ${label}. Open ${label} to confirm it appears.`;
      setWarning(successMsg);
      setPublishStatus({ kind: "success", message: successMsg });
      if (activeAd && !savedAds.some((a) => a.id === activeAd.id)) {
        void saveCurrentAd();
      }
    } catch {
      const failMsg = `${label} publish failed — check connection and Meta credentials`;
      setError(failMsg);
      setPublishStatus({ kind: "error", message: `Not sent to ${label}. ${failMsg}` });
    } finally {
      setPublishLoading(false);
      setPublishTarget(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[rgb(var(--brand-200))] pb-5 sm:pb-6">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[rgb(var(--brand-600))]">
            Dr. Elizabeth Peeling
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-playfair)] text-2xl text-[rgb(var(--brand-900))] sm:text-4xl">
            Social Ads Studio
          </h1>
          {libraryCloudOk === false ? (
            <p className="mt-2 max-w-xl text-sm text-amber-800">
              Cloud library is not connected on this deployment. Photos may
              disappear after you leave this browser until Blob storage is
              linked.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void logout()}
            className="min-h-11 shrink-0 rounded-lg border border-[rgb(var(--brand-300))] px-3 py-2 text-sm text-[rgb(var(--brand-800))] hover:bg-white"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mt-6 grid gap-6 sm:mt-8 sm:gap-8 lg:grid-cols-[1fr_360px]">
        <div className="order-1 flex flex-col gap-6 sm:gap-8">
          {/* iPhone-first: media → calendar → caption → AI */}
          <div className="order-1 lg:order-2">
          <PhotoLibrary
            photos={galleryPhotos}
            ready={libraryReady}
            selectedId={selectedId}
            beforeMergeId={beforeMergeId}
            afterMergeId={afterMergeId}
            mergePickSlot={mergePickSlot}
            videoStillId={videoStillId}
            categories={STUDIO_CATEGORIES}
            onUpload={handleUpload}
            onSelect={selectPhoto}
            onDelete={handleDeletePhoto}
            onNoteChange={handleNoteChange}
            onDigitalEnhance={(id, notes) => void handleDigitalEnhance(id, notes)}
            enhancingId={enhancingId}
          />
          </div>

          <div className="order-2 lg:hidden">
            <SavedAdsRail
              ads={savedAds}
              activeId={savedActiveId}
              running={calendarRunning}
              rerunningId={calendarRerunningId}
              onSelect={(id) => void onSelectSavedAd(id)}
              onFavorite={(id) => void toggleSavedFavorite(id)}
              onDelete={(id) => void discardSaved(id)}
              onRunToday={() => void runTodaysCalendar()}
              onRerunToday={() => void runCalendar({ force: true })}
              onRerunAd={(ad) =>
                void runCalendar({
                  force: true,
                  date: ad.scheduledDate,
                  calendarPostId: ad.calendarPostId,
                  replaceAdId: ad.id,
                })
              }
            />
          </div>

          <div className="order-4 lg:order-1">
          <GenerationPanel
            categoryId={categoryId}
            categories={STUDIO_CATEGORIES}
            imageContext={imageContext}
            videoTone={videoTone}
            videoSpokenLanguage={videoSpokenLanguage}
            loading={loading}
            aiLoading={aiLoading}
            publishLoading={publishLoading}
            error={error}
            warning={warning}
            onCategoryChange={(id) => {
              setCategoryId(id);
              setImageContext((prev) => {
                const { notes, include } = parseOnImageTextLine(prev);
                return withOnImageTextLine(
                  notes,
                  include ? pickShortOnImageHeadline(id) : null
                );
              });
            }}
            onImageContextChange={setImageContext}
            videoDuration={videoDuration}
            videoVoiceMode={videoVoiceMode}
            onVideoToneChange={setVideoTone}
            onVideoSpokenLanguageChange={setVideoSpokenLanguage}
            onVideoDurationChange={setVideoDuration}
            onVideoVoiceModeChange={setVideoVoiceMode}
            onRandomizeImageContext={(kind) => {
              const base = randomImageContext(categoryId, kind);
              const include = rollIncludeOnImageText();
              setImageContext(
                withOnImageTextLine(
                  base,
                  include ? pickShortOnImageHeadline(categoryId) : null
                )
              );
            }}
            onGenerateAiImage={() => void generateAiImage()}
            onPrepareAiVideo={() => void prepareAiVideo()}
            onMergeImages={() => void mergeBeforeAfterImages()}
            mergeLoading={mergeLoading}
            mergePickSlot={mergePickSlot}
            onPickMergeSlot={(slot) => {
              setError("");
              if (slot === "before" && beforeMergeId) {
                setBeforeMergeId(null);
                setMergePickSlot(null);
                return;
              }
              if (slot === "after" && afterMergeId) {
                setAfterMergeId(null);
                setMergePickSlot(null);
                return;
              }
              if (slot === "video" && videoStillId) {
                setVideoStillId(null);
                setMergePickSlot(null);
                return;
              }
              if (mergePickSlot === slot) {
                setMergePickSlot(null);
              } else {
                setMergePickSlot(slot);
                document
                  .getElementById("studio-media-library")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
            beforeMergePreviewUrl={
              photos.find((p) => p.id === beforeMergeId)?.previewUrl ?? null
            }
            afterMergePreviewUrl={
              photos.find((p) => p.id === afterMergeId)?.previewUrl ?? null
            }
            onClearMergeBefore={() => {
              setBeforeMergeId(null);
              if (mergePickSlot === "before") setMergePickSlot(null);
            }}
            onClearMergeAfter={() => {
              setAfterMergeId(null);
              if (mergePickSlot === "after") setMergePickSlot(null);
            }}
            videoStillSource={videoStillSource}
            onVideoStillSourceChange={(source) => {
              setVideoStillSource(source);
              if (source === "library") {
                setMergePickSlot("video");
                document
                  .getElementById("studio-media-library")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              } else if (mergePickSlot === "video") {
                setMergePickSlot(null);
              }
            }}
            videoStillPreviewUrl={
              photos.find((p) => p.id === videoStillId)?.previewUrl ?? null
            }
            videoStillPickActive={mergePickSlot === "video"}
            onClearVideoStill={() => {
              setVideoStillId(null);
              if (mergePickSlot === "video") setMergePickSlot(null);
            }}
            videoMotionPrompt={videoMotionPrompt}
            onVideoMotionPromptChange={setVideoMotionPrompt}
            onGenerateVideoMotionPrompt={() => {
              const still = photos.find((p) => p.id === videoStillId);
              void fetchVideoMotionPrompt({
                photoNote: still?.note || still?.name,
              });
            }}
            videoMotionLoading={videoMotionLoading}
            videoLoading={videoLoading}
            videoPrepLoading={videoPrepLoading}
            videoPrepActive={Boolean(videoPrep)}
          />
          </div>

          {videoPrep ? (
            <div className="order-5">
            <VideoPrepPanel
              stillPreviewUrl={
                photos.find((p) => p.id === videoPrep.photoId)?.previewUrl ??
                null
              }
              stillName={
                photos.find((p) => p.id === videoPrep.photoId)?.name ?? null
              }
              script={videoPrep.script}
              scriptLoading={scriptLoading}
              videoLoading={videoLoading}
              toneLabel={
                `${STUDIO_VIDEO_TONES.find((t) => t.id === videoTone)?.label || videoTone} · ${videoSpokenLanguage === "fr" ? "French" : "English"}`
              }
              videoTone={videoTone}
              durationLabel={studioVideoDurationLabel(videoDuration)}
              voiceModeLabel={studioVideoVoiceModeLabel(videoVoiceMode)}
              voiceMode={videoVoiceMode}
              ttsVoice={ttsVoice}
              ttsPreviewLoading={ttsPreviewLoading}
              scriptCategoryId={videoPrep.categoryId}
              mediaCategoryId={videoPrep.mediaCategoryId}
              categories={STUDIO_CATEGORIES}
              error={error}
              warning={warning}
              higgsfieldUrl={higgsfieldFallbackUrl}
              motionPrompt={videoPrep.motionPrompt}
              motionPromptLoading={videoMotionLoading}
              onMotionPromptChange={(value) => {
                setVideoMotionPrompt(value);
                setVideoPrep({ ...videoPrep, motionPrompt: value });
              }}
              onRegenerateMotionPrompt={() => {
                const still = photos.find((p) => p.id === videoPrep.photoId);
                void fetchVideoMotionPrompt({
                  photoNote: still?.note || still?.name,
                }).then((prompt) => {
                  if (prompt) {
                    setVideoPrep((prev) =>
                      prev ? { ...prev, motionPrompt: prompt } : prev
                    );
                  }
                });
              }}
              onScriptChange={(script) =>
                setVideoPrep({ ...videoPrep, script })
              }
              onScriptCategoryChange={(id) => {
                setVideoPrep({ ...videoPrep, categoryId: id });
                void regenerateVideoScript(id);
              }}
              onTtsVoiceChange={setTtsVoice}
              onTestTtsVoice={() => void previewTtsVoice()}
              onRegenerateScript={() => void regenerateVideoScript()}
              onConfirmVideo={() => void confirmAiVideo()}
              onCancel={cancelVideoPrep}
            />
            </div>
          ) : null}

          <div className="order-3 lg:order-3">
          <CaptionPanel
            language={language}
            categoryId={captionCategoryId}
            categories={STUDIO_CATEGORIES}
            selectedPhotoName={
              viewingSavedAd
                ? "Calendar ad preview"
                : selectedPhoto?.name ?? null
            }
            selectedIsAi={
              viewingSavedAd ? true : selectedPhoto?.source === "ai"
            }
            selectedIsVideo={
              !viewingSavedAd &&
              Boolean(
                selectedPhoto &&
                  (selectedPhoto.mediaKind === "video" ||
                    selectedPhoto.mimeType.startsWith("video/"))
              )
            }
            mediaCategoryLabel={
              viewingSavedAd
                ? STUDIO_CATEGORIES.find((c) => c.id === savedViewAd?.categoryId)
                    ?.label ?? null
                : selectedPhoto
                  ? STUDIO_CATEGORIES.find(
                      (c) => c.id === selectedPhoto.categoryId
                    )?.label ?? null
                  : null
            }
            loading={loading || videoPrepLoading || scriptLoading || videoLoading}
            aiLoading={aiLoading}
            publishLoading={publishLoading}
            error={videoPrep ? "" : error}
            warning={videoPrep ? "" : warning}
            hasActive={Boolean(activeAd)}
            onLanguageChange={setLanguage}
            onCategoryChange={setCaptionCategoryId}
            captionPrompt={captionPrompt}
            onCaptionPromptChange={setCaptionPrompt}
            onRandomizeCaptionPrompt={() =>
              setCaptionPrompt(randomCaptionPrompt(captionCategoryId))
            }
            onRandomizeOdqPrice={() =>
              setCaptionPrompt(randomOdqPricePrompt(captionCategoryId))
            }
            onGenerateAd={() => void generateAdFromPhoto()}
          />
          </div>

          <div className="order-6">
          {activeAd ? (
            <AdPreview
              ad={activeAd}
              photo={previewPhoto}
              photoFr={previewPhotoFr}
              language={language}
              onAdChange={updateActiveAd}
              alreadySaved={savedAds.some((a) => a.id === activeAd.id)}
              saveBusy={savingAd}
              onSaveProposed={
                viewingSavedAd || savedAds.some((a) => a.id === activeAd.id)
                  ? undefined
                  : () => void saveCurrentAd()
              }
              onDeleteProposed={() => {
                if (savedViewAd && savedActiveId === activeAd.id) {
                  void discardSaved(activeAd.id);
                } else {
                  discardAd(activeAd.id);
                }
              }}
              captionNotes={captionPrompt}
              odqAudit={odqAudit}
              onOdqAudit={setOdqAudit}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-[rgb(var(--brand-300))] bg-white/60 px-6 py-10 text-center text-sm text-[rgb(var(--brand-600))]">
              Select media, then generate a caption — or create an AI image.
            </div>
          )}
          </div>

          {activeAd || publishPhotoSource ? (
            <section className="order-7 rounded-2xl border border-[rgb(var(--brand-300))] bg-white p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-[rgb(var(--brand-900))]">
                Publish
              </h2>

              {activeAd?.fr && publishPlacement === "post" ? (
                <label className="mt-4 block text-sm">
                  <span className="font-medium text-[rgb(var(--brand-800))]">
                    Language
                  </span>
                  <select
                    value={publishLang}
                    onChange={(e) =>
                      setPublishLang(e.target.value as "en" | "fr")
                    }
                    disabled={publishLoading}
                    className="mt-1.5 w-full max-w-xs rounded-lg border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] px-3 py-2.5 text-base sm:text-sm"
                  >
                    <option value="en">English</option>
                    <option value="fr">French</option>
                  </select>
                </label>
              ) : null}

              <div
                className="mt-4 inline-flex rounded-lg border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] p-1"
                role="group"
                aria-label="Publish as post or story"
              >
                <button
                  type="button"
                  onClick={() => setPublishPlacement("post")}
                  disabled={publishLoading}
                  aria-pressed={publishPlacement === "post"}
                  className={`min-h-11 rounded-md px-4 text-sm font-medium transition disabled:opacity-50 ${
                    publishPlacement === "post"
                      ? "bg-white text-[rgb(var(--brand-900))] shadow-sm"
                      : "text-[rgb(var(--brand-700))] hover:text-[rgb(var(--brand-900))]"
                  }`}
                >
                  Post
                </button>
                <button
                  type="button"
                  onClick={() => setPublishPlacement("story")}
                  disabled={publishLoading}
                  aria-pressed={publishPlacement === "story"}
                  className={`min-h-11 rounded-md px-4 text-sm font-medium transition disabled:opacity-50 ${
                    publishPlacement === "story"
                      ? "bg-white text-[rgb(var(--brand-900))] shadow-sm"
                      : "text-[rgb(var(--brand-700))] hover:text-[rgb(var(--brand-900))]"
                  }`}
                >
                  Story
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void onPublish("instagram")}
                  disabled={publishLoading}
                  className="min-h-12 rounded-lg border-2 border-[rgb(var(--brand-700))] bg-white px-4 py-3 text-sm font-semibold text-[rgb(var(--brand-900))] transition hover:bg-[rgb(var(--brand-50))] disabled:opacity-50"
                >
                  {publishLoading && publishTarget === "instagram"
                    ? "Publishing…"
                    : publishPlacement === "story"
                      ? "Publish to Instagram Story"
                      : "Publish to Instagram"}
                </button>
                <button
                  type="button"
                  onClick={() => void onPublish("facebook")}
                  disabled={publishLoading}
                  className="min-h-12 rounded-lg bg-[rgb(var(--brand-800))] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[rgb(var(--brand-900))] disabled:opacity-50"
                >
                  {publishLoading && publishTarget === "facebook"
                    ? "Publishing…"
                    : publishPlacement === "story"
                      ? "Publish to Facebook Story"
                      : "Publish to Facebook"}
                </button>
              </div>

              {publishStatus ? (
                <p
                  role="status"
                  className={`mt-4 rounded-lg px-3 py-3 text-sm font-medium ${
                    publishStatus.kind === "success"
                      ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200"
                      : "bg-red-50 text-red-800 ring-1 ring-red-200"
                  }`}
                >
                  {publishStatus.message}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>

        <div className="order-2 hidden space-y-4 lg:order-2 lg:block">
          <SavedAdsRail
            ads={savedAds}
            activeId={savedActiveId}
            running={calendarRunning}
            rerunningId={calendarRerunningId}
            onSelect={(id) => void onSelectSavedAd(id)}
            onFavorite={(id) => void toggleSavedFavorite(id)}
            onDelete={(id) => void discardSaved(id)}
            onRunToday={() => void runTodaysCalendar()}
            onRerunToday={() => void runCalendar({ force: true })}
            onRerunAd={(ad) =>
              void runCalendar({
                force: true,
                date: ad.scheduledDate,
                calendarPostId: ad.calendarPostId,
                replaceAdId: ad.id,
              })
            }
          />
        </div>
      </div>

      <p className="mt-8 hidden text-xs text-[rgb(var(--brand-600))] sm:mt-10 sm:block">
        Photos stay on this device. Generations are for review only — not medical
        advice.
      </p>
    </div>
  );
}
