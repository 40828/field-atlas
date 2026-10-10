import type { Metadata } from "next";
import { MissionForm } from "@/components/engine/mission-form";
import { PageHeader } from "@/components/engine/page-header";

export const metadata: Metadata = { title: "New mission" };

export default function NewMissionPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        kicker="Create"
        title="New mission"
        description="Set a target and constraints, or leave them blank. Blank target uses the $1,000,000 aspirational default."
      />
      <MissionForm defaultObjective="Go make me money." />
    </div>
  );
}
