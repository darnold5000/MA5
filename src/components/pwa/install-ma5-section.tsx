"use client";

import { useCallback, useEffect, useState } from "react";

import {
  isIosSafari,
  isStandaloneDisplay,
  registerServiceWorker,
  subscribeToPush,
} from "@/lib/push/client";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallMa5Section({
  vapidPublicKey,
  signedIn,
}: {
  vapidPublicKey: string | null;
  signedIn: boolean;
}) {
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [installBusy, setInstallBusy] = useState(false);
  const [pushStatus, setPushStatus] = useState<
    "idle" | "on" | "denied" | "unsupported" | "error" | "need_keys"
  >("idle");
  const [pushBusy, setPushBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setStandalone(isStandaloneDisplay());
    setIos(isIosSafari());

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    void (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushStatus("unsupported");
        return;
      }
      if (!vapidPublicKey) {
        setPushStatus("need_keys");
        return;
      }
      const reg = await registerServiceWorker();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) setPushStatus("on");
      else if (Notification.permission === "denied") setPushStatus("denied");
    })();

    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, [vapidPublicKey]);

  const install = useCallback(async () => {
    if (!deferred) return;
    setInstallBusy(true);
    setMessage(null);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setDeferred(null);
        setMessage("MA5 installed. You can open it from your home screen.");
        setStandalone(isStandaloneDisplay());
      }
    } catch {
      setMessage("Install was cancelled or unavailable.");
    } finally {
      setInstallBusy(false);
    }
  }, [deferred]);

  const enablePush = useCallback(async () => {
    if (!vapidPublicKey) {
      setPushStatus("need_keys");
      return;
    }
    if (!signedIn) {
      setMessage("Sign in to enable push notifications.");
      return;
    }
    setPushBusy(true);
    setMessage(null);
    try {
      const sub = await subscribeToPush(vapidPublicKey);
      if (!sub) {
        if (Notification.permission === "denied") setPushStatus("denied");
        else setPushStatus("error");
        setMessage(
          ios && !standalone
            ? "On iPhone, install MA5 to the Home Screen first, then enable notifications."
            : "Notification permission was not granted.",
        );
        return;
      }
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
          hint?: string;
        } | null;
        setPushStatus("error");
        setMessage(data?.hint ?? data?.error ?? "Could not save subscription");
        return;
      }
      setPushStatus("on");
      setMessage("Push notifications enabled for this device.");
    } catch (err) {
      console.error(err);
      setPushStatus("error");
      setMessage("Could not enable push notifications.");
    } finally {
      setPushBusy(false);
    }
  }, [vapidPublicKey, signedIn, ios, standalone]);

  const disablePush = useCallback(async () => {
    setPushBusy(true);
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setPushStatus("idle");
      setMessage("Push notifications turned off on this device.");
    } catch {
      setMessage("Could not disable push.");
    } finally {
      setPushBusy(false);
    }
  }, []);

  return (
    <div className="space-y-5">
      {standalone ? (
        <p className="text-sm text-muted">
          MA5 is installed on this device. Open it from your Home Screen for the
          best experience.
        </p>
      ) : deferred ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Install MA5 for quicker access and push notifications when your
            coach messages you.
          </p>
          <button
            type="button"
            disabled={installBusy}
            onClick={() => void install()}
            className="inline-flex min-h-11 items-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
          >
            {installBusy ? "Installing…" : "Install MA5"}
          </button>
        </div>
      ) : ios ? (
        <div className="space-y-2 text-sm text-muted">
          <p className="font-medium text-foreground">Install on iPhone / iPad</p>
          <p>
            Safari does not support a one-tap install button. Add MA5 manually:
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Tap Share</li>
            <li>Tap Add to Home Screen</li>
            <li>Open MA5 from the Home Screen</li>
          </ol>
        </div>
      ) : (
        <p className="text-sm text-muted">
          Use your browser menu to install MA5 when the option appears (Chrome /
          Edge on Android or desktop). Or open this page on your phone after
          deploying over HTTPS.
        </p>
      )}

      <div className="border-t border-border pt-5">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">
          Push notifications
        </p>
        <p className="mt-2 text-sm text-muted">
          Alerts for new coach messages and announcements. Respects your
          Messages notification toggle. Requires install on iOS.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {pushStatus === "on" ? (
            <button
              type="button"
              disabled={pushBusy}
              onClick={() => void disablePush()}
              className="inline-flex min-h-11 items-center border border-border px-4 text-xs font-semibold tracking-wide uppercase disabled:opacity-50"
            >
              {pushBusy ? "…" : "Disable push"}
            </button>
          ) : (
            <button
              type="button"
              disabled={
                pushBusy ||
                pushStatus === "unsupported" ||
                pushStatus === "need_keys" ||
                pushStatus === "denied"
              }
              onClick={() => void enablePush()}
              className="inline-flex min-h-11 items-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
            >
              {pushBusy ? "Enabling…" : "Enable push"}
            </button>
          )}
        </div>
        {pushStatus === "need_keys" ? (
          <p className="mt-2 text-xs text-muted">
            Push is not configured on this server yet (missing VAPID keys).
          </p>
        ) : null}
        {pushStatus === "denied" ? (
          <p className="mt-2 text-xs text-muted">
            Notifications are blocked in browser settings for this site.
          </p>
        ) : null}
        {pushStatus === "unsupported" ? (
          <p className="mt-2 text-xs text-muted">
            This browser does not support Web Push.
          </p>
        ) : null}
      </div>

      {message ? <p className="text-sm text-foreground">{message}</p> : null}
    </div>
  );
}
