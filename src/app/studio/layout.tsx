import type { Metadata, Viewport } from "next";
import { StudioPwaRegister } from "@/components/studio/StudioPwaRegister";

export const metadata: Metadata = {
  title: "Ads Studio | Dr. Elizabeth Peeling",
  description:
    "Private Instagram and Facebook creative studio for Dr. Elizabeth Peeling.",
  applicationName: "Peeling Studio",
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: "Peeling Studio",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#595448",
};

export default function StudioLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh bg-[rgb(var(--brand-50))] text-[rgb(var(--brand-950))] pb-[env(safe-area-inset-bottom)]">
      <StudioPwaRegister />
      {children}
    </div>
  );
}
