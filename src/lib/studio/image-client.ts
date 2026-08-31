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

/**
 * Downscale a still before image-to-video upload. Keeps enough detail for DoP
 * while staying well under the serverless request body limit, so a big phone
 * photo can never fail the submit (and waste the round trip) on size alone.
 */
export async function compressImageForVideoStill(blob: Blob): Promise<Blob> {
  const maxEdge = 1536;
  const maxBytes = 3.5 * 1024 * 1024;
  if (blob.size <= maxBytes) {
    try {
      const probe = await createImageBitmap(blob);
      const longest = Math.max(probe.width, probe.height);
      probe.close();
      if (longest <= maxEdge) return blob;
    } catch {
      return blob;
    }
  }

  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return blob;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );
    return out && out.size > 0 ? out : blob;
  } catch {
    return blob;
  }
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
