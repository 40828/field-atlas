import { marketingSchema } from "../types";
import { PermanentError } from "../errors";
import { CancelledError } from "../errors";
import { MARKETING_SYSTEM } from "../prompts";
import { emitEvent } from "../repo/core";
import { insertMarketingAsset } from "../repo/ops";
import { getExperiment } from "../repo/research";
import { missionStillRunning } from "../repo/queue";
import type { HandlerCtx, HandlerResult } from "./types";

export async function handleMarketingGenerate({ task, mission, ai, signal }: HandlerCtx): Promise<HandlerResult> {
  if (!(await missionStillRunning(mission.id))) throw new CancelledError();
  const experimentId = String(task.input.experimentId ?? "");
  const experiment = await getExperiment(mission.accountId, experimentId);
  if (!experiment?.spec) throw new PermanentError("No specification is stored for this experiment yet.");

  const draft = await ai.object({
    system: MARKETING_SYSTEM,
    prompt: `Specification:\n${JSON.stringify(experiment.spec)}\n\nWrite honest drafts. Nothing will be published automatically.`,
    schema: marketingSchema,
    signal,
  });

  await insertMarketingAsset({
    accountId: mission.accountId,
    missionId: mission.id,
    kind: "positioning",
    title: `Positioning — ${experiment.spec.name}`,
    content: draft.positioning,
    status: "draft",
  });
  await insertMarketingAsset({
    accountId: mission.accountId,
    missionId: mission.id,
    kind: "landing_copy",
    title: `Landing copy — ${experiment.spec.name}`,
    content: draft.landingCopy,
    status: "draft",
  });
  await insertMarketingAsset({
    accountId: mission.accountId,
    missionId: mission.id,
    kind: "social_posts",
    title: `Social drafts — ${experiment.spec.name}`,
    content: { posts: draft.socialPosts },
    status: "draft",
  });
  await insertMarketingAsset({
    accountId: mission.accountId,
    missionId: mission.id,
    kind: "content_calendar",
    title: `Content calendar — ${experiment.spec.name}`,
    content: { days: draft.contentCalendar },
    status: "draft",
  });

  await emitEvent({
    accountId: mission.accountId,
    missionId: mission.id,
    taskId: task.id,
    type: "marketing.drafted",
    status: "completed",
    title: "Marketing drafts ready",
    what: "Stored positioning, landing copy, social posts and a  content calendar as drafts.",
    why: "Copy is cheaper to review than publishing. No channel integration is configured.",
    expected: "You edit and publish manually if you choose to.",
    evidence: [draft.landingCopy.headline],
    next: "Open the marketing workspace. Publishing is not available until you connect a channel (not built).",
  });

  return {
    output: { experimentId, headline: draft.landingCopy.headline },
    verification: { passed: true, checks: ["4 draft assets stored"], failures: [] },
    nextAction: "Review drafts in the marketing workspace.",
  };
}
