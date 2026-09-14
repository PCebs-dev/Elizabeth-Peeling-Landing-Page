import { NextResponse, type NextRequest } from "next/server";
import {
  createStudioSessionValue,
  studioPasswordConfigured,
  studioSessionCookieOptions,
  verifyStudioPassword,
  STUDIO_COOKIE,
  verifyStudioSessionValue,
} from "@/lib/studio/auth";

export async function POST(request: NextRequest) {
  if (!studioPasswordConfigured()) {
    return NextResponse.json(
      {
        error:
          "Studio password is not configured. Add STUDIO_PASSWORD to .env.local and restart npm run dev.",
      },
      { status: 503 },
    );
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: string };
    password = body.password ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!verifyStudioPassword(password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const token = await createStudioSessionValue();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(studioSessionCookieOptions(token));
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: STUDIO_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(STUDIO_COOKIE)?.value;
  return NextResponse.json({
    authenticated: await verifyStudioSessionValue(cookie),
  });
}
