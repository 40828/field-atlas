import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { EmptyState } from "@/components/engine/empty";
import { PageHeader } from "@/components/engine/page-header";
import { ActionButton } from "@/components/engine/action-form";
import { Badge } from "@/components/ui/badge";
import { markAssetAction } from "@/lib/engine/actions";
import { requireEnginePage } from "@/lib/engine/session";
import { listMarketingAssets } from "@/lib/engine/repo/ops";

export const metadata: Metadata = { title: "Marketing" };

export default async function MarketingPage() {
  const { accountId } = await requireEnginePage();
  const assets = await listMarketingAssets(accountId);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Distribution"
        title="Marketing"
        description="Drafts only. No social publishing integration is configured. Engagement numbers are entered by you from the real channel."
      />
      {assets.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No drafts yet"
          body="They are generated after you start an experiment and the specification task succeeds."
        />
      ) : (
        <div className="space-y-4">
          {assets.map((a) => (
            <article key={a.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-medium">{a.title}</h2>
                <Badge>{a.status}</Badge>
              </div>
              <pre className="mt-3 overflow-auto text-xs text-muted-foreground">{JSON.stringify(a.content, null, 2)}</pre>
              <div className="mt-3 flex flex-wrap gap-2">
                {a.status === "draft" ? (
                  <ActionButton label="Approve draft" size="sm" run={() => markAssetAction(a.id, "approved")} />
                ) : null}
                {a.status !== "published_manually" ? (
                  <ActionButton
                    label="I published this myself"
                    size="sm"
                    variant="outline"
                    run={() => markAssetAction(a.id, "published_manually")}
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
