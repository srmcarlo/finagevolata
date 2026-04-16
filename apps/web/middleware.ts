import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = (req.auth?.user as any)?.role;

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isOnboarding = pathname.startsWith("/onboarding");
  const isDashboard = pathname.startsWith("/consulente") ||
    pathname.startsWith("/azienda") ||
    pathname.startsWith("/admin");

  // Logged in users on auth pages → redirect to dashboard
  // COMPANY goes to "/" which checks onboarding status
  if (isAuthPage && isLoggedIn) {
    const redirect = role === "CONSULTANT" ? "/consulente" :
      role === "COMPANY" ? "/" :
      role === "ADMIN" ? "/admin" : "/";
    return NextResponse.redirect(new URL(redirect, req.url));
  }

  // Allow logged in COMPANY users to access onboarding
  if (isOnboarding && isLoggedIn && role === "COMPANY") {
    return NextResponse.next();
  }

  // Redirect non-COMPANY or non-logged-in users away from onboarding
  if (isOnboarding && (!isLoggedIn || role !== "COMPANY")) {
    return NextResponse.redirect(new URL("/login", req.url));
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

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
