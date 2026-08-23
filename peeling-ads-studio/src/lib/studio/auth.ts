const STUDIO_COOKIE = "studio_session";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export { STUDIO_COOKIE };

function sessionSecret(): string {
  return (
    process.env.STUDIO_SESSION_SECRET ??
    process.env.STUDIO_PASSWORD ??
    "studio-dev-secret"
  );
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(encoded: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encoded),
  );
  return toHex(sig);
}

export async function createStudioSessionValue(): Promise<string> {
  const payload = JSON.stringify({ iat: Date.now() });
  const encoded = encodeBase64Url(payload);
  return `${encoded}.${await sign(encoded)}`;
}

export async function verifyStudioSessionValue(
  value: string | undefined,
): Promise<boolean> {
  if (!value) return false;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return false;

  const expected = await sign(encoded);
  if (signature.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (mismatch !== 0) return false;

  try {
    const payload = JSON.parse(decodeBase64Url(encoded)) as { iat?: number };
    if (!payload.iat) return false;
    return Date.now() - payload.iat < SESSION_MAX_AGE_MS;
  } catch {
    return false;
  }
}

export async function isStudioAuthenticated(): Promise<boolean> {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  return verifyStudioSessionValue(jar.get(STUDIO_COOKIE)?.value);
}

export function studioPasswordConfigured(): boolean {
  return Boolean(process.env.STUDIO_PASSWORD?.trim());
}

export function verifyStudioPassword(password: string): boolean {
  const expected = process.env.STUDIO_PASSWORD?.trim();
  if (!expected) return false;
  if (password.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < password.length; i++) {
    mismatch |= password.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export function studioSessionCookieOptions(value: string) {
  return {
    name: STUDIO_COOKIE,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  };
}
