import { enqueueTask } from "./repo/queue";

export async function enqueueResearchPipeline(accountId: string, missionId: string): Promise<void> {
  const plan = await enqueueTask({
    accountId,
    missionId,
    kind: "research.plan",
    title: "Plan research themes",
    objective: "Propose search themes that could surface real demand signals.",
    requiredPermissions: ["research"],
    resourceEstimate: { aiCalls: 1, costCents: 0, seconds: 40 },
    idempotencyKey: "research.plan",
    nextAction: "Search public sources for each theme.",
  });

  const gather = await enqueueTask({
    accountId,
    missionId,
    kind: "research.gather",
    title: "Gather public sources",
    objective: "Retrieve real search results. Do not invent sources.",
    dependsOn: [plan.id],
    requiredPermissions: ["research"],
    resourceEstimate: { aiCalls: 0, costCents: 0, seconds: 45 },
    idempotencyKey: "research.gather",
    timeoutMs: 180_000,
    nextAction: "Synthesize candidate opportunities from retrieved sources.",
  });

  const synth = await enqueueTask({
    accountId,
    missionId,
    kind: "research.synthesize",
    title: "Synthesize opportunities",
    objective: "Turn retrieved sources into structured candidates with uncertainty.",
    dependsOn: [gather.id],
    requiredPermissions: ["research"],
    resourceEstimate: { aiCalls: 1, costCents: 0, seconds: 90 },
    idempotencyKey: "research.synthesize",
    timeoutMs: 180_000,
    nextAction: "Rank strategies using the deterministic scorer.",
  });

  await enqueueTask({
    accountId,
    missionId,
    kind: "strategy.rank",
    title: "Rank strategies",
    objective: "Score candidates on expected value, speed, capital, evidence and risk.",
    dependsOn: [synth.id],
    requiredPermissions: ["research"],
    resourceEstimate: { aiCalls: 0, costCents: 0, seconds: 10 },
    idempotencyKey: "strategy.rank",
    nextAction: "Wait for you to start a validation experiment.",
  });
}

export async function enqueueExperimentPipeline(accountId: string, missionId: string, experimentId: string): Promise<void> {
  const spec = await enqueueTask({
    accountId,
    missionId,
    kind: "experiment.spec",
    title: "Write experiment specification",
    objective: "Turn the selected strategy into a concrete, testable offer or product spec.",
    requiredPermissions: ["research"],
    resourceEstimate: { aiCalls: 1, costCents: 0, seconds: 60 },
    input: { experimentId },
    idempotencyKey: `experiment.spec:${experimentId}`,
    nextAction: "Draft marketing assets for the specification.",
  });

  await enqueueTask({
    accountId,
    missionId,
    kind: "marketing.generate",
    title: "Draft marketing assets",
    objective: "Produce positioning, landing copy and social drafts. Nothing is published.",
    dependsOn: [spec.id],
    requiredPermissions: ["research"],
    resourceEstimate: { aiCalls: 1, costCents: 0, seconds: 50 },
    input: { experimentId },
    idempotencyKey: `marketing.generate:${experimentId}`,
    nextAction: "Review drafts. Start a software build only if the spec requires it and sandbox permission is granted.",
  });
}
