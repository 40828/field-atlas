import type { EngineAI } from "../ai";
import type { MissionRow, TaskRow } from "../schema";

export interface HandlerResult {
  output: Record<string, unknown>;
  verification: { passed: boolean; checks: string[]; failures: string[] };
  nextAction?: string;
}

export interface HandlerCtx {
  task: TaskRow;
  mission: MissionRow;
  ai: EngineAI;
  signal: AbortSignal;
}

export type TaskHandler = (ctx: HandlerCtx) => Promise<HandlerResult>;
