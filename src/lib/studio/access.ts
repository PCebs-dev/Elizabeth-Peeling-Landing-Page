import { cookies } from "next/headers";
import { STUDIO_COOKIE, verifySessionToken } from "./auth";

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

function getAutomationSecret(): string {
  const raw =
    process.env.STUDIO_AUTOMATION_SECRET ?? process.env.CRON_SECRET ?? "";
  return raw.trim().replace(/^["']|["']$/g, "");
}

/** Session cookie OR Bearer automation/cron secret */
export async function assertStudioAccess(
  request: Request
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDIO_COOKIE)?.value;
  if (await verifySessionToken(token)) {
    return { ok: true };
  }

  const secret = getAutomationSecret();
  if (secret) {
    const auth = request.headers.get("authorization") || "";
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    const headerSecret = request.headers.get("x-studio-automation-secret") || "";
    if (
      timingSafeEqualString(bearer, secret) ||
      timingSafeEqualString(headerSecret, secret)
    ) {
      return { ok: true };
    }
  }

  return { ok: false, status: 401, error: "Unauthorized" };
}

export function isAutomationSecretConfigured(): boolean {
  return getAutomationSecret().length > 0;
}
