import type { Metadata } from "next";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { EmptyState } from "@/components/engine/empty";
import { PageHeader } from "@/components/engine/page-header";
import { ActionButton } from "@/components/engine/action-form";
import { Badge } from "@/components/ui/badge";
import { abandonExperimentAction, startFactoryBuildAction } from "@/lib/engine/actions";
import { requireEnginePage } from "@/lib/engine/session";
import { listExperiments } from "@/lib/engine/repo/research";

export const metadata: Metadata = { title: "Experiments" };

export default async function ExperimentsPage() {
  const { accountId } = await requireEnginePage();
  const rows = await listExperiments(accountId);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Validation"
        title="Experiments"
        description="Small tests with a hypothesis and success criteria. A specification is not a shipped product."
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="No experiments"
          body="Rank strategies first, then start the recommended experiment. The engine will not start one on its own."
        />
      ) : (
        <div className="space-y-4">
          {rows.map((e) => (
            <article key={e.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">{e.title}</h2>
                <Badge>{e.status}</Badge>
              </div>
              <p className="mt-2 text-sm">{e.hypothesis}</p>
              <p className="mt-1 text-sm text-muted-foreground">Success: {e.successCriteria}</p>
              {e.spec ? (
                <div className="mt-3 rounded-lg bg-muted/40 p-3 text-sm">
                  <p className="font-medium">{e.spec.name}</p>
                  <p className="text-muted-foreground">{e.spec.tagline}</p>
                  <p className="mt-2">{e.spec.needsSoftware ? "Software is specified (not built yet)." : e.spec.nonSoftwarePlan}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Specification not written yet — wait for the queued task.</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {e.spec?.needsSoftware ? (
                  <ActionButton
                    label="Queue sandbox build"
                    size="sm"
                    run={() => startFactoryBuildAction({ missionId: e.missionId, experimentId: e.id })}
                  />
                ) : null}
                <ButtonLink href="/engine/app/studio">Open studio</ButtonLink>
                {e.status !== "abandoned" && e.status !== "succeeded" ? (
                  <ActionButton
                    label="Abandon"
                    size="sm"
                    variant="outline"
                    confirm="Abandon this experiment? Similar ideas will be penalised unless assumptions change."
                    run={() => abandonExperimentAction(e.id, "Abandoned by user.")}
                  />
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function ButtonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex h-8 items-center rounded-md border border-border px-3 text-[13px]">
      {children}
    </Link>
  );
}
