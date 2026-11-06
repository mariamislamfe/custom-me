import type { ReactNode } from "react";

/** Shared dashboard building blocks, in the storefront's navy / mint / paper language but calmer. */

export const input =
  "h-12 w-full border-2 border-ink/25 bg-sheet px-4 text-base outline-none transition-colors focus:border-ink aria-invalid:border-alert";

export const pill =
  "flex h-11 items-center px-4 font-semibold ring-2 ring-ink/15 transition-colors peer-checked:bg-ink peer-checked:text-sheet peer-checked:ring-ink peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-mint hover:ring-ink/40";

export const smallButton = "inline-flex min-h-10 items-center px-3 text-sm font-semibold ring-2 ring-ink/15 hover:ring-ink/50 disabled:opacity-40";

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <h1 className="type-display text-[clamp(2.4rem,6vw,4rem)]">{children}</h1>
      {sub && <p className="mt-2 max-w-[64ch] text-muted">{sub}</p>}
    </div>
  );
}

export function Card({ title, hint, children, className }: { title?: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`border-2 border-ink/15 bg-sheet p-5 md:p-6 ${className ?? ""}`}>
      {title && <h2 className="type-condensed text-2xl">{title}</h2>}
      {hint && <p className="mb-4 mt-1 text-sm text-muted">{hint}</p>}
      {title && !hint && <div className="mb-4" />}
      {children}
    </section>
  );
}

export function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="font-semibold">
        {label}
      </label>
      {hint && <p className="text-sm text-muted">{hint}</p>}
      <div className="mt-1.5">{children}</div>
      <FieldError msg={error} />
    </div>
  );
}

export function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-sm font-semibold text-alert">{msg}</p>;
}

export function Row({ label, value, href }: { label: string; value: ReactNode; href?: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3">
      <dt className="font-semibold">{label}</dt>
      <dd className="min-w-0 break-words">
        {href ? (
          <a href={href} className="underline underline-offset-4">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

export function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold text-ink ${tone}`}>{children}</span>;
}

export function Loading({ what = "Loading…" }: { what?: string }) {
  return <p className="py-20 text-center text-muted">{what}</p>;
}

const toggleTrack =
  "relative mt-0.5 h-7 w-12 shrink-0 rounded-full bg-ink/20 transition-colors peer-checked:bg-ink peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-mint after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-sheet after:transition-transform peer-checked:after:translate-x-5";

export function Toggle({ name, label, hint, defaultChecked }: { name: string; label: string; hint: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className={toggleTrack} />
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-muted">{hint}</span>
      </span>
    </label>
  );
}
