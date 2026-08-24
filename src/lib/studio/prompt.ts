import { getCategory } from "./categories";
import { STUDIO_CLINIC } from "./targeting";
import { ODQ_COPY_SYSTEM } from "./odq-compliance";
import type { GenerateRequest, StudioCategoryId } from "./types";

/** Creative angles — one is picked at random per generation */
export const AD_ANGLES = [
  "social-proof",
  "transformation",
  "soft-cta",
  "myth-bust",
  "local-trust",
  "seasonal",
  "financing-friendly",
  "confidence",
  "behind-the-scenes",
  "question-hook",
] as const;

export type AdAngle = (typeof AD_ANGLES)[number];

const ANGLE_GUIDANCE: Record<AdAngle, string> = {
  "social-proof":
    "Lead with trust, reviews energy, or 'patients in Vaudreuil love…' without inventing specific review quotes or star counts.",
  transformation:
    "Focus on before/after energy and the journey — never promise specific timelines or guaranteed results.",
  "soft-cta":
    "Warm, inviting tone. Invite a consult or SmileView rather than hard-selling.",
  "myth-bust":
    "Gently correct a common misconception about this treatment (e.g. aligners are only for teens). In French, the label must be spelled 'Mythe :' — never the English word 'Myth'.",
  "local-trust":
    "Emphasize local care with Dr. Elizabeth Peeling at Clinique LE 32 in Vaudreuil-Dorion / West Island convenience. Use correct grammar (with Dr. … at Clinique …), never 'At Dr. … at Clinique…'.",
  seasonal:
    "Tie to a timely moment (new year smile, wedding season, back-to-school, summer photos) without sounding gimmicky.",
  "financing-friendly":
    "Mention that Beautifi financing may be available — no specific rates or approval promises.",
  confidence:
    "Emotional benefit: smiling freely in photos, meetings, and everyday life.",
  "behind-the-scenes":
    "Clinic/professional care angle — modern dentistry, gentle approach, personal attention from Dr. Peeling.",
  "question-hook":
    "Open with a relatable question that the treatment answers, then soft CTA.",
};

export function pickRandomAngle(exclude?: string[]): AdAngle {
  const pool = exclude?.length
    ? AD_ANGLES.filter((a) => !exclude.includes(a))
    : [...AD_ANGLES];
  const list = pool.length ? pool : [...AD_ANGLES];
  return list[Math.floor(Math.random() * list.length)]!;
}

export function buildSystemPrompt(): string {
  return `You are a bilingual (English/French Canadian) social media copywriter for a cosmetic dental practice.

Practice:
- Dentist: ${STUDIO_CLINIC.doctorName} / ${STUDIO_CLINIC.doctorNameFr}
- Clinic: ${STUDIO_CLINIC.practiceName}
- Location: ${STUDIO_CLINIC.address.city}, ${STUDIO_CLINIC.address.province}
- Phone: ${STUDIO_CLINIC.phoneDisplay}
- Instagram: ${STUDIO_CLINIC.instagram}
- Booking: ${STUDIO_CLINIC.bookingUrl}
- Smile simulation (Invisalign): ${STUDIO_CLINIC.smileViewUrl}
- Financing: Beautifi may be available

Rules:
- Brand naming (English): use natural phrasing such as "with Dr. Elizabeth Peeling at Clinique LE 32" or "at Clinique LE 32 with Dr. Elizabeth Peeling". NEVER write "At Dr. Elizabeth Peeling at Clinique LE 32" (double "at" is incorrect).
- Brand naming (French): use "avec Dre Elizabeth Peeling à Clinique LE 32" or "à Clinique LE 32 avec Dre Elizabeth Peeling". NEVER "À Dre Elizabeth Peeling à Clinique LE 32".
- Do not substitute another clinic or dentist name.
- Write trendy, scroll-stopping Instagram/Facebook copy — natural, warm, professional; not corporate or spammy.
- Sound like a real clinic social media post written by a person. Readers must not detect AI.
- NEVER use emojis, emoticons, or symbols like ★ ♥ ✓.
- NEVER use long dashes (em dash — or en dash –). Use a normal hyphen (-) or rewrite the sentence.
- Avoid AI tells: overly polished parallel lists, "Here's the thing:", "Ready to...", triple-hyphen flourishes, or robotic disclaimers inside the caption body.
- Never invent clinical outcomes, statistics, patient names, or fake reviews.
- Never diagnose or promise results. Include a short disclaimer when claims could be read as outcome guarantees.
- Captions and shortCaptions must be complete, grammatical sentences — never cut off mid-word or mid-phrase.
- Do NOT put hashtags in caption, shortCaption, or paid primaryText. Instagram and Facebook captions are plain sentences only. Put tags only in the hashtags JSON array (optional; they will not be posted).
- CTAs should point to booking a consult, calling, or SmileView when relevant to Invisalign.
- French must be Quebec-friendly (vous, natural phrasing), not overly formal European French.
- In French myth-bust copy, always write "Mythe :" — never leave the English word "Myth" in headlines or captions.
- Vary structure every time: hooks and line breaks are fine; zero emojis.
- Output ONLY valid JSON matching the schema described in the user message.

${ODQ_COPY_SYSTEM}`;
}

export function buildUserPrompt(
  req: GenerateRequest,
  angle: AdAngle
): string {
  const category = getCategory(req.categoryId);
  const avoid =
    req.avoidHeadlines && req.avoidHeadlines.length
      ? `\nDo NOT reuse these headlines (create something clearly different):\n- ${req.avoidHeadlines.join("\n- ")}`
      : "";

  const paidSchema =
    req.channel === "paid"
      ? `,
  "paid": {
    "primaryText": "Meta primary text (up to ~125 chars ideal, can be longer)",
    "headline": "Meta headline (~40 chars)",
    "description": "Meta link description (~30 chars)",
    "audienceSuggestion": "1-2 sentences on who to target",
    "budgetNote": "Brief starting budget suggestion in CAD for local testing"
  }`
      : "";

  const frSchema =
    req.language === "fr" || req.language === "both"
      ? `,
  "fr": {
    "headline": "...",
    "caption": "...",
    "shortCaption": "...",
    "hashtags": ["..."],
    "cta": "...",
    "disclaimer": "..."${
      req.channel === "paid"
        ? `,
    "paid": {
      "primaryText": "...",
      "headline": "...",
      "description": "..."
    }`
        : ""
    }
  }`
      : "";

  const langInstruction =
    req.language === "en"
      ? "Write the main fields in English only. Omit fr."
      : req.language === "fr"
        ? "Write the MAIN fields (headline, caption, etc.) in French. Also include the fr object with the same French content duplicated for consistency."
        : "Write the MAIN fields in English AND provide a full French version in the fr object.";

  return `Create one unique social ad creative.

Category: ${category.label} (${category.description})
Channel: ${req.channel === "paid" ? "Paid Meta (Facebook/Instagram) local ads" : "Organic Instagram/Facebook post"}
Creative angle (must follow): ${angle} — ${ANGLE_GUIDANCE[angle]}
Practitioner notes / caption prompt (weave these facts in; ODQ rules still override if they conflict): ${req.notes.trim() || "(none — write a strong original caption from the category, angle, and image context)"}
Selected images context: ${req.imageHints.length ? req.imageHints.join("; ") : "(photos selected; no extra notes)"}
${langInstruction}

Always name the practice naturally (e.g. "with Dr. Elizabeth Peeling at Clinique LE 32" / "avec Dre Elizabeth Peeling à Clinique LE 32") in the caption or CTA when natural. Never use "At Dr. … at Clinique…".
Write complete sentences only — do not truncate captions mid-word.
If the caption prompt includes a promo or price, you may use those figures ONLY if the prompt also supplies, labeled: regular price, exceptional price (if promo), expiry date (if promo), nature of the service, materials, whether lab/other services are included, and additional services not included. If any of those 3.09.07 fields are missing, write the caption with ZERO dollar amounts, ZERO down payments, and ZERO financing lines. Keep the rest of the practitioner prompt (theme, service, CTA). Never invent a regular price or expiry.
Never mention Beautifi/Beautifi, APR, or "financing may be available" unless the prompt contains a complete cost-of-credit disclosure (it almost never will — omit financing).
Think through Code de déontologie 3.09.01–3.09.11 before you write. If a line would violate them, rewrite it.
${avoid}

Return JSON with this shape:
{
  "headline": "short punchy headline",
  "caption": "full IG/FB caption with line breaks as \\n (no hashtags)",
  "shortCaption": "1-2 sentence short version",
  "hashtags": ["tag1", "tag2"],
  "cta": "call to action text",
  "disclaimer": "short compliance disclaimer or empty string if not needed",
  "angle": "${angle}"${paidSchema}${frSchema}
}`;
}

export function categoryLabel(id: StudioCategoryId): string {
  return getCategory(id).label;
}
