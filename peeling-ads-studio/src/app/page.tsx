import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { detectLocaleFromAcceptLanguage } from "@/lib/locale";

export default async function Home() {
  const headersList = await headers();
  const acceptLanguage = headersList.get("accept-language");
  const locale = detectLocaleFromAcceptLanguage(acceptLanguage);
  redirect(`/${locale}`);
}
