/**
 * Before/after merge for Instagram/Facebook stills via OpenAI image edits.
 */

import {
  extractImagePayloadFromOpenAI,
  modelCandidatesForEdit,
  modelSupportsInputFidelity,
} from "./generate-image";

function buildMergePrompt(enhance: boolean): string {
  const base = [
    "Create one polished square Instagram / Facebook still from the two reference photos.",
    "Image 1 = BEFORE treatment. Image 2 = AFTER treatment.",
    "Layout: clean 50/50 side-by-side split — BEFORE on the LEFT, AFTER on the RIGHT.",
    "Keep both faces clearly recognizable as the same person; preserve identity, age, hair, and expression as closely as possible.",
    "Match framing (crop both faces similarly), soft natural clinic lighting, and a seamless shared background so the pair reads as one professional before/after post.",
    "Thin soft vertical divider between the halves is OK; no heavy frames or cards.",
    "Optional tiny Understated labels only if helpful: “Before” left and “After” right — short, elegant, not a text poster.",
    "No clinic logos, no slogans, no checklists, no extra collage tiles.",
    "Photorealistic dental marketing aesthetic — focus the viewer on the smile / teeth improvement.",
  ].join(" ");

  if (!enhance) {
    return `${base} Do not beautify skin or change tooth shade beyond what is already in the photos — only compose the side-by-side.`;
  }

  return [
    base,
    "SUBTLE polish only (must stay natural):",
    "- Soften minor blemishes / pimples slightly on both faces; do not plasticize or blur identity.",
    "- Brighten teeth only a little (subtle whitening) so the dental improvement stays the hero — not a Hollywood bleach.",
    "- Do NOT change face shape, jaw, nose, eyes, makeup style, hair, or add filters that distract from the teeth result.",
  ].join(" ");
}

async function requestOpenAIMultiEdit(params: {
  apiKey: string;
  model: string;
  prompt: string;
  images: { bytes: Uint8Array; mimeType: string; filename: string }[];
  size?: "1024x1024" | "1024x1536";
}): Promise<{ base64: string; mimeType: string }> {
  const form = new FormData();
  form.append("model", params.model);
  form.append("prompt", params.prompt.slice(0, 32000));
  form.append("n", "1");
  form.append("size", params.size || "1024x1024");
  if (modelSupportsInputFidelity(params.model)) {
    form.append("input_fidelity", "high");
  }
  for (const img of params.images) {
    const copy = new Uint8Array(img.bytes.byteLength);
    copy.set(img.bytes);
    form.append(
      "image",
      new Blob([copy], { type: img.mimeType || "image/png" }),
      img.filename || "photo.png"
    );
  }

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${params.apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${params.model}:${res.status}:${text.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  return extractImagePayloadFromOpenAI(data);
}

export async function mergeBeforeAfterImages(params: {
  before: { bytes: Uint8Array; mimeType: string; filename?: string };
  after: { bytes: Uint8Array; mimeType: string; filename?: string };
  enhance?: boolean;
}): Promise<{
  base64: string;
  mimeType: string;
  provider: "openai";
  model: string;
  enhance: boolean;
}> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not set");
  }

  const enhance = params.enhance === true;
  const prompt = buildMergePrompt(enhance);
  const images = [
    {
      bytes: params.before.bytes,
      mimeType: params.before.mimeType || "image/png",
      filename: params.before.filename || "before.png",
    },
    {
      bytes: params.after.bytes,
      mimeType: params.after.mimeType || "image/png",
      filename: params.after.filename || "after.png",
    },
  ];

  const failures: string[] = [];
  for (const model of modelCandidatesForEdit()) {
    try {
      const image = await requestOpenAIMultiEdit({
        apiKey,
        model,
        prompt,
        images,
        size: "1024x1024",
      });
      return {
        ...image,
        provider: "openai",
        model,
        enhance,
      };
    } catch (err) {
      failures.push(err instanceof Error ? err.message : String(err));
    }
  }

  throw new Error(
    failures[0] || "Before/after merge failed on all image models"
  );
}
