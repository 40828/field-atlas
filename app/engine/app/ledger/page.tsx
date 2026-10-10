import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { EmptyState } from "@/components/engine/empty";
import { PageHeader } from "@/components/engine/page-header";
import { LedgerForm } from "@/components/engine/workspace-forms";
import { Badge } from "@/components/ui/badge";
import { LEDGER_LABELS } from "@/lib/engine/labels";
import { formatUsd } from "@/lib/engine/ledger-math";
import { requireEnginePage } from "@/lib/engine/session";
import { listMissions } from "@/lib/engine/repo/core";
import { ledgerSummary, listLedger } from "@/lib/engine/repo/ledger";

export const metadata: Metadata = { title: "Ledger" };

export default async function LedgerPage() {
  const { accountId } = await requireEnginePage();
  const [entries, summary, missions] = await Promise.all([listLedger(accountId), ledgerSummary(accountId), listMissions(accountId)]);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Books"
        title="Financial ledger"
        description="Projected and invoiced amounts are not cash. Confirmed net profit uses only attested or Stripe-verified collections."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile k="Confirmed net profit" v={formatUsd(summary.confirmedNetProfit)} />
        <Tile k="Collected (all reported)" v={formatUsd(summary.collectedAll)} />
        <Tile k="Not yet cash" v={formatUsd(summary.notYetCash)} />
        <Tile k="Cash balance" v="Unknown" hint="No bank connection. We do not invent one." />
      </div>
      <LedgerForm missions={missions.map((m) => ({ id: m.id, title: m.title }))} />
      {entries.length === 0 ? (
        <EmptyState icon={Wallet} title="No entries" body="Add a real invoice, collection, refund or expense. Duplicate references are rejected." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Verification</th>
                <th className="px-3 py-2">Reference</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-3 py-2">{e.occurredAt.toISOString().slice(0, 10)}</td>
                  <td className="px-3 py-2">{LEDGER_LABELS[e.kind]}</td>
                  <td className="px-3 py-2">{formatUsd(e.amountCents)}</td>
                  <td className="px-3 py-2">
                    <Badge variant={e.verification === "provider_verified" ? "success" : e.verification === "user_attested" ? "info" : "outline"}>
                      {e.verification}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {e.source}:{e.sourceRef}
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

function Tile({ k, v, hint }: { k: string; v: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-xs text-muted-foreground">{k}</p>
      <p className="mt-1 text-xl font-semibold">{v}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
