import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { ProposalWorkspace } from "@/components/solar/proposal/proposal-workspace";
import { proposalIdSchema } from "@/lib/solar/schemas";
import { getProposalDetail } from "@/lib/solar/server/db";
import { requirePageSession } from "@/lib/solar/server/session";

export const metadata: Metadata = { title: "Proposal" };

/**
 * `params` is request-time data under Cache Components, so it's awaited inside
 * a Suspense boundary: the shell below streams instantly while the proposal loads.
 */
export default function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <ProposalContent params={params} />
    </Suspense>
  );
}

async function ProposalContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsedId = proposalIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const { accountId } = await requirePageSession();
  const detail = await getProposalDetail(accountId, parsedId.data);
  if (!detail) notFound();

  return <ProposalWorkspace detail={detail} />;
}

function WorkspaceSkeleton() {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col" aria-hidden>
      <div className="flex flex-col gap-3 border-b border-border px-6 py-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-80 max-w-full" />
        <Skeleton className="h-4 w-[28rem] max-w-full" />
      </div>
      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[5fr_6fr]">
        <Skeleton className="min-h-[24rem] rounded-xl" />
        <Skeleton className="min-h-[24rem] rounded-xl" />
      </div>
    </div>
  );
}
