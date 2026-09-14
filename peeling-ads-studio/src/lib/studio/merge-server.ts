import sharp from "sharp";

const LABEL_HEIGHT = 36;
const GAP = 8;
const MAX_HEIGHT = 1200;

export function dataUrlToBuffer(dataUrl: string): Buffer {
  const trimmed = dataUrl.trim();
  const comma = trimmed.indexOf(",");
  if (comma === -1) throw new Error("Invalid image data");
  const meta = trimmed.slice(0, comma);
  const payload = trimmed.slice(comma + 1);
  if (!meta.includes("base64")) {
    throw new Error("Only base64 image data is supported");
  }
  return Buffer.from(payload, "base64");
}

async function loadImageBuffer(source: string | Buffer): Promise<Buffer> {
  if (Buffer.isBuffer(source)) return source;
  if (source.startsWith("data:")) return dataUrlToBuffer(source);
  if (source.startsWith("http://") || source.startsWith("https://") || source.startsWith("/")) {
    const res = await fetch(source);
    if (!res.ok) throw new Error("Could not load image");
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("Unsupported image source");
}

/** Subtle polish for the after photo — mirrors client-side auto-enhance defaults. */
export async function polishImageBuffer(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .modulate({ brightness: 1.06, saturation: 1.05 })
    .linear(1.12, -14)
    .sharpen({ sigma: 0.6 })
    .jpeg({ quality: 92 })
    .toBuffer();
}

export async function mergeBeforeAfterBuffers(
  beforeInput: string | Buffer,
  afterInput: string | Buffer,
  options: { polishAfter?: boolean } = {},
): Promise<Buffer> {
  const before = await loadImageBuffer(beforeInput);
  let after = await loadImageBuffer(afterInput);

  if (options.polishAfter) {
    after = await polishImageBuffer(after);
  }

  const beforeMeta = await sharp(before).metadata();
  const afterMeta = await sharp(after).metadata();
  const beforeHeight = beforeMeta.height ?? MAX_HEIGHT;
  const afterHeight = afterMeta.height ?? MAX_HEIGHT;
  const targetH = Math.min(MAX_HEIGHT, Math.max(beforeHeight, afterHeight));

  const beforePrepared = await sharp(before)
    .resize({ height: targetH, fit: "contain", background: "#2a2620" })
    .jpeg({ quality: 92 })
    .toBuffer();
  const afterPrepared = await sharp(after)
    .resize({ height: targetH, fit: "contain", background: "#2a2620" })
    .jpeg({ quality: 92 })
    .toBuffer();

  const beforeInfo = await sharp(beforePrepared).metadata();
  const afterInfo = await sharp(afterPrepared).metadata();
  const beforeW = beforeInfo.width ?? targetH;
  const afterW = afterInfo.width ?? targetH;
  const width = beforeW + afterW + GAP;
  const height = targetH + LABEL_HEIGHT;

  const beforeLabel = Buffer.from(
    `<svg width="${beforeW}" height="${LABEL_HEIGHT}"><rect width="100%" height="100%" fill="#2a2620"/><text x="16" y="24" fill="#faf7f5" font-family="system-ui,sans-serif" font-size="16" font-weight="600">Before</text></svg>`,
  );
  const afterLabel = Buffer.from(
    `<svg width="${afterW}" height="${LABEL_HEIGHT}"><rect width="100%" height="100%" fill="#2a2620"/><text x="16" y="24" fill="#faf7f5" font-family="system-ui,sans-serif" font-size="16" font-weight="600">After</text></svg>`,
  );

  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: "#2a2620",
    },
  })
    .composite([
      { input: await sharp(beforeLabel).png().toBuffer(), top: 0, left: 0 },
      { input: beforePrepared, top: LABEL_HEIGHT, left: 0 },
      { input: await sharp(afterLabel).png().toBuffer(), top: 0, left: beforeW + GAP },
      { input: afterPrepared, top: LABEL_HEIGHT, left: beforeW + GAP },
    ])
    .jpeg({ quality: 92 })
    .toBuffer();
}

export function bufferToDataUrl(buffer: Buffer, contentType = "image/jpeg"): string {
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}
