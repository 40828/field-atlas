"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft, CheckCircle2, FileText, Loader2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatBytes, formatInt } from "@/lib/solar/format";
import { BUILDING_TYPE_LABELS, MATERIAL_LABELS } from "@/lib/solar/options";
import type { BlueprintAnalysis } from "@/lib/solar/types";
import type { SiteMetadata } from "@/lib/solar/schemas";

export const GENERATION_STAGES = [
  "Drafting executive summary",
  "Building the verification checklist",
  "Taking off quantities",
  "Pricing with default unit costs",
] as const;

interface ReviewStepProps {
  fileName: string;
  fileSize: number;
  analysis: BlueprintAnalysis;
  meta: SiteMetadata;
  generating: boolean;
  /** Index of the generation stage currently running. */
  generationStage: number;
  error: string | null;
  limitReached?: boolean;
  onBack: () => void;
  onGenerate: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

export function ReviewStep({
  fileName,
  fileSize,
  analysis,
  meta,
  generating,
  generationStage,
  error,
  limitReached,
  onBack,
  onGenerate,
}: ReviewStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-muted/20 p-4">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <FileText className="size-4 text-brand" /> Blueprint analysis
          </h3>
          <dl className="divide-y divide-border">
            <Row label="File" value={fileName} />
            <Row label="Size" value={formatBytes(fileSize)} />
            <Row label="Sheets read" value={String(analysis.pageCount)} />
            <Row label="Roof area" value={`${formatInt(analysis.squareFeet)} sq ft`} />
            <Row label="Roof planes" value={String(analysis.roofPlanes)} />
            <Row label="Confidence" value={`${Math.round(analysis.confidence * 100)}%`} />
          </dl>
        </section>

        <section className="rounded-xl border border-border bg-muted/20 p-4">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="size-4 text-brand" /> Site parameters
          </h3>
          <dl className="divide-y divide-border">
            <Row label="Client" value={meta.clientName} />
            <Row label="Address" value={meta.address} />
            <Row label="Building type" value={BUILDING_TYPE_LABELS[meta.buildingType]} />
            <Row label="Target material" value={MATERIAL_LABELS[meta.material]} />
            <Row label="Jurisdiction" value={meta.jurisdiction} />
            <Row label="Zoning code" value={meta.zoningCode} />
          </dl>
        </section>
      </div>

      {generating && (
        <div className="sp-fade-up rounded-xl border border-primary/30 bg-primary/5 p-4" aria-live="polite">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">
              <Loader2 className="size-4 animate-spin text-brand" />
              {GENERATION_STAGES[Math.min(generationStage, GENERATION_STAGES.length - 1)]}…
            </span>
            <span className="num text-muted-foreground">
              {Math.min(generationStage + 1, GENERATION_STAGES.length)}/{GENERATION_STAGES.length}
            </span>
          </div>
          <Progress value={((generationStage + 1) / GENERATION_STAGES.length) * 100} aria-label="Proposal generation progress" />
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>
            {error}
            {limitReached && (
              <>
                {" "}
                <Link href="/dashboard/billing" className="font-semibold underline underline-offset-4">
                  View plans
                </Link>
              </>
            )}
          </span>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="ghost" onClick={onBack} disabled={generating}>
          <ArrowLeft /> Edit details
        </Button>
        <Button size="lg" onClick={onGenerate} disabled={generating} className={cn(!generating && "glow-amber")}>
          {generating ? <Loader2 className="animate-spin" /> : <Wand2 />}
          {generating ? "Generating…" : "Generate proposal & BOM"}
        </Button>
      </div>
    </div>
  );
}
