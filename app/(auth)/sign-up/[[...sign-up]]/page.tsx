import type { Metadata } from "next";
import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Create your account" };

export default function SignUpPage() {
  // Clerk's components read the pathname, which Cache Components requires behind Suspense.
  return (
    <Suspense fallback={<div className="h-96 w-full max-w-[25rem] animate-pulse rounded-xl bg-muted/40" />}>
      <SignUp />
    </Suspense>
  );
}
