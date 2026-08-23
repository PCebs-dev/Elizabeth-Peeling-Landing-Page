/**
 * Server pass-through for a client-stitched before/after collage.
 * We no longer send the collage to image-edit — that fused the two photos into one face.
 */

export async function mergeBeforeAfterImages(params: {
  composite: { bytes: Uint8Array; mimeType: string; filename?: string };
  enhance?: boolean;
}): Promise<{
  base64: string;
  mimeType: string;
  provider: "openai" | "local";
  model: string;
  enhance: boolean;
}> {
  return {
    base64: Buffer.from(params.composite.bytes).toString("base64"),
    mimeType: "image/png",
    provider: "local",
    model: "local-stitch",
    enhance: params.enhance === true,
  };
}
