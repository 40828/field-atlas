import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProposalNotFound() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-primary/15 text-brand">
        <FileQuestion className="size-7" />
      </span>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Proposal not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          That proposal doesn&apos;t exist or you no longer have access to it.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
