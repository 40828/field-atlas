"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatBytes, formatInt } from "@/lib/solar/format";
import { UPLOAD_LIMITS } from "@/lib/solar/options";
import type { BlueprintAnalysis } from "@/lib/solar/types";
import { BlueprintScanner } from "./blueprint-scanner";
import { ANALYSIS_STAGES, type UploadPhase, type UploadedFile } from "./types";

interface DropzoneStepProps {
  phase: UploadPhase;
  file: UploadedFile | null;
  /** 0–100 upload progress. */
  progress: number;
  /** Number of analysis stages completed (0…ANALYSIS_STAGES.length). */
  stage: number;
  analysis: BlueprintAnalysis | null;
  error: string | null;
  onSelect: (file: File) => void;
  onReset: () => void;
  onContinue: () => void;
}

export function DropzoneStep({
  phase,
  file,
  progress,
  stage,
  analysis,
  error,
  onSelect,
  onReset,
  onContinue,
}: DropzoneStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const busy = phase === "uploading" || phase === "analyzing";

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onSelect(dropped);
  }

  /* ───────── idle / error: the drop target ───────── */
  if (phase === "idle" || phase === "error") {
    return (
      <div className="flex flex-col gap-4">
        <label
          htmlFor="blueprint-input"
          onDragEnter={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
          }}
          onDrop={handleDrop}
          className={cn(
            "group relative flex min-h-[20rem] cursor-pointer flex-col items-center justify-center gap-5 overflow-hidden rounded-xl border-2 border-dashed px-6 py-12 text-center transition-all duration-300 focus-within:ring-[3px] focus-within:ring-ring",
            dragging
              ? "scale-[1.01] border-primary bg-primary/10"
              : "border-border bg-muted/20 hover:border-primary/50 hover:bg-primary/5",
            phase === "error" && !dragging && "border-destructive/50",
          )}
        >
          <div className="bg-blueprint pointer-events-none absolute inset-0 opacity-60" aria-hidden />
          <input
            ref={inputRef}
            id="blueprint-input"
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(e) => {
              const picked = e.target.files?.[0];
              if (picked) onSelect(picked);
              e.target.value = ""; // allow re-selecting the same file
            }}
          />

          <span
            className={cn(
              "relative grid size-16 place-items-center rounded-2xl bg-primary/15 text-brand transition-transform duration-300",
              dragging ? "-translate-y-1 scale-110" : "group-hover:-translate-y-0.5",
            )}
          >
            <UploadCloud className="size-8" />
          </span>
          <div className="relative space-y-1.5">
            <p className="text-lg font-semibold tracking-tight">
              {dragging ? "Release to upload" : "Drop your roof plan PDF here"}
            </p>
            <p className="text-sm text-muted-foreground">
              or <span className="font-medium text-brand underline-offset-4 group-hover:underline">browse files</span>
              {" · "}PDF only, up to {UPLOAD_LIMITS.maxBytes / 1024 / 1024} MB
            </p>
          </div>
          <p className="relative inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Lock className="size-3" /> Files are validated server-side and encrypted at rest
          </p>
        </label>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  /* ───────── uploading / analyzing / done ───────── */
  const done = phase === "done";
  const stagesDone = done ? ANALYSIS_STAGES.length : stage;

  return (
    <div className="flex flex-col gap-6">
      {/* File chip */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-brand">
          <FileText className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file?.fileName}</p>
          <p className="text-xs text-muted-foreground">
            {file ? formatBytes(file.fileSizeBytes) : ""} ·{" "}
            {phase === "uploading" ? `Uploading ${Math.round(progress)}%` : done ? "Analysis complete" : "Analyzing structure…"}
          </p>
        </div>
        {done ? (
          <CheckCircle2 className="size-5 shrink-0 text-success" />
        ) : (
          <Loader2 className="size-5 shrink-0 animate-spin text-brand" />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <BlueprintScanner stage={stagesDone} scanning={busy && phase === "analyzing"} />

        <div className="flex flex-col gap-4">
          {phase === "uploading" && (
            <div className="space-y-2" aria-live="polite">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Securely uploading</span>
                <span className="num text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} aria-label="Upload progress" />
            </div>
          )}

          <ol className="flex flex-col gap-1" aria-label="Structural analysis stages">
            {ANALYSIS_STAGES.map((s, i) => {
              const complete = i < stagesDone;
              const current = !done && phase === "analyzing" && i === stage;
              return (
                <li
                  key={s.label}
                  className={cn(
                    "flex items-start gap-3 rounded-lg px-3 py-2 transition-colors duration-300",
                    current && "bg-primary/10",
                  )}
                >
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center">
                    {complete ? (
                      <CheckCircle2 className="size-5 text-success" />
                    ) : current ? (
                      <Loader2 className="size-4 animate-spin text-brand" />
                    ) : (
                      <span className="size-2 rounded-full bg-border" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block text-sm font-medium", !complete && !current && "text-muted-foreground")}>
                      {s.label}
                    </span>
                    {(current || complete) && (
                      <span className="block text-xs text-muted-foreground">{s.detail}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {done && analysis && (
        <div className="sp-fade-up flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Roof area", `${formatInt(analysis.squareFeet)} sq ft`],
              ["Roof planes", String(analysis.roofPlanes)],
              ["Perimeter", `${formatInt(analysis.perimeterFeet)} lf`],
              ["Penetrations", String(analysis.penetrations)],
              ["Pitch", analysis.pitch],
              ["Confidence", `${Math.round(analysis.confidence * 100)}%`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="num mt-1 text-base font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-success" />
            {analysis.pageCount} sheets parsed · checksum <span className="font-mono">{analysis.checksum}</span>
          </p>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onReset} disabled={phase === "uploading"}>
          <RefreshCw /> {busy ? "Cancel" : "Replace file"}
        </Button>
        <Button size="lg" onClick={onContinue} disabled={!done}>
          Continue to site details <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
