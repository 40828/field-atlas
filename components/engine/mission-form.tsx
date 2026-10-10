"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createMissionAction, startMissionAction } from "@/lib/engine/actions";
import { IncomeDisclaimer } from "./disclaimer";

export function MissionForm({ defaultObjective = "" }: { defaultObjective?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="grid gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const num = (k: string) => {
          const v = String(fd.get(k) ?? "").trim();
          return v ? Number(v) : undefined;
        };
        setPending(true);
        setError(null);
        const created = await createMissionAction({
          objective: String(fd.get("objective") ?? ""),
          targetAmount: num("targetAmount"),
          timeframeDays: num("timeframeDays"),
          startingCapital: num("startingCapital"),
          maxSpend: num("maxSpend"),
          skills: String(fd.get("skills") ?? "") || undefined,
          categories: String(fd.get("categories") ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          riskTolerance: (String(fd.get("riskTolerance") ?? "medium") || "medium") as "low" | "medium" | "high",
          constraints: String(fd.get("constraints") ?? "") || undefined,
          zeroCapital: fd.get("zeroCapital") === "on",
        });
        if (!created.ok) {
          setPending(false);
          setError(created.error);
          return;
        }
        const started = await startMissionAction(created.data.id);
        setPending(false);
        if (!started.ok) setError(started.error);
        router.push(`/engine/app/missions/${created.data.id}`);
        router.refresh();
      }}
    >
      <Field id="objective" label="Instruction">
        <Textarea id="objective" name="objective" required minLength={5} defaultValue={defaultObjective} rows={4} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="targetAmount" label="Target profit (USD)" hint="Blank uses the $1,000,000 aspirational default. Not a promise.">
          <Input id="targetAmount" name="targetAmount" type="number" min={0} step="1" placeholder="1000000" />
        </Field>
        <Field id="timeframeDays" label="Timeframe (days)">
          <Input id="timeframeDays" name="timeframeDays" type="number" min={1} max={3650} />
        </Field>
        <Field id="startingCapital" label="Starting capital (USD)">
          <Input id="startingCapital" name="startingCapital" type="number" min={0} step="0.01" defaultValue="0" />
        </Field>
        <Field id="maxSpend" label="Maximum authorised spend (USD)">
          <Input id="maxSpend" name="maxSpend" type="number" min={0} step="0.01" defaultValue="0" />
        </Field>
      </div>
      <Field id="skills" label="Skills and resources">
        <Input id="skills" name="skills" placeholder="Copywriting, existing audience, contractor network…" />
      </Field>
      <Field id="categories" label="Preferred categories" hint="Comma-separated.">
        <Input id="categories" name="categories" placeholder="construction, local services, education" />
      </Field>
      <Field id="riskTolerance" label="Risk tolerance">
        <select
          id="riskTolerance"
          name="riskTolerance"
          defaultValue="medium"
          className="flex h-10 w-full rounded-lg border border-input bg-background/60 px-3 text-sm"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </Field>
      <Field id="constraints" label="Constraints">
        <Textarea id="constraints" name="constraints" rows={3} placeholder="Geography, industries to avoid, compliance rules…" />
      </Field>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="zeroCapital" defaultChecked className="mt-1" />
        <span>
          Zero-capital mode — prefer free tools, organic distribution, and validation before building. This is not a
          guarantee of zero ongoing cost.
        </span>
      </label>
      <IncomeDisclaimer />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Starting…" : "Create and start"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/engine/app")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
