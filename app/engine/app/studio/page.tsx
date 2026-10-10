import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/engine/empty";
import { PageHeader } from "@/components/engine/page-header";
import { Badge } from "@/components/ui/badge";
import { requireEnginePage } from "@/lib/engine/session";
import { listProjects } from "@/lib/engine/repo/ops";

export const metadata: Metadata = { title: "Software studio" };

export default async function StudioPage() {
  const { accountId } = await requireEnginePage();
  const projects = await listProjects(accountId);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Factory"
        title="Software studio"
        description="Generated projects live here, isolated from this application. Code is never executed on the main server. Checks run only inside a configured Vercel Sandbox."
      />
      {projects.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No generated projects"
          body="Start an experiment whose specification needs software, then queue a sandbox build. If Sandbox is not configured, files can still be stored as a draft."
        />
      ) : (
        <div className="grid gap-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/engine/app/studio/${p.id}`} className="rounded-xl border border-border bg-card p-4 hover:bg-accent/40">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-medium">{p.name}</h2>
                <Badge>{p.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{p.spec.tagline}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {Object.keys(p.files).length} files
                {p.deploymentUrl ? ` · ${p.deploymentUrl}` : ""}
                {p.error ? ` · ${p.error}` : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
