import type { Metadata } from "next";
import { Radar } from "lucide-react";
import { EmptyState } from "@/components/engine/empty";
import { PageHeader } from "@/components/engine/page-header";
import { Badge } from "@/components/ui/badge";
import { STRATEGY_LABELS } from "@/lib/engine/labels";
import { formatUsd } from "@/lib/engine/ledger-math";
import { requireEnginePage } from "@/lib/engine/session";
import { listOpportunities } from "@/lib/engine/repo/research";

export const metadata: Metadata = { title: "Opportunities" };

export default async function OpportunitiesPage() {
  const { accountId } = await requireEnginePage();
  const rows = await listOpportunities(accountId);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Intelligence"
        title="Opportunities"
        description="Candidates produced from retrieved sources. Observed claims are only kept when they cite a real source id."
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={Radar}
          title="No opportunities yet"
          body="Start a mission. After sources are gathered, synthesis writes structured candidates here. Estimates are labelled; they are not verified demand."
        />
      ) : (
        <div className="space-y-4">
          {rows.map((o) => {
            const d = o.data;
            return (
              <article key={o.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{o.title}</h2>
                  <Badge variant="secondary">{STRATEGY_LABELS[o.kind]}</Badge>
                  <Badge variant="outline">evidence {(d.evidenceQuality * 100).toFixed(0)}%</Badge>
                </div>
                <p className="mt-2 text-sm">{d.description}</p>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <Item k="Customer" v={d.targetCustomer} />
                  <Item k="Problem" v={d.problem} />
                  <Item k="Pricing" v={`${d.pricing.model} · ${formatUsd(d.pricing.lowCents)}–${formatUsd(d.pricing.highCents)} (${d.pricing.basis})`} />
                  <Item k="Time to first sale" v={`~${d.daysToFirstSale} days (estimate)`} />
                  <Item k="Startup cost" v={formatUsd(d.startupCostCents)} />
                  <Item k="Probability" v={`${(d.probability.value * 100).toFixed(0)}% (${(d.probability.low * 100).toFixed(0)}–${(d.probability.high * 100).toFixed(0)}%)`} />
                </dl>
                <div className="mt-4 space-y-2 text-sm">
                  <p className="font-medium">Demand claims</p>
                  {d.demand.map((c, i) => (
                    <p key={i} className="text-muted-foreground">
                      <Badge variant={c.basis === "observed" ? "success" : "outline"}>{c.basis}</Badge> {c.text}
                    </p>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {d.downgradedClaims} claim(s) downgraded because they were labelled observed without a retrieved source. {d.limitations}
                </p>
                <p className="mt-2 text-sm">
                  <span className="font-medium">Validation: </span>
                  {d.validationExperiment.title} — {d.validationExperiment.successCriteria}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
