import Link from "next/link";
import { Suspense } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EngineShell } from "@/components/engine/shell";
import { requireEnginePage } from "@/lib/engine/session";
import { listMissions } from "@/lib/engine/repo/core";
import { clerkConfigured, databaseConfigured } from "@/lib/engine/config";
import { Button } from "@/components/ui/button";

export default function EngineAppLayout({ children }: { children: React.ReactNode }) {
  if (!clerkConfigured()) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 py-16">
        <h1 className="text-2xl font-semibold">Authentication is not configured</h1>
        <p className="text-sm text-muted-foreground">
          The operations desk needs Clerk keys before anyone can sign in. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and
          CLERK_SECRET_KEY, then restart the dev server.
        </p>
        <Button asChild>
          <Link href="/engine/setup">Open setup guide</Link>
        </Button>
      </div>
    );
  }
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/engine/app"
      signUpFallbackRedirectUrl="/engine/app"
    >
      <TooltipProvider delayDuration={150}>
        <Suspense fallback={<div className="min-h-dvh bg-background" />}>
          <AuthedShell>{children}</AuthedShell>
        </Suspense>
      </TooltipProvider>
    </ClerkProvider>
  );
}

async function AuthedShell({ children }: { children: React.ReactNode }) {
  const { accountId } = await requireEnginePage();
  let running = false;
  if (databaseConfigured()) {
    const missions = await listMissions(accountId);
    running = missions.some((m) => m.status === "running");
  }
  return <EngineShell running={running}>{children}</EngineShell>;
}
