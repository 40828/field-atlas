"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, CloudUpload, Loader2, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { syncToCrmAction } from "@/lib/solar/actions";
import { formatCurrencyWhole, formatDateTime } from "@/lib/solar/format";
import { BUILDING_TYPE_LABELS } from "@/lib/solar/options";
import type { Proposal } from "@/lib/solar/types";

interface CrmSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: Proposal;
  total: number;
  syncedAt: string | null;
  /** When set the sync button is disabled and this explains why. */
  blockedReason?: string;
  onSynced: (syncedAt: string) => void;
}

type SyncState = { kind: "idle" } | { kind: "syncing" } | { kind: "done"; recordId: string } | { kind: "error"; message: string };

export function CrmSyncDialog({ open, onOpenChange, proposal, total, syncedAt, blockedReason, onSynced }: CrmSyncDialogProps) {
  const [state, setState] = useState<SyncState>({ kind: "idle" });

  async function sync() {
    setState({ kind: "syncing" });
    const res = await syncToCrmAction(proposal.id);
    if (!res.ok) {
      setState({ kind: "error", message: res.error });
      return;
    }
    setState({ kind: "done", recordId: res.data.crmRecordId });
    onSynced(res.data.syncedAt);
  }

  const record: [string, string][] = [
    ["Deal name", `${proposal.projectName} — ${BUILDING_TYPE_LABELS[proposal.buildingType]}`],
    ["Account", proposal.clientName],
    ["Amount", formatCurrencyWhole(total)],
    ["Stage", proposal.approval === "approved" ? "Closed won" : "Proposal sent"],
    ["Source", `Voltline · ${proposal.id}`],
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (state.kind === "syncing") return; // don't dismiss mid-request
        if (!next) setState({ kind: "idle" });
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudUpload className="size-5 text-brand" /> Sync to CRM
          </DialogTitle>
          <DialogDescription>
            {syncedAt
              ? `Last synced ${formatDateTime(syncedAt)}. Syncing again updates the existing deal.`
              : "Creates or updates a deal in your connected CRM with this proposal's value and documents."}
          </DialogDescription>
        </DialogHeader>

        <dl className="divide-y divide-border rounded-lg border border-border bg-muted/20 text-sm">
          {record.map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-4 px-3 py-2.5">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        {blockedReason && state.kind === "idle" && (
          <p role="status" className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            <Unplug className="mt-0.5 size-4 shrink-0" /> {blockedReason}
          </p>
        )}
        {state.kind === "done" && (
          <p role="status" className="sp-fade-up flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            Synced successfully as <span className="font-mono font-semibold">{state.recordId}</span>.
          </p>
        )}
        {state.kind === "error" && (
          <p role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> {state.message}
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={state.kind === "syncing"}>
            {state.kind === "done" ? "Close" : "Cancel"}
          </Button>
          {state.kind !== "done" && (
            <Button onClick={sync} disabled={state.kind === "syncing" || !!blockedReason}>
              {state.kind === "syncing" ? <Loader2 className="animate-spin" /> : <CloudUpload />}
              {state.kind === "syncing" ? "Syncing…" : state.kind === "error" ? "Retry sync" : "Sync now"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
