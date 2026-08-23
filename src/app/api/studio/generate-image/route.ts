import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STUDIO_COOKIE, verifySessionToken } from "@/lib/studio/auth";
import { STUDIO_CATEGORIES } from "@/lib/studio/categories";
import { generateAdCopy } from "@/lib/studio/generate-copy";
import {
  buildEnFrImageTwins,
  generateStudioImage,
  localizeStudioImageText,
} from "@/lib/studio/generate-image";
import {
  buildImagePrompt,
  clipOnImageOverlay,
  pickShortOnImageHeadline,
  pickShortOnImageHeadlineFr,
  type OnImageText,
} from "@/lib/studio/image-prompt";
import type {
  GenerateImageRequest,
  StudioCategoryId,
  StudioChannel,
  StudioLanguage,
  SubjectMode,
} from "@/lib/studio/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const CATEGORY_IDS = new Set(STUDIO_CATEGORIES.map((c) => c.id));

function isCategoryId(v: unknown): v is StudioCategoryId {
  return typeof v === "string" && CATEGORY_IDS.has(v as StudioCategoryId);
}

function parseOnImageText(b: Record<string, unknown>): OnImageText | undefined {
  const text =
    typeof b.onImageText === "string"
      ? clipOnImageOverlay(b.onImageText)
      : "";
  if (!text) return undefined;
  const langRaw =
    typeof b.onImageLanguage === "string"
      ? b.onImageLanguage.trim().toLowerCase()
      : "en";
  const language: "en" | "fr" = langRaw === "fr" ? "fr" : "en";
  return { language, text };
}

function parseRequest(
  body: unknown
):
  | (GenerateImageRequest & {
      withCaption: boolean;
      bilingualPair: boolean;
      onImageText?: OnImageText;
      /** When set by the client, overrides the server-side 30% roll */
      includeOnImageText?: boolean;
      aspect?: "square" | "story";
    })
  | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid body" };
  const b = body as Record<string, unknown>;

  if (!isCategoryId(b.categoryId)) return { error: "Invalid categoryId" };

  const language = (b.language as StudioLanguage) || "en";
  if (language !== "en" && language !== "fr" && language !== "both") {
    return { error: "Invalid language" };
  }

  const channel = (b.channel as StudioChannel) || "organic";
  if (channel !== "organic" && channel !== "paid") {
    return { error: "Invalid channel" };
  }

  const subjectMode = (b.subjectMode as SubjectMode) || "random";
  if (
    subjectMode !== "random" &&
    subjectMode !== "people" &&
    subjectMode !== "service"
  ) {
    return { error: "Invalid subjectMode" };
  }

  const notes = typeof b.notes === "string" ? b.notes.slice(0, 2000) : "";
  const avoidHeadlines = Array.isArray(b.avoidHeadlines)
    ? b.avoidHeadlines
        .filter((x): x is string => typeof x === "string")
        .slice(0, 20)
    : [];
  const avoidAngles = Array.isArray(b.avoidAngles)
    ? b.avoidAngles
        .filter((x): x is string => typeof x === "string")
        .slice(0, 10)
    : [];

  const withCaption = b.withCaption === true;
  const bilingualPair = b.bilingualPair !== false;
  const aspect = b.aspect === "story" ? "story" : "square";
  const onImageText = parseOnImageText(b);
  const includeOnImageText =
    typeof b.includeOnImageText === "boolean"
      ? b.includeOnImageText
      : undefined;

  return {
    categoryId: b.categoryId,
    notes,
    language,
    channel,
    subjectMode,
    avoidHeadlines,
    avoidAngles,
    withCaption,
    bilingualPair,
    onImageText,
    includeOnImageText,
    aspect,
  };
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDIO_COOKIE)?.value;
  if (!(await verifySessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseRequest(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    // Caption-first path: one photo → EN typography → FR twin (same layout)
    if (parsed.withCaption) {
      const base = buildImagePrompt({
        categoryId: parsed.categoryId,
        subjectMode: parsed.subjectMode,
        notes: parsed.notes,
        aspect: parsed.aspect,
      });

      const copyNotes = [
        parsed.notes,
        `AI creative: ${base.summary}`,
        "Image is AI-generated (not a real patient). Disclose when posting if required.",
      ]
        .filter(Boolean)
        .join(" | ");

      const { ad, angle, warning: copyWarning } = await generateAdCopy({
        categoryId: parsed.categoryId,
        notes: copyNotes,
        language: parsed.language,
        channel: parsed.channel,
        imageHints: [base.summary],
        avoidHeadlines: parsed.avoidHeadlines,
        avoidAngles: parsed.avoidAngles,
      });

      const aiLine =
        "Creative uses an AI-generated image — not a real patient photo.";
      ad.disclaimer = ad.disclaimer ? `${ad.disclaimer} ${aiLine}` : aiLine;
      if (ad.fr) {
        const frLine =
          "Visuel généré par IA — ce n'est pas la photo d'un vrai patient.";
        ad.fr.disclaimer = ad.fr.disclaimer
          ? `${ad.fr.disclaimer} ${frLine}`
          : frLine;
      }

      const baseImage = await generateStudioImage(base.prompt, {
        aspect: parsed.aspect,
      });

      const englishText = clipOnImageOverlay(
        ad.headline || ad.shortCaption || "Smile with confidence."
      );
      const frenchText = clipOnImageOverlay(
        ad.fr?.headline || ad.fr?.shortCaption || ""
      );
      const wantFr =
        (parsed.language === "both" || parsed.language === "fr") &&
        Boolean(frenchText);

      const twinWarnings: string[] = [];
      if (baseImage.warning) twinWarnings.push(baseImage.warning);

      let imageBase64 = baseImage.base64;
      let mimeType = baseImage.mimeType;
      let imageFrBase64: string | undefined;
      let imageFrMimeType: string | undefined;
      let promptSummaryFr: string | undefined;
      let provider: string = baseImage.provider;
      let model = baseImage.model;

      if (wantFr && ad.fr) {
        const twins = await buildEnFrImageTwins({
          base64: baseImage.base64,
          mimeType: baseImage.mimeType || "image/png",
          englishText,
          frenchText,
          aspect: parsed.aspect,
        });
        imageBase64 = twins.en.base64;
        mimeType = twins.en.mimeType;
        imageFrBase64 = twins.fr.base64;
        imageFrMimeType = twins.fr.mimeType;
        promptSummaryFr = "Same photo · FR text";
        provider = twins.en.provider;
        model = twins.en.model;
        if (twins.en.warning) twinWarnings.push(twins.en.warning);
        if (twins.fr.warning) twinWarnings.push(twins.fr.warning);
      } else {
        const enOnly = await localizeStudioImageText({
          bytes: Buffer.from(baseImage.base64, "base64"),
          mimeType: baseImage.mimeType || "image/png",
          filename: "creative.png",
          language: "en",
          text: englishText,
          mode: "replace",
          aspect: parsed.aspect,
        });
        imageBase64 = enOnly.base64;
        mimeType = enOnly.mimeType;
        provider = enOnly.provider;
        model = enOnly.model;
        if (enOnly.warning) twinWarnings.push(enOnly.warning);
      }

      return NextResponse.json({
        imageBase64,
        mimeType,
        imageFrBase64,
        imageFrMimeType,
        promptSummary: `${base.summary} · EN text`,
        promptSummaryFr,
        subjectKind: base.subjectKind,
        visualAngle: base.visualAngle,
        provider,
        model,
        hasOnImageText: true,
        ad,
        angle,
        warning: [copyWarning, ...twinWarnings].filter(Boolean).join(" "),
      });
    }

    // Image-only path: photo first, then a single short headline when opted in.
    const withText =
      typeof parsed.includeOnImageText === "boolean"
        ? parsed.includeOnImageText
        : Boolean(parsed.onImageText) || Math.random() < 0.3;
    const englishText = withText
      ? parsed.onImageText?.text?.trim() ||
        pickShortOnImageHeadline(parsed.categoryId)
      : "";

    const base = buildImagePrompt({
      categoryId: parsed.categoryId,
      subjectMode: parsed.subjectMode,
      notes: parsed.notes,
      aspect: parsed.aspect,
    });

    const photo = await generateStudioImage(base.prompt, {
      aspect: parsed.aspect,
    });

    const pairWarnings: string[] = [];
    if (photo.warning) pairWarnings.push(photo.warning);

    const wantFrPair =
      parsed.bilingualPair &&
      (parsed.language === "both" ||
        parsed.language === "fr" ||
        parsed.language === "en");

    if (withText) {
      try {
        if (wantFrPair) {
          const twins = await buildEnFrImageTwins({
            base64: photo.base64,
            mimeType: photo.mimeType || "image/png",
            englishText,
            frenchText: pickShortOnImageHeadlineFr(parsed.categoryId),
            aspect: parsed.aspect,
          });
          if (twins.en.warning) pairWarnings.push(twins.en.warning);
          if (twins.fr.warning) pairWarnings.push(twins.fr.warning);

          return NextResponse.json({
            imageBase64: twins.en.base64,
            mimeType: twins.en.mimeType,
            imageFrBase64: twins.fr.base64,
            imageFrMimeType: twins.fr.mimeType,
            promptSummary: `${base.summary} · EN text`,
            promptSummaryFr: `${base.summary} · FR text`,
            subjectKind: base.subjectKind,
            visualAngle: base.visualAngle,
            provider: twins.en.provider,
            model: twins.en.model,
            hasOnImageText: true,
            warning: pairWarnings.filter(Boolean).join(" ") || undefined,
          });
        }

        const enOnly = await localizeStudioImageText({
          bytes: Buffer.from(photo.base64, "base64"),
          mimeType: photo.mimeType || "image/png",
          filename: "creative.png",
          language: "en",
          text: englishText,
          mode: "replace",
          aspect: parsed.aspect,
        });
        if (enOnly.warning) pairWarnings.push(enOnly.warning);

        return NextResponse.json({
          imageBase64: enOnly.base64,
          mimeType: enOnly.mimeType,
          promptSummary: `${base.summary} · EN text`,
          subjectKind: base.subjectKind,
          visualAngle: base.visualAngle,
          provider: enOnly.provider,
          model: enOnly.model,
          hasOnImageText: true,
          warning: pairWarnings.filter(Boolean).join(" ") || undefined,
        });
      } catch (err) {
        pairWarnings.push(
          err instanceof Error
            ? `On-image text failed: ${err.message}`
            : "On-image text failed"
        );
        return NextResponse.json({
          imageBase64: photo.base64,
          mimeType: photo.mimeType,
          imageFrBase64: wantFrPair ? photo.base64 : undefined,
          imageFrMimeType: wantFrPair ? photo.mimeType : undefined,
          promptSummary: base.summary,
          promptSummaryFr: wantFrPair ? base.summary : undefined,
          subjectKind: base.subjectKind,
          visualAngle: base.visualAngle,
          provider: photo.provider,
          model: photo.model,
          hasOnImageText: false,
          warning: pairWarnings.filter(Boolean).join(" ") || undefined,
        });
      }
    }

    return NextResponse.json({
      imageBase64: photo.base64,
      mimeType: photo.mimeType,
      imageFrBase64: wantFrPair ? photo.base64 : undefined,
      imageFrMimeType: wantFrPair ? photo.mimeType : undefined,
      promptSummary: base.summary,
      promptSummaryFr: wantFrPair ? base.summary : undefined,
      subjectKind: base.subjectKind,
      visualAngle: base.visualAngle,
      provider: photo.provider,
      model: photo.model,
      hasOnImageText: false,
      warning: pairWarnings.filter(Boolean).join(" ") || undefined,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Image generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
