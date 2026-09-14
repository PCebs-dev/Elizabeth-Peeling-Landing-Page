import { analytics } from "@/config/links";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  if (typeof window === "undefined") return;

  if (analytics.gaId && window.gtag) {
    window.gtag("event", eventName, params);
  }

  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", eventName, params);
  }
}

export function trackOutboundLink(href: string, eventName?: string) {
  trackEvent(eventName ?? "outbound_click", { link_url: href });
}
