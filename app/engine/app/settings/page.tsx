import type { Metadata } from "next";
import { Suspense } from "react";
import { UserProfile } from "@clerk/nextjs";
import { PageHeader } from "@/components/engine/page-header";
import { ActionButton } from "@/components/engine/action-form";
import { PermissionsForm } from "@/components/engine/workspace-forms";
import { decideApprovalAction } from "@/lib/engine/actions";
import { integrationStatuses } from "@/lib/engine/config";
import { requireEnginePage } from "@/lib/engine/session";
import { getPermissions, listAudit } from "@/lib/engine/repo/core";
import { listApprovals } from "@/lib/engine/repo/ops";

export const metadata: Metadata = { title: "Integrations" };

export default async function SettingsPage() {
  const { accountId } = await requireEnginePage();
  const [perms, approvals, audit] = await Promise.all([
    getPermissions(accountId),
    listApprovals(accountId, "pending"),
    listAudit(accountId, 20),
  ]);
  const integrations = integrationStatuses();

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Control"
        title="Integrations and permissions"
        description="Agents cannot change these settings. Research is always allowed; everything else is opt-in."
      />

      {approvals.length ? (
        <section className="space-y-3">
          <h2 className="font-medium">Pending approvals</h2>
          {approvals.map((a) => (
            <div key={a.id} className="flex flex-col gap-2 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
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
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-medium">Permissions</h2>
        <PermissionsForm scopes={perms.scopes} spendLimitCents={perms.spendLimitCents} zeroCapitalMode={perms.zeroCapitalMode} />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Integrations</h2>
        <div className="grid gap-3">
          {integrations.map((i) => (
            <div key={i.id} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium">{i.name}</h3>
                <span className={i.configured ? "text-sm text-success" : "text-sm text-muted-foreground"}>
                  {i.configured ? "Configured" : i.required ? "Required — missing" : "Not configured"}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{i.what}</p>
              <p className="mt-2 text-xs">Env: {i.env.length ? i.env.join(", ") : "none"}</p>
              <p className="text-xs text-muted-foreground">{i.howToConfigure} · {i.cost}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Account</h2>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
          <UserProfile />
        </Suspense>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Recent audit log</h2>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {audit.map((a) => (
            <li key={a.id}>
              {a.createdAt.toISOString()} · {a.action} · {a.target ?? "—"}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
