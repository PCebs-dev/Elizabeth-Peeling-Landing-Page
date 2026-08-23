"use client";

import { useEffect } from "react";

/** Registers the studio PWA service worker when supported. */
export function StudioPwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/studio" }).catch(() => {
      /* non-fatal */
    });
  }, []);
  return null;
}
