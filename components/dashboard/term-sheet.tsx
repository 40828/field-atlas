"use client";

import { use, useEffect, useRef } from "react";
import { Map as MapIcon, X } from "lucide-react";
import { loadTerm } from "@/lib/atlas/client";
import { AnimatedScene } from "@/components/atlas/animated-scene";
import { TermIconGlyph } from "@/components/atlas/term-icon";
import { Async } from "@/components/ui/async-boundary";
import { ConceptNode } from "./concept-node";

interface TermSheetProps {
  term: string;
  path: string[];
  onClose: () => void;
  onOpenTerm: (term: string) => void;
  onMap: (term: string) => void;
}

/** Side drawer (bottom sheet on mobile) with a quick overview of a concept node. */
export function TermSheet({ term, path, onClose, onOpenTerm, onMap }: TermSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, [term]);

  return (
    <>
      <div className="anim-fade fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Overview of ${term}`}
        className="anim-sheet fixed right-0 bottom-0 z-50 flex max-h-[85vh] w-full flex-col rounded-t-3xl border border-line-strong bg-surface shadow-[0_-20px_60px_rgba(0,0,0,0.5)] outline-none md:inset-y-0 md:max-h-none md:w-[440px] md:rounded-none md:rounded-l-3xl"
      >
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-[11px] tracking-wider text-mute uppercase">{path.join(" › ")}</p>
            <h2 className="mt-0.5 text-xl font-semibold tracking-tight">{term}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close overview"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-line-strong text-mute transition hover:border-accent hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <Async key={term} label="Getting a quick overview...">
            <TermBody term={term} path={path} onOpenTerm={onOpenTerm} />
          </Async>
        </div>

        <div className="flex gap-2.5 border-t border-line px-5 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))]">
          <button
            type="button"
            onClick={() => onMap(term)}
            className="brand-gradient flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(91,120,255,0.3)] transition hover:brightness-110"
          >
            <MapIcon className="h-4 w-4" aria-hidden /> Map this term
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line-strong px-4 py-2.5 text-sm font-semibold transition hover:border-accent"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}

function TermBody({
  term,
  path,
  onOpenTerm,
}: {
  term: string;
  path: string[];
  onOpenTerm: (t: string) => void;
}) {
  const d = use(loadTerm(path, term));

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="flex h-[68px] w-[68px] flex-none items-center justify-center rounded-2xl border border-line-strong bg-canvas/70">
          <TermIconGlyph icon={d.icon} />
        </div>
        <p className="text-4xl leading-none" aria-hidden>
          {d.emoji}
        </p>
      </div>

      <AnimatedScene strs={[term, path.join(" ")]} />

      <p className="leading-7 text-ink/90">{d.summary}</p>

      {d.keyIdeas.length > 0 && (
        <>
          <Heading>Key ideas</Heading>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-ink/90 marker:text-accent">
            {d.keyIdeas.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </>
      )}

      {d.equation && (
        <>
          <Heading>Key equation</Heading>
          <code className="block overflow-x-auto rounded-lg bg-tint px-3 py-2 font-mono text-[15px] text-aqua">
            {d.equation}
          </code>
        </>
      )}

      {d.example && (
        <>
          <Heading>Example</Heading>
          <p className="text-sm leading-6 text-ink/90">{d.example}</p>
        </>
      )}

      {d.related.length > 0 && (
        <>
          <Heading>Related terms</Heading>
          <div className="flex flex-wrap gap-1.5">
            {d.related.map((r) => (
              <ConceptNode key={r} label={r} onClick={() => onOpenTerm(r)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Heading({ children }: { children: string }) {
  return (
    <div className="mt-5 mb-1.5 text-xs font-bold tracking-[0.1em] text-aqua uppercase">{children}</div>
  );
}
