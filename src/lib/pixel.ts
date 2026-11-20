/**
 * Meta Pixel on the store. The IDs come from the dashboard (Store & payments);
 * with none set, nothing loads and `track` does nothing.
 */

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[][]; loaded: boolean; version: string; push: Fbq };

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

const started = new Set<string>();
/** Events sent before the pixels started (a page's own effects run before the layout's) */
let early: Parameters<typeof track>[] = [];

/** Meta's loader: queues calls until fbevents.js arrives, then starts each pixel once. */
export function startPixels(ids: readonly string[]) {
  if (typeof window === "undefined" || !ids.length) return;
  if (!window.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    } as Fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq ??= fbq;
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
  for (const id of ids) {
    if (started.has(id)) continue;
    started.add(id);
    window.fbq("init", id);
  }
  const waiting = early;
  early = [];
  for (const args of waiting) track(...args);
}

/** A standard event (PageView, AddToCart, InitiateCheckout, Purchase…) to every pixel; `eventID` lets Meta drop duplicates. */
export function track(event: string, params?: Record<string, unknown>, eventID?: string) {
  if (typeof window === "undefined") return;
  if (!window.fbq || !started.size) {
    // Kept only briefly: a store with no pixels never starts them
    if (early.length < 10) early.push([event, params, eventID]);
    return;
  }
  if (eventID) window.fbq("track", event, params ?? {}, { eventID });
  else if (params) window.fbq("track", event, params);
  else window.fbq("track", event);
}
