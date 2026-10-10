import type { Metadata } from "next";
import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  // Clerk's components read the pathname, which Cache Components requires behind Suspense.
  return (
    <Suspense fallback={<div className="h-96 w-full max-w-[25rem] animate-pulse rounded-xl bg-muted/40" />}>
      <SignIn />
    </Suspense>
  );
}
