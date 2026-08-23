/**
 * Spoken voiceover scripts for studio video prep (V1 TTS / caption seeding).
 * Silent mode ignores TTS; V1 muxes this script via OpenAI speech API.
 */

import { getCategory } from "./categories";
import { STUDIO_CLINIC } from "./targeting";
import type {
  StudioCategoryId,
  StudioVideoDuration,
  StudioVideoTone,
} from "./types";
import { isUnbrandedViralVideoTone, parseStudioVideoDuration } from "./types";

export type VideoSpokenLanguage = "en" | "fr";

const TONE_GUIDANCE: Record<StudioVideoTone, string> = {
  warm: "Warm, welcoming, calm confidence — like a trusted local dentist.",
  humorous:
    "Light, tasteful humour — witty but never mocking teeth, patients, or appearance.",
  random_funny:
    "Casually funny and shareable — the kind of dental-adjacent joke people save and send to friends. Relatable, scroll-stopping, lightly absurd or observational. Not a clinic ad; no hard sell. Still tasteful: never mock patients' looks, disabilities, trauma, or dental anxiety in a cruel way.",
  random_edgy:
    "Tongue-in-cheek and a little bolder than Random Funny — dry sarcasm, spicy one-liners, mildly rebellious energy. Still funny and shareable, still dental-topic adjacent. Push the vibe without going mean, NSFW, or punching down on appearance, trauma, or anxiety. Not a clinic ad; no hard sell.",
  serious:
    "Serious, measured, professional — clear and reassuring without being cold.",
  inspirational:
    "Uplifting and motivating — confidence and self-care, not hype.",
  educational:
    "Clear and helpful — one simple insight about the treatment, no jargon dump.",
  soft_cta:
    "Gentle invitation — soft call to book a consult, never pushy or salesy.",
};

/** Opening styles injected per request so viral scripts don't converge on one template. */
const VIRAL_OPENING_ANGLES = [
  "Start mid-thought, like you interrupted yourself.",
  "Start with a relatable confession (no product name in the first 5 words).",
  "Start with a spicy rhetorical question (not about booking).",
  "Start with a fake-serious PSA that flips into a joke.",
  "Start with a group-chat / friend-roast energy line.",
  "Start with a dating-app / photo-day struggle vibe.",
  "Start with a 'nobody talks about…' hot take.",
  "Start with a petty observation about smiles / mirrors / Zoom.",
  "Start with a dramatic overreaction to a tiny dental inconvenience.",
  "Start with a one-liner that sounds like a meme caption spoken aloud.",
] as const;

function scriptLengthGuidance(duration: StudioVideoDuration): string {
  switch (duration) {
    case 5:
      return "- 12–25 words (about 5–8 seconds spoken — tight hook for a ~5s clip).";
    case 10:
      return "- 25–45 words (about 10–15 seconds spoken — match a ~10s clip).";
    default:
      return "- 25–45 words (about 10–15 seconds spoken).";
  }
}

function pickViralOpeningAngle(): string {
  const i = Math.floor(Math.random() * VIRAL_OPENING_ANGLES.length);
  return VIRAL_OPENING_ANGLES[i]!;
}

/** Reject the common “Invisalign: …” / “Whitening — …” ad-template openings. */
function looksLikeTreatmentHeadlineScript(
  script: string,
  categoryLabel: string
): boolean {
  const trimmed = script.trim();
  const label = categoryLabel.trim();
  if (!label) return false;

  // "Invisalign: …" / "Invisalign - …" / "Invisalign — …"
  const headline = new RegExp(
    `^${escapeRegExp(label)}\\s*[:\\-–—]\\s*`,
    "i"
  );
  if (headline.test(trimmed)) return true;

  // Starts with the treatment name as the first word(s)
  const startsWithLabel = new RegExp(
    `^${escapeRegExp(label)}\\b`,
    "i"
  );
  if (startsWithLabel.test(trimmed)) return true;

  // Generic "ProductName: joke" pattern even if label casing differs
  if (/^[A-Za-z][A-Za-z0-9+ ]{1,28}\s*:\s+\S/.test(trimmed)) {
    const beforeColon = trimmed.split(":")[0]?.trim().toLowerCase() || "";
    if (
      beforeColon === label.toLowerCase() ||
      beforeColon.includes(label.toLowerCase())
    ) {
      return true;
    }
  }

  return false;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fallbackScript(
  categoryId: StudioCategoryId,
  tone: StudioVideoTone,
  language: VideoSpokenLanguage
): string {
  const category = getCategory(categoryId);
  const label = language === "fr" ? category.labelFr : category.label;
  const clinic = STUDIO_CLINIC.practiceName;
  const doctorEn = STUDIO_CLINIC.doctorName;
  const doctorFr = STUDIO_CLINIC.doctorNameFr;

  if (language === "fr") {
    const fr: Record<StudioVideoTone, string> = {
      warm: `Vous méritez un sourire qui vous ressemble. Avec ${doctorFr} à ${clinic}, explorez ${label} avec douceur, près de chez vous à Vaudreuil-Dorion.`,
      humorous: `Sourire pour les photos? Oui. Stresser pour ${label}? Pas nécessaire. ${doctorFr} à ${clinic} vous accueille simplement, sans pression.`,
      random_funny:
        categoryId === "botox"
          ? "Pourquoi mon front a l'air plus stressé que mon agenda cette semaine?"
          : "Okay but why do group photos hit different the second you notice your own smile in the preview?",
      random_edgy:
        categoryId === "botox"
          ? "Hot take: mes rides du front font du overtime et personne ne les a embauchées."
          : "Hot take: your front camera has been soft-launching a glow-up you keep declining.",
      serious: `${label} demande une approche claire et personnalisée. ${doctorFr} à ${clinic} prend le temps d'expliquer vos options — sans pression.`,
      inspirational: `Un petit pas vers ${label} peut changer la façon dont vous vous présentez au monde. Commencez cette conversation avec ${doctorFr} à ${clinic}.`,
      educational: `Savoir ce que ${label} peut vraiment offrir commence par une consultation. ${doctorFr} à ${clinic} clarifie ce qui est réaliste pour vous.`,
      soft_cta: `Curieux à propos de ${label}? Réservez une consultation douce avec ${doctorFr} à ${clinic}, Vaudreuil-Dorion.`,
    };
    return fr[tone];
  }

  const en: Record<StudioVideoTone, string> = {
    warm: `You deserve a smile that feels like you. With ${doctorEn} at ${clinic}, explore ${label} with care — right here in Vaudreuil-Dorion.`,
    humorous: `Smile for photos? Yes. Stress about ${label}? Not required. ${doctorEn} at ${clinic} keeps it simple and kind.`,
    random_funny:
      categoryId === "botox"
        ? "Why does my forehead look more stressed than my calendar this week?"
        : "Okay but why do group photos hit different the second you notice your own smile in the preview?",
    random_edgy:
      categoryId === "botox"
        ? "Hot take: my forehead lines are working overtime and nobody hired them."
        : "Hot take: your front camera has been soft-launching a glow-up you keep declining.",
    serious: `${label} deserves a clear, personal plan. ${doctorEn} at ${clinic} takes time to explain what's realistic — no pressure, just clarity.`,
    inspirational: `One thoughtful step toward ${label} can change how you show up. Start that conversation with ${doctorEn} at ${clinic}.`,
    educational: `Understanding what ${label} can (and can't) do starts with a consult. ${doctorEn} at ${clinic} helps you see what's realistic for your smile.`,
    soft_cta: `Curious about ${label}? Book a gentle consult with ${doctorEn} at ${clinic} in Vaudreuil-Dorion.`,
  };
  return en[tone];
}

/** Per-category joke territory for Random Funny / Random Edgy (not clinic ads). */
function viralTopicBrief(categoryId: StudioCategoryId): {
  world: string;
  angles: string;
  avoidForce: string;
} {
  switch (categoryId) {
    case "botox":
      return {
        world:
          "This is a Botox / facial aesthetics comedy bit — treat it as its own topic (wrinkles, forehead lines, resting face, '11s', aging jokes, soft-launch glow-ups).",
        angles:
          "Funny angles: forehead drama, mirror zoom-ins, Zoom lighting betrayal, friends noticing you look 'well rested', optional light link to a better smile — teeth are optional, not required.",
        avoidForce:
          "Do NOT force dental/teeth/Invisalign jokes. Do NOT make it about brushing or cavities.",
      };
    case "invisalign":
      return {
        world:
          "Clear aligner / straightening comedy — trays, metal-mouth nostalgia, selfie angles, 'subtle flex'.",
        angles:
          "Funny angles: tray routines, coffee timing, photo confidence, friends asking if something looks different.",
        avoidForce: "Do NOT force Botox/wrinkle jokes.",
      };
    case "whitening":
      return {
        world:
          "Teeth whitening / smile brightness comedy — coffee stains, filter vs real life, smile confidence.",
        angles:
          "Funny angles: latte regret, wedding photos, front-camera honesty, 'is it the lighting or me'.",
        avoidForce: "Do NOT force Botox/wrinkle jokes.",
      };
    case "veneers":
      return {
        world:
          "Veneers / smile upgrade comedy — Hollywood glow-up energy, before/after tease without medical claims.",
        angles:
          "Funny angles: smile in photos, 'main character' energy, friends clocking the glow-up.",
        avoidForce: "Do NOT force Botox/wrinkle jokes.",
      };
    case "crowns":
      return {
        world:
          "Dental crowns / 'fixed that one tooth' comedy — bite confidence, smile rebuild energy.",
        angles:
          "Funny angles: that one tooth that ruins photos, chewing confidence, quiet glow-up.",
        avoidForce: "Do NOT force Botox/wrinkle jokes.",
      };
    case "implants":
      return {
        world:
          "Dental implants / missing-tooth comeback comedy — smile comeback, eating confidence.",
        angles:
          "Funny angles: avoiding certain foods, photo angles, 'back in the game' smile energy.",
        avoidForce: "Do NOT force Botox/wrinkle jokes.",
      };
    case "smile-makeover":
      return {
        world:
          "Full smile makeover / glow-up comedy — total vibe shift, confidence reboot.",
        angles:
          "Funny angles: soft-launching a new smile, friends noticing, camera confidence.",
        avoidForce: "Keep it smile/glow-up — not a clinic brochure.",
      };
    default:
      return {
        world: "Cosmetic smile / face comedy related to the selected topic.",
        angles: "Relatable social-media humor about confidence and appearance.",
        avoidForce: "Stay on the selected topic; do not force unrelated treatments.",
      };
  }
}

function buildViralSystemPrompt(
  tone: StudioVideoTone,
  duration: StudioVideoDuration,
  categoryId: StudioCategoryId,
  categoryLabel: string
): string {
  const vibe =
    tone === "random_edgy"
      ? "Write like a slightly unhinged best friend with dry sarcasm — bold, tongue-in-cheek, still clever."
      : "Write like a funny friend on Reels — light, absurd, instantly likeable.";
  const topic = viralTopicBrief(categoryId);

  return [
    "You write short spoken scripts for viral Instagram Reels / TikTok humor.",
    "This is entertainment content, NOT an ad. Zero clinic/doctor/brand/location/CTA to book.",
    "Each category is its own joke universe — be funny and viral for THAT topic, not a generic 'dental office' bit.",
    topic.world,
    topic.angles,
    topic.avoidForce,
    vibe,
    `Tone details: ${TONE_GUIDANCE[tone]}`,
    'Return JSON only: { "script": string }.',
    "Hard rules:",
    scriptLengthGuidance(duration),
    `- Topic seed: "${categoryLabel}" may appear mid-script at most once, casually — never as a pitch or title.`,
    `- FORBIDDEN openings: do NOT start with "${categoryLabel}:", "${categoryLabel} -", "${categoryLabel} —", or any "TreatmentName: joke" pattern.`,
    `- Do NOT begin the script with the word(s) "${categoryLabel}".`,
    "- Do NOT open with a product definition, benefit list, or 'because…' sales punchline.",
    "- First 3–6 words must hook as conversation / confession / roast / question — not a product label.",
    "- Each script must feel unique: new joke angle, new scenario, new punchline structure.",
    "- Sound spoken aloud (contracted OK). No hashtags, no emoji, no stage directions.",
    "- No medical claims, guarantees, or before/after promises.",
    "- Don't punch down on looks, trauma, disability, or dental anxiety.",
  ].join("\n");
}

async function requestScript(params: {
  system: string;
  user: string;
  temperature: number;
}): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: params.temperature,
      presence_penalty: 0.55,
      frequency_penalty: 0.35,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${text.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response");
  const parsed = JSON.parse(content) as { script?: string };
  const script = parsed.script?.trim();
  if (!script || script.length < 20) {
    throw new Error("Incomplete script from model");
  }
  return script.slice(0, 1200);
}

export async function generateVideoScript(input: {
  categoryId: StudioCategoryId;
  notes?: string;
  tone: StudioVideoTone;
  language?: VideoSpokenLanguage;
  duration?: StudioVideoDuration;
  avoidScripts?: string[];
}): Promise<{ script: string; summary: string; warning?: string }> {
  const category = getCategory(input.categoryId);
  const tone = input.tone;
  const lang: VideoSpokenLanguage = input.language === "fr" ? "fr" : "en";
  const duration = parseStudioVideoDuration(input.duration ?? 5);
  const notes = input.notes?.trim().slice(0, 800) || "";
  const avoid = (input.avoidScripts || [])
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);
  const viralUnbranded = isUnbrandedViralVideoTone(tone);

  const summary = `VO · ${category.label} · ${tone} · ${lang} · ${duration}s`;

  if (!process.env.OPENAI_API_KEY) {
    return {
      script: fallbackScript(input.categoryId, tone, lang),
      summary,
      warning: "OPENAI_API_KEY missing — used a local video script template.",
    };
  }

  const brandEn = `${STUDIO_CLINIC.doctorName} at ${STUDIO_CLINIC.practiceName}`;
  const brandFr = `${STUDIO_CLINIC.doctorNameFr} à ${STUDIO_CLINIC.practiceName}`;
  const openingAngle = pickViralOpeningAngle();

  const system = viralUnbranded
    ? buildViralSystemPrompt(tone, duration, input.categoryId, category.label)
    : [
        "You write short spoken voiceover scripts for Instagram Reels / Facebook video ads for a cosmetic dentistry clinic.",
        `Practice brand (required in every script): ${brandEn} / French: ${brandFr}.`,
        `Location: ${STUDIO_CLINIC.address.city}, Quebec.`,
        'Return JSON only: { "script": string }.',
        "Script rules:",
        scriptLengthGuidance(duration),
        "- Natural spoken language, not a caption with hashtags.",
        `- Explicitly name ${brandEn} (or ${brandFr} when writing French). Do not use a generic clinic name.`,
        "- No on-screen text instructions, no stage directions, no emoji.",
        "- No hard medical claims, no guaranteed outcomes, no before/after promises.",
        "- Not a real identifiable patient story.",
        "- Stay tightly on the selected treatment category.",
        `- Tone: ${TONE_GUIDANCE[tone]}`,
      ].join("\n");

  const viralTopic = viralTopicBrief(input.categoryId);

  const user = viralUnbranded
    ? [
        `Category: ${category.label}`,
        `Joke universe: ${viralTopic.world}`,
        `Preferred angles: ${viralTopic.angles}`,
        viralTopic.avoidForce,
        `Target length: ~${duration}s spoken.`,
        `Language: ${lang === "fr" ? "French (Québec-friendly)" : "English"} only.`,
        `Selected tone: ${tone === "random_edgy" ? "Random Edgy" : "Random Funny"}.`,
        `This generation's opening direction: ${openingAngle}`,
        "Make it independently funny for THIS category — captivate in the first second.",
        "If useful, you may lightly connect to a better smile — but only when it fits (especially optional for Botox).",
        notes ? `Optional vibe note (not on-screen text): ${notes}` : "",
        avoid.length
          ? `Do NOT reuse these prior scripts (new joke required):\n- ${avoid.join("\n- ")}`
          : "",
        "Bad examples to NEVER copy: \"Botox: because wrinkles…\" / \"Invisalign: because life's too short…\"",
        "Good vibe (invent a NEW joke): \"Not me negotiating with my forehead lines before a Zoom call.\" / \"Why is my smile acting like it needs an apology tour?\"",
        "Output one fresh spoken script now.",
      ]
        .filter(Boolean)
        .join("\n")
    : [
        `Category: ${category.label} (${category.description})`,
        `Target video length: ${duration} seconds — keep the spoken script paced for that clip.`,
        `Spoken language: ${lang === "fr" ? "French (Québec-friendly)" : "English"} — write the entire script in this language only.`,
        `Tone id: ${tone}`,
        notes ? `Creative direction (do not quote as on-screen text): ${notes}` : "",
        avoid.length
          ? `Avoid repeating these prior scripts:\n- ${avoid.join("\n- ")}`
          : "",
        "Write one fresh spoken voiceover script.",
      ]
        .filter(Boolean)
        .join("\n");

  try {
    let script = await requestScript({
      system,
      user,
      temperature: viralUnbranded ? 1.15 : 0.95,
    });

    // One retry if the model falls back to “Invisalign: …” templates.
    if (
      viralUnbranded &&
      looksLikeTreatmentHeadlineScript(script, category.label)
    ) {
      script = await requestScript({
        system,
        user: [
          user,
          "RETRY: Your previous draft illegally started with the treatment name / 'Treatment:' headline. Rewrite from a completely different hook. Do not start with the product name.",
        ].join("\n"),
        temperature: 1.2,
      });
    }

    return { script, summary };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Script generation failed";
    const useFallback =
      message.includes("429") ||
      message.includes("insufficient_quota") ||
      message.includes("credit_balance_exhausted") ||
      message.includes("rate_limit") ||
      message.includes("OPENAI_API_KEY");

    if (useFallback) {
      return {
        script: fallbackScript(input.categoryId, tone, lang),
        summary,
        warning:
          "OpenAI unavailable — used a local video script template.",
      };
    }
    throw err;
  }
}
