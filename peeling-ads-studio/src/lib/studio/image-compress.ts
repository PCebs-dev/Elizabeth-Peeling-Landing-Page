function loadFileViaObjectUrl(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image"));
    };
    img.src = url;
  });
}

async function rasterizeToJpeg(
  source: ImageBitmap | HTMLImageElement,
  maxSide: number,
  quality: number,
): Promise<Blob> {
  const width = source instanceof ImageBitmap ? source.width : source.naturalWidth;
  const height = source instanceof ImageBitmap ? source.height : source.naturalHeight;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable for compression");

  ctx.drawImage(source, 0, 0, targetW, targetH);
  if (source instanceof ImageBitmap) source.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("Could not compress image"));
      },
      "image/jpeg",
      quality,
    );
  });
}

/** Compress photos before upload so mobile storage stays reliable. */
export async function compressImageFile(
  file: File,
  maxSide = 1800,
  quality = 0.88,
): Promise<{ blob: Blob; contentType: string }> {
  try {
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(file);
      const blob = await rasterizeToJpeg(bitmap, maxSide, quality);
      return { blob, contentType: "image/jpeg" };
    }
  } catch {
    /* fall through — common on iOS camera / HEIC edge cases */
  }

  try {
    const img = await loadFileViaObjectUrl(file);
    const blob = await rasterizeToJpeg(img, maxSide, quality);
    return { blob, contentType: "image/jpeg" };
  } catch {
    /* fall through — upload the original bytes */
  }

  return { blob: file, contentType: file.type || "image/jpeg" };
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read blob"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Blob read failed"));
    reader.readAsDataURL(blob);
  });
}

/** Safari rejects fetch("data:...") — decode data URLs manually instead. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const trimmed = dataUrl.trim();
  const comma = trimmed.indexOf(",");
  if (comma === -1) throw new Error("Invalid image data");

  const header = trimmed.slice(0, comma);
  const payload = trimmed.slice(comma + 1);
  const mime = /data:([^;,]+)/i.exec(header)?.[1]?.trim() || "image/jpeg";

  let bytes: Uint8Array;
  if (/;base64/i.test(header)) {
    const binary = atob(payload.replace(/\s/g, ""));
    bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } else {
    const decoded = decodeURIComponent(payload);
    bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0));
  }

  return new Blob([new Uint8Array(bytes)], { type: mime });
}

export async function fetchUrlAsBlob(url: string): Promise<Blob> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Could not load image (${res.status})`);
  return res.blob();
}
