"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Cpu, FileCheck2, Lock, ScanSearch } from "lucide-react";
import { Card } from "@/components/ui/card";
import { analyzeBlueprintAction, createProposalAction } from "@/lib/solar/actions";
import { blueprintFileSchema, siteMetadataSchema } from "@/lib/solar/schemas";
import { UPLOAD_LIMITS } from "@/lib/solar/options";
import { DropzoneStep } from "./dropzone-step";
import { MetadataStep } from "./metadata-step";
import { GENERATION_STAGES, ReviewStep } from "./review-step";
import { Stepper } from "./stepper";
import {
  ANALYSIS_STAGES,
  EMPTY_FORM,
  type FieldErrors,
  type FieldName,
  type FormValues,
  type UploadedFile,
  type UploadPhase,
} from "./types";
import type { BlueprintAnalysis } from "@/lib/solar/types";

type Step = 1 | 2 | 3;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function UploadWizard() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [maxReached, setMaxReached] = useState<Step>(1);

  // Step 1 — file + analysis
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);
  const [analysis, setAnalysis] = useState<BlueprintAnalysis | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Step 2 — form
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverFormError, setServerFormError] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);

  // Step 3 — generation
  const [generating, setGenerating] = useState(false);
  const [genStage, setGenStage] = useState(0);
  const [genError, setGenError] = useState<string | null>(null);

  /** Incremented to cancel an in-flight upload/analysis run. */
  const runRef = useRef(0);
  const formRef = useRef<HTMLDivElement>(null);

  /* ───────────── validation (derived — no effects needed) ───────────── */

  const parsed = useMemo(() => siteMetadataSchema.safeParse(values), [values]);

  const errors = useMemo<FieldErrors>(() => {
    if (parsed.success) return {};
    const out: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as FieldName | undefined;
      if (!key || out[key]) continue;
      if (submitAttempted || touched[key]) out[key] = issue.message;
    }
    return out;
  }, [parsed, touched, submitAttempted]);

  /* ───────────────────────────── Step 1 logic ───────────────────────── */

  function failUpload(message: string) {
    setPhase("error");
    setFile(null);
    setAnalysis(null);
    setFileError(message);
  }

  async function handleFile(f: File) {
    const run = ++runRef.current;
    const cancelled = () => runRef.current !== run;
    setFileError(null);

    // Fast client-side checks (the server action re-validates everything).
    const hasPdfName = /\.pdf$/i.test(f.name);
    if (!hasPdfName || (f.type !== "application/pdf" && f.type !== "")) {
      return failUpload("That doesn't look like a PDF. Export your roof plan as a .pdf and try again.");
    }
    if (f.size > UPLOAD_LIMITS.maxBytes) {
      return failUpload(`File is ${(f.size / 1024 / 1024).toFixed(1)} MB — the limit is 50 MB. Try exporting only the roof-plan sheets.`);
    }

    let magic = "";
    try {
      magic = String.fromCharCode(...new Uint8Array(await f.slice(0, 8).arrayBuffer()));
    } catch {
      return failUpload("We couldn't read that file. Please try again.");
    }

    const candidate = { fileName: f.name, fileSizeBytes: f.size, mimeType: "application/pdf" as const, magic };
    const check = blueprintFileSchema.safeParse(candidate);
    if (!check.success) return failUpload(check.error.issues[0]?.message ?? "Invalid file");

    setFile(check.data);
    setAnalysis(null);
    setProgress(0);
    setStage(0);
    setPhase("uploading");

    // Simulated chunked upload.
    for (let p = 0; p < 100; ) {
      await sleep(70);
      if (cancelled()) return;
      p = Math.min(100, p + 7);
      setProgress(p);
    }

    // Kick off the server analysis immediately; animate the stages alongside it.
    setPhase("analyzing");
    const request = analyzeBlueprintAction(check.data);
    for (let i = 0; i < ANALYSIS_STAGES.length; i++) {
      setStage(i);
      await sleep(600);
      if (cancelled()) return;
    }

    const result = await request;
    if (cancelled()) return;
    if (!result.ok) return failUpload(result.error);
    setAnalysis(result.data);
    setPhase("done");
  }

  function resetUpload() {
    runRef.current++;
    setPhase("idle");
    setFile(null);
    setAnalysis(null);
    setProgress(0);
    setStage(0);
    setFileError(null);
    // A different blueprint invalidates later steps.
    setStep(1);
    setMaxReached(1);
  }

  function goTo(next: Step) {
    setStep(next);
    setMaxReached((m) => (next > m ? next : m));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ───────────────────────────── Step 2 logic ───────────────────────── */

  function setField<K extends FieldName>(name: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [name]: value }));
    setServerFormError(null);
  }

  const blurField = (name: FieldName) => setTouched((t) => (t[name] ? t : { ...t, [name]: true }));

  function submitMetadata() {
    setSubmitAttempted(true);
    if (!parsed.success) {
      setFocusTick((t) => t + 1); // focus the first invalid field once errors are rendered
      return;
    }
    goTo(3);
  }

  useEffect(() => {
    if (focusTick === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [focusTick]);

  /* ───────────────────────────── Step 3 logic ───────────────────────── */

  function resetAll() {
    runRef.current++;
    setStep(1);
    setMaxReached(1);
    setPhase("idle");
    setFile(null);
    setAnalysis(null);
    setProgress(0);
    setStage(0);
    setFileError(null);
    setValues(EMPTY_FORM);
    setTouched({});
    setSubmitAttempted(false);
    setServerFormError(null);
    setGenerating(false);
    setGenStage(0);
    setGenError(null);
  }

  async function generate() {
    if (!parsed.success || !file || generating) return;
    setGenerating(true);
    setGenError(null);
    setGenStage(0);

    const ticker = setInterval(() => setGenStage((s) => Math.min(s + 1, GENERATION_STAGES.length - 1)), 420);
    const result = await createProposalAction({ file, meta: parsed.data });
    clearInterval(ticker);

    if (!result.ok) {
      setGenerating(false);
      if (result.fieldErrors && Object.keys(result.fieldErrors).some((k) => k in EMPTY_FORM)) {
        setServerFormError(result.error);
        goTo(2);
      } else {
        setGenError(result.error);
      }
      return;
    }

    setGenStage(GENERATION_STAGES.length - 1);
    const id = result.data.id;
    // Cache Components keeps this page alive in the background (Activity), so
    // clear the wizard now — returning here later starts a fresh upload.
    resetAll();
    router.push(`/dashboard/proposals/${id}`);
  }

  /* ─────────────────────────────── Render ───────────────────────────── */

  const titles: Record<Step, { title: string; sub: string }> = {
    1: { title: "Upload your roof plan", sub: "We parse every sheet to measure planes, penetrations and structure." },
    2: { title: "Describe the site", sub: "These parameters steer material takeoffs, code checks and zoning alignment." },
    3: { title: "Review & generate", sub: "Confirm everything looks right. You can edit the BOM after generation." },
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <Card className="gap-6 py-6">
        <div className="px-5 sm:px-6">
          <Stepper current={step} maxReached={maxReached} onGo={goTo} />
        </div>
        <div className="h-px bg-border" />

        <div key={step} ref={formRef} className="sp-fade-up flex flex-col gap-6 px-5 sm:px-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{titles[step].title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{titles[step].sub}</p>
          </div>

          {step === 1 && (
            <DropzoneStep
              phase={phase}
              file={file}
              progress={progress}
              stage={stage}
              analysis={analysis}
              error={fileError}
              onSelect={handleFile}
              onReset={resetUpload}
              onContinue={() => goTo(2)}
            />
          )}

          {step === 2 && (
            <MetadataStep
              values={values}
              errors={errors}
              serverError={serverFormError}
              onChange={setField}
              onBlur={blurField}
              onBack={() => goTo(1)}
              onNext={submitMetadata}
            />
          )}

          {step === 3 && file && analysis && parsed.success && (
            <ReviewStep
              fileName={file.fileName}
              fileSize={file.fileSizeBytes}
              analysis={analysis}
              meta={parsed.data}
              generating={generating}
              generationStage={genStage}
              error={genError}
              onBack={() => goTo(2)}
              onGenerate={generate}
            />
          )}
        </div>
      </Card>

      {/* Context rail */}
      <aside className="hidden flex-col gap-4 xl:flex" aria-label="How it works">
        <Card className="gap-4 p-5">
          <h3 className="text-sm font-semibold">What happens to your file</h3>
          <ul className="flex flex-col gap-4 text-sm">
            {[
              { icon: Lock, title: "Validated & encrypted", body: "Type, size and PDF signature are verified on the server before processing." },
              { icon: ScanSearch, title: "Structural analysis", body: "Roof planes, scale and obstructions are extracted from every sheet." },
              { icon: Cpu, title: "Engineered output", body: "Code checks, zoning alignment and a priced BOM are drafted automatically." },
              { icon: FileCheck2, title: "You stay in control", body: "Every quantity and unit cost remains editable before you export." },
            ].map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/12 text-brand">
                  <Icon className="size-4" />
                </span>
                <span className="leading-snug">
                  <span className="block font-medium">{title}</span>
                  <span className="text-muted-foreground">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <p className="px-1 text-xs leading-relaxed text-muted-foreground">
          Tip: export only the roof-plan and structural sheets for the fastest, most accurate takeoff.
        </p>
      </aside>
    </div>
  );
}
