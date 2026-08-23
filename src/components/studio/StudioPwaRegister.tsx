"use client";

import { useEffect } from "react";

/** Registers the studio service worker (HTTPS or localhost only). */
export function StudioPwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (window.location.protocol !== "https:" && !isLocalhost) return;

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* silent — PWA install still works via manifest on many browsers */
    });
  }, []);

  return null;
}
