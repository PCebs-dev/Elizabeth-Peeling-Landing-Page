import type { NextConfig } from "next";

const STUDIO_ORIGIN =
  process.env.NEXT_PUBLIC_STUDIO_URL ??
  "https://elizabeth-peeling-landing-page.vercel.app";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/studio",
        destination: `${STUDIO_ORIGIN}/studio`,
        permanent: false,
      },
      {
        source: "/studio/:path*",
        destination: `${STUDIO_ORIGIN}/studio/:path*`,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
