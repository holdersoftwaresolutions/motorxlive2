import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname === "/dev-control") {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  const publicAdminRoutes = ["/admin/login"];

  const publicContributorRoutes = [
    "/contributor/login",
    "/contributor/request-access",
  ];

  const isAdminRoute = pathname.startsWith("/admin");
  const isContributorRoute = pathname.startsWith("/contributor");

  if (!isAdminRoute && !isContributorRoute) {
    return NextResponse.next();
  }

  if (publicAdminRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  if (publicContributorRoutes.includes(pathname)) {
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