import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MissionControls } from "@/components/engine/mission-controls";
import { PageHeader } from "@/components/engine/page-header";
import { EventBadge, MissionBadge, TaskBadge } from "@/components/engine/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUsd } from "@/lib/engine/ledger-math";
import { requireEnginePage } from "@/lib/engine/session";
import { getMission, listEvents } from "@/lib/engine/repo/core";
import { listTasks } from "@/lib/engine/repo/queue";
import { listOpportunities, listStrategies, listExperiments } from "@/lib/engine/repo/research";
import { listApprovals } from "@/lib/engine/repo/ops";
import { ActionButton } from "@/components/engine/action-form";
import { decideApprovalAction, retryTaskAction } from "@/lib/engine/actions";

export const metadata: Metadata = { title: "Mission" };

export default async function MissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { accountId } = await requireEnginePage();
  const { id } = await params;
  const mission = await getMission(accountId, id);
  if (!mission) notFound();

  const [events, tasks, opps, strategies, experiments, approvals] = await Promise.all([
    listEvents(accountId, { missionId: id, limit: 30 }),
    listTasks(accountId, id),
    listOpportunities(accountId, id),
    listStrategies(accountId, id),
    listExperiments(accountId, id),
    listApprovals(accountId, "pending"),
  ]);
  const mine = approvals.filter((a) => a.missionId === id);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Mission"
        title={mission.title}
        description={mission.objective}
        actions={<MissionControls id={mission.id} status={mission.status} />}
      />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <MissionBadge status={mission.status} />
        <span>Target {formatUsd(mission.targetCents)} (objective, not a promise)</span>
        {mission.zeroCapital ? <span>Zero-capital mode</span> : null}
        {mission.blockedReason ? <span className="text-destructive">{mission.blockedReason}</span> : null}
      </div>

      {mine.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Approvals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mine.map((a) => (
              <div key={a.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-sm text-muted-foreground">{a.detail}</p>
                </div>
                <div className="flex gap-2">
                  <ActionButton label="Approve" size="sm" run={() => decideApprovalAction(a.id, "approved")} />
                  <ActionButton label="Deny" size="sm" variant="destructive" run={() => decideApprovalAction(a.id, "denied")} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Link className="rounded-xl border border-border p-4 hover:bg-accent/40" href="/engine/app/opportunities">
          <p className="text-2xl font-semibold">{opps.length}</p>
          <p className="text-sm text-muted-foreground">Opportunities</p>
        </Link>
        <Link className="rounded-xl border border-border p-4 hover:bg-accent/40" href="/engine/app/strategies">
          <p className="text-2xl font-semibold">{strategies.length}</p>
          <p className="text-sm text-muted-foreground">Strategies</p>
        </Link>
        <Link className="rounded-xl border border-border p-4 hover:bg-accent/40" href="/engine/app/experiments">
          <p className="text-2xl font-semibold">{experiments.length}</p>
          <p className="text-sm text-muted-foreground">Experiments</p>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks yet. Start the mission to enqueue research.</p>
          ) : (
            tasks.map((t) => (
              <div key={t.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.kind} · retries {t.retryCount}/{t.maxRetries}
                    {t.error ? ` · ${t.error}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <TaskBadge status={t.status} />
                  {t.status === "failed" || t.status === "blocked" ? (
                    <ActionButton label="Retry" size="sm" variant="outline" run={() => retryTaskAction(t.id)} />
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {events.map((e) => (
            <article key={e.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium">{e.title}</h3>
                <EventBadge status={e.status} />
              </div>
              <p className="mt-2 text-sm">{e.what}</p>
              <p className="mt-1 text-xs text-muted-foreground">Why: {e.why}</p>
              <p className="text-xs text-muted-foreground">Next: {e.next}</p>
            </article>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
