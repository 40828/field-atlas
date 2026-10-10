import type { Metadata } from "next";
import { Suspense, type CSSProperties } from "react";
import Link from "next/link";
import { FilePlus2, Gauge, Hourglass, Layers, Ruler, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/solar/metric-card";
import { ProposalsTable } from "@/components/solar/proposals-table";
import { formatInt } from "@/lib/solar/format";
import { getDashboardMetrics, listProposals } from "@/lib/solar/server/db";

export const metadata: Metadata = { title: "Overview" };

export default function DashboardPage() {
  return (
    <div className="relative">
      {/* Engineering-paper backdrop */}
      <div className="bg-blueprint pointer-events-none absolute inset-x-0 top-0 h-80" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="sp-fade-up">
            <p className="mb-2 inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-brand uppercase">
              <span className="relative flex size-2">
                <span className="sp-ping absolute inline-flex size-full rounded-full bg-primary/70" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              Live workspace
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Blueprint pipeline
            </h1>
            <p className="mt-2 max-w-xl text-pretty text-muted-foreground">
              Every roof plan you upload becomes an engineered proposal and a priced bill of
              materials. Track what&apos;s parsing, what&apos;s ready, and what&apos;s out for approval.
            </p>
          </div>
          <Button asChild size="lg" className="sp-fade-up shrink-0" style={{ "--sp-delay": "80ms" } as CSSProperties}>
            <Link href="/dashboard/upload">
              <FilePlus2 />
              Upload blueprint
            </Link>
          </Button>
        </header>

        <Suspense fallback={<MetricsSkeleton />}>
          <MetricsGrid />
        </Suspense>

        <Suspense fallback={<TableCardSkeleton />}>
          <RecentUploads />
        </Suspense>
      </div>
    </div>
  );
}

/* ───────────────────────────── Async sections ──────────────────────────── */

async function MetricsGrid() {
  const m = await getDashboardMetrics();
  return (
    <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        index={0}
        label="Active Proposals"
        value={formatInt(m.activeProposals)}
        icon={Layers}
        delta={m.trends.activeProposals}
        caption="vs. last 30 days"
        series={[4, 5, 5, 7, 6, 8, 9, 10]}
      />
      <MetricCard
        index={1}
        label="Total Square Feet Processed"
        value={formatInt(m.totalSquareFeet)}
        unit="sq ft"
        icon={Ruler}
        delta={m.trends.totalSquareFeet}
        caption="roof area analyzed"
        series={[2, 3, 3, 5, 6, 6, 8, 9]}
      />
      <MetricCard
        index={2}
        label="Pending Approvals"
        value={formatInt(m.pendingApprovals)}
        icon={Hourglass}
        delta={m.trends.pendingApprovals}
        lowerIsBetter
        caption="awaiting client sign-off"
        series={[6, 5, 7, 6, 4, 5, 3, 2]}
      />
      <MetricCard
        index={3}
        label="Win Rate"
        value={String(m.winRate)}
        unit="%"
        icon={Trophy}
        delta={m.trends.winRate}
        caption="closed-won vs. lost"
        series={[48, 52, 50, 55, 58, 57, 62, 64]}
      />
    </section>
  );
}

async function RecentUploads() {
  const proposals = await listProposals();
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b border-border px-5 py-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="size-4 text-brand" />
          Recent blueprint uploads
        </CardTitle>
        <CardDescription>
          Filter by processing status, building type or search across clients and addresses.
        </CardDescription>
        <CardAction>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/upload">
              <FilePlus2 /> New
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <ProposalsTable proposals={proposals} />
    </Card>
  );
}

/* ─────────────────────────────── Fallbacks ─────────────────────────────── */

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden>
      {Array.from({ length: 4 }, (_, i) => (
        <Card key={i} className="gap-4 p-5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-4 w-40" />
        </Card>
      ))}
    </div>
  );
}

function TableCardSkeleton() {
  return (
    <Card className="gap-0 overflow-hidden py-0" aria-hidden>
      <div className="flex flex-col gap-2 border-b border-border p-5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="flex flex-col gap-3 p-5">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </Card>
  );
}
