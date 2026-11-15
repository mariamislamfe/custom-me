"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { site } from "@/config/site";
import { whatsappLink } from "@/lib/contact";

const SEEN = "help-bubble-closed";
const MESSAGE = `Hi ${site.name}! I need some help.`;

/**
 * The green "Need help?" button, bottom corner of every store page: it opens
 * a WhatsApp chat with the shop. Its bubble pops up after a few seconds, once
 * per visit, and stays closed once closed.
 */
export function HelpButton({ whatsapp }: { whatsapp: string }) {
  // The Lab has its own bar along the bottom of the phone screen: sit above it
  return <HelpButtonView whatsapp={whatsapp} raised={usePathname().startsWith("/lab")} />;
}

/** The button itself. Reading the URL waits for the request, so the layout shows this alone until then (in a Suspense fallback). */
export function HelpButtonView({ whatsapp, raised = false }: { whatsapp: string; raised?: boolean }) {
  const [bubble, setBubble] = useState(false);
  const href = whatsappLink(whatsapp, MESSAGE);

  useEffect(() => {
    let closed = false;
    try {
      closed = sessionStorage.getItem(SEEN) === "1";
    } catch {
      // Storage blocked: the bubble just shows again
    }
    if (closed) return;
    const t = window.setTimeout(() => setBubble(true), 4000);
    return () => window.clearTimeout(t);
  }, []);

  const close = () => {
    setBubble(false);
    try {
      sessionStorage.setItem(SEEN, "1");
    } catch {
      // nothing to remember it in
    }
  };

  return (
    <div className={`fixed right-4 z-40 flex items-end gap-3 sm:right-6 ${raised ? "bottom-24 lg:bottom-6" : "bottom-4 sm:bottom-6"}`}>
      <AnimatePresence>
        {bubble && (
          <motion.div
            className="relative mb-2 w-max max-w-[min(15rem,calc(100vw-7rem))] rounded-2xl rounded-br-sm bg-white py-3 pl-4 pr-9 text-[#111B21] shadow-[0_6px_24px_rgb(11_20_56/0.22)] ring-1 ring-black/5"
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            style={{ transformOrigin: "bottom right" }}
          >
            <a href={href} target="_blank" rel="noreferrer" onClick={close} className="block">
              <span className="block font-bold">Need help?</span>
              <span className="mt-0.5 block text-sm leading-snug text-[#54656F]">Chat with us on WhatsApp, we reply fast.</span>
            </a>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full text-[#54656F] hover:bg-black/5"
            >
              <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        onClick={close}
        aria-label="Need help? Chat with us on WhatsApp"
        className="group relative grid size-14 shrink-0 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_6px_18px_rgb(37_211_102/0.45)] transition-transform hover:scale-105 active:scale-95"
      >
        <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-30 [animation-iteration-count:3] motion-reduce:hidden" />
        <svg viewBox="0 0 24 24" className="relative size-8" aria-hidden>
          {/* a speech bubble with a phone in it */}
          <path d="M12 2.6a9.4 9.4 0 0 0-8.1 14.2L2.6 21.4l4.7-1.2A9.4 9.4 0 1 0 12 2.6z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
          <path
            d="M8.7 7.3c.3-.3.8-.2 1 .2l.9 1.9c.1.3.1.6-.2.9l-.6.6c.6 1.3 1.6 2.3 2.9 2.9l.6-.6c.3-.3.6-.3.9-.2l1.9.9c.4.2.5.7.2 1l-.8.8c-.6.6-1.5.8-2.3.5-2.3-.9-4.1-2.7-5-5-.3-.8-.1-1.7.5-2.3z"
            fill="currentColor"
          />
        </svg>
      </a>
    </div>
  );
}
