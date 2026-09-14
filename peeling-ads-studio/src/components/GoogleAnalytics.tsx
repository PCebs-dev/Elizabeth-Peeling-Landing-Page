import Script from "next/script";
import { analytics } from "@/config/links";

export function GoogleAnalytics() {
  if (!analytics.gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${analytics.gaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${analytics.gaId}');
        `}
      </Script>
    </>
  );
}
