import { productSpecSchema } from "../types";
import { PermanentError } from "../errors";
import { CancelledError } from "../errors";
import { missionBrief, SPEC_SYSTEM } from "../prompts";
import { emitEvent } from "../repo/core";
import { getExperiment, getOpportunity, getStrategy, updateExperiment } from "../repo/research";
import { missionStillRunning } from "../repo/queue";
import type { HandlerCtx, HandlerResult } from "./types";

export async function handleExperimentSpec({ task, mission, ai, signal }: HandlerCtx): Promise<HandlerResult> {
  if (!(await missionStillRunning(mission.id))) throw new CancelledError();
  const experimentId = String(task.input.experimentId ?? "");
  const experiment = await getExperiment(mission.accountId, experimentId);
  if (!experiment) throw new PermanentError("Experiment not found for this specification task.");

  const strategy = experiment.strategyId ? await getStrategy(mission.accountId, experiment.strategyId) : null;
  const opportunity = strategy ? await getOpportunity(mission.accountId, strategy.opportunityId) : null;

  const spec = await ai.object({
    system: SPEC_SYSTEM,
    prompt: [
      missionBrief(mission),
      `Experiment: ${experiment.title}`,
      `Hypothesis: ${experiment.hypothesis}`,
      `Success criteria: ${experiment.successCriteria}`,
      opportunity ? `Opportunity: ${JSON.stringify(opportunity.data)}` : "",
      "Write the smallest specification that can test the hypothesis.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    schema: productSpecSchema,
    signal,
  });

  await updateExperiment(mission.accountId, experiment.id, { spec, status: "running", startedAt: new Date() });

  await emitEvent({
    accountId: mission.accountId,
    missionId: mission.id,
    taskId: task.id,
    type: "experiment.spec",
    status: "completed",
    title: `Specification: ${spec.name}`,
    what: spec.needsSoftware
      ? `Software prototype specified (${spec.coreFeatures.length} features). Not built yet.`
      : `Non-software validation: ${spec.nonSoftwarePlan}`,
    why: "A written spec is cheaper to review than generated code, and it records what 'done' means.",
    expected: "Marketing drafts next. A sandbox build only if you authorise it and the spec needs software.",
    evidence: spec.acceptanceTests,
    next: spec.needsSoftware
      ? "Review the spec in the software workspace. Building requires the sandbox permission and is not started automatically."
      : "Use the non-software plan. Do not start a code build for this experiment.",
  });

  return {
    output: { experimentId: experiment.id, specName: spec.name, needsSoftware: spec.needsSoftware },
    verification: {
      passed: spec.acceptanceTests.length >= 2,
      checks: ["spec stored on experiment", `${spec.acceptanceTests.length} acceptance tests`],
      failures: [],
    },
    nextAction: "Draft marketing assets.",
  };
}
