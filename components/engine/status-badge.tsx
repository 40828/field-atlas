import { Badge, type BadgeProps } from "@/components/ui/badge";
import { EVENT_LABELS, MISSION_LABELS, TASK_LABELS } from "@/lib/engine/labels";
import type { EngineEventStatus, MissionStatus, TaskStatus } from "@/lib/engine/types";

const MISSION_VARIANT: Record<MissionStatus, BadgeProps["variant"]> = {
  draft: "secondary",
  running: "success",
  paused: "warning",
  blocked: "destructive",
  completed: "info",
  cancelled: "outline",
  failed: "destructive",
};

const TASK_VARIANT: Record<TaskStatus, BadgeProps["variant"]> = {
  pending: "secondary",
  running: "info",
  succeeded: "success",
  failed: "destructive",
  cancelled: "outline",
  awaiting_approval: "warning",
  blocked: "destructive",
};

const EVENT_VARIANT: Record<EngineEventStatus, BadgeProps["variant"]> = {
  planned: "secondary",
  in_progress: "info",
  completed: "default",
  verified: "success",
  failed: "destructive",
  needs_approval: "warning",
  simulated: "outline",
};

export function MissionBadge({ status }: { status: MissionStatus }) {
  return <Badge variant={MISSION_VARIANT[status]}>{MISSION_LABELS[status]}</Badge>;
}

export function TaskBadge({ status }: { status: TaskStatus }) {
  return <Badge variant={TASK_VARIANT[status]}>{TASK_LABELS[status]}</Badge>;
}

export function EventBadge({ status }: { status: EngineEventStatus }) {
  return <Badge variant={EVENT_VARIANT[status]}>{EVENT_LABELS[status]}</Badge>;
}
