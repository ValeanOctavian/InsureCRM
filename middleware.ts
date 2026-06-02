import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const publicPaths = [
  "/login",
  "/register",
  "/forgot-password",
  "/portal/login",
  "/portal/register",
];

function resolveHomeForRole(role: string, request: NextRequest): URL {
  if (role === "broker") return new URL("/broker/dashboard", request.url);
  if (role === "client") return new URL("/portal", request.url);
  return new URL("/admin", request.url);
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;
  const role = user?.user_metadata?.role as string | undefined;

  // Expose the pathname to server components (e.g. portal layout).
  supabaseResponse.headers.set("x-pathname", pathname);

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    // If a logged-in client hits the broker login/register, send them to portal
    if (user && role === "client" && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
    // If user is already logged in, redirect to their dashboard
    if (user && role) {
      return NextResponse.redirect(resolveHomeForRole(role, request));
    }
    return supabaseResponse;
  }

  // /portal/complete-profile is reachable but still requires auth
  if (pathname === "/portal/complete-profile") {
    if (!user) {
      const loginUrl = new URL("/portal/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return supabaseResponse;
  }

  // Require authentication for all other routes
  if (!user) {
    // If the user is trying to access a portal route, send them to portal login
    const loginPath =
      pathname.startsWith("/portal") || pathname.startsWith("/client")
        ? "/portal/login"
        : "/login";
    const loginUrl = new URL(loginPath, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based route protection
  // Broker routes — only broker or admin
  if (pathname.startsWith("/broker") && role !== "broker" && role !== "admin") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Portal / client routes — only client role
  if (
    (pathname.startsWith("/portal") || pathname.startsWith("/client")) &&
    role !== "client"
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Admin routes — only admin role
  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     * - auth callback (handled by Supabase)
     */
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
