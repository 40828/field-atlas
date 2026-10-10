import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";
import { EmptyState } from "@/components/engine/empty";
import { PageHeader } from "@/components/engine/page-header";
import { MissionBadge } from "@/components/engine/status-badge";
import { formatUsd } from "@/lib/engine/ledger-math";
import { relativeTime } from "@/lib/engine/labels";
import { requireEnginePage } from "@/lib/engine/session";
import { listMissions } from "@/lib/engine/repo/core";

export const metadata: Metadata = { title: "History" };

export default async function HistoryPage() {
  const { accountId } = await requireEnginePage();
  const missions = await listMissions(accountId);

  return (
    <div className="space-y-6">
      <PageHeader kicker="Archive" title="Mission history" description="Every mission you created, including cancelled and completed ones." />
      {missions.length === 0 ? (
        <EmptyState icon={History} title="No missions" body="History is empty until you create one from the dashboard." />
      ) : (
        <div className="space-y-2">
          {missions.map((m) => (
            <Link key={m.id} href={`/engine/app/missions/${m.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border p-4 hover:bg-accent/40">
              <div>
                <p className="font-medium">{m.title}</p>
                <p className="text-xs text-muted-foreground">
                  {relativeTime(m.createdAt)} · target {formatUsd(m.targetCents)}
                </p>
              </div>
              <MissionBadge status={m.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
