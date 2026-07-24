"use client";

import { useEffect } from "react";
import { pushSupported } from "@/lib/push/vapid";

/**
 * Registers the push service worker once on mount, in supported browsers
 * (Chrome Windows/Android — feature-detected via PushManager). No-op
 * everywhere else. Runs inside <Providers> so it's app-wide.
 */
export function RegisterPushSW() {
  useEffect(() => {
    if (!pushSupported()) return;
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw-custom.js", {
          scope: "/",
        });
      } catch {
        // SW registration failure is non-fatal; push just won't deliver.
      }
    };
    void register();
  }, []);

  return null;
}
