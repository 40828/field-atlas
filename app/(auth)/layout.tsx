import Link from "next/link";
import { ClerkProvider } from "@clerk/nextjs";
import { BrandMark, BrandWordmark } from "@/components/solar/brand";

/** Centered shell for the hosted-component sign-in / sign-up pages. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <div className="bg-blueprint relative grid min-h-dvh place-items-center px-4 py-12">
        <div className="flex w-full max-w-md flex-col items-center gap-6">
          <Link href="/solar" className="flex items-center gap-2.5" aria-label="Voltline home">
            <BrandMark />
            <BrandWordmark />
          </Link>
          {children}
          <p className="text-center text-xs text-muted-foreground">
            By continuing you agree to the{" "}
            <Link href="/terms" className="underline underline-offset-4">Terms</Link> and{" "}
            <Link href="/privacy" className="underline underline-offset-4">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </ClerkProvider>
  );
}
