const STUDIO_COOKIE = "studio_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 14; // 14 days

export { STUDIO_COOKIE };

/** Trim + strip optional surrounding quotes from env values */
function getPassword(): string {
  const raw = process.env.STUDIO_PASSWORD ?? "";
  return raw.trim().replace(/^["']|["']$/g, "");
}

export function isStudioConfigured(): boolean {
  return getPassword().length > 0;
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export function verifyStudioPassword(input: string): boolean {
  const expected = getPassword();
  if (!expected) return false;
  return timingSafeEqualString(input.trim(), expected);
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const base64 =
    typeof btoa !== "undefined"
      ? btoa(binary)
      : Buffer.from(value, "utf8").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad =
    padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  if (typeof atob !== "undefined") {
    const binary = atob(padded + pad);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(padded + pad, "base64").toString("utf8");
}

export async function createSessionToken(): Promise<string> {
  const secret = getPassword();
  const payload = `studio:${Date.now()}`;
  const sig = await hmacHex(secret, payload);
  return toBase64Url(`${payload}.${sig}`);
}

export async function verifySessionToken(
  token: string | undefined
): Promise<boolean> {
  if (!token || !getPassword()) return false;
  try {
    const raw = fromBase64Url(token);
    const dot = raw.lastIndexOf(".");
    if (dot <= 0) return false;
    const payload = raw.slice(0, dot);
    const sig = raw.slice(dot + 1);
    if (!payload.startsWith("studio:")) return false;
    const expected = await hmacHex(getPassword(), payload);
    if (!timingSafeEqualString(sig, expected)) return false;
    const ts = Number(payload.slice("studio:".length));
    if (!Number.isFinite(ts)) return false;
    const ageMs = Date.now() - ts;
    return ageMs >= 0 && ageMs < COOKIE_MAX_AGE * 1000;
  } catch {
    return false;
  }
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  path: "/",
  maxAge: COOKIE_MAX_AGE,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export function clearSessionCookieHeader(): string {
  return `${STUDIO_COOKIE}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`;
}
