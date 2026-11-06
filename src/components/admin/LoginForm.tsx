"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/admin/actions";
import { input } from "./ui";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="mt-6 grid gap-3">
      <label htmlFor="password" className="font-semibold">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        autoFocus
        aria-invalid={!!state.error}
        aria-describedby={state.error ? "login-error" : undefined}
        className={input}
      />
      {state.error && (
        <p id="login-error" role="alert" className="font-semibold text-alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-ink mt-2" disabled={pending}>
        {pending ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}
