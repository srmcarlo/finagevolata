import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = new Set(["/", "/features", "/prezzi", "/contatti", "/privacy", "/termini", "/cookie"]);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = (req.auth?.user as any)?.role;
  const emailVerified = (req.auth?.user as any)?.emailVerified;
  const userEmail = req.auth?.user?.email;

  // Public invite acceptance — allow unauthenticated
  if (pathname.startsWith("/invite/")) {
    return NextResponse.next();
  }

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isVerifyPage = pathname.startsWith("/verify-email");
  const isOnboarding = pathname.startsWith("/onboarding");
  const isDashboard =
    pathname.startsWith("/consulente") ||
    pathname.startsWith("/azienda") ||
    pathname.startsWith("/admin");
  const isPublicMarketing = PUBLIC_PATHS.has(pathname);

  // /verify-email is always reachable for the verification flow (also when not logged in).
  // If a verified, logged-in user lands here, bounce them to their dashboard.
  if (isVerifyPage) {
    if (isLoggedIn && emailVerified) {
      const redirect =
        role === "CONSULTANT" ? "/consulente" :
        role === "ADMIN" ? "/admin" :
        role === "COMPANY" ? "/azienda" :
        "/";
      return NextResponse.redirect(new URL(redirect, req.url));
    }
    return NextResponse.next();
  }

  // Logged-in users on marketing homepage "/" → redirect to dashboard
  if (pathname === "/" && isLoggedIn) {
    const redirect =
      role === "CONSULTANT" ? "/consulente" :
      role === "ADMIN" ? "/admin" :
      role === "COMPANY" ? "/azienda" :
      "/login";
    return NextResponse.redirect(new URL(redirect, req.url));
  }

  // Logged-in users on auth pages → redirect to dashboard
  if (isAuthPage && isLoggedIn) {
    const redirect =
      role === "CONSULTANT" ? "/consulente" :
      role === "COMPANY" ? "/azienda" :
      role === "ADMIN" ? "/admin" : "/";
    return NextResponse.redirect(new URL(redirect, req.url));
  }

  // Hard gate: logged-in users with unverified email cannot touch onboarding or dashboards.
  if (isLoggedIn && !emailVerified && (isOnboarding || isDashboard)) {
    const qs = userEmail ? `?email=${encodeURIComponent(userEmail)}` : "";
    return NextResponse.redirect(new URL(`/verify-email${qs}`, req.url));
  }

  // Onboarding: allow COMPANY + CONSULTANT (each wizard enforces role internally)
  if (isOnboarding) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (role !== "COMPANY" && role !== "CONSULTANT") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  // Dashboard requires login
  if (isDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Role-based route protection
  if (isLoggedIn && isDashboard) {
    if (pathname.startsWith("/consulente") && role !== "CONSULTANT") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (pathname.startsWith("/azienda") && role !== "COMPANY") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // Public marketing paths: always allow
  if (isPublicMarketing) {
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|opengraph-image|sitemap.xml|robots.txt).*)"],
};
