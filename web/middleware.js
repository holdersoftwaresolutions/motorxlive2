import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname === "/dev-control") {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  const isAdminRoute = pathname.startsWith("/admin");
  const isContributorRoute = pathname.startsWith("/contributor");
  const isLoginRoute =
    pathname === "/admin/login" || pathname === "/contributor/login";

  if (!isAdminRoute && !isContributorRoute) {
    return NextResponse.next();
  }

  if (isLoginRoute) {
    return NextResponse.next();
  }

  const token = request.cookies.get("motorxlive_access_token")?.value;

  if (!token) {
    const loginPath = isContributorRoute ? "/contributor/login" : "/admin/login";
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/contributor/:path*", "/dev-control"],
};