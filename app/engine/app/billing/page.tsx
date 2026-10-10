import type { Metadata } from "next";
import { PageHeader } from "@/components/engine/page-header";
import { BillingButtons } from "@/components/engine/workspace-forms";
import { ENGINE_PLANS } from "@/lib/engine/entitlements";
import { getEngineEntitlement } from "@/lib/engine/entitlements";
import { stripeConfigured } from "@/lib/engine/config";
import { requireEnginePage } from "@/lib/engine/session";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const { accountId } = await requireEnginePage();
  const entitlement = await getEngineEntitlement(accountId);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Subscription"
        title="Billing"
        description="One platform subscription. Generated customer apps are not billed separately here. Stripe events are verified on the server."
      />
      <div className="rounded-xl border border-border p-4">
        <p className="text-sm text-muted-foreground">Current plan</p>
        <p className="text-2xl font-semibold">{entitlement.planName}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {entitlement.activeMissions}/{entitlement.activeMissionLimit} active missions · {entitlement.aiTasksToday}/
          {entitlement.aiTasksPerDay} AI tasks today
          {entitlement.status ? ` · Stripe ${entitlement.status}` : ""}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Object.values(ENGINE_PLANS).map((p) => (
          <div key={p.key} className="rounded-xl border border-border p-4">
            <h2 className="font-medium">{p.name}</h2>
            <p className="mt-1 text-2xl font-semibold">{p.monthlyPrice ? `$${p.monthlyPrice}/mo` : "Free"}</p>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              <li>{p.activeMissions} active missions</li>
              <li>{p.aiTasksPerDay} AI tasks / day</li>
            </ul>
          </div>
        ))}
      </div>
      {stripeConfigured() ? (
        <BillingButtons />
      ) : (
        <p className="text-sm text-muted-foreground">
          Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_ENGINE_WEBHOOK_SECRET, then run{" "}
          <code>npm run engine:stripe-setup</code>.
        </p>
      )}
    </div>
  );
}
