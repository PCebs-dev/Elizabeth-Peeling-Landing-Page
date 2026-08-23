"use client";

import { useState } from "react";
import type { PublishPlatform, StudioFormat, StudioLanguage } from "@/lib/studio/types";
import { dataUrlToBlobForPublish, type LocalHistoryItem, saveHistory, loadHistory } from "@/lib/studio/media-store";

interface PublishPanelProps {
  imageDataUrl: string | null;
  onPublished?: () => void;
  onStartAgain?: () => void;
}

export function PublishPanel({ imageDataUrl, onPublished, onStartAgain }: PublishPanelProps) {
  const [language, setLanguage] = useState<StudioLanguage>("fr");
  const [format, setFormat] = useState<StudioFormat>("post");
  const [cta, setCta] = useState("Réservez votre consultation dès aujourd'hui");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState<PublishPlatform | null>(null);
  const [status, setStatus] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function generateCaption() {
    setGenerating(true);
    setStatus(null);
    try {
      const res = await fetch("/api/studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          format,
          cta,
          imageHint: title || "cosmetic dentistry",
        }),
      });
      const data = (await res.json()) as {
        title?: string;
        caption?: string;
        tags?: string[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Caption generation failed");
      setTitle(data.title ?? "");
      setCaption(data.caption ?? "");
      setTags(Array.isArray(data.tags) ? data.tags : []);
    } catch (e) {
      setStatus({
        type: "err",
        text: e instanceof Error ? e.message : "Could not generate caption",
      });
    } finally {
      setGenerating(false);
    }
  }

  async function publish(platform: PublishPlatform) {
    if (!imageDataUrl) {
      setStatus({ type: "err", text: "Add or select a creative image first." });
      return;
    }
    if (!caption.trim()) {
      setStatus({ type: "err", text: "Generate or write a caption before publishing." });
      return;
    }

    setPublishing(platform);
    setStatus(null);
    try {
      const blob = await dataUrlToBlobForPublish(imageDataUrl);
      const form = new FormData();
      form.append("platform", platform);
      form.append("language", language);
      form.append("format", format);
      form.append("caption", caption);
      form.append("cta", cta);
      form.append("title", title);
      form.append("tags", tags.join(","));
      form.append("image", blob, "creative.jpg");

      // Important: do NOT set Content-Type — the browser adds the multipart boundary.
      const res = await fetch("/api/studio/publish", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      const message = data.message ?? data.error ?? "Publish failed";

      if (!res.ok || data.ok === false) {
        setStatus({ type: "err", text: message });
        return;
      }

      setStatus({ type: "ok", text: message });

      const history = loadHistory();
      const item: LocalHistoryItem = {
        id: crypto.randomUUID(),
        title: title || "Untitled creative",
        caption,
        tags,
        language,
        format,
        cta,
        imageDataUrl,
        createdAt: Date.now(),
      };
      saveHistory([item, ...history]);
      onPublished?.();
    } catch (e) {
      setStatus({
        type: "err",
        text: e instanceof Error ? e.message : "Network error while publishing",
      });
    } finally {
      setPublishing(null);
    }
  }

  const hasDraft =
    Boolean(imageDataUrl) ||
    Boolean(caption.trim()) ||
    Boolean(title.trim()) ||
    tags.length > 0;

  return (
    <section className="rounded-2xl border border-[rgb(var(--brand-200))] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg text-[rgb(var(--brand-900))]">Review</h2>
          <p className="mt-1 text-xs text-[rgb(var(--brand-600))]">
            {format === "story" ? "Story" : "Post"} · {language.toUpperCase()}
            {tags.length > 0 ? ` · ${tags.slice(0, 2).join(" · ")}` : ""}
          </p>
        </div>
        {hasDraft ? (
          <button
            type="button"
            onClick={() => onStartAgain?.()}
            disabled={publishing !== null || generating}
            className="shrink-0 rounded-lg border border-[rgb(var(--brand-300))] px-3 py-2 text-xs font-medium text-[rgb(var(--brand-800))] disabled:opacity-60"
          >
            Start again
          </button>
        ) : null}
      </div>

      <label className="mt-4 block text-sm font-medium text-[rgb(var(--brand-800))]">
        Language
        <select
          value={language}
          onChange={(e) => {
            const lang = e.target.value as StudioLanguage;
            setLanguage(lang);
            setCta(
              lang === "fr"
                ? "Réservez votre consultation dès aujourd'hui"
                : "Book your consultation today",
            );
          }}
          className="mt-1 w-full rounded-lg border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] px-3 py-2.5 text-sm"
        >
          <option value="en">English</option>
          <option value="fr">French</option>
        </select>
      </label>

      <div className="mt-4 flex rounded-lg border border-[rgb(var(--brand-200))] p-1">
        {(["post", "story"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFormat(value)}
            className={`flex-1 rounded-md py-2 text-sm font-medium capitalize ${
              format === value
                ? "bg-[rgb(var(--brand-800))] text-white"
                : "text-[rgb(var(--brand-700))]"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      <label className="mt-4 block text-sm font-medium text-[rgb(var(--brand-800))]">
        CTA
        <input
          value={cta}
          onChange={(e) => setCta(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] px-3 py-2.5 text-sm"
        />
      </label>

      <button
        type="button"
        disabled={generating}
        onClick={() => void generateCaption()}
        className="mt-4 min-h-10 w-full rounded-lg border border-[rgb(var(--brand-300))] px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {generating ? "Generating caption…" : "Generate caption"}
      </button>

      {title ? (
        <label className="mt-4 block text-sm font-medium text-[rgb(var(--brand-800))]">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] px-3 py-2.5 text-sm"
          />
        </label>
      ) : null}

      <label className="mt-4 block text-sm font-medium text-[rgb(var(--brand-800))]">
        Caption
        <textarea
          rows={5}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] px-3 py-2.5 text-sm"
        />
      </label>

      {tags.length > 0 ? (
        <p className="mt-2 text-xs text-[rgb(var(--brand-600))]">{tags.join(" · ")}</p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={publishing !== null}
          onClick={() => void publish("instagram")}
          className="min-h-11 rounded-lg border-2 border-[rgb(var(--brand-800))] px-3 py-2 text-sm font-semibold text-[rgb(var(--brand-800))] disabled:opacity-60"
        >
          {publishing === "instagram" ? "Sending…" : "Instagram"}
        </button>
        <button
          type="button"
          disabled={publishing !== null}
          onClick={() => void publish("facebook")}
          className="min-h-11 rounded-lg bg-[rgb(var(--brand-800))] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {publishing === "facebook" ? "Sending…" : "Facebook"}
        </button>
      </div>

      {status ? (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            status.type === "err"
              ? "bg-red-50 text-red-800"
              : "bg-green-50 text-green-800"
          }`}
          role="alert"
        >
          {status.text}
        </p>
      ) : null}
    </section>
  );
}
