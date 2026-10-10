import type { Metadata } from "next";
import { PageHeader } from "@/components/engine/page-header";
import { integrationStatuses } from "@/lib/engine/config";

export const metadata: Metadata = { title: "Setup" };

export default function SetupPage() {
  const items = integrationStatuses();
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Configuration"
        title="Setup"
        description="Names of environment variables only — values are never shown. Add them to .env.local and the Vercel project."
      />
      <ol className="space-y-4">
        {items.map((i, idx) => (
          <li key={i.id} className="rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Step {idx + 1}</p>
            <h2 className="font-medium">
              {i.name} {i.configured ? "· ready" : i.required ? "· required" : "· optional"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{i.what}</p>
            <p className="mt-2 text-sm">{i.howToConfigure}</p>
            {i.env.length ? <p className="mt-1 font-mono text-xs">{i.env.join(" · ")}</p> : null}
            <p className="mt-1 text-xs text-muted-foreground">{i.cost}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
