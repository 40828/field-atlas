import type { OpportunityData, StrategyKind } from "./types";

/**
 * Strategy ranking. Pure and deterministic so it can be tested and audited.
 *
 * Expected value (all in cents, over the opportunity's own horizon):
 *   E[revenue] = p · (0.85·base + 0.15·high) + (1 − p) · low
 *   EV         = E[revenue] − startupCost − opCostMonthly·horizonMonths
 * then discounted for time-to-first-revenue and for weak evidence. The ranking SCORE blends EV
 * with speed, capital efficiency, evidence quality, execution difficulty and legal risk, so a
 * huge hypothetical upside with a tiny probability or no evidence never wins on size alone.
 */

export interface ScoringContext {
  riskTolerance: "low" | "medium" | "high";
  /** Capital the user can put in right now (starting capital capped by authorised spend). */
  availableCapitalCents: number;
  zeroCapital: boolean;
  /** Titles of strategies already abandoned/failed for this account. */
  abandonedTitles?: string[];
}

export interface ScoredStrategy {
  index: number;
  kind: StrategyKind;
  expectedValueCents: number;
  expectedRevenueCents: number;
  totalCostCents: number;
  score: number;
  components: Record<string, number>;
  rationale: string;
  disqualified: string | null;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
}

export function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  return inter / (ta.size + tb.size - inter);
}

export function expectedValue(c: OpportunityData): { expectedRevenue: number; totalCost: number; ev: number } {
  const p = clamp(c.probability.value, 0, 1);
  const { lowCents, baseCents, highCents, horizonMonths } = c.revenue;
  const expectedRevenue = p * (0.85 * baseCents + 0.15 * Math.max(highCents, baseCents)) + (1 - p) * Math.min(lowCents, baseCents);
  const totalCost = c.startupCostCents + c.opCostMonthlyCents * horizonMonths + c.validationExperiment.costCents;
  return { expectedRevenue, totalCost, ev: expectedRevenue - totalCost };
}

/** Signed log scale: ±$100 ≈ ±0.33, ±$10k ≈ ±0.67, ±$1M ≈ ±1. */
function normalizeMoney(cents: number): number {
  const dollars = Math.abs(cents) / 100;
  const v = Math.log10(1 + dollars / 100) / 4;
  return clamp(Math.sign(cents) * v, -1, 1);
}

const LEGAL_PENALTY: Record<"low" | "medium" | "high", Record<ScoringContext["riskTolerance"], number>> = {
  low: { low: 1, medium: 1, high: 1 },
  medium: { low: 0.8, medium: 0.92, high: 1 },
  high: { low: 0.35, medium: 0.6, high: 0.8 },
};

export function scoreOpportunity(c: OpportunityData, ctx: ScoringContext, index: number): ScoredStrategy {
  const { expectedRevenue, totalCost, ev } = expectedValue(c);

  const timeFactor = 1 / (1 + c.daysToFirstSale / 120);
  const evidenceFactor = 0.5 + 0.5 * c.evidenceQuality;
  const adjustedEv = ev > 0 ? ev * timeFactor * evidenceFactor : ev;

  const upfront = c.startupCostCents + c.validationExperiment.costCents;
  const speed = clamp(1 - Math.log10(1 + c.daysToFirstSale) / Math.log10(731), 0, 1);
  const capitalEfficiency = upfront === 0 ? 1 : clamp(1 - Math.log10(1 + upfront / 100) / 5, 0, 1);
  const ease = 1 - ((c.complexity - 1) / 4) * 0.5 - ((c.acquisitionDifficulty - 1) / 4) * 0.3 - ((c.competition - 1) / 4) * 0.2;
  const legal = LEGAL_PENALTY[c.legalRisk][ctx.riskTolerance];

  const components = {
    expectedValue: normalizeMoney(adjustedEv),
    speed,
    capitalEfficiency,
    evidence: c.evidenceQuality,
    ease: clamp(ease, 0, 1),
    legal,
  };

  let score =
    (0.32 * ((components.expectedValue + 1) / 2) + 0.2 * speed + 0.14 * capitalEfficiency + 0.18 * c.evidenceQuality + 0.16 * components.ease) * legal;

  let disqualified: string | null = null;
  if (upfront > ctx.availableCapitalCents) {
    disqualified = `Needs ${(upfront / 100).toFixed(0)} USD upfront but only ${(ctx.availableCapitalCents / 100).toFixed(0)} USD is authorised.`;
    score *= 0.15;
  } else if (ctx.zeroCapital && upfront > 0) {
    score *= 0.7;
  }

  for (const title of ctx.abandonedTitles ?? []) {
    if (similarity(title, c.validationExperiment.title + " " + c.description) >= 0.5) {
      disqualified ??= `Similar to previously abandoned strategy “${title}” with no material change in assumptions.`;
      score *= 0.4;
      break;
    }
  }

  const rationale = [
    `Expected value ≈ $${Math.round(ev / 100).toLocaleString("en-US")} (probability ${(c.probability.value * 100).toFixed(0)}%, range ${(c.probability.low * 100).toFixed(0)}–${(c.probability.high * 100).toFixed(0)}%).`,
    `First revenue in ~${Math.round(c.daysToFirstSale)} days; upfront cost $${Math.round(upfront / 100)}.`,
    `${(c.evidenceQuality * 100).toFixed(0)}% of claims tie to retrieved sources (${c.observedClaims}/${c.totalClaims}).`,
    disqualified ? `Penalised: ${disqualified}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    index,
    kind: c.kind,
    expectedValueCents: Math.round(ev),
    expectedRevenueCents: Math.round(expectedRevenue),
    totalCostCents: Math.round(totalCost),
    score: Math.round(score * 10_000) / 10_000,
    components,
    rationale,
    disqualified,
  };
}

export function rankOpportunities(items: OpportunityData[], ctx: ScoringContext): ScoredStrategy[] {
  return items
    .map((o, i) => scoreOpportunity(o, ctx, i))
    .sort((a, b) => b.score - a.score || b.expectedValueCents - a.expectedValueCents);
}
