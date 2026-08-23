import { redirect } from "next/navigation";
import { isStudioAuthenticated } from "@/lib/studio/auth";
import { StudioApp } from "@/components/studio/StudioApp";

export default async function StudioPage() {
  const authed = await isStudioAuthenticated();
  if (!authed) redirect("/studio/login");
  return <StudioApp />;
}
