import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isDashboard = pathname.startsWith("/consulente") ||
    pathname.startsWith("/azienda") ||
    pathname.startsWith("/admin");

  if (isAuthPage && isLoggedIn) {
    const role = (req.auth?.user as any)?.role;
    const redirect = role === "CONSULTANT" ? "/consulente" :
      role === "COMPANY" ? "/azienda" :
      role === "ADMIN" ? "/admin" : "/";
    return NextResponse.redirect(new URL(redirect, req.url));
  }

  if (isDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && isDashboard) {
    const role = (req.auth?.user as any)?.role;
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
