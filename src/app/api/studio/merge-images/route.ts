import { NextResponse, type NextRequest } from "next/server";
import { verifyStudioSessionValue, STUDIO_COOKIE } from "@/lib/studio/auth";
import {
  bufferToDataUrl,
  dataUrlToBuffer,
  mergeBeforeAfterBuffers,
} from "@/lib/studio/merge-server";
import { readStoredMediaFile, saveStoredMedia } from "@/lib/studio/media-server";
import {
  firstBlob,
  firstString,
  formBool,
  jsonBool,
  parseMultipartOrJson,
} from "@/lib/studio/request-body";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

async function bufferFromId(id: string): Promise<Buffer | null> {
  const file = await readStoredMediaFile(id);
  return file?.buffer ?? null;
}

async function resolveImageFromJson(
  data: Record<string, unknown>,
  side: "before" | "after",
): Promise<Buffer | null> {
  const dataUrlKeys =
    side === "before"
      ? ["beforeDataUrl", "before", "beforeImage", "before_image"]
      : ["afterDataUrl", "after", "afterImage", "after_image"];

  for (const key of dataUrlKeys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      return dataUrlToBuffer(value.trim());
    }
  }

  const idKeys = side === "before" ? ["beforeId", "before_id"] : ["afterId", "after_id"];
  for (const key of idKeys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      return bufferFromId(value.trim());
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get(STUDIO_COOKIE)?.value;
  if (!(await verifyStudioSessionValue(cookie))) return unauthorized();

  let parsed;
  try {
    parsed = await parseMultipartOrJson(request);
  } catch {
    return badRequest("Expected multipart form data or JSON body");
  }

  let beforeBuffer: Buffer | null = null;
  let afterBuffer: Buffer | null = null;
  let beforeId: string | undefined;
  let afterId: string | undefined;
  let polishAfter = false;
  let saveToLibrary = true;

  if (parsed.kind === "multipart") {
    const { form } = parsed;
    const beforeBlob = firstBlob(form, "before", "beforeImage", "before_image", "imageBefore");
    const afterBlob = firstBlob(form, "after", "afterImage", "after_image", "imageAfter");
    beforeId = firstString(form, "beforeId", "before_id");
    afterId = firstString(form, "afterId", "after_id");
    polishAfter = formBool(form.get("polish")) || formBool(form.get("subtlePolish")) || formBool(form.get("subtle_polish"));
    saveToLibrary = !formBool(form.get("skipSave"));

    if (beforeBlob) beforeBuffer = Buffer.from(await beforeBlob.arrayBuffer());
    if (afterBlob) afterBuffer = Buffer.from(await afterBlob.arrayBuffer());

    if (!beforeBuffer && beforeId) beforeBuffer = await bufferFromId(beforeId);
    if (!afterBuffer && afterId) afterBuffer = await bufferFromId(afterId);

    const beforeDataUrl = firstString(form, "beforeDataUrl", "before_data_url");
    const afterDataUrl = firstString(form, "afterDataUrl", "after_data_url");
    if (!beforeBuffer && beforeDataUrl?.startsWith("data:")) {
      beforeBuffer = dataUrlToBuffer(beforeDataUrl);
    }
    if (!afterBuffer && afterDataUrl?.startsWith("data:")) {
      afterBuffer = dataUrlToBuffer(afterDataUrl);
    }
  } else {
    const { data } = parsed;
    beforeId =
      typeof data.beforeId === "string"
        ? data.beforeId
        : typeof data.before_id === "string"
          ? data.before_id
          : undefined;
    afterId =
      typeof data.afterId === "string"
        ? data.afterId
        : typeof data.after_id === "string"
          ? data.after_id
          : undefined;
    polishAfter =
      jsonBool(data.polish) || jsonBool(data.subtlePolish) || jsonBool(data.subtle_polish);
    saveToLibrary = !jsonBool(data.skipSave);

    beforeBuffer = await resolveImageFromJson(data, "before");
    afterBuffer = await resolveImageFromJson(data, "after");
  }

  if (!beforeBuffer || !afterBuffer) {
    return badRequest("Before and after images are required");
  }

  try {
    const merged = await mergeBeforeAfterBuffers(beforeBuffer, afterBuffer, {
      polishAfter,
    });
    const dataUrl = bufferToDataUrl(merged);

    let item;
    if (saveToLibrary) {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `media_${Date.now()}`;
      item = await saveStoredMedia({
        id,
        name: "Before / After",
        kind: "before-after",
        buffer: merged,
        contentType: "image/jpeg",
        beforeId,
        afterId,
      });
    }

    return NextResponse.json({
      ok: true,
      dataUrl,
      mergedDataUrl: dataUrl,
      item,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Merge failed";
    return badRequest(message);
  }
}
