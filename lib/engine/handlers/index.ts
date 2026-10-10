import type { TaskKind } from "../types";
import { handleExperimentSpec } from "./experiment";
import { handleFactoryBuild, handleFactoryDeploy } from "./factory";
import { handleMarketingGenerate } from "./marketing";
import { handleResearchGather, handleResearchPlan, handleResearchSynthesize } from "./research";
import { handleStrategyRank } from "./strategy";
import type { TaskHandler } from "./types";

export const HANDLERS: Record<TaskKind, TaskHandler> = {
  "research.plan": handleResearchPlan,
  "research.gather": handleResearchGather,
  "research.synthesize": handleResearchSynthesize,
  "strategy.rank": handleStrategyRank,
  "experiment.spec": handleExperimentSpec,
  "marketing.generate": handleMarketingGenerate,
  "factory.build": handleFactoryBuild,
  "factory.deploy": handleFactoryDeploy,
};

export type { HandlerCtx, HandlerResult, TaskHandler } from "./types";
