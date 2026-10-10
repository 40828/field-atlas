"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addBusinessAction,
  addImprovementAction,
  addLedgerEntryAction,
  addProspectAction,
  classifyOutreachAction,
  draftOutreachAction,
  generateImprovementAction,
  markOutreachSentAction,
  savePermissionsAction,
  updateProspectAction,
} from "@/lib/engine/actions";
import { startEngineCheckoutAction, openEnginePortalAction } from "@/lib/engine/billing-actions";
import { PERMISSION_SCOPES, SCOPE_INFO, type PermissionScope } from "@/lib/engine/types";
import { LEDGER_KINDS } from "@/lib/engine/types";
import { LEDGER_LABELS } from "@/lib/engine/labels";

export function LedgerForm({ missions }: { missions: Array<{ id: string; title: string }> }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const result = await addLedgerEntryAction({
          kind: String(fd.get("kind")),
          amount: Number(fd.get("amount")),
          description: String(fd.get("description")),
          reference: String(fd.get("reference")),
          missionId: String(fd.get("missionId") || "") || undefined,
          attested: fd.get("attested") === "on",
        });
        setMsg(result.ok ? (result.data.duplicate ? "Duplicate reference — not inserted." : "Saved.") : result.error);
        if (result.ok) router.refresh();
      }}
    >
      <Field label="Kind">
        <select name="kind" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" required>
          {LEDGER_KINDS.map((k) => (
            <option key={k} value={k}>
              {LEDGER_LABELS[k]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Amount (USD)">
        <Input name="amount" type="number" min={0.01} step="0.01" required />
      </Field>
      <Field label="Description">
        <Input name="description" required />
      </Field>
      <Field label="Unique reference">
        <Input name="reference" required placeholder="invoice-1042" />
      </Field>
      <Field label="Mission">
        <select name="missionId" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
          <option value="">None</option>
          {missions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      </Field>
      <label className="flex items-center gap-2 self-end text-sm">
        <input type="checkbox" name="attested" /> I confirmed this against a real statement
      </label>
      <div className="sm:col-span-2">
        <Button type="submit">Add entry</Button>
        {msg ? <p className="mt-2 text-sm text-muted-foreground">{msg}</p> : null}
      </div>
    </form>
  );
}

export function ProspectForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const result = await addProspectAction({
          company: String(fd.get("company")),
          contactName: String(fd.get("contactName") || "") || undefined,
          role: String(fd.get("role") || "") || undefined,
          email: String(fd.get("email") || "") || undefined,
          website: String(fd.get("website") || "") || undefined,
          notes: String(fd.get("notes") || "") || undefined,
        });
        setError(result.ok ? null : result.error);
        if (result.ok) {
          e.currentTarget.reset();
          router.refresh();
        }
      }}
    >
      <Field label="Company">
        <Input name="company" required />
      </Field>
      <Field label="Contact">
        <Input name="contactName" />
      </Field>
      <Field label="Role">
        <Input name="role" />
      </Field>
      <Field label="Email (you provide this)">
        <Input name="email" type="email" />
      </Field>
      <Field label="Website">
        <Input name="website" type="url" placeholder="https://" />
      </Field>
      <Field label="Notes">
        <Input name="notes" />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit">Add prospect</Button>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </div>
    </form>
  );
}

export function ProspectRowActions({
  id,
  stage,
}: {
  id: string;
  stage: "new" | "qualified" | "contacted" | "replied" | "meeting" | "won" | "lost";
}) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2">
      <select
        defaultValue={stage}
        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        onChange={async (e) => {
          await updateProspectAction(id, { stage: e.target.value });
          router.refresh();
        }}
      >
        {["new", "qualified", "contacted", "replied", "meeting", "won", "lost"].map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <Button type="button" size="sm" variant="outline" onClick={async () => { await draftOutreachAction(id); router.refresh(); }}>
        Draft email
      </Button>
    </div>
  );
}

export function OutreachActions({
  id,
  status,
}: {
  id: string;
  status: "draft" | "approved" | "sent_manually" | "replied";
}) {
  const router = useRouter();
  if (status === "replied") return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {status !== "sent_manually" ? (
        <Button type="button" size="sm" onClick={async () => { await markOutreachSentAction(id); router.refresh(); }}>
          I sent this
        </Button>
      ) : (
        (["interested", "not_now", "not_interested", "question", "unsubscribe"] as const).map((c) => (
          <Button key={c} type="button" size="sm" variant="outline" onClick={async () => { await classifyOutreachAction(id, c); router.refresh(); }}>
            {c}
          </Button>
        ))
      )}
    </div>
  );
}

export function PermissionsForm({
  scopes,
  spendLimitCents,
  zeroCapitalMode,
}: {
  scopes: PermissionScope[];
  spendLimitCents: number;
  zeroCapitalMode: boolean;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const selected = PERMISSION_SCOPES.filter((s) => fd.get(s) === "on");
        const result = await savePermissionsAction({
          scopes: selected,
          spendLimit: Number(fd.get("spendLimit") || 0),
          zeroCapitalMode: fd.get("zeroCapitalMode") === "on",
        });
        setMsg(result.ok ? "Saved." : result.error);
        if (result.ok) router.refresh();
      }}
    >
      <div className="space-y-3">
        {PERMISSION_SCOPES.map((scope) => (
          <label key={scope} className="flex items-start gap-2 text-sm">
            <input type="checkbox" name={scope} defaultChecked={scopes.includes(scope)} disabled={scope === "research"} className="mt-1" />
            <span>
              <span className="font-medium">{SCOPE_INFO[scope].label}</span>
              <span className="block text-muted-foreground">{SCOPE_INFO[scope].description}</span>
            </span>
          </label>
        ))}
      </div>
      <Field label="Spending limit (USD)">
        <Input name="spendLimit" type="number" min={0} step="0.01" defaultValue={(spendLimitCents / 100).toString()} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="zeroCapitalMode" defaultChecked={zeroCapitalMode} />
        Prefer zero-capital strategies
      </label>
      <Button type="submit">Save permissions</Button>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
    </form>
  );
}

export function BillingButtons() {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        onClick={async () => {
          const r = await startEngineCheckoutAction({ plan: "pro", interval: "monthly" });
          if (!r.ok) setError(r.error);
          else window.location.href = r.data.url;
        }}
      >
        Upgrade to Operator
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={async () => {
          const r = await startEngineCheckoutAction({ plan: "scale", interval: "monthly" });
          if (!r.ok) setError(r.error);
          else window.location.href = r.data.url;
        }}
      >
        Upgrade to Studio
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={async () => {
          const r = await openEnginePortalAction();
          if (!r.ok) setError(r.error);
          else window.location.href = r.data.url;
        }}
      >
        Manage billing
      </Button>
      {error ? <p className="w-full text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

export function ImprovementForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="grid gap-3 rounded-xl border border-border p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const result = await addImprovementAction({
          observation: String(fd.get("observation")),
          hypothesis: String(fd.get("hypothesis")),
          successCriterion: String(fd.get("successCriterion")),
          proposal: String(fd.get("proposal")),
        });
        setError(result.ok ? null : result.error);
        if (result.ok) {
          e.currentTarget.reset();
          router.refresh();
        }
      }}
    >
      <Field label="Observed problem">
        <Textarea name="observation" required minLength={10} />
      </Field>
      <Field label="Hypothesis">
        <Textarea name="hypothesis" required minLength={10} />
      </Field>
      <Field label="Success criterion">
        <Input name="successCriterion" required minLength={10} />
      </Field>
      <Field label="Proposed change">
        <Textarea name="proposal" required minLength={10} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit">Record hypothesis</Button>
        <Button
          type="button"
          variant="outline"
          onClick={async (ev) => {
            const form = ev.currentTarget.form;
            if (!form) return;
            const observation = String(new FormData(form).get("observation") ?? "");
            const r = await generateImprovementAction(observation);
            if (!r.ok) {
              setError(r.error);
              return;
            }
            (form.elements.namedItem("hypothesis") as HTMLTextAreaElement).value = r.data.draft.hypothesis;
            (form.elements.namedItem("successCriterion") as HTMLInputElement).value = r.data.draft.successCriterion;
            (form.elements.namedItem("proposal") as HTMLTextAreaElement).value = r.data.draft.proposal;
          }}
        >
          Draft from observation
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}

export function BusinessForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="grid gap-3 rounded-xl border border-border p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const r = await addBusinessAction({
          name: String(fd.get("name")),
          summary: String(fd.get("summary") || ""),
          asking: Number(fd.get("asking") || 0) || undefined,
          assumptions: String(fd.get("assumptions") || ""),
          financialNotes: String(fd.get("financialNotes") || ""),
        });
        setError(r.ok ? null : r.error);
        if (r.ok) {
          e.currentTarget.reset();
          router.refresh();
        }
      }}
    >
      <Field label="Business name">
        <Input name="name" required />
      </Field>
      <Field label="Summary">
        <Textarea name="summary" />
      </Field>
      <Field label="Asking price (USD, estimate)">
        <Input name="asking" type="number" min={0} />
      </Field>
      <Field label="Valuation assumptions">
        <Textarea name="assumptions" placeholder="Multiples, comparables, and what is unverified." />
      </Field>
      <Field label="Financial notes">
        <Textarea name="financialNotes" />
      </Field>
      <Button type="submit">Save profile</Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
