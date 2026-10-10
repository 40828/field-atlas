import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/engine/page-header";
import { ActionButton } from "@/components/engine/action-form";
import { Badge } from "@/components/ui/badge";
import { publishProjectAction, startFactoryDeployAction } from "@/lib/engine/actions";
import { requireEnginePage } from "@/lib/engine/session";
import { getProject } from "@/lib/engine/repo/ops";

export const metadata: Metadata = { title: "Project" };

export default async function StudioProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { accountId } = await requireEnginePage();
  const { id } = await params;
  const project = await getProject(accountId, id);
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Project"
        title={project.name}
        description={project.spec.tagline}
        actions={
          <div className="flex flex-wrap gap-2">
            {project.missionId ? (
              <ActionButton
                label="Queue deploy"
                run={() => startFactoryDeployAction({ missionId: project.missionId!, projectId: project.id })}
              />
            ) : null}
            <ActionButton
              label={project.listedInCatalog ? "Unlist from catalog" : "List in my catalog"}
              variant="outline"
              run={() => publishProjectAction(project.id, !project.listedInCatalog)}
            />
          </div>
        }
      />
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge>{project.status}</Badge>
        {project.previewUrl ? (
          <a className="underline" href={project.previewUrl} target="_blank" rel="noreferrer">
            Preview
          </a>
        ) : null}
        {project.deploymentUrl ? (
          <a className="underline" href={project.deploymentUrl} target="_blank" rel="noreferrer">
            Deployment
          </a>
        ) : (
          <span className="text-muted-foreground">No verified deployment URL</span>
        )}
      </div>
      {project.error ? <p className="text-sm text-destructive">{project.error}</p> : null}
      <section>
        <h2 className="font-medium">Checks</h2>
        {project.checks.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No sandbox checks have run.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {project.checks.map((c) => (
              <li key={c.name} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">
                  {c.name} — {c.passed ? "passed" : "failed"} (exit {c.exitCode ?? "n/a"})
                </p>
                <pre className="mt-2 max-h-40 overflow-auto text-xs text-muted-foreground">{c.output || c.command}</pre>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="font-medium">Files</h2>
        <ul className="mt-2 space-y-2">
          {Object.entries(project.files).map(([path, content]) => (
            <li key={path} className="rounded-lg border border-border">
              <p className="border-b border-border px-3 py-2 font-mono text-xs">{path}</p>
              <pre className="max-h-64 overflow-auto p-3 text-xs">{content}</pre>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
