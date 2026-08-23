/**
 * Single-photo retouch via OpenAI image edits (one `image` field).
 */

import {
  extractImagePayloadFromOpenAI,
  modelCandidatesForEdit,
  modelSupportsInputFidelity,
} from "./generate-image";

function retouchPrompt(notes: string): string {
  const trimmed = notes.trim() ||
    "Subtle natural retouch: soften minor skin blemishes and slightly whiten teeth.";
  return [
    "Retouch this single dental-clinic photo.",
    "Keep the same person, pose, framing, lighting, and crop.",
    "Photorealistic and medically honest — do not invent dental work.",
    "Do not add text, logos, collages, or change the background layout.",
    "Do not change face shape, jaw, nose, eyes, or hair.",
    "Apply ONLY these retouch notes:",
    trimmed.slice(0, 2000),
  ].join(" ");
}

async function openaiSingleEdit(params: {
  apiKey: string;
  model: string;
  prompt: string;
  bytes: Uint8Array;
  mimeType: string;
  filename: string;
}): Promise<{ base64: string; mimeType: string }> {
  const form = new FormData();
  form.append("model", params.model);
  form.append("prompt", params.prompt.slice(0, 32000));
  form.append("n", "1");
  form.append("size", "1024x1024");
  if (modelSupportsInputFidelity(params.model)) {
    form.append("input_fidelity", "high");
  }
  const copy = new Uint8Array(params.bytes.byteLength);
  copy.set(params.bytes);
  form.append(
    "image",
    new Blob([copy], { type: params.mimeType || "image/png" }),
    params.filename || "photo.png"
  );

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

export async function retouchStudioImage(params: {
  bytes: Uint8Array;
  mimeType: string;
  filename?: string;
  notes: string;
}): Promise<{ base64: string; mimeType: string; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const prompt = retouchPrompt(params.notes);
  const failures: string[] = [];

  for (const model of modelCandidatesForEdit()) {
    try {
      const image = await openaiSingleEdit({
        apiKey,
        model,
        prompt,
        bytes: params.bytes,
        mimeType: params.mimeType,
        filename: params.filename || "photo.png",
      });
      return { ...image, model };
    } catch (err) {
      failures.push(err instanceof Error ? err.message : String(err));
    }
  }

  throw new Error(failures[0] || "Retouch failed");
}
