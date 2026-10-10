import type { Claim, OpportunityCandidate, OpportunityData } from "./types";

/**
 * Server-side claim hygiene. The model may label a claim "observed"; we only keep that
 * label when every cited id exists in the retrieved evidence set. Otherwise the claim is
 * downgraded to an assumption. Evidence quality is computed here, never by the model.
 */
export function bindOpportunity(candidate: OpportunityCandidate, validIds: Set<string>, limitations: string): OpportunityData {
  let observedClaims = 0;
  let totalClaims = 0;
  let downgradedClaims = 0;

  const bindClaim = (c: Claim): Claim => {
    totalClaims += 1;
    const ids = c.evidenceIds.filter((id) => validIds.has(id));
    if (c.basis === "observed") {
      if (ids.length === 0) {
        downgradedClaims += 1;
        return { ...c, basis: "assumption", evidenceIds: [] };
      }
      observedClaims += 1;
      return { ...c, evidenceIds: ids };
    }
    return { ...c, evidenceIds: ids };
  };

  const pricingIds = candidate.pricing.evidenceIds.filter((id) => validIds.has(id));
  totalClaims += 1;
  let pricing = { ...candidate.pricing, evidenceIds: pricingIds };
  if (pricing.basis === "observed") {
    if (pricingIds.length === 0) {
      downgradedClaims += 1;
      pricing = { ...pricing, basis: "assumption" };
    } else {
      observedClaims += 1;
    }
  }

  return {
    ...candidate,
    demand: candidate.demand.map(bindClaim),
    competitors: candidate.competitors.map(bindClaim),
    pricing,
    evidenceQuality: totalClaims === 0 ? 0 : observedClaims / totalClaims,
    observedClaims,
    totalClaims,
    downgradedClaims,
    limitations,
  };
}
