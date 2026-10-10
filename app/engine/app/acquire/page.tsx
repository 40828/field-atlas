import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { EmptyState } from "@/components/engine/empty";
import { PageHeader } from "@/components/engine/page-header";
import { BusinessForm } from "@/components/engine/workspace-forms";
import { formatUsd } from "@/lib/engine/ledger-math";
import { requireEnginePage } from "@/lib/engine/session";
import { listBusinesses } from "@/lib/engine/repo/catalog";

export const metadata: Metadata = { title: "Acquisitions" };

export default async function AcquirePage() {
  const { accountId } = await requireEnginePage();
  const rows = await listBusinesses(accountId);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Later stage"
        title="Business sale profiles"
        description="Prepare listings and notes. Asking prices are estimates. The engine never transfers equity, accounts, or money."
      />
      <BusinessForm />
      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No profiles"
          body="Use this when a venture has real books worth showing a buyer. Offers and due diligence stay manual."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((b) => (
            <article key={b.id} className="rounded-xl border border-border p-4">
              <h2 className="font-medium">{b.name}</h2>
              <p className="mt-1 text-sm">{b.summary || "No summary"}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Asking {b.askingCents ? formatUsd(b.askingCents) : "not set"} (estimate)
              </p>
              {b.assumptions ? <p className="mt-1 text-xs text-muted-foreground">Assumptions: {b.assumptions}</p> : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
