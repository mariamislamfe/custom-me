import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

/**
 * Single-password access to the dashboard (products, orders, finance).
 *
 * Set ADMIN_PASSWORD (and optionally ADMIN_SESSION_SECRET) in .env.local or
 * your host's environment. Sessions are HMAC-signed cookies; changing the
 * password signs everyone out.
 */
export const ADMIN_COOKIE = "customme_admin";
// Long enough that tapping an order notification on the home screen app rarely meets the login page
const SESSION_DAYS = 30;

export const adminConfigured = () => Boolean(process.env.ADMIN_PASSWORD);

function key() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return createHash("sha256")
    .update(`customme-admin:${process.env.ADMIN_SESSION_SECRET ?? ""}:${password}`)
    .digest();
}

const sign = (value: string, k: Buffer) => createHmac("sha256", k).update(value).digest("base64url");

const safeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
};

export function checkPassword(input: string) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(password).digest();
  return timingSafeEqual(a, b);
}

export async function createSession() {
  const k = key();
  if (!k) throw new Error("ADMIN_PASSWORD is not set");
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const value = `${expires}.${sign(String(expires), k)}`;
  (await cookies()).set(ADMIN_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function isAdmin() {
  // Session checks compare against the current time, so they always run per request
  await connection();
  const k = key();
  if (!k) return false;
  const raw = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!raw) return false;
  const [expires, sig] = raw.split(".");
  if (!expires || !sig || Number(expires) < Date.now()) return false;
  return safeEqual(sig, sign(expires, k));
}

/** Call at the top of every admin page, action and route handler. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
