export interface EnhanceOptions {
  prompt?: string;
  auto?: boolean;
}

interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  whitening: number;
  clarity: number;
}

const DEFAULT_AUTO: Adjustments = {
  brightness: 1.06,
  contrast: 1.12,
  saturation: 1.05,
  warmth: 0.08,
  whitening: 0.18,
  clarity: 0.25,
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function promptToAdjustments(prompt: string | undefined, auto = false): Adjustments {
  const base: Adjustments = auto ? { ...DEFAULT_AUTO } : {
    brightness: 1,
    contrast: 1,
    saturation: 1,
    warmth: 0,
    whitening: 0,
    clarity: 0,
  };
  if (!prompt?.trim()) return base;

  const p = prompt.toLowerCase();
  if (/whiten|teeth|smile|brighter teeth/.test(p)) {
    base.whitening = clamp(base.whitening + 0.35, 0, 0.7);
    base.brightness = clamp(base.brightness + 0.04, 0.7, 1.4);
  }
  if (/bright|lighter|exposure/.test(p)) base.brightness = clamp(base.brightness + 0.12, 0.7, 1.5);
  if (/contrast|punch|crisp/.test(p)) base.contrast = clamp(base.contrast + 0.15, 0.6, 1.7);
  if (/soft|natural|subtle/.test(p)) {
    base.contrast = clamp(base.contrast - 0.06, 0.7, 1.5);
    base.clarity = clamp(base.clarity - 0.05, 0, 0.8);
  }
  if (/warm|golden/.test(p)) base.warmth = clamp(base.warmth + 0.25, -0.5, 0.6);
  if (/cool|clinical/.test(p)) base.warmth = clamp(base.warmth - 0.2, -0.5, 0.6);
  if (/sharp|clarity|detail/.test(p)) base.clarity = clamp(base.clarity + 0.3, 0, 0.85);
  if (/enhance|polish|professional|retouch/.test(p)) {
    base.brightness = clamp(base.brightness + 0.05, 0.7, 1.4);
    base.contrast = clamp(base.contrast + 0.08, 0.7, 1.6);
    base.clarity = clamp(base.clarity + 0.15, 0, 0.8);
    base.whitening = clamp(base.whitening + 0.12, 0, 0.65);
  }

  if (
    base.brightness === 1 &&
    base.contrast === 1 &&
    base.saturation === 1 &&
    base.warmth === 0 &&
    base.whitening === 0 &&
    base.clarity === 0
  ) {
    return { ...DEFAULT_AUTO, whitening: 0.12 };
  }
  return base;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

function applyPixelAdjustments(data: Uint8ClampedArray, adj: Adjustments): void {
  const mid = 128;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    r *= adj.brightness;
    g *= adj.brightness;
    b *= adj.brightness;

    r = (r - mid) * adj.contrast + mid;
    g = (g - mid) * adj.contrast + mid;
    b = (b - mid) * adj.contrast + mid;

    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gray + (r - gray) * adj.saturation;
    g = gray + (g - gray) * adj.saturation;
    b = gray + (b - gray) * adj.saturation;

    if (adj.warmth !== 0) {
      r += adj.warmth * 28;
      b -= adj.warmth * 28;
    }

    if (adj.whitening > 0) {
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luma > 90 && luma < 245) {
        const lift = ((luma - 90) / 155) * adj.whitening * 42;
        r += lift * 0.92;
        g += lift;
        b += lift * 1.05;
      }
    }

    data[i] = clamp(r, 0, 255);
    data[i + 1] = clamp(g, 0, 255);
    data[i + 2] = clamp(b, 0, 255);
  }
}

export async function enhanceImageDataUrl(
  dataUrl: string,
  options: EnhanceOptions = {},
): Promise<string> {
  const adj = promptToAdjustments(options.prompt, options.auto ?? !options.prompt?.trim());
  const img = await loadImage(dataUrl);
  const maxSide = 1800;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  applyPixelAdjustments(imageData.data, adj);
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.92);
}

export async function mergeBeforeAfterSideBySide(
  beforeDataUrl: string,
  afterDataUrl: string,
): Promise<string> {
  const [before, after] = await Promise.all([
    loadImage(beforeDataUrl),
    loadImage(afterDataUrl),
  ]);
  const targetH = Math.min(1200, Math.max(before.height, after.height));
  const beforeW = Math.round((before.width / before.height) * targetH);
  const afterW = Math.round((after.width / after.height) * targetH);
  const gap = 8;
  const labelH = 36;
  const canvas = document.createElement("canvas");
  canvas.width = beforeW + afterW + gap;
  canvas.height = targetH + labelH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.fillStyle = "#2a2620";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(before, 0, labelH, beforeW, targetH);
  ctx.drawImage(after, beforeW + gap, labelH, afterW, targetH);
  ctx.fillStyle = "#faf7f5";
  ctx.font = "600 16px system-ui, sans-serif";
  ctx.fillText("Before", 16, 24);
  ctx.fillText("After", beforeW + gap + 16, 24);
  return canvas.toDataURL("image/jpeg", 0.92);
}
