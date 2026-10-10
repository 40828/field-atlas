import type { Metadata } from "next";
import { GitCompare } from "lucide-react";
import { EmptyState } from "@/components/engine/empty";
import { PageHeader } from "@/components/engine/page-header";
import { ActionButton } from "@/components/engine/action-form";
import { Badge } from "@/components/ui/badge";
import { startExperimentAction } from "@/lib/engine/actions";
import { STRATEGY_LABELS } from "@/lib/engine/labels";
import { formatUsd } from "@/lib/engine/ledger-math";
import { requireEnginePage } from "@/lib/engine/session";
import { listOpportunities, listStrategies } from "@/lib/engine/repo/research";

export const metadata: Metadata = { title: "Strategies" };

export default async function StrategiesPage() {
  const { accountId } = await requireEnginePage();
  const [strategies, opps] = await Promise.all([listStrategies(accountId), listOpportunities(accountId)]);
  const titles = new Map(opps.map((o) => [o.id, o.title]));

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Comparison"
        title="Strategies"
        description="Ranked by a deterministic scorer. Expected value is a model-assisted estimate, not collected cash. The top row is a recommendation — you start the experiment."
      />
      {strategies.length === 0 ? (
        <EmptyState
          icon={GitCompare}
          title="No ranked strategies"
          body="They appear after research synthesis finishes. Keep the dashboard open or click “Run next task now” on the mission."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Rank</th>
                <th className="px-3 py-2">Opportunity</th>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Expected value</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {strategies.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-3 py-3 font-mono">{s.rank}</td>
                  <td className="px-3 py-3">
                    <p className="font-medium">{titles.get(s.opportunityId) ?? s.kind}</p>
                    <p className="max-w-md text-xs text-muted-foreground">{s.rationale}</p>
                  </td>
                  <td className="px-3 py-3">{STRATEGY_LABELS[s.kind]}</td>
                  <td className="px-3 py-3">{s.score.toFixed(3)}</td>
                  <td className="px-3 py-3">{formatUsd(s.expectedValueCents)}</td>
                  <td className="px-3 py-3">
                    <Badge variant={s.status === "recommended" ? "default" : "outline"}>{s.status}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    {s.status === "recommended" || s.status === "candidate" ? (
                      <ActionButton
                        label="Start experiment"
                        size="sm"
                        run={() => startExperimentAction({ missionId: s.missionId, strategyId: s.id })}
                      />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
