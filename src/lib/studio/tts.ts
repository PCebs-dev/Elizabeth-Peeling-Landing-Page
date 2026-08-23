/**
 * OpenAI text-to-speech for V1 video voiceover + prep preview.
 * Docs: https://platform.openai.com/docs/api-reference/audio/createSpeech
 */

import {
  DEFAULT_STUDIO_TTS_VOICE,
  isStudioTtsVoiceId,
  type StudioTtsVoiceId,
} from "./tts-voices";

const DEFAULT_TTS_MODEL = "tts-1";

export function isOpenAiTtsConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function ttsModel(): string {
  return process.env.OPENAI_TTS_MODEL?.trim() || DEFAULT_TTS_MODEL;
}

function defaultTtsVoice(): StudioTtsVoiceId {
  const fromEnv = process.env.OPENAI_TTS_VOICE?.trim().toLowerCase();
  if (isStudioTtsVoiceId(fromEnv)) return fromEnv;
  return DEFAULT_STUDIO_TTS_VOICE;
}

/**
 * Synthesize spoken audio from a prep script.
 * Language is implied by the script text (EN or FR); voice is selectable in prep.
 */
export async function synthesizeStudioVoiceover(input: {
  script: string;
  /** Spoken language — used only for logging / future voice maps */
  language?: "en" | "fr";
  /** OpenAI TTS voice id; falls back to OPENAI_TTS_VOICE / coral */
  voice?: string;
  /** Cap input length (preview can use a shorter slice) */
  maxChars?: number;
}): Promise<{
  bytes: Buffer;
  mimeType: string;
  model: string;
  voice: string;
}> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required for spoken video. Add it to .env.local."
    );
  }

  const maxChars = input.maxChars ?? 4096;
  const script = input.script.trim().slice(0, maxChars);
  if (!script) {
    throw new Error("Voiceover script is empty — write or regenerate a script first.");
  }

  const model = ttsModel();
  const voice = isStudioTtsVoiceId(input.voice)
    ? input.voice
    : defaultTtsVoice();

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: script,
      voice,
      response_format: "mp3",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `OpenAI TTS failed (${res.status}): ${text.slice(0, 300)}`
    );
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) {
    throw new Error("OpenAI TTS returned empty audio");
  }

  return {
    bytes: buf,
    mimeType: "audio/mpeg",
    model,
    voice,
  };
}
