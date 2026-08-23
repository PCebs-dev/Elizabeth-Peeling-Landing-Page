"use client";

import { links } from "@/config/links";
import type {
  GeneratedAd,
  StudioLanguage,
  StudioPhoto,
} from "@/lib/studio/types";

interface AdPreviewProps {
  ad: GeneratedAd;
  photo: StudioPhoto | null;
  /** French on-image twin when bilingual */
  photoFr?: StudioPhoto | null;
  language: StudioLanguage;
  onAdChange: (next: GeneratedAd) => void;
  /** Removes this proposed ad only — never deletes library media. */
  onDeleteProposed?: () => void;
  onSaveProposed?: () => void;
  saveBusy?: boolean;
  alreadySaved?: boolean;
}

/** Soft preview truncate at a word boundary (full caption stays editable above). */
function previewTruncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const breakAt = Math.max(slice.lastIndexOf(" "), slice.lastIndexOf("\n"));
  const cut = (breakAt > max * 0.55 ? slice.slice(0, breakAt) : slice).trimEnd();
  return `${cut.replace(/[\s.,;:!-]+$/u, "")}…`;
}

export function AdPreview({
  ad,
  photo,
  photoFr = null,
  language,
  onAdChange,
  onDeleteProposed,
  onSaveProposed,
  saveBusy = false,
  alreadySaved = false,
}: AdPreviewProps) {
  const showFr = Boolean(ad.fr) && (language === "fr" || language === "both");
  const showEn = language === "en" || language === "both" || !ad.fr;

  function updateEn(field: "headline" | "caption" | "cta", value: string) {
    onAdChange({ ...ad, [field]: value });
  }

  function updateFr(field: "headline" | "caption" | "cta", value: string) {
    if (!ad.fr) return;
    onAdChange({ ...ad, fr: { ...ad.fr, [field]: value } });
  }

  const previewCaption =
    language === "fr" && ad.fr ? ad.fr.caption : ad.caption;
  const previewHeadline =
    language === "fr" && ad.fr ? ad.fr.headline : ad.headline;
  const previewCta = language === "fr" && ad.fr ? ad.fr.cta : ad.cta;
  const phonePhotoEn = photo;
  const phonePhotoFr = photoFr || photo;
  const phonePhoto =
    language === "fr" && photoFr ? photoFr : photo;

  const isVideoMedia = (p: StudioPhoto | null | undefined) =>
    Boolean(
      p &&
        (p.mediaKind === "video" || p.mimeType.startsWith("video/"))
    );

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[rgb(var(--brand-900))]">
            Review
          </h2>
          <p className="mt-1 text-xs text-[rgb(var(--brand-600))]">
            Angle: <span className="font-medium">{ad.angle}</span>
            {ad.channel === "paid" ? " · Paid" : " · Organic"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onSaveProposed && !alreadySaved ? (
            <button
              type="button"
              onClick={onSaveProposed}
              disabled={saveBusy}
              className="min-h-11 shrink-0 rounded-lg bg-[rgb(var(--brand-800))] px-3 py-2 text-sm font-medium text-white hover:bg-[rgb(var(--brand-900))] disabled:opacity-60"
            >
              {saveBusy ? "Saving…" : "Save proposed ad"}
            </button>
          ) : null}
          {onDeleteProposed ? (
            <button
              type="button"
              onClick={onDeleteProposed}
              className="min-h-11 shrink-0 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-50"
              title="Removes this ad from review. Photos stay in the media library."
            >
              Delete proposed ad
            </button>
          ) : null}
        </div>
      </div>

      {language === "both" && ad.fr ? (
        <div className="grid items-start gap-6 md:grid-cols-2">
          <PhoneFrame label="Instagram · EN image">
            <IgPost
              mediaUrl={phonePhotoEn?.previewUrl}
              isVideo={isVideoMedia(phonePhotoEn)}
              headline={ad.headline}
              caption={ad.caption}
              cta={ad.cta}
              lockCaptionHeight
            />
          </PhoneFrame>
          <PhoneFrame label="Instagram · FR image">
            <IgPost
              mediaUrl={phonePhotoFr?.previewUrl}
              isVideo={isVideoMedia(phonePhotoFr)}
              headline={ad.fr.headline}
              caption={ad.fr.caption}
              cta={ad.fr.cta}
              lockCaptionHeight
            />
          </PhoneFrame>
        </div>
      ) : (
        <div className="grid items-start gap-6 md:grid-cols-2">
          <PhoneFrame label="Instagram">
            <IgPost
              mediaUrl={phonePhoto?.previewUrl}
              isVideo={isVideoMedia(phonePhoto)}
              headline={previewHeadline}
              caption={previewCaption}
              cta={previewCta}
            />
          </PhoneFrame>

          <PhoneFrame label="Facebook">
            <FbPost
              mediaUrl={phonePhoto?.previewUrl}
              isVideo={isVideoMedia(phonePhoto)}
              headline={previewHeadline}
              caption={
                language === "fr" && ad.fr
                  ? ad.fr.caption
                  : ad.paid?.primaryText || ad.caption
              }
              cta={previewCta}
              isPaid={ad.channel === "paid"}
              paidHeadline={
                language === "fr" && ad.fr?.paid
                  ? ad.fr.paid.headline
                  : ad.paid?.headline
              }
              paidDescription={
                language === "fr" && ad.fr?.paid
                  ? ad.fr.paid.description
                  : ad.paid?.description
              }
            />
          </PhoneFrame>
        </div>
      )}

      {isVideoMedia(phonePhoto) ? (
        <p className="text-xs text-[rgb(var(--brand-600))]">
          Video — download from the library to post Reels manually.
        </p>
      ) : null}

      <div
        className={`grid items-start gap-4 rounded-2xl border border-[rgb(var(--brand-200))] bg-white p-5 ${
          showEn && showFr ? "sm:grid-cols-2" : ""
        }`}
      >
        {showEn ? (
          <EditableCaption
            title="English caption"
            headline={ad.headline}
            caption={ad.caption}
            cta={ad.cta}
            onHeadline={(v) => updateEn("headline", v)}
            onCaption={(v) => updateEn("caption", v)}
            onCta={(v) => updateEn("cta", v)}
          />
        ) : null}

        {showFr && ad.fr ? (
          <EditableCaption
            title="Légende française"
            headline={ad.fr.headline}
            caption={ad.fr.caption}
            cta={ad.fr.cta}
            onHeadline={(v) => updateFr("headline", v)}
            onCaption={(v) => updateFr("caption", v)}
            onCta={(v) => updateFr("cta", v)}
          />
        ) : null}
      </div>

      {(ad.disclaimer || ad.fr?.disclaimer) && (
        <p className="text-xs text-[rgb(var(--brand-600))]">
          Disclaimer:{" "}
          {language === "fr" && ad.fr?.disclaimer
            ? ad.fr.disclaimer
            : ad.disclaimer}
        </p>
      )}

      {ad.channel === "paid" && ad.paid ? (
        <div className="rounded-2xl border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] p-5 text-sm">
          <h3 className="font-semibold text-[rgb(var(--brand-900))]">
            Paid ad extras
          </h3>
          <ul className="mt-2 space-y-1 text-[rgb(var(--brand-800))]">
            <li>
              <span className="font-medium">Primary:</span> {ad.paid.primaryText}
            </li>
            <li>
              <span className="font-medium">Headline:</span> {ad.paid.headline}
            </li>
            <li>
              <span className="font-medium">Description:</span>{" "}
              {ad.paid.description}
            </li>
            <li>
              <span className="font-medium">Audience:</span>{" "}
              {ad.paid.audienceSuggestion}
            </li>
            <li>
              <span className="font-medium">Budget:</span> {ad.paid.budgetNote}
            </li>
          </ul>
          <p className="mt-3 text-xs text-[rgb(var(--brand-600))]">
            Download the export pack for the full Meta targeting checklist
            (Vaudreuil / West Island, {links.address.city}).
          </p>
        </div>
      ) : null}
    </section>
  );
}

function EditableCaption({
  title,
  headline,
  caption,
  cta,
  onHeadline,
  onCaption,
  onCta,
}: {
  title: string;
  headline: string;
  caption: string;
  cta: string;
  onHeadline: (v: string) => void;
  onCaption: (v: string) => void;
  onCta: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[rgb(var(--brand-900))]">
        {title}
      </h3>
      <label className="block text-xs font-medium text-[rgb(var(--brand-700))]">
        Headline
        <input
          type="text"
          value={headline}
          onChange={(e) => onHeadline(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] px-3 py-2 text-sm text-[rgb(var(--brand-950))]"
        />
      </label>
      <label className="block text-xs font-medium text-[rgb(var(--brand-700))]">
        Caption
        <textarea
          value={caption}
          onChange={(e) => onCaption(e.target.value)}
          rows={8}
          className="mt-1 w-full rounded-lg border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] px-3 py-2 text-sm text-[rgb(var(--brand-950))]"
        />
      </label>
      <label className="block text-xs font-medium text-[rgb(var(--brand-700))]">
        CTA
        <input
          type="text"
          value={cta}
          onChange={(e) => onCta(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] px-3 py-2 text-sm text-[rgb(var(--brand-950))]"
        />
      </label>
    </div>
  );
}

function PhoneFrame({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <p className="mb-2 h-4 text-xs font-medium uppercase tracking-wider text-[rgb(var(--brand-600))]">
        {label}
      </p>
      <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-[1.75rem] border-[10px] border-[rgb(var(--brand-900))] bg-white shadow-lg">
        <div className="h-6 bg-[rgb(var(--brand-900))]" />
        {children}
      </div>
    </div>
  );
}

function MediaFrame({
  mediaUrl,
  isVideo,
  emptyLabel,
}: {
  mediaUrl?: string;
  isVideo?: boolean;
  emptyLabel: string;
}) {
  if (!mediaUrl) {
    return (
      <div className="flex h-full items-center justify-center text-neutral-400">
        {emptyLabel}
      </div>
    );
  }
  if (isVideo) {
    return (
      <video
        src={mediaUrl}
        className="h-full w-full object-cover"
        muted
        playsInline
        loop
        autoPlay
        controls
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={mediaUrl} alt="" className="h-full w-full object-cover" />
  );
}

function IgPost({
  mediaUrl,
  isVideo,
  headline,
  caption,
  cta,
  lockCaptionHeight = false,
}: {
  mediaUrl?: string;
  isVideo?: boolean;
  headline: string;
  caption: string;
  cta: string;
  /** Keep EN/FR phone frames the same height in dual preview */
  lockCaptionHeight?: boolean;
}) {
  return (
    <div className="bg-white text-[11px] leading-relaxed text-neutral-900">
      <div className="flex items-center gap-2 border-b border-neutral-100 px-3 py-2">
        <div className="h-7 w-7 shrink-0 rounded-full bg-[rgb(var(--brand-300))]" />
        <div className="min-w-0">
          <p className="font-semibold">dr.elizabeth.peeling</p>
          <p className="text-[10px] text-neutral-500">Vaudreuil-Dorion</p>
        </div>
      </div>
      <div className="aspect-square bg-neutral-100">
        <MediaFrame
          mediaUrl={mediaUrl}
          isVideo={isVideo}
          emptyLabel="Select media"
        />
      </div>
      <div
        className={`space-y-1.5 px-3 py-2 ${
          lockCaptionHeight ? "h-[156px] overflow-hidden" : ""
        }`}
      >
        <p className="line-clamp-2 font-semibold">{headline}</p>
        <p className="whitespace-pre-wrap text-neutral-800">
          {previewTruncate(caption, lockCaptionHeight ? 160 : 280)}
        </p>
        <p className="truncate font-medium text-[rgb(var(--brand-700))]">
          {cta}
        </p>
      </div>
    </div>
  );
}

function FbPost({
  mediaUrl,
  isVideo,
  headline,
  caption,
  cta,
  isPaid,
  paidHeadline,
  paidDescription,
}: {
  mediaUrl?: string;
  isVideo?: boolean;
  headline: string;
  caption: string;
  cta: string;
  isPaid: boolean;
  paidHeadline?: string;
  paidDescription?: string;
}) {
  return (
    <div className="bg-white text-[11px] leading-relaxed text-neutral-900">
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="h-8 w-8 rounded-full bg-[rgb(var(--brand-400))]" />
        <div>
          <p className="font-semibold">Dr. Elizabeth Peeling</p>
          <p className="text-[10px] text-neutral-500">
            {isPaid ? "Sponsored · Vaudreuil-Dorion" : "Just now · Vaudreuil-Dorion"}
          </p>
        </div>
      </div>
      <p className="whitespace-pre-wrap px-3 pb-2 text-neutral-800">
        {previewTruncate(caption, 220)}
      </p>
      <div className="aspect-[1.91/1] bg-neutral-100">
        <MediaFrame
          mediaUrl={mediaUrl}
          isVideo={isVideo}
          emptyLabel="Select media"
        />
      </div>
      {isPaid ? (
        <div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50 px-3 py-2">
          <div>
            <p className="text-[10px] uppercase text-neutral-500">
              elizabethpeeling.ca
            </p>
            <p className="font-semibold">{paidHeadline || headline}</p>
            <p className="text-neutral-600">{paidDescription || cta}</p>
          </div>
          <span className="rounded bg-neutral-200 px-2 py-1 text-[10px] font-semibold">
            Learn more
          </span>
        </div>
      ) : (
        <div className="border-t border-neutral-100 px-3 py-2 font-medium text-[rgb(var(--brand-700))]">
          {cta}
        </div>
      )}
    </div>
  );
}
