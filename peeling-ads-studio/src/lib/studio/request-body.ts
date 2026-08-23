import type { NextRequest } from "next/server";

export type ParsedStudioBody =
  | { kind: "multipart"; form: FormData }
  | { kind: "json"; data: Record<string, unknown> };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Accept multipart uploads or JSON — matches what mobile clients actually send. */
export async function parseMultipartOrJson(
  request: NextRequest,
): Promise<ParsedStudioBody> {
  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();

  if (contentType.includes("multipart/form-data")) {
    return { kind: "multipart", form: await request.formData() };
  }

  if (contentType.includes("application/json")) {
    const data = asRecord(await request.json());
    if (!data) throw new Error("Invalid JSON body");
    return { kind: "json", data };
  }

  // Some mobile browsers omit Content-Type for FormData; try parsing anyway.
  try {
    const form = await request.formData();
    if ([...form.keys()].length > 0) {
      return { kind: "multipart", form };
    }
  } catch {
    /* fall through */
  }

  throw new Error("Expected multipart form data or JSON body");
}

export function formBool(value: FormDataEntryValue | null): boolean {
  if (value === null) return false;
  const text = String(value).trim().toLowerCase();
  return text === "1" || text === "true" || text === "yes" || text === "on";
}

export function jsonBool(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const text = value.trim().toLowerCase();
    return text === "1" || text === "true" || text === "yes" || text === "on";
  }
  return false;
}

export function firstBlob(
  form: FormData,
  ...keys: string[]
): Blob | null {
  for (const key of keys) {
    const entry = form.get(key);
    if (entry instanceof Blob && entry.size > 0) return entry;
  }
  return null;
}

export function firstString(
  form: FormData,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = String(form.get(key) ?? "").trim();
    if (value) return value;
  }
  return undefined;
}
