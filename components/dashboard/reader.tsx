"use client";

import { use, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { loadOutline, loadPage } from "@/lib/atlas/client";
import type { OutlinePage, Tier } from "@/lib/atlas/types";
import { AnimatedScene } from "@/components/atlas/animated-scene";
import { VisualBlock } from "@/components/atlas/visual";
import { Async } from "@/components/ui/async-boundary";
import { ConceptNode } from "./concept-node";

interface ReaderProps {
  path: string[];
  tiers: Tier[];
  tier: number;
  onClose: () => void;
  onTier: (tier: number) => void;
  onOpenTerm: (term: string) => void;
}

/** Full-screen, book-style reader for one tier of a map. */
export function Reader({ path, tiers, tier, onClose, onTier, onOpenTerm }: ReaderProps) {
  const t = tiers[tier];
  return (
    <div
      className="anim-fade fixed inset-0 z-30 flex flex-col bg-canvas pt-[env(safe-area-inset-top,0px)]"
      role="dialog"
      aria-modal="true"
      aria-label={`Part ${t.n}: ${t.name}`}
    >
      <div className="flex items-center gap-3 border-b border-line bg-surface/80 px-4 py-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close reader"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-line-strong text-mute transition hover:border-accent hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[11px] tracking-wider text-mute uppercase">{path.join(" › ")}</p>
          <p className="truncate text-sm font-semibold text-accent">
            Part {t.n} · {t.name}
          </p>
        </div>
      </div>

      <Async key={`${path.join(">")}|${tier}`} label="Laying out this part of the book...">
        <Book {...{ path, tiers, tier, onClose, onTier, onOpenTerm }} />
      </Async>
    </div>
  );
}

function Book({ path, tiers, tier, onClose, onTier, onOpenTerm }: ReaderProps) {
  const t = tiers[tier];
  const outline = use(loadOutline(path, t));
  const pages = useMemo(() => outline.pages.slice(0, 8), [outline]);
  const n = pages.length;
  const [page, setPage] = useState(0);

  const prevTier = tier > 0 ? tiers[tier - 1] : null;
  const nextTier = tier + 1 < tiers.length ? tiers[tier + 1] : null;

  const goPrev = () => (page > 0 ? setPage(page - 1) : prevTier && onTier(tier - 1));
  const goNext = () => (page < n - 1 ? setPage(page + 1) : nextTier ? onTier(tier + 1) : onClose());

  return (
    <>
      <div key={page} className="min-h-0 flex-1 overflow-y-auto">
        <Async label={`Writing ${pages[page].title}...`}>
          <PageBody {...{ path, tier: t, pages, index: page, onOpenTerm }} />
        </Async>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line bg-surface/80 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur-xl">
        <button
          type="button"
          onClick={goPrev}
          disabled={page === 0 && !prevTier}
          className="flex items-center gap-1.5 rounded-xl border border-line-strong px-3.5 py-2 text-sm font-semibold transition hover:border-accent disabled:opacity-40 disabled:hover:border-line-strong"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {page > 0 ? "Back" : prevTier ? `Part ${prevTier.n}` : "Back"}
        </button>

        <label className="flex min-w-0 items-center gap-2 text-xs text-mute">
          <span className="hidden sm:inline">
            Page {page + 1} of {n}
          </span>
          <select
            value={page}
            onChange={(e) => setPage(Number(e.target.value))}
            aria-label="Jump to page"
            className="max-w-[46vw] rounded-lg border border-line-strong bg-surface-2 px-2 py-1.5 text-sm text-ink sm:max-w-xs"
          >
            {pages.map((p, i) => (
              <option key={p.title} value={i}>
                {i + 1}. {p.title}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={goNext}
          className="brand-gradient flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold text-white transition hover:brightness-110"
        >
          {page < n - 1 ? "Next" : nextTier ? `Part ${nextTier.n}` : "Finish"}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </>
  );
}

function PageBody({
  path,
  tier,
  pages,
  index,
  onOpenTerm,
}: {
  path: string[];
  tier: Tier;
  pages: OutlinePage[];
  index: number;
  onOpenTerm: (term: string) => void;
}) {
  const d = use(loadPage(path, tier, pages, index));
  const info = pages[index];

  // Warm the next page so "Next" feels instant.
  useEffect(() => {
    if (index + 1 < pages.length) loadPage(path, tier, pages, index + 1).catch(() => {});
  }, [path, tier, pages, index]);

  return (
    <article className="book mx-auto max-w-2xl px-5 pt-8 pb-12">
      <div className="font-sans text-[11px] font-bold tracking-[0.2em] text-accent uppercase">
        Part {tier.n} · {tier.name} · Page {index + 1}
      </div>
      <h2 className="mt-1.5 text-[2rem] leading-tight font-bold">{info.title}</h2>
      <p className="mb-5 text-mute italic">{info.summary}</p>

      <AnimatedScene strs={[info.title, tier.name, path.join(" ")]} />

      {d.paragraphs.map((p, i) => (
        <div key={i}>
          <p className="t">{p}</p>
          {i === 1 && d.visual && <VisualBlock visual={d.visual} />}
        </div>
      ))}

      <aside className="my-6 rounded-r-xl border-l-4 border-accent bg-tint px-5 py-3.5 text-[0.97rem]">
        <b className="font-sans">{d.callout.title}. </b>
        {d.callout.text}
      </aside>

      {d.equation && (
        <div className="my-4 rounded-xl border border-line-strong p-3 font-sans">
          <b className="text-sm">{d.equation.name}</b>
          <code className="mt-1.5 block overflow-x-auto rounded-lg bg-tint px-3 py-2 font-mono text-[15px] text-aqua">
            {d.equation.formula}
          </code>
        </div>
      )}

      {d.keyTerms.length > 0 && (
        <div className="mt-6 font-sans">
          <div className="mb-2 text-xs font-bold tracking-[0.1em] text-aqua uppercase">
            Key terms (click for an overview)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {d.keyTerms.map((k) => (
              <ConceptNode key={k} label={k} onClick={() => onOpenTerm(k)} />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
