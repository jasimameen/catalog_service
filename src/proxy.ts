import { NextResponse, type NextRequest } from "next/server";
import { sessionNeedsEmailOtp, verifyEmailPath } from "@/lib/auth/email-verified";
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

    const catalogIconPath = tenantCatalogIconPath(pathname);
    if (catalogIconPath) {
      const url = request.nextUrl.clone();
      url.pathname = `/s/${encodeURIComponent(host)}${catalogIconPath}`;
      return NextResponse.rewrite(url);
    }

    if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/i.test(pathname)) {
      return NextResponse.next();
    }

    // Tenant hosts keep dedicated guest paths: /dine, /dine/t/{code}, /reserve,
    // /track/*. Everything else is the regular menu. Old table QR on the root
    // (?table=) redirects to /dine so printed codes keep working.
    const forwarded = tenantStorefrontPath(pathname);
    if (forwarded) {
      const url = request.nextUrl.clone();
      url.pathname = `/s/${encodeURIComponent(host)}${forwarded}`;
      return NextResponse.rewrite(url);
    }

    if (pathname === "/" || pathname === "") {
      const table = request.nextUrl.searchParams.get("table")?.trim();
      if (table) {
        const url = request.nextUrl.clone();
        url.pathname = "/dine";
        return NextResponse.redirect(url);
      }
    }

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

  const needsOtp = sessionNeedsEmailOtp(user);
  if (needsOtp && (pathname.startsWith("/admin") || pathname.startsWith("/new"))) {
    return NextResponse.redirect(new URL(verifyEmailPath(user?.email, pathname), request.nextUrl));
  }

  // Callback must run even if a session already exists — recovery emails
  // exchange ?code= here. Forgot-password stays reachable while signed out.
  // Unverified public users stay on /auth/verify instead of bouncing to admin.
  if (
    pathname.startsWith("/auth") &&
    user &&
    !pathname.startsWith("/auth/callback") &&
    !pathname.startsWith("/auth/verify")
  ) {
    if (needsOtp) {
      return NextResponse.redirect(new URL(verifyEmailPath(user.email), request.nextUrl));
    }
    const admin = request.nextUrl.clone();
    admin.pathname = "/admin";
    admin.search = "";
    return NextResponse.redirect(admin);
  }

  return response;
}

function tenantStorefrontPath(pathname: string): string | null {
  if (pathname === "/dine" || pathname.startsWith("/dine/")) return pathname;
  if (pathname === "/reserve" || pathname.startsWith("/reserve/")) return pathname;
  if (pathname.startsWith("/track/")) return pathname;
  return null;
}

function tenantCatalogIconPath(pathname: string): string | null {
  if (pathname === "/favicon.ico" || pathname === "/icon" || pathname === "/icon.svg") return "/icon";
  if (pathname.startsWith("/icon/")) return pathname;
  if (pathname === "/apple-icon" || pathname.startsWith("/apple-icon")) return pathname;
  if (pathname === "/opengraph-image" || pathname.startsWith("/opengraph-image")) return pathname;
  if (pathname === "/twitter-image" || pathname.startsWith("/twitter-image")) return pathname;
  return null;
}

export const config = {
  matcher: [
    "/((?!_next/|api/|catalog/|sw\\.js|manifest\\.webmanifest|admin-offline\\.html|robots.txt|sitemap.xml|llms.txt|.*\\.(?:jpg|jpeg|gif|webp|png|svg|mp4|webm|txt|csv)$).*)",
  ],
};
