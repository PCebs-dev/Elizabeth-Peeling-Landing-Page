import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyStudioSessionValue, STUDIO_COOKIE } from "@/lib/studio/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/studio")) return NextResponse.next();

  const authed = await verifyStudioSessionValue(
    request.cookies.get(STUDIO_COOKIE)?.value,
  );

  if (pathname.startsWith("/studio/login")) {
    if (authed) {
      return NextResponse.redirect(new URL("/studio", request.url));
    }
    return NextResponse.next();
  }

  if (!authed) {
    return NextResponse.redirect(new URL("/studio/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/studio", "/studio/:path*"],
};
