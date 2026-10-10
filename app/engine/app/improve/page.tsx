import type { Metadata } from "next";
import { LineChart } from "lucide-react";
import { EmptyState } from "@/components/engine/empty";
import { PageHeader } from "@/components/engine/page-header";
import { ActionButton } from "@/components/engine/action-form";
import { ImprovementForm } from "@/components/engine/workspace-forms";
import { Badge } from "@/components/ui/badge";
import { decideImprovementAction } from "@/lib/engine/actions";
import { requireEnginePage } from "@/lib/engine/session";
import { listImprovements } from "@/lib/engine/repo/ops";

export const metadata: Metadata = { title: "Improvements" };

export default async function ImprovePage() {
  const { accountId } = await requireEnginePage();
  const rows = await listImprovements(accountId);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Learning"
        title="Improvement center"
        description="Hypotheses stay isolated until you adopt them. The engine does not change production because a model prefers a variant."
      />
      <ImprovementForm />
      {rows.length === 0 ? (
        <EmptyState icon={LineChart} title="No hypotheses" body="Record an observed problem from real usage. Do not optimise vanity metrics that hurt customers or confirmed profit." />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <article key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex justify-between gap-2">
                <h2 className="font-medium">{r.hypothesis}</h2>
                <Badge>{r.status}</Badge>
              </div>
              <p className="mt-2 text-sm">{r.observation}</p>
              <p className="mt-1 text-sm text-muted-foreground">Success: {r.successCriterion}</p>
              <p className="mt-1 text-sm">{r.proposal}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status === "proposed" ? (
                  <>
                    <ActionButton label="Approve test" size="sm" run={() => decideImprovementAction(r.id, "approved")} />
                    <ActionButton label="Reject" size="sm" variant="outline" run={() => decideImprovementAction(r.id, "rejected")} />
                  </>
                ) : null}
                {r.status === "approved" || r.status === "tested" ? (
                  <>
                    <ActionButton label="Mark tested" size="sm" variant="outline" run={() => decideImprovementAction(r.id, "tested")} />
                    <ActionButton label="Adopt" size="sm" run={() => decideImprovementAction(r.id, "adopted")} />
                    <ActionButton label="Roll back" size="sm" variant="destructive" run={() => decideImprovementAction(r.id, "rolled_back")} />
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
