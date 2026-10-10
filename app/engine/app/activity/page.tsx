import type { Metadata } from "next";
import { Activity } from "lucide-react";
import { EmptyState } from "@/components/engine/empty";
import { PageHeader } from "@/components/engine/page-header";
import { EventBadge } from "@/components/engine/status-badge";
import { requireEnginePage } from "@/lib/engine/session";
import { listEvents, listMissions } from "@/lib/engine/repo/core";
import { relativeTime } from "@/lib/engine/labels";
import type { EngineEventStatus } from "@/lib/engine/types";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { accountId } = await requireEnginePage();
  const q = await searchParams;
  const missionId = typeof q.mission === "string" ? q.mission : undefined;
  const type = typeof q.type === "string" ? q.type : undefined;
  const status = typeof q.status === "string" ? (q.status as EngineEventStatus) : undefined;
  const [events, missions] = await Promise.all([
    listEvents(accountId, { missionId, type, status, limit: 80 }),
    listMissions(accountId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Live feed"
        title="Activity"
        description="Persistent records of what the engine actually did. Simulated events are never written here."
      />
      <form className="flex flex-wrap gap-2" action="/engine/app/activity">
        <select name="mission" defaultValue={missionId ?? ""} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="">All missions</option>
          {missions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
        <input name="type" defaultValue={type ?? ""} placeholder="Type prefix" className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
        <select name="status" defaultValue={status ?? ""} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="">All statuses</option>
          {["planned", "in_progress", "completed", "verified", "failed", "needs_approval"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="submit" className="h-10 rounded-lg border border-border px-3 text-sm">
          Filter
        </button>
      </form>
      {events.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No events yet"
          body="Events appear when research starts, sources are stored, strategies are ranked, or a task fails. The feed is never pre-filled."
        />
      ) : (
        <ol className="space-y-3">
          {events.map((e) => (
            <li key={e.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-medium">{e.title}</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <EventBadge status={e.status} />
                  {relativeTime(e.createdAt)}
                </div>
              </div>
              <p className="mt-2 text-sm">{e.what}</p>
              <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-foreground">Why</dt>
                  <dd>{e.why}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Expected</dt>
                  <dd>{e.expected}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Next</dt>
                  <dd>{e.next}</dd>
                </div>
                {e.evidence.length ? (
                  <div>
                    <dt className="font-medium text-foreground">Evidence</dt>
                    <dd>{e.evidence.join(" · ")}</dd>
                  </div>
                ) : null}
              </dl>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
