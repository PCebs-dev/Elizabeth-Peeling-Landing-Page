/**
 * Browser-only image helpers for studio uploads and OpenAI retouch payloads.
 */

export type StudioImageAspect = "square" | "story";

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBlob(base64: string, mimeType = "image/png"): Blob {
  const trimmed = base64.trim();
  const comma = trimmed.indexOf(",");
  const raw =
    trimmed.startsWith("data:") && comma >= 0
      ? trimmed.slice(comma + 1)
      : trimmed;
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

export function studioImageAspect(
  width: number,
  height: number
): StudioImageAspect {
  return height / Math.max(width, 1) >= 1.2 ? "story" : "square";
}

export async function compressImageForRetouch(blob: Blob): Promise<Blob> {
  const result = await compressImageForRetouchWithSize(blob);
  return result.blob;
}

export async function compressImageForRetouchWithSize(blob: Blob): Promise<{
  blob: Blob;
  width: number;
  height: number;
}> {
  try {
    const bitmap = await createImageBitmap(blob);
    const max = 1024;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      const w = bitmap.width;
      const h = bitmap.height;
      bitmap.close();
      return { blob, width: w, height: h };
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const compressed = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.88)
    );
    if (compressed && compressed.size > 0) {
      return { blob: compressed, width, height };
    }
    return { blob, width, height };
  } catch {
    return { blob, width: 1024, height: 1024 };
  }
}
