/** Compress photos before upload so mobile storage stays reliable. */
export async function compressImageFile(
  file: File,
  maxSide = 1800,
  quality = 0.88,
): Promise<{ blob: Blob; contentType: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable for compression");

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("Could not compress image"));
      },
      "image/jpeg",
      quality,
    );
  });

  return { blob, contentType: "image/jpeg" };
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

export async function fetchUrlAsBlob(url: string): Promise<Blob> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Could not load image (${res.status})`);
  return res.blob();
}
