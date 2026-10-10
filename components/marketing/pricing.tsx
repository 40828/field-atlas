"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ANNUAL_DISCOUNT,
  PLANS,
  TRIAL_DAYS,
  displayMonthlyPrice,
  type BillingInterval,
  type PaidPlanKey,
} from "@/lib/billing/plans";
import { Section, SectionHeading } from "./section";

interface Tier {
  name: string;
  blurb: string;
  /** Paid plan key, or null for the contact-sales tier. */
  plan: PaidPlanKey | null;
  features: readonly string[];
  cta: string;
  featured?: boolean;
}

const TIERS: readonly Tier[] = [
  {
    name: PLANS.starter.name,
    blurb: "For owner-operators bidding a handful of roofs a month.",
    plan: "starter",
    features: [
      `${PLANS.starter.proposalLimit} proposals / month`,
      "AI blueprint takeoff",
      "Editable BOM with CSV export",
      "Code & zoning verification checklist",
    ],
    cta: `Start ${TRIAL_DAYS}-day trial`,
  },
  {
    name: PLANS.team.name,
    blurb: "For estimating teams that live in the pipeline every day.",
    plan: "team",
    features: [
      "Unlimited proposals",
      "Everything in Starter",
      "Higher daily analysis allowance",
      "Priority support",
    ],
    cta: `Start ${TRIAL_DAYS}-day trial`,
    featured: true,
  },
  {
    name: "Enterprise",
    blurb: "For multi-branch contractors with security and workflow requirements.",
    plan: null,
    features: ["Everything in Team", "Custom limits & invoicing", "Single sign-on options", "Dedicated onboarding"],
    cta: "Talk to sales",
  },
];

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Sign-up first, then land on the billing page with the chosen plan highlighted. */
const signUpHref = (plan: PaidPlanKey, interval: BillingInterval) =>
  `/sign-up?redirect_url=${encodeURIComponent(`/dashboard/billing?plan=${plan}&interval=${interval}`)}`;

export function Pricing() {
  const [billing, setBilling] = useState<BillingInterval>("annual");

  return (
    <Section id="pricing" className="bg-card/30">
      <SectionHeading
        eyebrow="Pricing"
        title="Priced per team, not per proposal"
        description={`Try ${PLANS.free.proposalLimit} proposals free, no card needed. Paid plans start with a ${TRIAL_DAYS}-day trial.`}
      />

      <div
        role="radiogroup"
        aria-label="Billing period"
        className="mx-auto mt-8 flex w-fit items-center gap-1 rounded-full border border-border bg-card p-1"
      >
        {(["monthly", "annual"] as const).map((b) => (
          <button
            key={b}
            type="button"
            role="radio"
            aria-checked={billing === b}
            onClick={() => setBilling(b)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
              billing === b
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {b}
            {b === "annual" && (
              <span className={cn("text-[11px]", billing === b ? "opacity-80" : "text-success")}>
                −{Math.round(ANNUAL_DISCOUNT * 100)}%
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {TIERS.map((t) => {
          const price = t.plan ? displayMonthlyPrice(t.plan, billing) : null;
          return (
            <article
              key={t.name}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-6 transition-all duration-300 hover:-translate-y-1",
                t.featured ? "glow-amber border-primary/50" : "border-border hover:border-primary/30",
              )}
            >
              {t.featured && (
                <Badge className="absolute -top-3 left-6 border-primary/40 bg-primary text-primary-foreground">
                  Most popular
                </Badge>
              )}
              <h3 className="text-lg font-semibold tracking-tight">{t.name}</h3>
              <p className="mt-1 min-h-10 text-sm text-muted-foreground">{t.blurb}</p>

              <p className="mt-6 flex items-baseline gap-1.5" aria-live="polite">
                {price === null ? (
                  <span className="text-4xl font-semibold tracking-tight">Custom</span>
                ) : (
                  <>
                    <span className="num text-4xl font-semibold tracking-tight">{usd.format(price)}</span>
                    <span className="text-sm text-muted-foreground">/ month</span>
                  </>
                )}
              </p>
              <p className="mt-1 h-4 text-xs text-muted-foreground">
                {price !== null && billing === "annual" ? "Billed annually" : ""}
              </p>

              <Button
                asChild
                size="lg"
                variant={t.featured ? "default" : "outline"}
                className="mt-6 w-full"
              >
                {t.plan ? (
                  <Link href={signUpHref(t.plan, billing)}>{t.cta}</Link>
                ) : (
                  <a href="mailto:sales@voltline.example">{t.cta}</a>
                )}
              </Button>

              <ul className="mt-6 space-y-3 border-t border-border pt-6 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </Section>
  );
}
