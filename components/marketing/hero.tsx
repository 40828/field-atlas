import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, PlayCircle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BlueprintPlan } from "./blueprint-plan";

const delay = (ms: number): CSSProperties => ({ "--sp-delay": `${ms}ms` }) as CSSProperties;

const PROOF_POINTS = [
  "AI takeoff from your PDF",
  "Editable, priced BOM",
  "Code & zoning checklist",
] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pt-12 pb-20 sm:px-6 sm:pt-20 sm:pb-28">
      {/* ambient background */}
      <div className="bg-blueprint pointer-events-none absolute inset-x-0 top-0 h-[34rem] opacity-70" />
      <div className="pointer-events-none absolute top-[-12rem] left-1/2 size-[40rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10">
        <div>
          <Badge
            variant="outline"
            className="sp-fade-up gap-2 rounded-full bg-card/60 px-3 py-1 backdrop-blur"
            style={delay(0)}
          >
            <span className="relative flex size-1.5">
              <span className="sp-ping absolute inline-flex size-full rounded-full bg-primary" />
              <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
            </span>
            Built for commercial solar &amp; roofing contractors
          </Badge>

          <h1
            className="sp-fade-up mt-6 text-balance text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl lg:text-[3.5rem]"
            style={delay(70)}
          >
            From blueprint to <span className="text-gradient-amber">bid-ready proposal</span> in
            minutes.
          </h1>

          <p
            className="sp-fade-up mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground"
            style={delay(140)}
          >
            Upload a roof plan. Voltline measures the roof, drafts a proposal with a priced bill
            of materials and flags every code and zoning item for your engineer to confirm, ready
            to review, edit and send.
          </p>

          <div className="sp-fade-up mt-8 flex flex-col gap-3 sm:flex-row" style={delay(210)}>
            <Button asChild size="lg" className="glow-amber">
              <Link href="/sign-up">
                Try 2 proposals free <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#preview">
                <PlayCircle /> See the workspace
              </a>
            </Button>
          </div>

          <ul
            className="sp-fade-up mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground"
            style={delay(280)}
          >
            {PROOF_POINTS.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-success" aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* product visual */}
        <div className="sp-fade-up relative" style={delay(200)}>
          <div className="glow-amber relative overflow-hidden rounded-2xl border border-border bg-card/80 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <span className="size-2.5 rounded-full bg-destructive/70" />
              <span className="size-2.5 rounded-full bg-warning/80" />
              <span className="size-2.5 rounded-full bg-success/80" />
              <span className="ml-3 truncate font-mono text-[11px] text-muted-foreground">
                harbor-point-roof-plan.pdf — analyzing
              </span>
            </div>
            <div className="relative aspect-[8/5] p-4">
              <BlueprintPlan className="size-full" />
              <div className="sp-scan-line" />
            </div>
          </div>

          {/* floating result chips */}
          <div className="absolute -bottom-9 left-3 hidden items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-xl sm:flex md:-left-6">
            <span className="grid size-9 place-items-center rounded-lg bg-success/12 text-success">
              <ShieldCheck className="size-[18px]" aria-hidden />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-medium">Code checklist drafted</p>
              <p className="num mt-0.5 text-xs text-muted-foreground">For engineer review</p>
            </div>
          </div>
          <div className="absolute -top-4 right-3 hidden items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-xl sm:flex md:-right-5">
            <span className="grid size-9 place-items-center rounded-lg bg-primary/12 text-brand">
              <FileText className="size-[18px]" aria-hidden />
            </span>
            <div className="leading-tight">
              <p className="num text-sm font-medium">Priced BOM</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Editable line by line</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
