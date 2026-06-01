import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const publicPaths = ["/login", "/register", "/forgot-password"];

const roleRouteMap: Record<string, string[]> = {
  broker: ["/broker"],
  client: ["/portal", "/client"],
  admin: ["/admin"],
};

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    // If user is already logged in, redirect to their appropriate dashboard
    if (user) {
      const role = user.user_metadata?.role as string | undefined;
      if (role && roleRouteMap[role]) {
        const redirectUrl = new URL(
          role === "broker"
            ? "/broker/dashboard"
            : role === "client"
              ? "/portal"
              : "/admin",
          request.url
        );
        return NextResponse.redirect(redirectUrl);
      }
    }
    return supabaseResponse;
  }

  // Require authentication for all other routes
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based route protection
  const role = user.user_metadata?.role as string | undefined;

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
