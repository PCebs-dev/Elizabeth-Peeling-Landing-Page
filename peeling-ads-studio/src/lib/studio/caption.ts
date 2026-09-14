import type {
  CaptionGenerateRequest,
  CaptionGenerateResponse,
  StudioLanguage,
} from "./types";

function detectTopics(text: string): string[] {
  const lower = text.toLowerCase();
  const topics: string[] = [];
  if (/invisalign|aligner/.test(lower)) topics.push("Invisalign");
  if (/confiden|confiance/.test(lower)) topics.push("confidence");
  if (/smile|sourire/.test(lower)) topics.push("Organic");
  if (/whiten|blanch/.test(lower)) topics.push("whitening");
  if (/veneer|facette/.test(lower)) topics.push("veneers");
  if (topics.length === 0) topics.push("Organic");
  return topics;
}

function fallbackCaption(req: CaptionGenerateRequest): CaptionGenerateResponse {
  const isFr = req.language === "fr";
  const topic = req.topic?.trim() || (isFr ? "sourire" : "smile");
  const tags = detectTopics(`${topic} ${req.imageHint ?? ""} ${req.cta ?? ""}`);

  if (isFr) {
    return {
      title: "Souriez librement à nouveau",
      caption: [
        "Un sourire aligné change bien plus que vos dents — il redonne confiance au quotidien.",
        "",
        req.cta?.trim() || "Réservez votre consultation dès aujourd'hui.",
        "",
        "📍 LE 32 Clinique Dentaire — Vaudreuil-Dorion",
        "#Invisalign #DentisterieEsthetique #Sourire #Vaudreuil",
      ].join("\n"),
      tags,
    };
  }

  return {
    title: "Smile Freely Again",
    caption: [
      "A confident smile starts with a plan tailored to you.",
      "",
      req.cta?.trim() || "Book your consultation today.",
      "",
      "📍 LE 32 Clinique Dentaire — Vaudreuil-Dorion",
      "#Invisalign #CosmeticDentistry #Smile #Vaudreuil",
    ].join("\n"),
    tags,
  };
}

export async function generateCaption(
  req: CaptionGenerateRequest,
): Promise<CaptionGenerateResponse> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return fallbackCaption(req);

  const langLabel = req.language === "fr" ? "French" : "English";
  const prompt = `You write short, warm social captions for Dr. Elizabeth Peeling, a cosmetic dentist in Vaudreuil-Dorion, Quebec.
Language: ${langLabel}
Format: ${req.format}
Topic or image context: ${req.topic || req.imageHint || "cosmetic dentistry / Invisalign"}
Call to action to include: ${req.cta || (req.language === "fr" ? "Réservez votre consultation" : "Book your consultation")}

Return JSON only: {"title":"...","caption":"...","tags":["tag1","tag2","tag3"]}
Title: short hook (max 6 words). Caption: 2-4 sentences plus CTA line. Tags: 2-4 short tags.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });
    if (!res.ok) return fallbackCaption(req);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return fallbackCaption(req);
    const parsed = JSON.parse(raw) as CaptionGenerateResponse;
    if (!parsed.title || !parsed.caption) return fallbackCaption(req);
    return {
      title: parsed.title,
      caption: parsed.caption,
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : detectTopics(parsed.caption),
    };
  } catch {
    return fallbackCaption(req);
  }
}

export function languageLabel(lang: StudioLanguage): string {
  return lang === "fr" ? "French" : "English";
}
