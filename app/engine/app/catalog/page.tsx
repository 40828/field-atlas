import type { Metadata } from "next";
import Link from "next/link";
import { Package } from "lucide-react";
import { EmptyState } from "@/components/engine/empty";
import { PageHeader } from "@/components/engine/page-header";
import { ActionButton } from "@/components/engine/action-form";
import { Badge } from "@/components/ui/badge";
import { toggleFavoriteAction } from "@/lib/engine/actions";
import { requireEnginePage } from "@/lib/engine/session";
import { listProjects } from "@/lib/engine/repo/ops";
import { listCatalog, listFavorites } from "@/lib/engine/repo/catalog";

export const metadata: Metadata = { title: "Catalog" };

export default async function CatalogPage() {
  const { accountId } = await requireEnginePage();
  const [listed, mine, favs] = await Promise.all([listCatalog(accountId), listProjects(accountId), listFavorites(accountId)]);
  const favSet = new Set(favs.map((f) => f.projectId));

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Library"
        title="Application catalog"
        description="Your listed prototypes. A shared multi-tenant marketplace is not enabled — other customers cannot see your private projects."
      />
      {listed.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nothing listed"
          body="Generate a project in the software studio, then list it. Usage limits follow your platform plan."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {listed.map((p) => (
            <article key={p.id} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-medium">{p.name}</h2>
                <Badge>{p.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{p.spec.tagline}</p>
              <div className="mt-3 flex gap-2">
                <Link href={`/engine/app/studio/${p.id}`} className="text-sm underline">
                  Open
                </Link>
                <ActionButton
                  label={favSet.has(p.id) ? "Unsave" : "Save"}
                  size="sm"
                  variant="outline"
                  run={() => toggleFavoriteAction(p.id)}
                />
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">{mine.length} project(s) in your studio · {favs.length} saved</p>
    </div>
  );
}
