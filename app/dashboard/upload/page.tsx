import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadWizard } from "@/components/solar/upload/upload-wizard";
import { getEntitlement } from "@/lib/billing/entitlements";
import { requirePageSession } from "@/lib/solar/server/session";

export const metadata: Metadata = { title: "New Proposal" };

/** Three-step wizard: blueprint upload → site metadata → review & generate. */
export default function UploadPage() {
  return (
    <div className="relative">
      <div className="bg-blueprint pointer-events-none absolute inset-x-0 top-0 h-72" aria-hidden />
      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="sp-fade-up">
          <p className="mb-2 font-mono text-[11px] tracking-[0.2em] text-brand uppercase">New proposal</p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            From blueprint to bid in minutes
          </h1>
          <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">
            Upload a PDF roof plan, tell us about the site, and we&apos;ll draft a proposal with a
            fully itemized bill of materials for you to review and edit.
          </p>
        </header>
        <Suspense fallback={<Skeleton className="h-[28rem] rounded-xl" />}>
          <Gate />
        </Suspense>
      </div>
    </div>
  );
}

/** Resolves the caller's account + plan; shows the paywall instead of the wizard when exhausted. */
async function Gate() {
  const { accountId } = await requirePageSession();
  const e = await getEntitlement(accountId);

  if (e.proposalsRemaining !== null && e.proposalsRemaining <= 0) {
    return (
      <Card className="items-center gap-4 p-10 text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-primary/15 text-brand">
          <Lock className="size-6" />
        </span>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">
            {e.plan === "free" ? "You've used your free proposals" : "You've reached your plan's proposal limit"}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {e.plan === "free"
              ? "Start a plan to keep turning blueprints into proposals. Every paid plan begins with a 14-day trial."
              : `Your ${e.planName} plan includes ${e.proposalLimit} proposals per billing period. Upgrade to keep going.`}
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/dashboard/billing">View plans</Link>
        </Button>
      </Card>
    );
  }

  return <UploadWizard accountId={accountId} />;
}
