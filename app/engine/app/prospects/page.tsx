import type { Metadata } from "next";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/engine/empty";
import { PageHeader } from "@/components/engine/page-header";
import { OutreachActions, ProspectForm, ProspectRowActions } from "@/components/engine/workspace-forms";
import { Badge } from "@/components/ui/badge";
import { requireEnginePage } from "@/lib/engine/session";
import { listOutreach, listProspects } from "@/lib/engine/repo/ops";

export const metadata: Metadata = { title: "Prospects" };

export default async function ProspectsPage() {
  const { accountId } = await requireEnginePage();
  const [prospects, drafts] = await Promise.all([listProspects(accountId), listOutreach(accountId)]);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Sales"
        title="Prospects"
        description="You enter contacts. The engine drafts email; you send it. Automated sending and scraping are not implemented."
      />
      <ProspectForm />
      {prospects.length === 0 ? (
        <EmptyState icon={Users} title="No prospects" body="Add a company you already know. Do not paste lists obtained from unauthorized sources." />
      ) : (
        <div className="space-y-3">
          {prospects.map((p) => (
            <article key={p.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-medium">{p.company}</h2>
                  <p className="text-sm text-muted-foreground">
                    {[p.contactName, p.role, p.email].filter(Boolean).join(" · ") || "No contact details"}
                  </p>
                  {p.notes ? <p className="mt-1 text-sm">{p.notes}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{p.stage}</Badge>
                  <ProspectRowActions id={p.id} stage={p.stage} />
                </div>
              </div>
              {drafts
                .filter((d) => d.prospectId === p.id)
                .map((d) => (
                  <div key={d.id} className="mt-3 rounded-lg bg-muted/40 p-3 text-sm">
                    <p className="font-medium">{d.subject}</p>
                    <pre className="mt-2 whitespace-pre-wrap text-xs">{d.body}</pre>
                    <OutreachActions id={d.id} status={d.status} />
                  </div>
                ))}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
