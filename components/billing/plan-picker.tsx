"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { openBillingPortalAction, startCheckoutAction } from "@/lib/billing/actions";
import {
  ANNUAL_DISCOUNT,
  PLANS,
  TRIAL_DAYS,
  chargePerCycle,
  displayMonthlyPrice,
  isBillingInterval,
  isPaidPlanKey,
  type BillingInterval,
  type PaidPlanKey,
} from "@/lib/billing/plans";

const FEATURES: Record<PaidPlanKey, string[]> = {
  starter: ["25 proposals per month", "AI blueprint takeoff", "Editable BOM and CSV export", "Email support"],
  team: ["Unlimited proposals", "Everything in Starter", "Higher daily analysis allowance", "Priority support"],
};

/** Plan cards with the monthly/annual switch; starts a Stripe Checkout session on click. */
export function PlanPicker({
  initialPlan,
  initialInterval,
  billingEnabled,
}: {
  initialPlan?: string;
  initialInterval?: string;
  billingEnabled: boolean;
}) {
  const [interval, setIntervalState] = useState<BillingInterval>(isBillingInterval(initialInterval) ? initialInterval : "monthly");
  const [pending, start] = useTransition();
  const [busyPlan, setBusyPlan] = useState<PaidPlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const highlight = isPaidPlanKey(initialPlan) ? initialPlan : null;

  function choose(plan: PaidPlanKey) {
    setError(null);
    setBusyPlan(plan);
    start(async () => {
      const res = await startCheckoutAction({ plan, interval });
      if (!res.ok) {
        setError(res.error);
        setBusyPlan(null);
        return;
      }
      window.location.assign(res.data.url);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div role="group" aria-label="Billing interval" className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
          {(["monthly", "annual"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={interval === v}
              onClick={() => setIntervalState(v)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                interval === v ? "bg-card shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v === "monthly" ? "Monthly" : "Annual"}
            </button>
          ))}
        </div>
        <Badge variant="success">Save {Math.round(ANNUAL_DISCOUNT * 100)}% annually</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(["starter", "team"] as const).map((key) => (
          <Card key={key} className={cn("gap-4 p-6", highlight === key && "border-primary/60 ring-1 ring-primary/40")}>
            <div>
              <h3 className="text-lg font-semibold">{PLANS[key].name}</h3>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="num text-3xl font-semibold">${displayMonthlyPrice(key, interval)}</span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </p>
              {interval === "annual" && (
                <p className="mt-1 text-xs text-muted-foreground">Billed ${chargePerCycle(key, interval).toLocaleString("en-US")} per year</p>
              )}
            </div>
            <ul className="flex flex-1 flex-col gap-2 text-sm">
              {FEATURES[key].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" /> {f}
                </li>
              ))}
            </ul>
            <Button onClick={() => choose(key)} disabled={!billingEnabled || pending}>
              {pending && busyPlan === key && <Loader2 className="animate-spin" />}
              Start {TRIAL_DAYS}-day trial
            </Button>
          </Card>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        You won&apos;t be charged until the trial ends, and you can cancel any time from the billing portal. Need more?{" "}
        <a className="underline underline-offset-4" href="mailto:sales@voltline.example">
          Talk to sales
        </a>
        .
      </p>
    </div>
  );
}

export function ManageBillingButton({ disabled }: { disabled?: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant="outline"
        disabled={disabled || pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await openBillingPortalAction();
            if (!res.ok) return setError(res.error);
            window.location.assign(res.data.url);
          })
        }
      >
        {pending && <Loader2 className="animate-spin" />}
        Manage billing
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
