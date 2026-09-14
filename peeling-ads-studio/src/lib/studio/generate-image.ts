/**
 * Shared image generation for studio routes + calendar automation.
 * Extracted so cron/script can call the same pipeline without HTTP.
 */

import { sanitizeFrenchMarketingText } from "./sanitize-copy";
import {
  clipOnImageOverlay,
  refinedOnImageTypographyPrompt,
} from "./image-prompt";

const OPENAI_IMAGE_MODELS = [
  "gpt-image-2",
  "gpt-image-1.5",
  "gpt-image-1",
  "gpt-image-1-mini",
] as const;

export function modelCandidatesForEdit(): string[] {
  return modelCandidates();
}

function modelCandidates(): string[] {
  const preferred = process.env.OPENAI_IMAGE_MODEL?.trim();
  const list = [...OPENAI_IMAGE_MODELS];
  if (
    preferred &&
    !list.includes(preferred as (typeof OPENAI_IMAGE_MODELS)[number])
  ) {
    return [preferred, ...list];
  }
  if (preferred) {
    return [preferred, ...list.filter((m) => m !== preferred)];
  }
  return list;
}

export async function extractImagePayloadFromOpenAI(data: {
  data?: { b64_json?: string; url?: string }[];
}): Promise<{ base64: string; mimeType: string }> {
  return extractImagePayload(data);
}

async function extractImagePayload(data: {
  data?: { b64_json?: string; url?: string }[];
}): Promise<{ base64: string; mimeType: string }> {
  const item = data.data?.[0];
  if (!item) throw new Error("Empty image response from OpenAI");

  if (item.b64_json) {
    return { base64: item.b64_json, mimeType: "image/png" };
  }

  if (item.url) {
    const imgRes = await fetch(item.url);
    if (!imgRes.ok) throw new Error("Failed to download generated image URL");
    const buf = Buffer.from(await imgRes.arrayBuffer());
    return { base64: buf.toString("base64"), mimeType: "image/png" };
  }

  throw new Error("Image response missing b64_json and url");
}

async function requestOpenAIModel(
  apiKey: string,
  model: string,
  prompt: string,
  size: "1024x1024" | "1024x1536"
): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: prompt.slice(0, 32000),
      n: 1,
      size,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${model}:${res.status}:${text.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  return extractImagePayload(data);
}

async function requestPollinations(
  prompt: string,
  size: "1024x1024" | "1024x1536"
): Promise<{ base64: string; mimeType: string }> {
  const seed = Math.floor(Math.random() * 1_000_000);
  const [width, height] = size.split("x");
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt.slice(0, 800)
  )}?width=${width}&height=${height}&nologo=true&seed=${seed}`;

  const res = await fetch(url, {
    headers: { Accept: "image/*" },
  });
  if (!res.ok) {
    throw new Error(`Fallback image provider failed (${res.status})`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength < 1000) {
    throw new Error("Fallback image provider returned an empty image");
  }
  return { base64: buf.toString("base64"), mimeType: "image/png" };
}

function summarizeOpenAIFailures(failures: string[]): string {
  const joined = failures.join(" | ").toLowerCase();
  if (
    joined.includes("limit 0") ||
    joined.includes("rate_limit") ||
    joined.includes("429")
  ) {
    return "OpenAI image models are blocked (rate limit 0). Add a payment method and complete org verification at https://platform.openai.com/settings/organization — or the studio will use a free fallback provider.";
  }
  if (joined.includes("does not exist") || joined.includes("invalid_value")) {
    return "Configured OpenAI image model is unavailable on this account.";
  }
  return failures[0] ?? "OpenAI image generation failed";
}

export function modelSupportsInputFidelity(model: string): boolean {
  // gpt-image-2 always uses high fidelity; the API rejects the parameter.
  return (
    model === "gpt-image-1" ||
    model === "gpt-image-1.5" ||
    model === "gpt-image-1-mini"
  );
}

async function requestOpenAIEdit(
  apiKey: string,
  model: string,
  prompt: string,
  bytes: Uint8Array,
  mimeType: string,
  filename: string,
  size: "1024x1024" | "1024x1536"
): Promise<{ base64: string; mimeType: string }> {
  const form = new FormData();
  form.append("model", model);
  form.append("prompt", prompt.slice(0, 32000));
  form.append("n", "1");
  form.append("size", size);
  if (modelSupportsInputFidelity(model)) {
    form.append("input_fidelity", "high");
  }
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  form.append(
    "image",
    new Blob([copy], { type: mimeType || "image/png" }),
    filename || "creative.png"
  );

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${model}:${res.status}:${text.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  return extractImagePayload(data);
}

/**
 * Keep the same photo/composition and either translate existing on-image text
 * in place, or replace it with a provided line.
 */
export async function localizeStudioImageText(params: {
  bytes: Uint8Array;
  mimeType: string;
  filename?: string;
  language: "en" | "fr";
  /** Used when mode is "replace" */
  text?: string;
  /** translate = swap language of the one headline; replace = burn provided text */
  mode?: "translate" | "replace";
  aspect?: "square" | "story";
}): Promise<{
  base64: string;
  mimeType: string;
  provider: "openai" | "source";
  model?: string;
  warning?: string;
}> {
  const mode = params.mode || (params.text?.trim() ? "replace" : "translate");
  const rawText = clipOnImageOverlay(params.text || "");
  const text =
    params.language === "fr"
      ? clipOnImageOverlay(sanitizeFrenchMarketingText(rawText))
      : rawText;

  if (mode === "replace" && !text) {
    return {
      base64: Buffer.from(params.bytes).toString("base64"),
      mimeType: params.mimeType || "image/png",
      provider: "source",
      warning: "No overlay text — reused source image.",
    };
  }

  const prompt =
    mode === "translate"
      ? [
          "Language-only edit of this exact marketing photograph.",
          "CRITICAL: keep the SAME photograph — identical subject, pose, crop, lighting, colors, and background.",
          "Do NOT redesign, restyle, or turn a photo into an infographic/collage.",
          refinedOnImageTypographyPrompt({
            language: params.language,
            text,
            mode: "translate",
          }),
        ].join(" ")
      : [
          "Typography-only edit of this exact marketing photograph.",
          "CRITICAL: keep the identical people, objects, pose, crop, lighting, colors, background, and composition.",
          "Do NOT invent a new scene, style, collage, or infographic layout.",
          refinedOnImageTypographyPrompt({
            language: params.language,
            text,
            mode: "replace",
          }),
        ].join(" ");

  const apiKey = process.env.OPENAI_API_KEY;
  const failures: string[] = [];
  const size: "1024x1024" | "1024x1536" =
    params.aspect === "story" ? "1024x1536" : "1024x1024";

  if (apiKey) {
    for (const model of modelCandidates()) {
      try {
        const image = await requestOpenAIEdit(
          apiKey,
          model,
          prompt,
          params.bytes,
          params.mimeType || "image/png",
          params.filename || "creative.png",
          size
        );
        return {
          ...image,
          provider: "openai",
          model,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        failures.push(message);
      }
    }
  } else {
    failures.push("OPENAI_API_KEY not set");
  }

  return {
    base64: Buffer.from(params.bytes).toString("base64"),
    mimeType: params.mimeType || "image/png",
    provider: "source",
    warning: `${summarizeOpenAIFailures(failures)} Reused the same source image for the ${params.language.toUpperCase()} version.`,
  };
}

export type LocalizedImageResult = Awaited<
  ReturnType<typeof localizeStudioImageText>
>;

/**
 * Same base photo → EN typography burn → FR language twin.
 * Keeps EN/FR composition identical (edits only, never two separate generations).
 */
export async function buildEnFrImageTwins(params: {
  base64: string;
  mimeType: string;
  filename?: string;
  englishText: string;
  /** When set, FR overlay uses this line instead of a free translation. */
  frenchText?: string;
  aspect?: "square" | "story";
}): Promise<{
  en: LocalizedImageResult;
  fr: LocalizedImageResult;
  englishText: string;
}> {
  const bytes = Buffer.from(params.base64, "base64");
  const mimeType = params.mimeType || "image/png";
  const filename = params.filename || "creative.png";
  const englishText = clipOnImageOverlay(params.englishText);
  const frenchText = clipOnImageOverlay(
    sanitizeFrenchMarketingText(params.frenchText || "")
  );

  const en = await localizeStudioImageText({
    bytes,
    mimeType,
    filename,
    language: "en",
    text: englishText,
    mode: "replace",
    aspect: params.aspect,
  });

  const enBytes = Buffer.from(en.base64, "base64");
  const fr = await localizeStudioImageText({
    bytes: enBytes,
    mimeType: en.mimeType || mimeType,
    filename: "en-creative.png",
    language: "fr",
    text: frenchText || undefined,
    mode: frenchText ? "replace" : "translate",
    aspect: params.aspect,
  });

  return { en, fr, englishText };
}

export async function generateStudioImage(
  prompt: string,
  options?: { aspect?: "square" | "story" }
): Promise<{
  base64: string;
  mimeType: string;
  provider: "openai" | "pollinations";
  model?: string;
  warning?: string;
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  const failures: string[] = [];
  const size: "1024x1024" | "1024x1536" =
    options?.aspect === "story" ? "1024x1536" : "1024x1024";

  if (apiKey) {
    for (const model of modelCandidates()) {
      try {
        const image = await requestOpenAIModel(apiKey, model, prompt, size);
        return {
          ...image,
          provider: "openai",
          model,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        failures.push(message);
      }
    }
  } else {
    failures.push("OPENAI_API_KEY not set");
  }

  try {
    const image = await requestPollinations(prompt, size);
    return {
      ...image,
      provider: "pollinations",
      warning: `${summarizeOpenAIFailures(failures)} Used free fallback image provider instead.`,
    };
  } catch (fallbackErr) {
    const fb =
      fallbackErr instanceof Error ? fallbackErr.message : "fallback failed";
    throw new Error(
      `${summarizeOpenAIFailures(failures)} Fallback also failed: ${fb}`
    );
  }
}
