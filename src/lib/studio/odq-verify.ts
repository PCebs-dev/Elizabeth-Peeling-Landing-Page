import type { GeneratedAdCopy } from "./types";
import {
  ODQ_IDENTIFICATION_EN,
  ODQ_IDENTIFICATION_FR,
  applyOdqCompliance,
} from "./odq-compliance";

/**
 * Independent ODQ / Code de déontologie gate (CQLR c D-3, r. 4, § 9).
 * Deterministic — no model. Runs after copy generation and can re-check
 * captions in Review. Practitioner notes are used only as facts; missing
 * 3.09.07 fields are never invented.
 */
export interface OdqIssue {
  code: string;
  article: string;
  message: string;
}

export interface OdqPriceFacts {
  regularPrice?: string;
  exceptionalPrice?: string;
  expiryDate?: string;
  serviceNature?: string;
  materials?: string;
  labIncluded?: string;
  additionalNotIncluded?: string;
}

export interface OdqAuditResult {
  ok: boolean;
  issues: OdqIssue[];
  repairs: string[];
  ad: GeneratedAdCopy;
  priceMode: "none" | "complete-regular" | "complete-exceptional" | "stripped";
}

const MONEY =
  /\$\s*\d[\d\s,]*(?:\.\d{2})?|\d[\d\s,]*(?:\.\d{2})?\s*(?:\$|CAD\b)/i;

const PRICE_LINE =
  /^(nature of the service|regular price|exceptional price|special price|expiry date|materials|laboratory or other services included|lab(?:oratory)?(?:\s*\/\s*other services included)?:|additional services(?: that may be required and are not included)?|the advertised regular price remains|nature du service|prix r[ée]gulier|prix exceptionnel|date d['’]expiration|mat[ée]riaux|services de laboratoire|services additionnels|le prix r[ée]gulier annonc[ée])/i;

/** Label-only lines the model (or a prior strip) leaves in the caption with no amount. */
const EMPTY_PRICE_LABEL =
  /^(nature of the service|regular price|exceptional price|special price|expiry date|materials|laboratory|lab|additional services|nature du service|prix r[ée]gulier|prix exceptionnel|date d['’]expiration|mat[ée]riaux|laboratoire|services additionnels)\s*:?\s*$/i;

const FINANCING =
  /\b(beautifi|financing may be|may be available to help|0\s*%\s*interest|everyone (?:is )?approv|taux d['’]intérêt|financement peut)\b/i;

const TESTIMONIAL =
  /\b(our patients say|a patient told|patients tell us|5[- ]star|cinq [ée]toiles|google review)\b/i;

const COMPARATIVE =
  /\b(better than other|unlike other (?:clinic|dentist)|vs\.? other dentist|#1 (?:in|au))\b/i;

const SPECIALTY =
  /\b(orthodontist|oral surgeon|periodontist|endodontist|prosthodontist|invisalign specialist|smile specialist|orthodontiste|spécialiste invisalign)\b/i;

function collectText(ad: GeneratedAdCopy): string {
  return [
    ad.headline,
    ad.caption,
    ad.shortCaption,
    ad.cta,
    ad.disclaimer,
    ad.paid?.primaryText,
    ad.paid?.headline,
    ad.fr?.headline,
    ad.fr?.caption,
    ad.fr?.shortCaption,
    ad.fr?.cta,
  ]
    .filter(Boolean)
    .join("\n");
}


function isPlaceholderAmount(value: string): boolean {
  return /^(x|y|\.{2,}|…)$/i.test(value.trim());
}

function captureLabeled(
  source: string,
  labels: RegExp[],
  kind: "money" | "text"
): string | undefined {
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    for (const re of labels) {
      const m = re.exec(line);
      const value = m?.[1]?.trim().replace(/[.;]+$/, "").trim();
      if (!value || isPlaceholderAmount(value)) continue;
      if (kind === "money") {
        const amount = value.replace(/[^\d.,]/g, "");
        if (!/\d/.test(amount)) continue;
        return value.replace(/\s+/g, " ");
      }
      if (value.length < 3) continue;
      return value.replace(/\s+/g, " ");
    }
  }
  return undefined;
}

export function parseOdqPriceFacts(source: string): OdqPriceFacts {
  return {
    regularPrice: captureLabeled(
      source,
      [
        /^regular\s+price:\s*(.+)$/i,
        /^prix\s+r[ée]gulier\s*:\s*(.+)$/i,
      ],
      "money"
    ),
    exceptionalPrice: captureLabeled(
      source,
      [
        /^(?:exceptional|special|promo(?:tional)?)\s+price:\s*(.+)$/i,
        /^prix\s+exceptionnel\s*:\s*(.+)$/i,
      ],
      "money"
    ),
    expiryDate: captureLabeled(
      source,
      [
        /^expir(?:y|ation)\s+date:\s*(.+)$/i,
        /^date\s+d['’]expiration\s*:\s*(.+)$/i,
        /^offer until:\s*(.+)$/i,
        /^offre jusqu['’]au\s*:\s*(.+)$/i,
      ],
      "text"
    ),
    serviceNature: captureLabeled(
      source,
      [
        /^nature of the service:\s*(.+)$/i,
        /^nature du (?:bien ou )?service\s*:\s*(.+)$/i,
      ],
      "text"
    ),
    materials: captureLabeled(
      source,
      [/^materials?:\s*(.+)$/i, /^mat[ée]riaux\s*:\s*(.+)$/i],
      "text"
    ),
    labIncluded: captureLabeled(
      source,
      [
        /^lab(?:oratory)?(?: \/ other services included)?:\s*(.+)$/i,
        /^laboratory(?: or other services included)?:\s*(.+)$/i,
        /^laboratoire\s*:\s*(.+)$/i,
        /^services de laboratoire ou autres inclus\s*:\s*(.+)$/i,
      ],
      "text"
    ),
    additionalNotIncluded: captureLabeled(
      source,
      [
        /^additional services(?: that may be required and are not included)?:\s*(.+)$/i,
        /^additional services not included:\s*(.+)$/i,
        /^services? additionnels?(?: pouvant être requis et non inclus)?\s*:\s*(.+)$/i,
      ],
      "text"
    ),
  };
}

function factsCompleteRegular(f: OdqPriceFacts): boolean {
  return Boolean(
    f.regularPrice &&
      f.serviceNature &&
      f.materials &&
      f.labIncluded &&
      f.additionalNotIncluded &&
      !f.exceptionalPrice
  );
}

function factsCompleteExceptional(f: OdqPriceFacts): boolean {
  return Boolean(
    f.regularPrice &&
      f.exceptionalPrice &&
      f.expiryDate &&
      f.serviceNature &&
      f.materials &&
      f.labIncluded &&
      f.additionalNotIncluded
  );
}

function formatPriceBlock(facts: OdqPriceFacts, french: boolean): string {
  if (french) {
    const lines = [
      `Nature du service : ${facts.serviceNature}`,
      `Prix régulier : ${facts.regularPrice}`,
    ];
    if (facts.exceptionalPrice) {
      lines.push(`Prix exceptionnel : ${facts.exceptionalPrice}`);
      lines.push(`Date d'expiration : ${facts.expiryDate}`);
    }
    lines.push(`Matériaux : ${facts.materials}`);
    lines.push(`Services de laboratoire ou autres inclus : ${facts.labIncluded}`);
    lines.push(
      `Services additionnels pouvant être requis et non inclus : ${facts.additionalNotIncluded}`
    );
    lines.push(
      "Le prix régulier annoncé demeure en vigueur au moins 90 jours après sa dernière publication."
    );
    return lines.join("\n");
  }
  const lines = [
    `Nature of the service: ${facts.serviceNature}`,
    `Regular price: ${facts.regularPrice}`,
  ];
  if (facts.exceptionalPrice) {
    lines.push(`Exceptional price: ${facts.exceptionalPrice}`);
    lines.push(`Expiry date: ${facts.expiryDate}`);
  }
  lines.push(`Materials: ${facts.materials}`);
  lines.push(`Laboratory or other services included: ${facts.labIncluded}`);
  lines.push(
    `Additional services that may be required and are not included: ${facts.additionalNotIncluded}`
  );
  lines.push(
    "The advertised regular price remains in effect for at least 90 days after last publication."
  );
  return lines.join("\n");
}

function normalizePriceLine(line: string): string {
  return line
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, " ")
    .replace(/[*_`#]+/g, "")
    .replace(/^[\s>*•·\-–—\d.)]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripPriceDisclosure(text: string): string {
  const kept = text
    .split(/\r?\n/)
    .filter((line) => !PRICE_LINE.test(normalizePriceLine(line)));
  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripDanglingPriceLabels(text: string): string {
  const kept = text.split(/\r?\n/).filter((line) => {
    const normalized = normalizePriceLine(line);
    if (!normalized) return true;
    return !EMPTY_PRICE_LABEL.test(normalized);
  });
  return kept
    .join("\n")
    .replace(
      /(?:^|[.!?]\s+|\n)\s*(?:\*{0,2}|_{0,2})(?:regular price|exceptional price|special price|prix r[ée]gulier|prix exceptionnel)\s*:\s*(?:\*{0,2}|_{0,2})(?=\s*(?:\n|$|[A-Za-zÀ-ÿ]))/gi,
      (match) => (match.startsWith("\n") ? "\n" : match.match(/^[.!?]/) ? match[0] + " " : "")
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripMoneyAndFinancing(text: string): string {
  let out = stripPriceDisclosure(text);
  out = out.replace(/\$\s*\d[\d\s,]*(?:\.\d{2})?/g, "");
  out = out.replace(/\d[\d\s,]*(?:\.\d{2})?\s*(?:\$|CAD)\b/gi, "");
  out = out.replace(
    /(?:including|with)\s+a?\s*\$?\s*\d[\d,]*\s*down payment[^.]*[.]?/gi,
    ""
  );
  out = out.replace(/acompte[^.]*[.]?/gi, "");
  out = out.replace(
    /[^.]*\b(beautifi|financing may be|financement peut)[^.]*[.]?/gi,
    ""
  );
  out = out.replace(/[ \t]{2,}/g, " ");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

function softenOutcomes(text: string): string {
  return text
    .replace(/\bremarkable improvement\b/gi, "possible change, which varies")
    .replace(/\bam[ée]lioration remarquable\b/gi, "changement possible, variable")
    .replace(/\bdream smile\b/gi, "smile you will discuss at an exam")
    .replace(/\bsourire de r[êe]ve\b/gi, "sourire à évaluer en examen")
    .replace(
      /\bstraight teeth you(?:['’]ve| have) always wanted\b/gi,
      "alignment options reviewed in clinic"
    )
    .replace(
      /\bdents droites dont vous avez toujours r[êe]v[ée]\b/gi,
      "options d'alignement à évaluer en clinique"
    )
    .replace(/\bperfect smile\b/gi, "a smile assessed in clinic")
    .replace(/\bsourire parfait\b/gi, "un sourire évalué en clinique");
}

function mapFields(
  ad: GeneratedAdCopy,
  fn: (text: string, french: boolean) => string
): GeneratedAdCopy {
  return {
    ...ad,
    headline: fn(ad.headline, false),
    caption: fn(ad.caption, false),
    shortCaption: fn(ad.shortCaption, false),
    cta: fn(ad.cta, false),
    disclaimer: fn(ad.disclaimer, false),
    paid: ad.paid
      ? {
          ...ad.paid,
          primaryText: fn(ad.paid.primaryText, false),
          headline: fn(ad.paid.headline, false),
          description: fn(ad.paid.description, false),
        }
      : ad.paid,
    fr: ad.fr
      ? {
          ...ad.fr,
          headline: fn(ad.fr.headline, true),
          caption: fn(ad.fr.caption, true),
          shortCaption: fn(ad.fr.shortCaption, true),
          cta: fn(ad.fr.cta, true),
          disclaimer: fn(ad.fr.disclaimer, true),
          paid: ad.fr.paid
            ? {
                ...ad.fr.paid,
                primaryText: fn(ad.fr.paid.primaryText, true),
                headline: fn(ad.fr.paid.headline, true),
                description: fn(ad.fr.paid.description, true),
              }
            : ad.fr.paid,
        }
      : ad.fr,
  };
}

function insertPriceBlock(
  caption: string,
  block: string,
  french: boolean
): string {
  const id = french ? ODQ_IDENTIFICATION_FR : ODQ_IDENTIFICATION_EN;
  const withoutId = caption.split(id).join("").trim();
  const cleaned = stripDanglingPriceLabels(stripPriceDisclosure(withoutId));
  return `${cleaned}\n\n${block}\n\n${id}`.trim();
}

/**
 * Second-pass gate. Incorporates practitioner notes as facts only.
 * Incomplete price or financing claims are removed rather than guessed.
 */
export function auditAndRepairOdqCopy(
  ad: GeneratedAdCopy,
  notes = ""
): OdqAuditResult {
  const issues: OdqIssue[] = [];
  const repairs: string[] = [];
  const fromNotes = parseOdqPriceFacts(notes);
  const fromCopy = parseOdqPriceFacts(collectText(ad) + "\n" + notes);
  const facts: OdqPriceFacts = {
    regularPrice: fromNotes.regularPrice || fromCopy.regularPrice,
    exceptionalPrice: fromNotes.exceptionalPrice || fromCopy.exceptionalPrice,
    expiryDate: fromNotes.expiryDate || fromCopy.expiryDate,
    serviceNature: fromNotes.serviceNature || fromCopy.serviceNature,
    materials: fromNotes.materials || fromCopy.materials,
    labIncluded: fromNotes.labIncluded || fromCopy.labIncluded,
    additionalNotIncluded:
      fromNotes.additionalNotIncluded || fromCopy.additionalNotIncluded,
  };

  let next = mapFields(ad, (t) => softenOutcomes(t));
  const blob = collectText(next) + "\n" + notes;
  const hasMoney = MONEY.test(blob);
  const hasFinancing = FINANCING.test(blob);
  const promoIntent = Boolean(
    facts.exceptionalPrice ||
      /(?:exceptional|special|promo(?:tional)?)\s+price:\s*\$?\s*\d/i.test(blob)
  );

  let priceMode: OdqAuditResult["priceMode"] = "none";

  if (TESTIMONIAL.test(blob)) {
    issues.push({
      code: "testimonial",
      article: "3.09.10",
      message: "Testimonials and endorsements are prohibited.",
    });
  }
  if (COMPARATIVE.test(blob)) {
    issues.push({
      code: "comparative",
      article: "3.09.03",
      message: "Comparative advertising is prohibited.",
    });
  }
  if (SPECIALTY.test(blob)) {
    issues.push({
      code: "specialty",
      article: "3.09.04-3.09.05",
      message: "Specialty titles are not permitted for this practice.",
    });
  }

  if (hasFinancing) {
    issues.push({
      code: "financing-incomplete",
      article: "3.09.02 / CPA",
      message:
        "Vague financing (Beautifi without cost of credit) is incomplete advertising. Financing lines were removed.",
    });
    next = mapFields(next, (t) =>
      t.replace(/[^.]*\b(beautifi|financing may be|financement peut)[^.]*[.]?/gi, "").trim()
    );
    repairs.push("Removed incomplete financing language.");
  }

  if (hasMoney || promoIntent) {
    if (promoIntent && factsCompleteExceptional(facts)) {
      priceMode = "complete-exceptional";
      const en = formatPriceBlock(facts, false);
      const fr = formatPriceBlock(facts, true);
      next = {
        ...next,
        caption: insertPriceBlock(next.caption, en, false),
        shortCaption: stripMoneyAndFinancing(next.shortCaption),
        paid: next.paid
          ? { ...next.paid, primaryText: insertPriceBlock(next.paid.primaryText, en, false) }
          : next.paid,
        fr: next.fr
          ? {
              ...next.fr,
              caption: insertPriceBlock(next.fr.caption, fr, true),
              shortCaption: stripMoneyAndFinancing(next.fr.shortCaption),
            }
          : next.fr,
      };
      repairs.push(
        "Inserted the 3.09.07 closed price list (regular price, exceptional price, expiry, materials, lab, extras) with equal-weight labels."
      );
    } else if (!promoIntent && factsCompleteRegular(facts)) {
      priceMode = "complete-regular";
      const en = formatPriceBlock(facts, false);
      const fr = formatPriceBlock(facts, true);
      next = {
        ...next,
        caption: insertPriceBlock(next.caption, en, false),
        fr: next.fr
          ? { ...next.fr, caption: insertPriceBlock(next.fr.caption, fr, true) }
          : next.fr,
      };
      repairs.push("Inserted a complete regular-price disclosure (3.09.07).");
    } else {
      priceMode = "stripped";
      issues.push({
        code: "price-incomplete",
        article: "3.09.07-3.09.08",
        message:
          "Price/promo copy was incomplete (need regular price, and if a promo: exceptional price + expiry date, plus materials, lab inclusion, and extras not included). Dollar amounts and down payments were removed so the post is not an incomplete price ad. Add those labeled facts in the caption prompt to advertise a fee.",
      });
      next = mapFields(next, (t, french) => {
        const stripped = stripMoneyAndFinancing(t);
        if (french) {
          return /dentiste généraliste/i.test(stripped)
            ? stripped
            : `${stripped}\n\n${ODQ_IDENTIFICATION_FR}`.trim();
        }
        return /general dentist/i.test(stripped)
          ? stripped
          : `${stripped}\n\n${ODQ_IDENTIFICATION_EN}`.trim();
      });
      repairs.push(
        "Stripped incomplete price and down-payment figures rather than inventing missing 3.09.07 fields."
      );
    }
  }

  const gated = applyOdqCompliance(next);
  next = gated.ad;

  const after = collectText(next);
  if (MONEY.test(after) && priceMode === "stripped") {
    next = mapFields(next, (t) => stripMoneyAndFinancing(t));
  }

  next = mapFields(next, (t) => stripDanglingPriceLabels(t));

  return {
    ok: issues.length === 0,
    issues,
    repairs,
    ad: next,
    priceMode,
  };
}

export function summarizeOdqAudit(audit: OdqAuditResult): string {
  const parts = [
    ...audit.issues.map((i) => `${i.article}: ${i.message}`),
    ...audit.repairs,
  ];
  return parts.join(" ");
}
