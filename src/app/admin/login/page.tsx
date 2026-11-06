import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main id="main" className="drafting grid min-h-dvh place-items-center px-5">
      <div className="w-full max-w-sm border-2 border-ink bg-sheet p-7 shadow-[8px_8px_0_#14215A]">
        <span className="block h-12 w-44">
          <Logo className="h-full w-full text-[1.1rem]" />
        </span>
        <h1 className="type-condensed mt-5 text-4xl">Dashboard</h1>
        <p className="mt-1 text-muted">Orders, products, prices and finance.</p>
        <LoginForm />
      </div>
    </main>
  );
}
