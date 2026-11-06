"use client";

import { useEffect, useState, useTransition } from "react";
import { deletePushSubscription, savePushSubscription, sendTestPush } from "@/app/admin/actions";

type Status = "checking" | "unsupported" | "needs-install" | "denied" | "off" | "on";

const SW_URL = "/dashboard-sw.js";
const SCOPE = "/admin/";

/** The VAPID public key (base64url) as the bytes PushManager wants. */
function keyBytes(base64url: string) {
  const b64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function deviceLabel() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad|Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "iPad";
  if (/Android/.test(ua)) return "Android phone";
  if (/Windows/.test(ua)) return "Windows computer";
  if (/Macintosh/.test(ua)) return "Mac";
  return "Phone";
}

const isAppleMobile = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
const isInstalled = () =>
  matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

async function currentSubscription() {
  const reg = await navigator.serviceWorker.getRegistration(SCOPE);
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** Turns order notifications on or off for the phone this page is open on. */
export function PushSetup({ publicKey, knownEndpoints }: { publicKey: string; knownEndpoints: string[] }) {
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let live = true;
    (async () => {
      let next: Status;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        next = isAppleMobile() && !isInstalled() ? "needs-install" : "unsupported";
      } else if (Notification.permission === "denied") {
        next = "denied";
      } else {
        const sub = await currentSubscription();
        next = sub ? "on" : "off";
        // On, but the dashboard lost it (e.g. removed from the list): send it again
        if (sub && !knownEndpoints.includes(sub.endpoint)) await savePushSubscription(sub.toJSON(), deviceLabel()).catch(() => {});
      }
      if (live) setStatus(next);
    })();
    return () => {
      live = false;
    };
  }, [knownEndpoints]);

  const turnOn = () =>
    start(async () => {
      setMessage(null);
      try {
        // Ask first, straight from the tap: iPhones only allow the prompt then
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "denied" : "off");
          return;
        }
        const reg = await navigator.serviceWorker.register(SW_URL, { scope: SCOPE });
        await navigator.serviceWorker.ready;
        const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
        await savePushSubscription(sub.toJSON(), deviceLabel());
        setStatus("on");
        setMessage({ text: "Notifications are on for this phone. Send a test to check." });
      } catch (err) {
        console.error(err);
        setMessage({ text: "Couldn't turn them on. Check your connection and try again.", error: true });
      }
    });

  const turnOff = () =>
    start(async () => {
      setMessage(null);
      try {
        const sub = await currentSubscription();
        if (sub) {
          await deletePushSubscription(sub.endpoint);
          await sub.unsubscribe();
        }
        setStatus("off");
      } catch {
        setMessage({ text: "Couldn't turn them off. Try again.", error: true });
      }
    });

  const test = () =>
    start(async () => {
      setMessage(null);
      try {
        const n = await sendTestPush();
        setMessage(
          n
            ? { text: `Sent to ${n} ${n === 1 ? "device" : "devices"}. It should arrive in a few seconds.` }
            : { text: "No device has notifications on yet.", error: true },
        );
      } catch {
        setMessage({ text: "Couldn't send it. Check your connection and try again.", error: true });
      }
    });

  return (
    <div className="mt-3">
      {status === "checking" && <p className="text-muted">Checking this phone…</p>}
      {status === "needs-install" && (
        <p className="bg-amber p-3 font-semibold">
          On iPhone, notifications only work from the home screen app: do step 1 first, then open CUSTOM ME from your home screen and
          come back to this page.
        </p>
      )}
      {status === "unsupported" && (
        <p className="bg-amber p-3 font-semibold">
          This browser can&apos;t get notifications. On Android use Chrome; on iPhone, add the dashboard to your home screen first.
        </p>
      )}
      {status === "denied" && (
        <p className="bg-amber p-3 font-semibold">
          Notifications are blocked for CUSTOM ME on this phone. Allow them in your phone&apos;s Settings (Notifications → CUSTOM ME), then
          reload this page.
        </p>
      )}
      {(status === "off" || status === "on") && (
        <div className="flex flex-wrap items-center gap-3">
          {status === "off" ? (
            <button type="button" className="btn btn-ink" disabled={pending} onClick={turnOn}>
              {pending ? "Turning on…" : "Turn on notifications on this phone"}
            </button>
          ) : (
            <>
              <span className="flex min-h-11 items-center gap-2 bg-mint px-4 font-semibold">
                <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                  <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                On for this phone
              </span>
              <button type="button" className="btn btn-ink" disabled={pending} onClick={test}>
                {pending ? "Sending…" : "Send a test notification"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={turnOff}
                className="min-h-11 px-4 font-semibold ring-2 ring-ink/20 hover:ring-ink/50"
              >
                Turn off
              </button>
            </>
          )}
        </div>
      )}
      {message && (
        <p role={message.error ? "alert" : "status"} className={`mt-3 font-semibold ${message.error ? "text-alert" : ""}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

/** A phone in the "getting notifications" list. */
export function RemoveDeviceButton({ endpoint }: { endpoint: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => deletePushSubscription(endpoint))}
      className="min-h-10 px-3 text-sm font-semibold text-alert hover:bg-alert/10 disabled:opacity-40"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
