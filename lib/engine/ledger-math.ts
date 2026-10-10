import type { LedgerKind, LedgerVerification } from "./types";

export interface LedgerLike {
  kind: LedgerKind;
  amountCents: number;
  verification: LedgerVerification;
}

export interface LedgerSummary {
  projected: number;
  invoiced: number;
  /** All collected revenue regardless of how it was confirmed. */
  collectedAll: number;
  collectedUnverified: number;
  collectedAttested: number;
  collectedProviderVerified: number;
  refunds: number;
  expenses: number;
  fees: number;
  taxEstimate: number;
  /** Net profit counting ONLY confirmed (attested or provider-verified) revenue. */
  confirmedNetProfit: number;
  /** Net profit if every self-reported collected entry were true. Shown only as a comparison. */
  reportedNetProfit: number;
  /** Money in the engine's books that is not cash: forecasts and invoices. */
  notYetCash: number;
  /** `null` — the engine has no reliable bank data, so it never invents a balance. */
  cashBalance: null;
}

/**
 * Net profit = confirmed collected revenue − refunds − operating expenses − processing fees − estimated taxes.
 * Projected revenue and invoices are never counted: an invoice or forecast is not cash.
 * Costs always count in full (conservative) regardless of their verification state.
 */
export function summarizeLedger(entries: LedgerLike[]): LedgerSummary {
  const sum = (pred: (e: LedgerLike) => boolean) => entries.filter(pred).reduce((a, e) => a + e.amountCents, 0);
  const collected = (v?: LedgerVerification) => sum((e) => e.kind === "revenue_collected" && (v ? e.verification === v : true));

  const collectedAll = collected();
  const collectedUnverified = collected("unverified");
  const collectedAttested = collected("user_attested");
  const collectedProviderVerified = collected("provider_verified");
  const refunds = sum((e) => e.kind === "refund");
  const expenses = sum((e) => e.kind === "expense");
  const fees = sum((e) => e.kind === "processing_fee");
  const taxEstimate = sum((e) => e.kind === "tax_estimate");
  const costs = refunds + expenses + fees + taxEstimate;
  const projected = sum((e) => e.kind === "revenue_projected");
  const invoiced = sum((e) => e.kind === "revenue_invoiced");

  return {
    projected,
    invoiced,
    collectedAll,
    collectedUnverified,
    collectedAttested,
    collectedProviderVerified,
    refunds,
    expenses,
    fees,
    taxEstimate,
    confirmedNetProfit: collectedAttested + collectedProviderVerified - costs,
    reportedNetProfit: collectedAll - costs,
    notYetCash: projected + invoiced,
    cashBalance: null,
  };
}

export function formatUsd(cents: number, opts: { sign?: boolean } = {}): string {
  const abs = Math.abs(cents) / 100;
  const body = abs.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: abs >= 1000 ? 0 : 2 });
  if (cents < 0) return `-${body}`;
  return opts.sign && cents > 0 ? `+${body}` : body;
}
