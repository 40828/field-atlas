import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Auth gate. The matcher is deliberately narrow: only the dashboard, the auth pages and the
 * authenticated APIs go through Clerk. The marketing site, Field Atlas and the Stripe webhook
 * (`/api/billing/webhook`, which authenticates by signature) are never touched.
 */
const isProtected = createRouteMatcher(["/dashboard(.*)", "/engine/app(.*)", "/api/blob(.*)", "/api/engine/events(.*)"]);

const clerkReady = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);

export default clerkReady
  ? clerkMiddleware(
      async (auth, req) => {
        if (isProtected(req)) await auth.protect();
      },
      { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
    )
  : function proxy() {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/engine/app/:path*",
    "/sign-in/:path*",
    "/sign-up/:path*",
    "/api/blob/:path*",
    "/api/engine/events/:path*",
  ],
};
