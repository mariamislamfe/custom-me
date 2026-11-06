import Link from "next/link";
import { logout } from "@/app/admin/actions";
import { Logo } from "@/components/brand/Logo";
import { usingSupabase } from "@/lib/server/backend";
import { AdminNav } from "./AdminNav";

export function AdminBar() {
  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 pt-2 sm:px-5 md:py-3">
        <Link href="/admin/orders" className="flex min-h-11 items-center gap-3" aria-label="Dashboard home">
          <span className="block h-9 w-32">
            <Logo className="h-full w-full text-[0.85rem]" />
          </span>
          <span className="bg-ink px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-mint">Dashboard</span>
        </Link>
        {/* Phones: one row that scrolls sideways, so the sticky bar stays short */}
        <AdminNav>
          <Link href="/" target="_blank" className="px-3 py-2 font-semibold hover:bg-mint-soft">
            View store ↗
          </Link>
          <form action={logout}>
            <button type="submit" className="px-3 py-2 font-semibold text-muted hover:bg-mint-soft hover:text-ink">
              Log out
            </button>
          </form>
        </AdminNav>
      </div>
      {!usingSupabase() && process.env.VERCEL && (
        <p className="bg-amber px-5 py-2 text-center text-sm font-semibold">
          Supabase isn&apos;t connected: on Vercel nothing you save is kept. Add the Supabase keys (see README) before taking orders.
        </p>
      )}
    </header>
  );
}
