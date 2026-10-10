"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { groupByCategory, lineTotal } from "@/lib/solar/bom";
import { formatCurrency, formatNumber } from "@/lib/solar/format";
import { BOM_CATEGORY_LABELS } from "@/lib/solar/options";
import type { BomCategory, BomLineItem, BomSummary } from "@/lib/solar/types";

export type BomFieldErrors = Record<string, Partial<Record<keyof BomLineItem, string>>>;

interface BomTableProps {
  items: BomLineItem[];
  summary: BomSummary;
  editing: boolean;
  errors: BomFieldErrors;
  onChange: (id: string, patch: Partial<BomLineItem>) => void;
  onAdd: (category: BomCategory) => void;
  onRemove: (id: string) => void;
}

/** Columns in tab order. `key` doubles as the data-attribute used for arrow-key navigation. */
const COLUMNS = [
  { key: "sku", letter: "A", label: "SKU", align: "left" },
  { key: "description", letter: "B", label: "Description", align: "left" },
  { key: "unit", letter: "C", label: "Unit", align: "center" },
  { key: "quantity", letter: "D", label: "Qty", align: "right" },
  { key: "unitCost", letter: "E", label: "Unit Cost", align: "right" },
] as const;

const cellBase =
  "border border-border p-0 align-middle focus-within:relative focus-within:z-10 focus-within:ring-2 focus-within:ring-primary focus-within:ring-inset";

const inputBase =
  "block h-9 w-full bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground/50 aria-invalid:bg-destructive/10";

/** Move focus to the same column in the row above/below (Excel-like). */
function navigate(e: KeyboardEvent<HTMLInputElement>) {
  const dir = e.key === "ArrowDown" || (e.key === "Enter" && !e.shiftKey) ? 1 : e.key === "ArrowUp" || (e.key === "Enter" && e.shiftKey) ? -1 : 0;
  if (!dir) return;
  const col = e.currentTarget.dataset.col;
  const table = e.currentTarget.closest("table");
  if (!col || !table) return;
  const cells = [...table.querySelectorAll<HTMLInputElement>(`input[data-col="${col}"]`)];
  const next = cells[cells.indexOf(e.currentTarget) + dir];
  if (next) {
    e.preventDefault();
    next.focus();
    next.select();
  }
}

/** Numeric input that keeps its raw text while typing ("12." stays "12.") and commits valid numbers live. */
function NumberCell({
  value,
  onCommit,
  col,
  label,
  invalid,
  step = 1,
}: {
  value: number;
  onCommit: (n: number) => void;
  col: string;
  label: string;
  invalid?: string;
  step?: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      data-col={col}
      inputMode="decimal"
      aria-label={label}
      aria-invalid={!!invalid}
      title={invalid}
      value={draft ?? String(value)}
      step={step}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        const n = Number(raw);
        if (raw.trim() !== "" && Number.isFinite(n) && n >= 0) onCommit(n);
      }}
      onBlur={() => setDraft(null)}
      onKeyDown={navigate}
      className={cn(inputBase, "num text-right")}
    />
  );
}

export function BomTable({ items, summary, editing, errors, onChange, onAdd, onRemove }: BomTableProps) {
  const groups = groupByCategory(items);
  const colCount = COLUMNS.length + 2 + (editing ? 1 : 0); // row# + columns + total (+ delete)
  /** Columns left of "Line Total" (row # + data columns) — used to right-align summary rows. */
  const labelSpan = COLUMNS.length + 1;
  // Sequential spreadsheet-style row numbers across all categories.
  const rowNumbers = new Map(groups.flatMap((g) => g.rows).map((r, i) => [r.id, i + 1]));

  return (
    <div className="min-h-0 flex-1 overflow-auto" role="region" aria-label="Bill of materials spreadsheet" tabIndex={0}>
      <table className="w-full min-w-[38rem] border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-20">
          {/* Spreadsheet column letters */}
          <tr className="bg-muted text-[10px] text-muted-foreground">
            <th className="border border-border bg-muted py-1 font-normal" aria-hidden />
            {COLUMNS.map((c) => (
              <th key={c.key} className="border border-border bg-muted py-1 font-mono font-normal" aria-hidden>{c.letter}</th>
            ))}
            <th className="border border-border bg-muted py-1 font-mono font-normal" aria-hidden>F</th>
            {editing && <th className="border border-border bg-muted py-1" aria-hidden />}
          </tr>
          <tr className="bg-card text-xs tracking-wide text-muted-foreground uppercase">
            <th className="w-10 border border-border bg-card px-2 py-2 font-medium">#</th>
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  "border border-border bg-card px-2.5 py-2 font-medium whitespace-nowrap",
                  c.align === "right" && "text-right",
                  c.align === "center" && "text-center",
                  c.key === "sku" && "w-28",
                  c.key === "unit" && "w-14",
                  c.key === "quantity" && "w-20",
                  c.key === "unitCost" && "w-24",
                )}
              >
                {c.label}
              </th>
            ))}
            <th scope="col" className="w-28 border border-border bg-card px-2.5 py-2 text-right font-medium">Line Total</th>
            {editing && <th scope="col" className="w-10 border border-border bg-card"><span className="sr-only">Remove</span></th>}
          </tr>
        </thead>

        <tbody>
          {groups.map(({ category, rows }) => {
            const total = summary.byCategory.find((b) => b.category === category)!;
            const isLabor = category === "labor";
            return (
              <CategoryBlock key={category}>
                <tr>
                  <th
                    colSpan={colCount}
                    scope="colgroup"
                    className="border border-border bg-primary/10 px-3 py-2 text-left"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        {BOM_CATEGORY_LABELS[category]}
                        <span className="rounded bg-background/60 px-1.5 py-0.5 font-mono text-[10px] font-normal text-muted-foreground">
                          {rows.length} {rows.length === 1 ? "line" : "lines"}
                        </span>
                      </span>
                      <span className="num text-xs font-medium text-muted-foreground">
                        {isLabor ? `${formatNumber(total.quantity)} hrs · ` : ""}
                        {formatCurrency(total.subtotal)}
                      </span>
                    </span>
                  </th>
                </tr>

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={colCount} className="border border-border px-3 py-3 text-center text-xs text-muted-foreground">
                      No line items in this category.
                    </td>
                  </tr>
                )}

                {rows.map((item) => {
                  const rowNumber = rowNumbers.get(item.id) ?? 0;
                  const err = errors[item.id] ?? {};
                  return (
                    <tr key={item.id} data-row={item.id} className="group/row transition-colors hover:bg-muted/40">
                      <td className="border border-border bg-muted/50 px-2 text-center font-mono text-[11px] text-muted-foreground">
                        {rowNumber}
                      </td>

                      <td className={cn(cellBase, "font-mono text-xs")}>
                        {editing ? (
                          <input
                            data-col="sku"
                            aria-label={`SKU, row ${rowNumber}`}
                            aria-invalid={!!err.sku}
                            title={err.sku}
                            value={item.sku}
                            maxLength={32}
                            onChange={(e) => onChange(item.id, { sku: e.target.value })}
                            onKeyDown={navigate}
                            className={cn(inputBase, "font-mono text-xs")}
                          />
                        ) : (
                          <span className="block truncate px-2.5 py-2">{item.sku}</span>
                        )}
                      </td>

                      <td className={cellBase}>
                        {editing ? (
                          <input
                            data-col="description"
                            aria-label={`Description, row ${rowNumber}`}
                            aria-invalid={!!err.description}
                            title={err.description}
                            value={item.description}
                            maxLength={120}
                            onChange={(e) => onChange(item.id, { description: e.target.value })}
                            onKeyDown={navigate}
                            className={inputBase}
                          />
                        ) : (
                          <span className="block px-2.5 py-2 leading-snug">{item.description}</span>
                        )}
                      </td>

                      <td className={cn(cellBase, "text-center text-muted-foreground")}>
                        {editing ? (
                          <input
                            data-col="unit"
                            aria-label={`Unit, row ${rowNumber}`}
                            aria-invalid={!!err.unit}
                            title={err.unit}
                            value={item.unit}
                            maxLength={8}
                            onChange={(e) => onChange(item.id, { unit: e.target.value })}
                            onKeyDown={navigate}
                            className={cn(inputBase, "text-center")}
                          />
                        ) : (
                          <span className="block px-2.5 py-2">{item.unit}</span>
                        )}
                      </td>

                      <td className={cellBase}>
                        {editing ? (
                          <NumberCell
                            col="quantity"
                            label={`Quantity, row ${rowNumber}`}
                            value={item.quantity}
                            invalid={err.quantity}
                            onCommit={(n) => onChange(item.id, { quantity: n })}
                          />
                        ) : (
                          <span className="num block px-2.5 py-2 text-right">{formatNumber(item.quantity)}</span>
                        )}
                      </td>

                      <td className={cellBase}>
                        {editing ? (
                          <NumberCell
                            col="unitCost"
                            label={`Unit cost, row ${rowNumber}`}
                            value={item.unitCost}
                            invalid={err.unitCost}
                            step={0.01}
                            onCommit={(n) => onChange(item.id, { unitCost: n })}
                          />
                        ) : (
                          <span className="num block px-2.5 py-2 text-right">{formatCurrency(item.unitCost)}</span>
                        )}
                      </td>

                      <td className="num border border-border bg-muted/20 px-2.5 py-2 text-right font-medium">
                        {formatCurrency(lineTotal(item))}
                      </td>

                      {editing && (
                        <td className="border border-border p-0 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Remove row ${rowNumber}`}
                            onClick={() => onRemove(item.id)}
                            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {editing && (
                  <tr>
                    <td colSpan={colCount} className="border border-border p-0">
                      <button
                        type="button"
                        onClick={() => onAdd(category)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-brand focus-visible:bg-primary/10 focus-visible:outline-none"
                      >
                        <Plus className="size-3.5" /> Add line to {BOM_CATEGORY_LABELS[category]}
                      </button>
                    </td>
                  </tr>
                )}
              </CategoryBlock>
            );
          })}
        </tbody>

        <tfoot>
          <SummaryRow label="Materials subtotal" value={summary.materialsSubtotal} labelSpan={labelSpan} editing={editing} />
          <SummaryRow
            label={`Labor subtotal · ${formatNumber(summary.laborHours)} hrs`}
            value={summary.laborSubtotal}
            labelSpan={labelSpan}
            editing={editing}
          />
          <SummaryRow
            label={`Contingency (${Math.round(summary.contingencyRate * 100)}%)`}
            value={summary.contingency}
            labelSpan={labelSpan}
            editing={editing}
          />
          <tr className="bg-primary/15">
            <td colSpan={labelSpan} className="border border-primary/40 px-3 py-3 text-right text-sm font-semibold tracking-wide uppercase">
              Estimated project total
            </td>
            <td className="num border border-primary/40 px-3 py-3 text-right text-lg font-bold whitespace-nowrap text-brand">
              {formatCurrency(summary.total)}
            </td>
            {editing && <td className="border border-primary/40" />}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Groups a category's <tr>s without adding DOM (keeps valid table markup). */
function CategoryBlock({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function SummaryRow({
  label,
  value,
  labelSpan,
  editing,
}: {
  label: string;
  value: number;
  labelSpan: number;
  editing: boolean;
}) {
  return (
    <tr className="bg-muted/30">
      <td colSpan={labelSpan} className="border border-border px-3 py-2 text-right text-xs font-medium text-muted-foreground">
        {label}
      </td>
      <td className="num border border-border px-3 py-2 text-right font-medium whitespace-nowrap">{formatCurrency(value)}</td>
      {editing && <td className="border border-border" />}
    </tr>
  );
}
