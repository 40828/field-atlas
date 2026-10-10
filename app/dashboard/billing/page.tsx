import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckCircle2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ManageBillingButton, PlanPicker } from "@/components/billing/plan-picker";
import { getEntitlement } from "@/lib/billing/entitlements";
import { billingConfigured } from "@/lib/billing/stripe";
import { formatDate, formatInt } from "@/lib/solar/format";
import { requirePageSession } from "@/lib/solar/server/session";

export const metadata: Metadata = { title: "Billing" };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function BillingPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="relative">
      <div className="bg-blueprint pointer-events-none absolute inset-x-0 top-0 h-64" aria-hidden />
      <div className="relative mx-auto flex w-full max-w-[1000px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="sp-fade-up">
          <p className="mb-2 font-mono text-[11px] tracking-[0.2em] text-brand uppercase">Billing</p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Plan &amp; usage</h1>
        </header>
        <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
          <BillingContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function BillingContent({ searchParams }: { searchParams: SearchParams }) {
  const [{ accountId }, params] = await Promise.all([requirePageSession(), searchParams]);
  const e = await getEntitlement(accountId);
  const checkout = one(params.checkout);
  const subscribed = e.plan !== "free";
  const usagePct = e.proposalLimit ? Math.min(100, (e.proposalsUsed / e.proposalLimit) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      {checkout === "success" && (
        <p role="status" className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          Thanks! Your subscription is being activated. If your plan below hasn&apos;t updated, refresh in a few seconds.
        </p>
      )}
      {checkout === "canceled" && (
        <p role="status" className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" /> Checkout was canceled. You haven&apos;t been charged.
        </p>
      )}
      {!billingConfigured() && (
        <p role="status" className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          <Info className="mt-0.5 size-4 shrink-0" /> Billing isn&apos;t connected on this deployment yet, so plans can&apos;t be purchased.
        </p>
      )}

      <Card className="gap-5 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">{e.planName}</h2>
          {e.status === "trialing" && <Badge variant="warning">Trial</Badge>}
          {e.status === "active" && <Badge variant="success">Active</Badge>}
          {e.status === "past_due" && <Badge variant="destructive">Payment past due</Badge>}
          {e.cancelAtPeriodEnd && <Badge variant="secondary">Cancels at period end</Badge>}
          <div className="ml-auto">
            <ManageBillingButton disabled={!e.hasStripeCustomer} />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">Proposals {e.plan === "free" ? "(free allowance)" : "this period"}</span>
              <span className="num text-muted-foreground">
                {formatInt(e.proposalsUsed)}
                {e.proposalLimit !== null ? ` / ${formatInt(e.proposalLimit)}` : " · unlimited"}
              </span>
            </div>
            {e.proposalLimit !== null && <Progress value={usagePct} aria-label="Proposals used" />}
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Analyses today</dt>
              <dd className="num font-medium">
                {e.analysesToday} / {e.analysesPerDay}
              </dd>
            </div>
            {e.trialEnd && e.status === "trialing" && (
              <div>
                <dt className="text-xs text-muted-foreground">Trial ends</dt>
                <dd className="font-medium">{formatDate(e.trialEnd.toISOString())}</dd>
              </div>
            )}
            {subscribed && e.periodEnd && (
              <div>
                <dt className="text-xs text-muted-foreground">{e.cancelAtPeriodEnd ? "Access until" : "Renews"}</dt>
                <dd className="font-medium">{formatDate(e.periodEnd.toISOString())}</dd>
              </div>
            )}
          </dl>
        </div>
      </Card>

      {!subscribed && (
        <section aria-labelledby="plans-heading" className="flex flex-col gap-4">
          <h2 id="plans-heading" className="text-lg font-semibold">
            Choose a plan
          </h2>
          <PlanPicker
            initialPlan={one(params.plan)}
            initialInterval={one(params.interval)}
            billingEnabled={billingConfigured()}
          />
        </section>
      )}
    </div>
  );
}
