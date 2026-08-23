import type { ReviewTheme } from "../types.js";

/** Theme detectors applied to aggregated public review / SERP text. */
const THEME_DEFS: Array<{
  theme: string;
  label: string;
  labelFr: string;
  patterns: RegExp[];
  creativeAngleEn: string;
  creativeAngleFr: string;
}> = [
  {
    theme: "cost",
    label: "Cost & value",
    labelFr: "Coût et valeur",
    patterns: [
      /\bcost\b/i,
      /\bprice\b/i,
      /\bexpensive\b/i,
      /\bfinanc/i,
      /\bprix\b/i,
      /\bco[uû]t\b/i,
      /\bcher\b/i,
    ],
    creativeAngleEn:
      "Lead with financing / payment plans and a clear consult — not a price promise.",
    creativeAngleFr:
      "Mettez de l'avant le financement et une consultation claire — sans promesse de prix.",
  },
  {
    theme: "fear_anxiety",
    label: "Comfort & anxiety",
    labelFr: "Confort et anxiété",
    patterns: [
      /\bfear\b/i,
      /\banxi/i,
      /\bnervous\b/i,
      /\bpain\b/i,
      /\bgentle\b/i,
      /\bpeur\b/i,
      /\bdouceur\b/i,
    ],
    creativeAngleEn:
      "Emphasize gentle, bilingual care and a low-pressure consultation.",
    creativeAngleFr:
      "Soulignez des soins doux, bilingues et une consultation sans pression.",
  },
  {
    theme: "adult",
    label: "Adult orthodontics",
    labelFr: "Orthodontie adulte",
    patterns: [
      /\badult\b/i,
      /\bprofessional\b/i,
      /\bwork\b/i,
      /\bdiscreet\b/i,
      /\badulte\b/i,
      /\bprofessionnel/i,
    ],
    creativeAngleEn:
      "Position clear aligners as discreet options for working adults.",
    creativeAngleFr:
      "Positionnez les aligneurs comme une option discrète pour les adultes actifs.",
  },
  {
    theme: "wait_time",
    label: "Access & wait times",
    labelFr: "Accessibilité et délais",
    patterns: [
      /\bwait\b/i,
      /\bappointment\b/i,
      /\bbook\b/i,
      /\bschedule\b/i,
      /\brendez-vous\b/i,
      /\battente\b/i,
    ],
    creativeAngleEn: "Highlight easy booking and consult availability.",
    creativeAngleFr:
      "Mettez de l'avant la prise de rendez-vous simple et la disponibilité.",
  },
  {
    theme: "results",
    label: "Smile results",
    labelFr: "Résultats du sourire",
    patterns: [
      /\bsmile\b/i,
      /\bresults?\b/i,
      /\btransform/i,
      /\bsourire\b/i,
      /\br[eé]sultat/i,
    ],
    creativeAngleEn:
      "Use SmileView preview + real consult — avoid guaranteed outcomes.",
    creativeAngleFr:
      "Utilisez SmileView + consultation — évitez les résultats garantis.",
  },
];

/**
 * Score review/SERP text blobs into creative themes.
 * When no live text is available, returns baseline themes with seed hit counts.
 */
export function extractReviewThemes(texts: string[]): ReviewTheme[] {
  if (texts.length === 0) {
    return THEME_DEFS.map((t, i) => ({
      theme: t.theme,
      label: t.label,
      labelFr: t.labelFr,
      hits: Math.max(3, 8 - i),
      creativeAngleEn: t.creativeAngleEn,
      creativeAngleFr: t.creativeAngleFr,
    }));
  }

  const joined = texts.join("\n");
  return THEME_DEFS.map((t) => {
    let hits = 0;
    for (const p of t.patterns) {
      const matches = joined.match(new RegExp(p.source, "gi"));
      hits += matches?.length ?? 0;
    }
    return {
      theme: t.theme,
      label: t.label,
      labelFr: t.labelFr,
      hits,
      creativeAngleEn: t.creativeAngleEn,
      creativeAngleFr: t.creativeAngleFr,
    };
  }).sort((a, b) => b.hits - a.hits);
}
