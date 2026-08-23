/** Browser-only: two independent photos on one square still (not a fused face). */

function loadBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read a merge photo"));
    };
    img.src = url;
  });
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  boxW: number,
  boxH: number
): void {
  const scale = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, x + (boxW - dw) / 2, y + (boxH - dh) / 2, dw, dh);
}

function drawPhotoCard(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string
): void {
  const radius = 18;
  const labelH = 52;
  const inner = 10;

  ctx.save();
  ctx.shadowColor = "rgba(40, 24, 16, 0.18)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  roundedRect(ctx, x, y, w, h, radius);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  roundedRect(ctx, x, y, w, h, radius);
  ctx.strokeStyle = "#e6d9d0";
  ctx.lineWidth = 2;
  ctx.stroke();

  const photoX = x + inner;
  const photoY = y + inner;
  const photoW = w - inner * 2;
  const photoH = h - inner * 2 - labelH;

  ctx.save();
  roundedRect(ctx, photoX, photoY, photoW, photoH, 10);
  ctx.clip();
  ctx.fillStyle = "#f5f0ec";
  ctx.fillRect(photoX, photoY, photoW, photoH);
  drawContain(ctx, img, photoX, photoY, photoW, photoH);
  ctx.restore();

  ctx.fillStyle = "#4a3428";
  ctx.font = "600 22px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, y + h - labelH / 2);
}

export async function stitchBeforeAfterToPng(
  beforeBlob: Blob,
  afterBlob: Blob,
  locale: "en" | "fr" = "en"
): Promise<Blob> {
  const [before, after] = await Promise.all([
    loadBlob(beforeBlob),
    loadBlob(afterBlob),
  ]);
  const size = 1080;
  const pad = 40;
  const gap = 32;
  const cardW = (size - pad * 2 - gap) / 2;
  const cardH = size - pad * 2;
  const beforeLabel = locale === "fr" ? "AVANT" : "BEFORE";
  const afterLabel = locale === "fr" ? "APRÈS" : "AFTER";

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not build merge canvas");

  ctx.fillStyle = "#f3ebe4";
  ctx.fillRect(0, 0, size, size);

  drawPhotoCard(ctx, before, pad, pad, cardW, cardH, beforeLabel);
  drawPhotoCard(ctx, after, pad + cardW + gap, pad, cardW, cardH, afterLabel);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) throw new Error("Merge canvas failed");
  return blob;
}
