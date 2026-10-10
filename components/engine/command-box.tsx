"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createMissionAction, startMissionAction } from "@/lib/engine/actions";
import { IncomeDisclaimer } from "./disclaimer";

const EXAMPLES = [
  "Go make me money.",
  "Find the fastest legitimate route to my first $1,000 in revenue without spending money upfront.",
  "Build a profitable AI tool for construction contractors.",
  "Find businesses that need automation and create an offer I can sell.",
];

export function CommandBox() {
  const router = useRouter();
  const [objective, setObjective] = useState("Go make me money.");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="rounded-2xl border border-border bg-card p-5 shadow-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const created = await createMissionAction({ objective, zeroCapital: true });
        if (!created.ok) {
          setPending(false);
          setError(created.error);
          return;
        }
        const started = await startMissionAction(created.data.id);
        setPending(false);
        if (!started.ok) {
          setError(started.error);
          router.push(`/engine/app/missions/${created.data.id}`);
          return;
        }
        router.push(`/engine/app/missions/${created.data.id}`);
        router.refresh();
      }}
    >
      <label htmlFor="ame-command" className="text-sm font-medium">
        What should the engine pursue?
      </label>
      <Textarea
        id="ame-command"
        value={objective}
        onChange={(e) => setObjective(e.target.value)}
        rows={4}
        className="mt-2 min-h-28 text-base"
        placeholder="Go make me money."
        required
        minLength={5}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            className="rounded-full border border-border px-3 py-1 text-left text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
            onClick={() => setObjective(ex)}
          >
            {ex}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <IncomeDisclaimer className="max-w-lg" />
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/engine/app/missions/new")}>
            More options
          </Button>
          <Button type="submit" disabled={pending || objective.trim().length < 5}>
            {pending ? "Starting…" : "Start mission"}
            <ArrowRight />
          </Button>
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
