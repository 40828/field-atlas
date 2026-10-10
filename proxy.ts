import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Auth gate. The matcher is deliberately narrow: only the dashboard, the auth pages and the
 * authenticated APIs go through Clerk. The marketing site, Field Atlas and the Stripe webhook
 * (`/api/billing/webhook`, which authenticates by signature) are never touched.
 */
const isProtected = createRouteMatcher(["/dashboard(.*)", "/api/blob(.*)"]);

export default clerkMiddleware(
  async (auth, req) => {
    if (isProtected(req)) await auth.protect();
  },
  { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
);

export const config = {
  matcher: ["/dashboard/:path*", "/sign-in/:path*", "/sign-up/:path*", "/api/blob/:path*"],
};
