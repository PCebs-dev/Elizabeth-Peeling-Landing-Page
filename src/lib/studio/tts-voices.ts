/**
 * OpenAI TTS voices for studio video prep (V1 / V2).
 * Labels include perceived gender so users can pick Male vs Female sounding options.
 */

export type StudioTtsVoiceId =
  | "alloy"
  | "ash"
  | "ballad"
  | "coral"
  | "echo"
  | "fable"
  | "nova"
  | "onyx"
  | "sage"
  | "shimmer";

export type StudioTtsVoiceGender = "female" | "male" | "neutral";

export const STUDIO_TTS_VOICES: {
  id: StudioTtsVoiceId;
  gender: StudioTtsVoiceGender;
  /** Dropdown label, e.g. "Female — coral" */
  label: string;
  hint: string;
}[] = [
  {
    id: "coral",
    gender: "female",
    label: "Female — coral",
    hint: "Warm, clear — often fits smile / aesthetic clips",
  },
  {
    id: "nova",
    gender: "female",
    label: "Female — nova",
    hint: "Bright and energetic (previous default)",
  },
  {
    id: "shimmer",
    gender: "female",
    label: "Female — shimmer",
    hint: "Soft, expressive",
  },
  {
    id: "sage",
    gender: "female",
    label: "Female — sage",
    hint: "Calm and composed",
  },
  {
    id: "ballad",
    gender: "female",
    label: "Female — ballad",
    hint: "Smooth storytelling tone",
  },
  {
    id: "alloy",
    gender: "neutral",
    label: "Neutral — alloy",
    hint: "Balanced, versatile",
  },
  {
    id: "echo",
    gender: "male",
    label: "Male — echo",
    hint: "Clear and mid-range",
  },
  {
    id: "onyx",
    gender: "male",
    label: "Male — onyx",
    hint: "Deeper, grounded",
  },
  {
    id: "ash",
    gender: "male",
    label: "Male — ash",
    hint: "Crisp and modern",
  },
  {
    id: "fable",
    gender: "male",
    label: "Male — fable",
    hint: "Warm narrative tone",
  },
];

export const DEFAULT_STUDIO_TTS_VOICE: StudioTtsVoiceId = "coral";

export function isStudioTtsVoiceId(v: unknown): v is StudioTtsVoiceId {
  return (
    typeof v === "string" && STUDIO_TTS_VOICES.some((voice) => voice.id === v)
  );
}

export function parseStudioTtsVoice(raw: unknown): StudioTtsVoiceId {
  if (isStudioTtsVoiceId(raw)) return raw;
  const fromEnv = process.env.OPENAI_TTS_VOICE?.trim().toLowerCase();
  if (isStudioTtsVoiceId(fromEnv)) return fromEnv;
  return DEFAULT_STUDIO_TTS_VOICE;
}

export function studioTtsVoiceLabel(id: StudioTtsVoiceId): string {
  return STUDIO_TTS_VOICES.find((v) => v.id === id)?.label || id;
}
