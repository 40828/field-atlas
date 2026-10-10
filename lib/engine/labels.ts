import type { EngineEventStatus, LedgerKind, MissionStatus, StrategyKind, TaskStatus } from "./types";
import { STRATEGY_LABELS } from "./types";

export { STRATEGY_LABELS };

export const MISSION_LABELS: Record<MissionStatus, string> = {
  draft: "Draft",
  running: "Running",
  paused: "Paused",
  blocked: "Blocked",
  completed: "Completed",
  cancelled: "Cancelled",
  failed: "Failed",
};

export const TASK_LABELS: Record<TaskStatus, string> = {
  pending: "Queued",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
  cancelled: "Cancelled",
  awaiting_approval: "Needs approval",
  blocked: "Blocked",
};

export const EVENT_LABELS: Record<EngineEventStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
  verified: "Verified",
  failed: "Failed",
  needs_approval: "Needs you",
  simulated: "Simulated",
};

export const LEDGER_LABELS: Record<LedgerKind, string> = {
  revenue_projected: "Projected revenue",
  revenue_invoiced: "Invoiced",
  revenue_collected: "Collected",
  refund: "Refund",
  expense: "Expense",
  processing_fee: "Processing fee",
  tax_estimate: "Estimated tax",
};

export function strategyLabel(kind: StrategyKind): string {
  return STRATEGY_LABELS[kind];
}

export function relativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60_000);
  if (Math.abs(min) < 1) return "just now";
  if (Math.abs(min) < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (Math.abs(hr) < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}
