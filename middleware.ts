import { NextRequest, NextResponse } from "next/server";

// Your platform's own domain — the marketing/apex site lives here, no subdomain.
const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "myplatform.com").toLowerCase();

/**
 * Returns:
 *  - ""        for the bare apex domain (e.g. "myplatform.com")
 *  - "app"     for the dashboard subdomain
 *  - "store1"  etc. for a tenant subdomain
 *  - null      if the host doesn't belong to ROOT_DOMAIN at all (e.g. a
 *              merchant's future custom domain — not resolved here yet)
 */
function extractSubdomain(hostname: string, rootDomain: string): string | null {
  if (hostname === rootDomain) return "";
  if (hostname.endsWith(`.${rootDomain}`)) {
    return hostname.slice(0, hostname.length - rootDomain.length - 1);
  }
  return null;
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostHeader = (req.headers.get("host") || "").toLowerCase();
  const hostname = hostHeader.split(":")[0]; // strip port — works for prod and local dev alike

  // *.localhost resolves natively in Chrome/Firefox — no /etc/hosts editing for local dev.
  const isLocalDev = hostname === "localhost" || hostname.endsWith(".localhost");
  const isVercelDefault = hostname.endsWith(".vercel.app");

  // Vercel-এর ডিফল্ট .vercel.app ডোমেনের জন্য ডাইনামিক রুট ডোমেন নির্ধারণ
  const rootDomain = isLocalDev 
    ? "localhost" 
    : isVercelDefault 
      ? hostname 
      : ROOT_DOMAIN;

  let subdomain = extractSubdomain(hostname, rootDomain);

  // Vercel-এর ডিফল্ট ডোমেনে সাবডোমেন ছাড়া /login বা /app রাউটে গেলে সরাসরি হ্যান্ডেল করার জন্য:
  if (isVercelDefault && subdomain === "") {
    if (url.pathname.startsWith("/login") || url.pathname.startsWith("/app")) {
      subdomain = "app";
    }
  }

  if (subdomain === null) {
    // Doesn't match our root domain — this is where a merchant's Tenant.customDomain
    // would eventually resolve (needs an Edge-compatible lookup, since middleware can't
    // hit Postgres directly). Passing through untouched for now.
    return NextResponse.next();
  }

  if (subdomain === "www") {
    url.host = rootDomain;
    return NextResponse.redirect(url);
  }

  if (subdomain === "") {
    // Bare apex domain — marketing/landing page, served as-is.
    return NextResponse.next();
  }

  const isApiRoute = url.pathname.startsWith("/api");
  const requestHeaders = new Headers(req.headers);

  if (subdomain === "app") {
    // app.<root> — the authenticated dashboard. Merchant vs. super admin views are
    // gated by the logged-in user's role inside /app, not by a separate subdomain.
    requestHeaders.set("x-app-surface", "dashboard");

    if (isApiRoute) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // রাউট ওভারল্যাপ এড়াতে ডাইনামিক পাথ চেকিং
    const pathname = url.pathname.startsWith("/app") ? url.pathname : `/app${url.pathname}`;

    return NextResponse.rewrite(
      new URL(`${pathname}${url.search}`, req.url),
      { request: { headers: requestHeaders } }
    );
  }

  // Any other subdomain is a tenant's public storefront.
  requestHeaders.set("x-app-surface", "storefront");
  requestHeaders.set("x-tenant-subdomain", subdomain);

  if (isApiRoute) {
    // Shared/centralized routes (e.g. the Phase 4 checkout API) stay at /api/* —
    // x-tenant-subdomain tells the handler which store the request belongs to.
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.rewrite(
    new URL(`/site/${subdomain}${url.pathname}${url.search}`, req.url),
    { request: { headers: requestHeaders } }
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};