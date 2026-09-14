import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://elizabeth-peeling-landing-page.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Dr. Elizabeth Peeling | Invisalign & Cosmetic Dentistry",
    template: "%s | Dr. Elizabeth Peeling",
  },
  description:
    "Invisalign and cosmetic dentistry consultations with Dr. Elizabeth Peeling in Vaudreuil-Dorion, Quebec.",
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
