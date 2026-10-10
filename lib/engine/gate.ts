import type { PermissionScope } from "./types";

/**
 * Approval gate. Decides whether a task may start, using ONLY data the user controls
 * (permission grants, spending limit, approval rows created by user-session actions).
 * Task handlers never receive anything that could modify those, so an agent cannot raise its own
 * limits or bypass a gate.
 */

export interface GateInput {
  required: PermissionScope[];
  costCents: number;
  grantedScopes: PermissionScope[];
  spendLimitCents: number;
  /** Money already spent/committed against the limit (ledger expenses + approved pending costs). */
  spentCents: number;
  /** Scopes the user approved specifically for this task. */
  approvedForTask: PermissionScope[];
  missionMaxSpendCents: number;
}

export type GateDecision =
  | { allowed: true }
  | { allowed: false; kind: "needs_approval"; scope: PermissionScope; reason: string }
  | { allowed: false; kind: "denied"; reason: string };

/** Scopes that need an explicit per-task approval even when the scope is granted. */
export const ALWAYS_ASK: PermissionScope[] = ["deploy", "publish", "outreach", "spend"];

export function evaluateGate(g: GateInput): GateDecision {
  const needed = new Set(g.required);
  if (g.costCents > 0) needed.add("spend");

  for (const scope of needed) {
    if (!g.grantedScopes.includes(scope)) {
      return { allowed: false, kind: "needs_approval", scope, reason: `The “${scope}” permission has not been enabled for this account.` };
    }
  }

  if (g.costCents > 0) {
    if (g.spentCents + g.costCents > g.spendLimitCents) {
      return { allowed: false, kind: "denied", reason: `This would exceed your spending limit ($${(g.spendLimitCents / 100).toFixed(2)}).` };
    }
    if (g.costCents > g.missionMaxSpendCents) {
      return { allowed: false, kind: "denied", reason: `This exceeds the mission's maximum authorised spend ($${(g.missionMaxSpendCents / 100).toFixed(2)}).` };
    }
  }

  for (const scope of needed) {
    if (ALWAYS_ASK.includes(scope) && !g.approvedForTask.includes(scope)) {
      return { allowed: false, kind: "needs_approval", scope, reason: `The “${scope}” action needs your approval each time.` };
    }
  }

  return { allowed: true };
}

/** Exponential backoff with a cap: 15s, 30s, 1m, 2m, … max 15m. */
export function backoffMs(retryCount: number): number {
  return Math.min(15 * 60_000, 15_000 * 2 ** Math.max(0, retryCount));
}
