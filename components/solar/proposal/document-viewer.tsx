"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Calendar, FileText, MapPin, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrencyWhole, formatDate, formatInt } from "@/lib/solar/format";
import { BUILDING_TYPE_LABELS, MATERIAL_LABELS } from "@/lib/solar/options";
import type { BomSummary, CheckStatus, Proposal, ProposalDocument } from "@/lib/solar/types";
import { BrandMark } from "../brand";
import { CheckBadge } from "../status-badge";

const SECTIONS = [
  { id: "summary", label: "Executive Summary" },
  { id: "dimensions", label: "Dimensions Found" },
  { id: "compliance", label: "Structural Compliance" },
  { id: "zoning", label: "Zoning Alignment" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const BAR: Record<CheckStatus, string> = {
  pass: "bg-success",
  review: "bg-warning",
  fail: "bg-destructive",
};

function SectionHeading({ index, id, children }: { index: number; id: SectionId; children: string }) {
  return (
    <h2 id={id} className="mb-4 flex scroll-mt-16 items-baseline gap-3 text-lg font-semibold tracking-tight">
      <span className="font-mono text-xs text-brand">{String(index).padStart(2, "0")}</span>
      {children}
      <span className="h-px flex-1 bg-border" />
    </h2>
  );
}

interface DocumentViewerProps {
  proposal: Proposal;
  document: ProposalDocument;
  /** Live BOM roll-up — binds `{{total}}`-style tokens in the narrative to current numbers. */
  summary: BomSummary;
  className?: string;
}

export function DocumentViewer({ proposal, document: doc, summary, className }: DocumentViewerProps) {
  const tokens: Record<string, string> = {
    total: formatCurrencyWhole(summary.total),
    hours: formatInt(summary.laborHours),
    contingency: `${Math.round(summary.contingencyRate * 100)}%`,
  };
  const bind = (text: string) => text.replace(/\{\{(\w+)\}\}/g, (m, key: string) => tokens[key] ?? m);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<SectionId>("summary");

  // Highlight the nav chip for whichever section is nearest the top of the pane.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id as SectionId);
      },
      { root, rootMargin: "-10% 0px -75% 0px", threshold: 0 },
    );
    SECTIONS.forEach((s) => {
      const el = root.querySelector(`#${s.id}`);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  function jump(id: SectionId) {
    scrollRef.current?.querySelector(`#${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const counts = doc.compliance.reduce(
    (acc, c) => ({ ...acc, [c.status]: acc[c.status] + 1 }),
    { pass: 0, review: 0, fail: 0 } as Record<CheckStatus, number>,
  );

  return (
    <section
      aria-label="Proposal document"
      className={cn("flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm", className)}
    >
      {/* Viewer toolbar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-muted/30 px-4 py-2.5 print:hidden">
        <FileText className="size-4 shrink-0 text-brand" />
        <p className="truncate text-sm font-medium">Proposal_{proposal.id}.pdf</p>
        <nav aria-label="Proposal sections" className="ml-auto flex gap-1 overflow-x-auto">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => jump(s.id)}
              aria-current={active === s.id ? "true" : undefined}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                active === s.id
                  ? "bg-primary/15 text-brand"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto scroll-smooth bg-muted/20 p-3 sm:p-5 print:overflow-visible print:bg-transparent print:p-0">
        <article className="mx-auto max-w-3xl rounded-lg border border-border bg-background px-5 py-8 shadow-sm sm:px-10 sm:py-12 print:border-0 print:shadow-none">
          {/* Cover */}
          <header className="mb-10 border-b border-border pb-8">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BrandMark className="size-8" />
                <span className="font-semibold tracking-tight">Voltline</span>
              </div>
              <Badge variant="outline" className="font-mono">{proposal.id}</Badge>
            </div>
            <p className="mb-2 font-mono text-[11px] tracking-[0.2em] text-brand uppercase">
              {BUILDING_TYPE_LABELS[proposal.buildingType]} · {MATERIAL_LABELS[proposal.material]}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{proposal.projectName}</h1>
            <p className="mt-1 text-muted-foreground">Engineering & Material Proposal</p>
            <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
              <div className="flex items-start gap-2">
                <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div><dt className="text-xs text-muted-foreground">Prepared for</dt><dd className="font-medium">{proposal.clientName}</dd></div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div><dt className="text-xs text-muted-foreground">Site</dt><dd className="font-medium">{proposal.address}</dd></div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div><dt className="text-xs text-muted-foreground">Generated</dt><dd className="font-medium">{formatDate(doc.generatedAt)}</dd></div>
              </div>
            </dl>
          </header>

          {/* 01 Executive summary */}
          <section className="mb-12">
            <SectionHeading index={1} id="summary">Executive Summary</SectionHeading>
            <div className="space-y-4 leading-7 text-pretty text-foreground/90">
              {doc.executiveSummary.map((p, i) => (
                <p key={i} className={cn(i === 0 && "text-[17px] text-foreground")}>{bind(p)}</p>
              ))}
            </div>
          </section>

          {/* 02 Dimensions */}
          <section className="mb-12">
            <SectionHeading index={2} id="dimensions">Dimensions Found</SectionHeading>
            <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
              {doc.dimensions.map((d) => (
                <div key={d.label} className="bg-background p-3.5 transition-colors hover:bg-accent/40">
                  <dt className="text-xs text-muted-foreground">{d.label}</dt>
                  <dd className="num mt-0.5 font-semibold">{d.value}</dd>
                  {d.note && <p className="mt-0.5 text-xs text-muted-foreground">{d.note}</p>}
                </div>
              ))}
            </dl>
          </section>

          {/* 03 Compliance */}
          <section className="mb-12">
            <SectionHeading index={3} id="compliance">Structural Engineering Compliance</SectionHeading>
            <div className="mb-4 flex flex-wrap gap-2 text-xs">
              <Badge variant="success">{counts.pass} passed</Badge>
              <Badge variant="warning">{counts.review} need review</Badge>
              {counts.fail > 0 && <Badge variant="destructive">{counts.fail} failed</Badge>}
            </div>
            <ul className="flex flex-col gap-3">
              {doc.compliance.map((c) => (
                <li
                  key={c.id}
                  className="relative overflow-hidden rounded-lg border border-border bg-card p-4 pl-5 transition-colors hover:border-primary/40"
                >
                  <span className={cn("absolute inset-y-0 left-0 w-1", BAR[c.status])} />
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{c.title}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                        <Scale className="size-3" /> {c.code}
                      </p>
                    </div>
                    <CheckBadge status={c.status} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{c.detail}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* 04 Zoning */}
          <section>
            <SectionHeading index={4} id="zoning">Local Zoning Alignment</SectionHeading>
            <p className="mb-4 text-sm text-muted-foreground">
              {proposal.jurisdiction} · Zoning <span className="font-mono text-foreground">{proposal.zoningCode}</span>
            </p>
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Requirement</TableHead>
                    <TableHead>Allowed</TableHead>
                    <TableHead>Proposed</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doc.zoning.map((z) => (
                    <TableRow key={z.id}>
                      <TableCell className="whitespace-normal font-medium">{z.requirement}</TableCell>
                      <TableCell className="num text-muted-foreground">{z.allowed}</TableCell>
                      <TableCell className="num whitespace-normal">{z.proposed}</TableCell>
                      <TableCell className="text-right"><CheckBadge status={z.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <footer className="mt-12 border-t border-border pt-4 text-xs text-muted-foreground">
            Generated automatically from the uploaded blueprint set. Final design requires review and seal by a
            licensed engineer of record prior to permit submission.
          </footer>
        </article>
      </div>
    </section>
  );
}
