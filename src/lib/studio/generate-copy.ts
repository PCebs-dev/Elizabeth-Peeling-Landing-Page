import { STUDIO_CATEGORIES } from "./categories";
import {
  buildSystemPrompt,
  buildUserPrompt,
  pickRandomAngle,
} from "./prompt";
import { applyOdqCompliance } from "./odq-compliance";
import {
  auditAndRepairOdqCopy,
  summarizeOdqAudit,
  type OdqAuditResult,
} from "./odq-verify";
import { sanitizeAdCopy } from "./sanitize-copy";
import { STUDIO_CLINIC, withClinicBookingLink } from "./targeting";
import type { GenerateRequest, GeneratedAdCopy } from "./types";

async function callOpenAICopy(
  system: string,
  user: string
): Promise<GeneratedAdCopy> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
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

  const parsed = JSON.parse(content) as GeneratedAdCopy;
  if (!parsed.headline || !parsed.caption) {
    throw new Error("Incomplete ad JSON from model");
  }
  if (!Array.isArray(parsed.hashtags)) parsed.hashtags = [];
  return parsed;
}

function finalizeCopy(ad: GeneratedAdCopy, notes: string): {
  ad: GeneratedAdCopy;
  warning?: string;
  odq: OdqAuditResult;
} {
  const first = applyOdqCompliance(sanitizeAdCopy(ad)).ad;
  const odq = auditAndRepairOdqCopy(first, notes);
  const repaired = odq.ad;
  const adWithBooking: GeneratedAdCopy = {
    ...repaired,
    caption: withClinicBookingLink(repaired.caption, repaired.cta, false),
    fr: repaired.fr
      ? {
          ...repaired.fr,
          caption: withClinicBookingLink(
            repaired.fr.caption,
            repaired.fr.cta,
            true
          ),
        }
      : repaired.fr,
  };
  const warning = summarizeOdqAudit(odq);
  return { ad: adWithBooking, warning: warning || undefined, odq };
}

/** Template fallback when no API key — still varies by angle */
export function fallbackAd(
  req: GenerateRequest,
  angle: string
): GeneratedAdCopy {
  const label =
    STUDIO_CATEGORIES.find((c) => c.id === req.categoryId)?.label ?? "Smile";
  const city = STUDIO_CLINIC.address.city;
  const brand = `${STUDIO_CLINIC.doctorName} at ${STUDIO_CLINIC.practiceName}`;
  const brandFr = `${STUDIO_CLINIC.doctorNameFr} à ${STUDIO_CLINIC.practiceName}`;
  const hooks: Record<string, string> = {
    "social-proof": `Patients across ${city} choose ${label} with ${brand}.`,
    transformation: `Your smile glow-up starts with a conversation with ${brand} - not a hard sell.`,
    "soft-cta": `Curious about ${label}? ${brand} is ready to talk through your options.`,
    "myth-bust": `Myth: ${label} is only for "perfect" candidates. Reality: a consult with ${brand} tells you what's possible.`,
    "local-trust": `${label} care, close to home with ${brand}.`,
    seasonal: `New season, new smile energy - explore ${label} with ${brand}.`,
    "financing-friendly": `Love the idea of ${label}? Ask ${brand} about payment options discussed at a consult.`,
    confidence: `The best accessory? A smile you actually want to show - ${brand} can help you explore ${label}.`,
    "behind-the-scenes": `Gentle, modern ${label} care with ${brand}.`,
    "question-hook": `Still putting off ${label}? Ask ${brand} the one question on your mind.`,
  };

  const headline = hooks[angle] ?? hooks["soft-cta"]!;
  const caption = [
    headline,
    ``,
    req.notes ? `Note: ${req.notes}` : `Based on your ${label} creative.`,
    ``,
    `Book a consult with ${brand} in ${city} - or call ${STUDIO_CLINIC.phoneDisplay}.`,
    ``,
    `Results vary. Treatment suitability is determined in clinic.`,
  ].join("\n");

  const base: GeneratedAdCopy = {
    headline: headline.slice(0, 120),
    caption,
    shortCaption: `Explore ${label} with ${brand} in ${city}. Book a consult.`,
    hashtags: [
      label.replace(/\s+/g, ""),
      "VaudreuilDorion",
      "WestIsland",
      "CosmeticDentistry",
      "CliniqueLE32",
      "DrElizabethPeeling",
      "SmileGoals",
      "MontrealDentists",
    ],
    cta: "Book at Clinique LE 32 - link in bio",
    disclaimer:
      "Results vary. Not medical advice - suitability determined in clinic.",
    angle,
  };

  if (req.channel === "paid") {
    base.paid = {
      primaryText: base.shortCaption,
      headline: `${label} in ${city}`,
      description: "Book your consult",
      audienceSuggestion: `Adults 25–54 near ${city} / West Island interested in cosmetic dentistry and ${label}.`,
      budgetNote: "Start around $20–$35 CAD/day for a 5–7 day local test.",
    };
  }

  if (req.language === "fr" || req.language === "both") {
    base.fr = {
      headline: `Découvrez ${label} avec ${brandFr} à ${city}.`,
      caption: [
        `Et si votre prochain sourire commençait ici?`,
        ``,
        `${label} avec ${brandFr}, ${city}.`,
        ``,
        `Prenez rendez-vous ou composez le ${STUDIO_CLINIC.phoneDisplay}.`,
        ``,
        `Les résultats varient. L'admissibilité se confirme en clinique.`,
      ].join("\n"),
      shortCaption: `${label} à ${city} — consultez ${brandFr}.`,
      hashtags: [
        label.replace(/\s+/g, ""),
        "VaudreuilDorion",
        "Dentiste",
        "Sourire",
        "CliniqueLE32",
        "OuestDeLIle",
      ],
      cta: "Prenez rendez-vous - lien dans la bio",
      disclaimer: "Les résultats varient. Ceci n'est pas un avis médical.",
      paid:
        req.channel === "paid"
          ? {
              primaryText: `${label} près de chez vous à ${city}.`,
              headline: `${label} — ${STUDIO_CLINIC.practiceName}`,
              description: "Prenez rendez-vous",
            }
          : undefined,
    };
  }

  return finalizeCopy(base, req.notes).ad;
}

export async function generateAdCopy(
  req: GenerateRequest
): Promise<{
  ad: GeneratedAdCopy;
  angle: string;
  warning?: string;
  odq?: OdqAuditResult;
}> {
  const angle = pickRandomAngle(req.avoidAngles);

  if (!process.env.OPENAI_API_KEY) {
    const done = finalizeCopy(fallbackAd(req, angle), req.notes);
    return {
      ad: done.ad,
      angle,
      warning: "OPENAI_API_KEY missing - used local template variation.",
      odq: done.odq,
    };
  }

  try {
    const raw = await callOpenAICopy(
      buildSystemPrompt(),
      buildUserPrompt(req, angle)
    );
    raw.angle = raw.angle || angle;
    const done = finalizeCopy(raw, req.notes);
    return {
      ad: done.ad,
      angle: raw.angle,
      warning: done.warning,
      odq: done.odq,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    const useFallback =
      message.includes("OPENAI_API_KEY") ||
      message.includes("429") ||
      message.includes("insufficient_quota") ||
      message.includes("credit_balance_exhausted") ||
      message.includes("rate_limit");

    if (useFallback) {
      const quotaIssue =
        message.includes("429") ||
        message.includes("insufficient_quota") ||
        message.includes("credit_balance_exhausted");
      const done = finalizeCopy(fallbackAd(req, angle), req.notes);
      return {
        ad: done.ad,
        angle,
        warning: quotaIssue
          ? "OpenAI has no credits remaining - used a local caption template. Add billing at platform.openai.com to enable AI-written copy and AI images."
          : "OpenAI unavailable - used local template variation.",
        odq: done.odq,
      };
    }
    throw err;
  }
}
