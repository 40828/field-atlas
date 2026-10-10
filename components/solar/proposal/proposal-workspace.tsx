"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Download,
  FileDown,
  FileText,
  Loader2,
  MapPin,
  PencilLine,
  Ruler,
  Table2,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { saveBomAction, updateWorkflowAction } from "@/lib/solar/actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APPROVAL_LABELS } from "@/lib/solar/options";
import { computeBomSummary } from "@/lib/solar/bom";
import { formatCurrency, formatDate, formatDateTime, formatInt } from "@/lib/solar/format";
import { bomLineSchema, saveBomSchema } from "@/lib/solar/schemas";
import type { ApprovalState, BomCategory, BomLineItem, DealOutcome, ProposalDetail } from "@/lib/solar/types";
import { ApprovalBadge, StatusBadge } from "../status-badge";
import { BomTable, type BomFieldErrors } from "./bom-table";
import { DocumentViewer } from "./document-viewer";

type Pane = "document" | "bom";

/** Number of added + removed + modified lines between two item lists. */
function countChanges(current: BomLineItem[], saved: BomLineItem[]): number {
  const savedById = new Map(saved.map((s) => [s.id, s]));
  const currentIds = new Set(current.map((c) => c.id));
  let changes = saved.filter((s) => !currentIds.has(s.id)).length;
  for (const item of current) {
    const prev = savedById.get(item.id);
    if (!prev) changes++;
    else if (
      prev.sku !== item.sku ||
      prev.description !== item.description ||
      prev.unit !== item.unit ||
      prev.quantity !== item.quantity ||
      prev.unitCost !== item.unitCost ||
      prev.category !== item.category
    )
      changes++;
  }
  return changes;
}

export function ProposalWorkspace({ detail }: { detail: ProposalDetail }) {
  const { proposal, document: doc } = detail;

  const [items, setItems] = useState<BomLineItem[]>(detail.bom);
  const [saved, setSaved] = useState<BomLineItem[]>(detail.bom);
  const [editing, setEditing] = useState(false);
  const [pane, setPane] = useState<Pane>("document");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [approval, setApproval] = useState<ApprovalState>(proposal.approval);
  const [outcome, setOutcome] = useState<DealOutcome>(proposal.outcome);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const newRowSeq = useRef(0);
  const workspaceRef = useRef<HTMLDivElement>(null);

  const summary = useMemo(() => computeBomSummary(items), [items]);
  const changes = useMemo(() => countChanges(items, saved), [items, saved]);
  const dirty = changes > 0;

  /** Per-cell validation, derived from the same Zod schema the server uses. */
  const errors = useMemo<BomFieldErrors>(() => {
    const out: BomFieldErrors = {};
    for (const item of items) {
      const res = bomLineSchema.safeParse(item);
      if (res.success) continue;
      out[item.id] = {};
      for (const issue of res.error.issues) {
        const key = issue.path[0] as keyof BomLineItem;
        if (!out[item.id][key]) out[item.id][key] = issue.message;
      }
    }
    return out;
  }, [items]);
  const invalidCount = Object.keys(errors).length;

  // Warn before leaving the page with unsaved BOM edits.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  /* ───────────────────────────── BOM editing ───────────────────────── */

  function updateItem(id: string, patch: Partial<BomLineItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    setJustSaved(false);
    setSaveError(null);
  }

  function addItem(category: BomCategory) {
    const id = `${proposal.id}-N${++newRowSeq.current}`;
    setItems((prev) => [
      ...prev,
      {
        id,
        category,
        sku: "CUSTOM",
        description: "",
        unit: category === "labor" ? "hr" : "ea",
        quantity: 1,
        unitCost: 0,
      },
    ]);
    setJustSaved(false);
    requestAnimationFrame(() =>
      workspaceRef.current
        ?.querySelector<HTMLInputElement>(`tr[data-row="${id}"] input[data-col="description"]`)
        ?.focus(),
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setJustSaved(false);
  }

  function discard() {
    setItems(saved);
    setSaveError(null);
  }

  async function save() {
    const check = saveBomSchema.safeParse({ proposalId: proposal.id, items });
    if (!check.success) {
      setSaveError(check.error.issues[0]?.message ?? "Fix the highlighted cells before saving.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const res = await saveBomAction({ proposalId: proposal.id, items: check.data.items });
    setSaving(false);
    if (!res.ok) {
      setSaveError(res.error);
      return;
    }
    setItems(res.data.items);
    setSaved(res.data.items);
    setJustSaved(true);
  }

  function toggleEditing() {
    setEditing((e) => !e);
    setPane("bom");
  }

  async function changeWorkflow(patch: { approval?: ApprovalState; outcome?: DealOutcome }) {
    const prev = { approval, outcome };
    if (patch.approval) setApproval(patch.approval);
    if (patch.outcome) setOutcome(patch.outcome);
    setWorkflowError(null);
    const res = await updateWorkflowAction({ proposalId: proposal.id, ...patch });
    if (!res.ok) {
      setApproval(prev.approval);
      setOutcome(prev.outcome);
      setWorkflowError(res.error);
    }
  }

  /** Download the saved BOM as CSV. Cells that a spreadsheet could read as formulas are neutralised. */
  function exportCsv() {
    const cell = (v: string | number) => {
      const s = String(v);
      const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const rows: (string | number)[][] = [
      ["Category", "SKU", "Description", "Unit", "Quantity", "Unit cost", "Line total"],
      ...saved.map((i) => [i.category, i.sku, i.description, i.unit, i.quantity, i.unitCost, Math.round(i.quantity * i.unitCost * 100) / 100]),
    ];
    const blob = new Blob([rows.map((r) => r.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${proposal.id}-bom.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    // Print stylesheet shows both panes stacked; "Save as PDF" in the dialog produces the file.
    window.print();
  }

  /* ─────────────────────────────── Render ──────────────────────────── */

  const showDocument = pane === "document";

  return (
    <div ref={workspaceRef} className="flex min-h-[calc(100dvh-4rem)] flex-col xl:h-[calc(100dvh-4rem)] print:h-auto">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background/60 px-4 py-4 sm:px-6">
        <Link
          href="/dashboard"
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground print:hidden"
        >
          <ArrowLeft className="size-3.5" /> All proposals
        </Link>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{proposal.projectName}</h1>
              <Badge variant="outline" className="font-mono">{proposal.id}</Badge>
              <StatusBadge status={proposal.status} />
              <ApprovalBadge approval={approval} />
              {outcome !== "open" && (
                <Badge variant={outcome === "won" ? "success" : "secondary"}>{outcome === "won" ? "Won" : "Lost"}</Badge>
              )}
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{proposal.clientName}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{proposal.address}</span>
              <span className="inline-flex items-center gap-1.5"><Ruler className="size-3.5" />{formatInt(proposal.squareFeet)} sq ft</span>
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />{formatDate(proposal.createdAt)}</span>
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 print:hidden">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Approval
                <Select value={approval} onValueChange={(v) => changeWorkflow({ approval: v as ApprovalState })}>
                  <SelectTrigger className="h-8 w-44 text-xs" aria-label="Approval status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(APPROVAL_LABELS) as ApprovalState[]).map((k) => (
                      <SelectItem key={k} value={k}>{APPROVAL_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Deal
                <Select value={outcome} onValueChange={(v) => changeWorkflow({ outcome: v as DealOutcome })}>
                  <SelectTrigger className="h-8 w-28 text-xs" aria-label="Deal outcome">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              {workflowError && <span role="alert" className="text-xs text-destructive">{workflowError}</span>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <div className="mr-1 hidden text-right sm:block">
              <p className="text-[11px] tracking-wider text-muted-foreground uppercase">Estimated total</p>
              <p className="num text-xl font-semibold text-brand">{formatCurrency(summary.total)}</p>
            </div>
            <Button variant="outline" onClick={exportPdf}>
              <FileDown /> Export to PDF
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={dirty} title={dirty ? "Save your changes first" : undefined}>
              <Download /> Export BOM (CSV)
            </Button>
            <Button onClick={toggleEditing} aria-pressed={editing} className={cn(editing && "glow-amber")}>
              {editing ? <Check /> : <PencilLine />}
              {editing ? "Done editing" : "Edit Line Items"}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile pane switcher */}
      <div
        role="tablist"
        aria-label="Workspace view"
        className="grid shrink-0 grid-cols-2 gap-1 border-b border-border bg-muted/30 p-1.5 xl:hidden print:hidden"
      >
        {([
          ["document", "Proposal", FileText],
          ["bom", "Bill of Materials", Table2],
        ] as const).map(([value, label, Icon]) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={pane === value}
            onClick={() => setPane(value)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              pane === value ? "bg-card shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      {/* Split pane */}
      <div className="grid min-h-0 flex-1 gap-4 p-3 sm:p-4 xl:grid-cols-[minmax(0,4fr)_minmax(0,5fr)] print:block print:p-0">
        <DocumentViewer
          proposal={proposal}
          document={doc}
          summary={summary}
          className={cn(!showDocument && "hidden xl:flex", "print:mb-8 print:flex print:overflow-visible print:border-0")}
        />

        <section
          aria-label="Bill of materials"
          className={cn(
            "min-h-[60dvh] min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm xl:min-h-0 print:flex print:overflow-visible print:border-0 print:shadow-none",
            showDocument ? "hidden xl:flex" : "flex",
          )}
        >
          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <Table2 className="size-4 text-brand" />
              <h2 className="text-sm font-semibold">Bill of Materials</h2>
              <Badge variant="secondary" className="font-mono">{items.length} lines</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {editing
                ? "Editing — Tab/Enter/↑↓ to move between cells. Totals update live."
                : `Updated ${formatDateTime(proposal.updatedAt)}`}
            </p>
            {justSaved && !dirty && (
              <span role="status" className="sp-fade-up ml-auto inline-flex items-center gap-1 text-xs font-medium text-success">
                <CheckCircle2 className="size-3.5" /> Saved
              </span>
            )}
          </div>

          <BomTable
            items={items}
            summary={summary}
            editing={editing}
            errors={errors}
            onChange={updateItem}
            onAdd={addItem}
            onRemove={removeItem}
          />

          {/* Unsaved-changes bar */}
          {(dirty || saveError) && (
            <div
              role="region"
              aria-label="Unsaved changes"
              className="sp-fade-up flex shrink-0 flex-wrap items-center gap-3 border-t border-primary/30 bg-primary/10 px-4 py-3 print:hidden"
            >
              <div className="min-w-0 flex-1 text-sm">
                {saveError ? (
                  <p role="alert" className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="size-4 shrink-0" /> {saveError}
                  </p>
                ) : invalidCount > 0 ? (
                  <p className="flex items-center gap-2 text-warning">
                    <AlertCircle className="size-4 shrink-0" /> {invalidCount} {invalidCount === 1 ? "line needs" : "lines need"} attention before saving.
                  </p>
                ) : (
                  <p className="font-medium">
                    {changes} unsaved {changes === 1 ? "change" : "changes"}
                    <span className="num ml-2 font-normal text-muted-foreground">New total {formatCurrency(summary.total)}</span>
                  </p>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={discard} disabled={saving || !dirty}>
                <Undo2 /> Discard
              </Button>
              <Button size="sm" onClick={save} disabled={saving || !dirty || invalidCount > 0}>
                {saving ? <Loader2 className="animate-spin" /> : <Check />}
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
