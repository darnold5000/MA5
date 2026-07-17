"use client";

import { useEffect } from "react";

import { registerServiceWorker } from "@/lib/push/client";

/** Registers the MA5 service worker once on the client. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    void registerServiceWorker();
  }, []);
  return null;
}
