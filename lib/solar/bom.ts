import { BOM_CATEGORIES, type BomCategory, type BomLineItem, type BomSummary } from "./types";

/** Contingency applied on top of materials + labor (waste, field changes). */
export const CONTINGENCY_RATE = 0.06;

/** Round to cents without floating-point drift (e.g. 0.1 + 0.2). */
export const roundCents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const lineTotal = (item: Pick<BomLineItem, "quantity" | "unitCost">) =>
  roundCents(item.quantity * item.unitCost);

/**
 * Pure BOM roll-up used by the server (persisting value) and the client
 * (live-updating totals while the user edits line items).
 */
export function computeBomSummary(
  items: readonly BomLineItem[],
  contingencyRate: number = CONTINGENCY_RATE,
): BomSummary {
  const byCategory = BOM_CATEGORIES.map((category) => {
    const rows = items.filter((i) => i.category === category);
    return {
      category,
      lineCount: rows.length,
      quantity: rows.reduce((sum, r) => sum + r.quantity, 0),
      subtotal: roundCents(rows.reduce((sum, r) => sum + lineTotal(r), 0)),
    };
  });

  const pick = (c: BomCategory) => byCategory.find((b) => b.category === c)!;
  const laborSubtotal = pick("labor").subtotal;
  const materialsSubtotal = roundCents(
    byCategory.filter((b) => b.category !== "labor").reduce((s, b) => s + b.subtotal, 0),
  );
  const contingency = roundCents((materialsSubtotal + laborSubtotal) * contingencyRate);

  return {
    byCategory,
    materialsSubtotal,
    laborSubtotal,
    laborHours: pick("labor").quantity,
    contingencyRate,
    contingency,
    total: roundCents(materialsSubtotal + laborSubtotal + contingency),
  };
}

export function groupByCategory(items: readonly BomLineItem[]) {
  return BOM_CATEGORIES.map((category) => ({
    category,
    rows: items.filter((i) => i.category === category),
  }));
}
