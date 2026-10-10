import type { Metadata } from "next";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { CommandBox } from "@/components/engine/command-box";
import { EmptyState } from "@/components/engine/empty";
import { PageHeader } from "@/components/engine/page-header";
import { MissionBadge } from "@/components/engine/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { databaseConfigured, integrationStatuses } from "@/lib/engine/config";
import { getEngineEntitlement } from "@/lib/engine/entitlements";
import { formatUsd } from "@/lib/engine/ledger-math";
import { listMissions, listEvents } from "@/lib/engine/repo/core";
import { listApprovals } from "@/lib/engine/repo/ops";
import { ledgerSummary } from "@/lib/engine/repo/ledger";
import { requireEnginePage } from "@/lib/engine/session";
import { relativeTime } from "@/lib/engine/labels";

export const metadata: Metadata = { title: "Dashboard" };

export default async function EngineDashboardPage() {
  const { accountId } = await requireEnginePage();
  if (!databaseConfigured()) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="The database is not configured yet." />
        <EmptyState
          icon={Wallet}
          title="Connect Postgres"
          body="Set DATABASE_URL (Neon) and run npm run db:migrate. Until then, missions cannot be stored."
          action={
            <Button asChild>
              <Link href="/engine/app/setup">Open setup</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const [missions, events, entitlement, summary, approvals] = await Promise.all([
    listMissions(accountId),
    listEvents(accountId, { limit: 8 }),
    getEngineEntitlement(accountId),
    ledgerSummary(accountId),
    listApprovals(accountId, "pending"),
  ]);
  const missing = integrationStatuses().filter((s) => s.required && !s.configured);

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Command"
        title="Go make me money."
        description="Give an instruction. The engine will persist a mission, research public sources, and wait before it spends, publishes, or deploys."
      />
      {missing.length ? (
        <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          Required integrations are missing: {missing.map((m) => m.name).join(", ")}.{" "}
          <Link href="/engine/app/setup" className="underline">
            Configure them
          </Link>
          .
        </div>
      ) : null}
      {approvals.length ? (
        <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
          {approvals.length} action{approvals.length === 1 ? "" : "s"} waiting for your approval.{" "}
          <Link href="/engine/app/settings" className="underline">
            Review
          </Link>
        </div>
      ) : null}

      <CommandBox />

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Confirmed net profit" value={formatUsd(summary.confirmedNetProfit)} hint="Attested + Stripe-verified collections minus costs" />
        <Stat label="Not yet cash" value={formatUsd(summary.notYetCash)} hint="Forecasts and invoices" />
        <Stat
          label="AI tasks today"
          value={`${entitlement.aiTasksToday} / ${entitlement.aiTasksPerDay}`}
          hint={`${entitlement.planName} plan`}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Missions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {missions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No missions yet. Use the command box above.</p>
            ) : (
              missions.slice(0, 6).map((m) => (
                <Link key={m.id} href={`/engine/app/missions/${m.id}`} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 hover:bg-accent/40">
                  <div>
                    <p className="font-medium">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{relativeTime(m.createdAt)}</p>
                  </div>
                  <MissionBadge status={m.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing has happened yet. Events are stored only when the engine actually does work.</p>
            ) : (
              events.map((e) => (
                <div key={e.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">{e.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{e.what}</p>
                </div>
              ))
            )}
            <Button asChild variant="outline" size="sm">
              <Link href="/engine/app/activity">Open feed</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="pt-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
