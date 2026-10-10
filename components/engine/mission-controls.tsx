"use client";

import {
  cancelMissionAction,
  completeMissionAction,
  pauseMissionAction,
  resumeMissionAction,
  runWorkerAction,
  startMissionAction,
} from "@/lib/engine/actions";
import type { MissionStatus } from "@/lib/engine/types";
import { ActionButton } from "./action-form";

export function MissionControls({ id, status }: { id: string; status: MissionStatus }) {
  return (
    <div className="flex flex-wrap gap-2">
      {status === "draft" || status === "failed" ? (
        <ActionButton label="Start" run={() => startMissionAction(id)} />
      ) : null}
      {status === "running" || status === "blocked" ? (
        <ActionButton label="Pause" variant="outline" run={() => pauseMissionAction(id)} />
      ) : null}
      {status === "paused" || status === "blocked" ? (
        <ActionButton label="Resume" run={() => resumeMissionAction(id)} />
      ) : null}
      {status === "running" ? (
        <ActionButton label="Run next task now" variant="secondary" run={() => runWorkerAction()} />
      ) : null}
      {status !== "cancelled" && status !== "completed" ? (
        <ActionButton
          label="Cancel mission"
          variant="destructive"
          confirm="Cancel this mission and its unfinished tasks?"
          run={() => cancelMissionAction(id)}
        />
      ) : null}
      {status === "running" || status === "paused" || status === "blocked" ? (
        <ActionButton
          label="Mark complete"
          variant="outline"
          confirm="Mark this mission complete? Unfinished tasks will stop."
          run={() => completeMissionAction(id)}
        />
      ) : null}
    </div>
  );
}
