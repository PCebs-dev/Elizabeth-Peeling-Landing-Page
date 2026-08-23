import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  STUDIO_COOKIE,
  isStudioConfigured,
  verifySessionToken,
} from "@/lib/studio/auth";
import { StudioApp } from "@/components/studio/StudioApp";

export default async function StudioPage() {
  if (!isStudioConfigured()) {
    redirect("/studio/login?error=config");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(STUDIO_COOKIE)?.value;
  if (!(await verifySessionToken(token))) {
    redirect("/studio/login");
  }

  return <StudioApp />;
}
