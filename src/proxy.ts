import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/lib/server/auth";
import { readProducts, storefront } from "@/lib/server/products";

/**
 * 1. Dashboard: send visitors without a session cookie to the login page.
 *    This is only a fast first check; every admin page, action and upload
 *    verifies the signed session itself.
 * 2. Product pages: an unknown slug would otherwise get the route's static
 *    shell (status 200) before the page can call notFound(), so answer it
 *    here with a real 404.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login" || request.cookies.has(ADMIN_COOKIE)) return;
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const slug = decodeURIComponent(pathname.split("/")[2] ?? "");
  const known = storefront(await readProducts()).some((p) => p.slug === slug);
  if (!known) {
    // Any unmatched path renders app/not-found.tsx with a 404 status
    return NextResponse.rewrite(new URL("/__unknown-product", request.url));
  }
}

export const config = {
  matcher: ["/product/:slug", "/admin", "/admin/:path*"],
};
