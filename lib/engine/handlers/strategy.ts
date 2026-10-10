import { rankOpportunities } from "../scoring";
import { emitEvent } from "../repo/core";
import { listAbandonedTitles, listOpportunities, replaceStrategies } from "../repo/research";
import { PermanentError } from "../errors";
import { missionStillRunning } from "../repo/queue";
import { CancelledError } from "../errors";
import type { HandlerCtx, HandlerResult } from "./types";

export async function handleStrategyRank({ task, mission }: HandlerCtx): Promise<HandlerResult> {
  if (!(await missionStillRunning(mission.id))) throw new CancelledError();
  const opps = await listOpportunities(mission.accountId, mission.id);
  if (opps.length === 0) throw new PermanentError("No opportunities to rank. Research did not produce candidates.");

  const abandoned = await listAbandonedTitles(mission.accountId);
  const ranked = rankOpportunities(
    opps.map((o) => o.data),
    {
      riskTolerance: mission.riskTolerance,
      availableCapitalCents: Math.min(mission.startingCapitalCents, mission.maxSpendCents || mission.startingCapitalCents),
      zeroCapital: mission.zeroCapital,
      abandonedTitles: abandoned,
    },
  );

  const rows = await replaceStrategies(
    mission.accountId,
    mission.id,
    ranked.map((s, rank) => {
      const opp = opps[s.index];
      return {
        opportunityId: opp.id,
        kind: s.kind,
        rank: rank + 1,
        score: s.score,
        expectedValueCents: s.expectedValueCents,
        components: s.components,
        rationale: s.rationale,
        status: rank === 0 ? ("recommended" as const) : ("candidate" as const),
      };
    }),
  );

  const top = rows[0];
  const topOpp = opps.find((o) => o.id === top.opportunityId);

  await emitEvent({
    accountId: mission.accountId,
    missionId: mission.id,
    taskId: task.id,
    type: "strategy.selected",
    status: "completed",
    title: `Recommended: ${topOpp?.title ?? top.kind}`,
    what: `Ranked ${rows.length} strategies. Top score ${top.score.toFixed(3)}; expected value $${(top.expectedValueCents / 100).toFixed(0)} (model estimate, not a forecast of collected cash).`,
    why: "The scorer blends expected value with speed, capital efficiency, evidence quality and risk so a huge hypothetical upside cannot win on size alone.",
    expected: "You review the comparison and start a small validation experiment — or reject the recommendation.",
    evidence: [top.rationale],
    next: "Open Strategy comparison and start an experiment when you are ready. The engine will not start spending or building on its own.",
  });

  return {
    output: { strategyIds: rows.map((r) => r.id), recommendedId: top.id },
    verification: { passed: rows.length > 0, checks: [`${rows.length} strategies ranked`], failures: [] },
    nextAction: "Wait for you to start a validation experiment.",
  };
}
