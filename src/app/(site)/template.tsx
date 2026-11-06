import type { ReactNode } from "react";

/**
 * Page transition: a mint rule sweeps across the top while the page rises in.
 * Same gesture as the signature line — every page arrives "drawn".
 *
 * Pure CSS on purpose: a template re-mounts on every navigation, so the
 * animation replays, and content is never hidden waiting for JavaScript.
 */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <>
      <div aria-hidden className="page-rule pointer-events-none fixed left-0 top-0 z-[70] h-1 w-full origin-left bg-mint" />
      <div className="page-in">{children}</div>
    </>
  );
}
