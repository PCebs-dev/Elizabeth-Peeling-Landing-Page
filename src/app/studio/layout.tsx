import type { Metadata, Viewport } from "next";
import { StudioPwaRegister } from "@/components/studio/StudioPwaRegister";

export const viewport: Viewport = {
  themeColor: "#595448",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Ads Studio",
  applicationName: "Peeling Studio",
  manifest: "/studio/manifest.webmanifest",
  description:
    "Private Instagram and Facebook creative studio for Dr. Elizabeth Peeling.",
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Peeling Studio",
  },
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[rgb(var(--brand-50))] text-[rgb(var(--brand-950))] pb-[env(safe-area-inset-bottom)]">
      <StudioPwaRegister />
      {children}
    </div>
  );
}
