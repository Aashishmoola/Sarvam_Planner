"use client";

import { useEffect, useState } from "react";
import {
  getVapidPublicKey,
  pushSupported,
  urlBase64ToUint8Array,
} from "@/lib/push/vapid";
import {
  savePushSubscription,
  removePushSubscription,
  setPushEnabled,
} from "./actions";

type Status = "unknown" | "subscribed" | "not-subscribed" | "unsupported";

export function NotificationsManager({
  pushEnabled: initialEnabled,
  morningPushAt,
  subscriptionCount,
}: {
  pushEnabled: boolean;
  morningPushAt: string;
  subscriptionCount: number;
}) {
  const supported = pushSupported();
  const [status, setStatus] = useState<Status>("unknown");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const [enabled, setEnabled] = useState(initialEnabled);
  const [showPrePrompt, setShowPrePrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Discover any existing browser subscription on mount.
  useEffect(() => {
    if (!supported) {
      setStatus("unsupported");
      return;
    }
    let cancelled = false;
    (async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (cancelled) return;
      if (sub) {
        setEndpoint(sub.endpoint);
        setStatus("subscribed");
      } else {
        setStatus("not-subscribed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supported]);

  async function doSubscribe() {
    setShowPrePrompt(false);
    setBusy(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setError("Notifications were blocked. Enable them in your browser settings.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(getVapidPublicKey()),
      });
      const res = await savePushSubscription(sub.toJSON());
      if (res.error) {
        setError(res.error);
        await sub.unsubscribe();
        return;
      }
      setEndpoint(sub.endpoint);
      setStatus("subscribed");
      setEnabled(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not enable push.");
    } finally {
      setBusy(false);
    }
  }

  async function doUnsubscribe() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      if (endpoint) await removePushSubscription(endpoint);
      setEndpoint(null);
      setStatus("not-subscribed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not unsubscribe.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(next: boolean) {
    setEnabled(next);
    const res = await setPushEnabled(next);
    if (res.error) {
      setError(res.error);
      setEnabled(!next);
    }
  }

  if (status === "unsupported") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-blue-50">
          Push notifications aren&apos;t supported in this browser. Sarvam
          Planner delivers nudges to Chrome on Windows and Android.
        </p>
        <p className="text-xs text-gray-mid">
          Morning push time is set to {morningPushAt}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3 border border-gray-soft p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-blue-50">Morning nudge</div>
            <div className="text-xs text-gray-fade">
              One gentle push at {morningPushAt} each day.
            </div>
          </div>
          <label className="inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => void toggleEnabled(e.target.checked)}
              disabled={busy}
              className="h-4 w-4 accent-blue-400"
            />
          </label>
        </div>
      </section>

      <section className="space-y-3 border border-gray-soft p-4">
        <div>
          <div className="text-sm text-blue-50">Device subscription</div>
          <div className="text-xs text-gray-fade">
            {status === "subscribed"
              ? "This browser will receive nudges."
              : status === "not-subscribed"
                ? "Not subscribed on this browser yet."
                : "Checking…"}
            {subscriptionCount > 0 && status !== "subscribed" && (
              <span className="ml-1">
                ({subscriptionCount} other device
                {subscriptionCount === 1 ? "" : "s"} subscribed.)
              </span>
            )}
          </div>
        </div>

        {permission === "denied" && (
          <p className="text-xs text-blue-300">
            Blocked in browser settings. Reset the permission to subscribe.
          </p>
        )}

        {status === "subscribed" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void doUnsubscribe()}
            className="tap-target border border-gray-soft px-4 text-xs uppercase tracking-widest text-gray-fade hover:border-blue-400 hover:text-blue-400 disabled:opacity-40"
          >
            {busy ? "Removing…" : "Unsubscribe this browser"}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || permission === "denied"}
            onClick={() => setShowPrePrompt(true)}
            className="tap-target bg-blue-400 border border-blue-400 px-4 text-xs uppercase tracking-widest text-blue-100 hover:bg-blue-500 disabled:opacity-40"
          >
            {busy ? "Enabling…" : "Enable on this browser"}
          </button>
        )}
      </section>

      {error && <p className="text-xs text-blue-300">{error}</p>}

      {showPrePrompt && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink-3/70 animate-fadein"
          onClick={() => setShowPrePrompt(false)}
        >
          <div
            className="w-full max-w-sm border border-gray-soft bg-ink-1 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-medium text-blue-50">
              We&apos;ll send one gentle nudge each morning — that&apos;s it.
            </h2>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPrePrompt(false)}
                className="tap-target text-xs uppercase tracking-widest text-gray-fade hover:text-blue-400"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={() => void doSubscribe()}
                className="tap-target bg-blue-400 border border-blue-400 px-4 text-xs uppercase tracking-widest text-blue-100 hover:bg-blue-500"
              >
                Allow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
