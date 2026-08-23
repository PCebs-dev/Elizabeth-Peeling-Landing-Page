import { NextResponse } from "next/server";
import {
  STUDIO_COOKIE,
  SESSION_COOKIE_OPTIONS,
  clearSessionCookieHeader,
  createSessionToken,
  isStudioConfigured,
  verifyStudioPassword,
} from "@/lib/studio/auth";

export async function POST(request: Request) {
  if (!isStudioConfigured()) {
    return NextResponse.json(
      {
        error:
          "Studio password is not configured. Set STUDIO_PASSWORD in .env.local and restart the dev server.",
      },
      { status: 503 }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.password || !verifyStudioPassword(body.password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(STUDIO_COOKIE, token, SESSION_COOKIE_OPTIONS);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(STUDIO_COOKIE, "", {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });
  // Also clear via header for older clients
  res.headers.append("Set-Cookie", clearSessionCookieHeader());
  return res;
}
