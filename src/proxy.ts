import { NextResponse, type NextRequest } from "next/server";
import { refreshSupabaseSession } from "@/lib/supabase/proxy-session";
import { isRootHost } from "@/lib/tenant";

// NOTE: this file is named proxy.ts, not middleware.ts — Next.js 16 renamed
// the convention (middleware.js is deprecated). See node_modules/next/dist/docs/
// 01-app/03-api-reference/03-file-conventions/proxy.md.

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const { pathname } = request.nextUrl;

  if (!isRootHost(host)) {
    // Tenant hosts still serve /api/* (order submit) and Next internals on
    // the same origin. Rewriting those to /s/[host] made checkout return
    // HTML instead of JSON.
    if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) {
      return NextResponse.next();
    }

    // Any other Host header is a tenant storefront — either {slug}.<root> or
    // a fully custom domain that's been added under Domains. Internally
    // rewrite to the catch-all storefront route; the visible URL in the
    // browser is untouched. Storefront is a single page (cart/checkout are
    // client state), so every path on a tenant host renders the same route.
    const url = request.nextUrl.clone();
    url.pathname = `/s/${encodeURIComponent(host)}`;
    return NextResponse.rewrite(url);
  }

  // Root host: marketing site + /admin + /auth. Keep the Supabase session
  // cookie fresh, then gate /admin behind sign-in.
  const { response, user } = await refreshSupabaseSession(request);

  if (pathname.startsWith("/admin") && !user) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = "/auth/sign-in";
    signIn.searchParams.set("next", pathname);
    return NextResponse.redirect(signIn);
  }

  if (pathname.startsWith("/auth") && user) {
    const admin = request.nextUrl.clone();
    admin.pathname = "/admin";
    admin.search = "";
    return NextResponse.redirect(admin);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/|api/|catalog/|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm|txt)$).*)",
  ],
};
