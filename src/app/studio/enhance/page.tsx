import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  STUDIO_COOKIE,
  isStudioConfigured,
  verifySessionToken,
} from "@/lib/studio/auth";
import { EnhanceStudio } from "@/components/studio/EnhanceStudio";

export default async function StudioEnhancePage() {
  if (!isStudioConfigured()) {
    redirect("/studio/login?error=config");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(STUDIO_COOKIE)?.value;
  if (!(await verifySessionToken(token))) {
    redirect("/studio/login");
  }

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-[rgb(var(--brand-700))]">
          Loading enhance studio…
        </div>
      }
    >
      <EnhanceStudio />
    </Suspense>
  );
}
