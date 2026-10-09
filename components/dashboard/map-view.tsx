"use client";

import { use, useEffect, type CSSProperties } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { loadExtras, loadMap } from "@/lib/atlas/client";
import type { FieldExtras, FieldMap, Tier } from "@/lib/atlas/types";
import { AnimatedScene } from "@/components/atlas/animated-scene";
import { Async } from "@/components/ui/async-boundary";
import { Card } from "@/components/ui/card";
import { ConceptNode } from "./concept-node";

interface MapViewProps {
  path: string[];
  filter: string;
  onOpenTerm: (term: string) => void;
  onOpenReader: (tiers: Tier[], tier: number) => void;
  onReady: () => void;
}

export function MapView({ path, filter, onOpenTerm, onOpenReader, onReady }: MapViewProps) {
  const topic = path[path.length - 1];
  return (
    <div className="space-y-4">
      <Async label={`Mapping ${topic}...`}>
        <MapBody {...{ path, filter, onOpenTerm, onOpenReader, onReady }} />
      </Async>
      <Async label="Gathering equations, open problems and vocabulary...">
        <ExtrasBody path={path} onOpenTerm={onOpenTerm} />
      </Async>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function MapBody({ path, filter, onOpenTerm, onOpenReader, onReady }: MapViewProps) {
  const map: FieldMap = use(loadMap(path));

  // Fires once the map has actually rendered; the dashboard uses it to count usage.
  useEffect(() => {
    onReady();
  }, [onReady]);

  const q = filter.trim().toLowerCase();
  const topicCounts = map.sections.map((s) =>
    s.subsections.reduce((n, ss) => n + ss.topics.length, 0),
  );
  const maxCount = Math.max(1, ...topicCounts);
  const totalTopics = topicCounts.reduce((a, b) => a + b, 0);

  return (
    <>
      {/* Overview */}
      <Card id="overview" className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-accent/15 blur-3xl" />
        <p className="font-mono text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">Field map</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{map.title}</h1>
        <p className="mt-3 max-w-3xl leading-7 text-mute">{map.definition}</p>
        <div className="mt-4 rounded-xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm leading-6">
          <b className="text-accent">Central idea: </b>
          {map.centralIdea}
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-3 text-center sm:max-w-md">
          {[
            ["Parts", map.tiers.length],
            ["Sections", map.sections.length],
            ["Topics", totalTopics],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-line bg-canvas/50 py-2.5">
              <dd className="font-mono text-xl font-semibold">{value}</dd>
              <dt className="text-[11px] tracking-wider text-mute uppercase">{label}</dt>
            </div>
          ))}
        </dl>
      </Card>

      {/* Hierarchy */}
      <Card
        id="hier"
        title="Master hierarchy"
        sub="Overlapping tiers that organize the whole field. Open a tier to read through it like a book."
      >
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {map.tiers.map((t, i) => (
            <button
              key={t.n}
              type="button"
              onClick={() => onOpenReader(map.tiers, i)}
              className="group relative overflow-hidden rounded-xl border border-line-strong bg-surface-2 p-4 text-left transition hover:-translate-y-0.5 hover:border-accent hover:bg-tint"
            >
              <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-accent to-aqua" />
              <span className="font-mono text-[11px] tracking-[0.16em] text-accent uppercase">Part {t.n}</span>
              <span className="mt-0.5 block font-semibold">{t.name}</span>
              <span className="mt-1 block text-sm leading-5 text-mute">{t.desc}</span>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
                <BookOpen className="h-3.5 w-3.5" aria-hidden /> Read this part like a book
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* At a glance */}
      <Card id="glance" title="The field at a glance" sub="Each section sized by how many topics it holds. Click one to jump to it.">
        <div className="mt-3 space-y-0.5">
          {map.sections.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => document.getElementById(`s${i + 1}`)?.scrollIntoView()}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-tint"
            >
              <span className="w-6 flex-none font-mono text-sm font-bold text-accent">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{s.title}</span>
                <span className="mt-1 block h-2 rounded-full bg-tint">
                  <i
                    className="bar-fill"
                    style={
                      {
                        "--w": `${Math.round((topicCounts[i] / maxCount) * 100)}%`,
                        "--d": `${i * 0.07}s`,
                      } as CSSProperties
                    }
                  />
                </span>
              </span>
              <span className="w-20 flex-none text-right font-mono text-xs text-mute">{topicCounts[i]} topics</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Contents */}
      <Card id="contents" title="Contents">
        <div className="mt-3 flex flex-wrap gap-1.5">
          {map.sections.map((s, i) => (
            <a
              key={s.title}
              href={`#s${i + 1}`}
              className="rounded-full bg-tint px-3 py-1 text-xs text-ink/90 transition hover:bg-accent hover:text-[#0a0f1f]"
            >
              {i + 1}. {s.title}
            </a>
          ))}
          {[
            ["eqs", "Equations"],
            ["front", "Frontier"],
            ["conn", "How it connects"],
            ["order", "Learning order"],
            ["vocab", "Vocabulary"],
            ["index", "Knowledge index"],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-full border border-line-strong px-3 py-1 text-xs text-mute transition hover:border-accent hover:text-ink"
            >
              {label}
            </a>
          ))}
        </div>
        <p className="mt-3 text-xs text-mute">
          Tip: click any concept node for a quick overview, then choose whether to map it. Use the filter box to find topics.
        </p>
      </Card>

      {/* Sections with concept nodes */}
      {map.sections.map((s, i) => (
        <Card key={s.title} id={`s${i + 1}`}>
          <h2 className="flex items-baseline gap-2.5 text-xl font-semibold tracking-tight">
            <span className="font-mono text-accent">{i + 1}.</span>
            {s.title}
          </h2>
          <p className="mt-1 text-sm text-mute">{s.intro}</p>
          <div className="mt-2 grid gap-x-6 lg:grid-cols-[210px_1fr]">
            <div className="lg:pt-2">
              <AnimatedScene
                small
                strs={[s.title, ...s.subsections.map((x) => x.title), path.join(" ")]}
              />
            </div>
            <div>
              {s.subsections.map((ss, j) => (
                <div key={ss.title}>
                  <h3 className="mt-4 mb-2 flex items-baseline gap-2 text-[15px] font-semibold text-aqua">
                    <span className="font-mono text-xs text-accent">
                      {i + 1}.{j + 1}
                    </span>
                    {ss.title}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {ss.topics.map((t) => (
                      <ConceptNode
                        key={t}
                        label={t}
                        dim={!!q && !t.toLowerCase().includes(q)}
                        onClick={() => onOpenTerm(t)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */

function ExtrasBody({ path, onOpenTerm }: { path: string[]; onOpenTerm: (t: string) => void }) {
  const d: FieldExtras = use(loadExtras(path));
  const vocab = [...d.vocabulary].sort((a, b) => a.term.localeCompare(b.term));

  return (
    <>
      <Card id="eqs" title="Core equations, laws and principles" sub="The compact core from which the rest can be developed.">
        {d.equations.length === 0 && (
          <p className="mt-3 text-sm text-mute">This field is not built on formal equations.</p>
        )}
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {d.equations.map((q) => (
            <div key={q.name} className="rounded-xl border border-line-strong bg-surface-2 p-3.5">
              <b className="text-sm">{q.name}</b>
              <code className="my-2 block overflow-x-auto rounded-lg bg-tint px-3 py-2 font-mono text-[15px] whitespace-nowrap text-aqua">
                {q.formula}
              </code>
              <p className="text-sm leading-5 text-mute">{q.meaning}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card id="front" title="The frontier: open problems" sub="Not separate branches; questions that cut across the areas above.">
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {d.frontier.map((f) => (
            <div key={f.area} className="rounded-xl border border-line-strong p-4">
              <b className="text-sm text-accent">{f.area}</b>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-5 text-ink/90 marker:text-mute">
                {f.questions.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Card id="conn" title="How the areas connect" sub="A conceptual dependency map, not a strict sequence.">
        <div className="mt-3 grid gap-2">
          {d.connections.map((c) => (
            <div key={c.layer} className="flex gap-3 rounded-xl border border-line bg-canvas/50 px-3.5 py-2.5 text-sm">
              <b className="w-28 flex-none text-accent">{c.layer}</b>
              <span className="text-ink/90">{c.items}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card id="order" title="The order to learn it">
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-[11px] tracking-wider text-mute uppercase">
                {["Stage", "Subjects", "Core capability", "Level"].map((h) => (
                  <th key={h} className="border-b border-line px-2.5 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.stages.map((s, i) => (
                <tr key={s.subjects} className="align-top">
                  <td className="border-b border-line px-2.5 py-2 font-mono text-accent">{i + 1}</td>
                  <td className="border-b border-line px-2.5 py-2">{s.subjects}</td>
                  <td className="border-b border-line px-2.5 py-2 text-mute">{s.capability}</td>
                  <td className="border-b border-line px-2.5 py-2">
                    <span className="block h-2 w-24 rounded-full bg-tint">
                      <i
                        className="bar-fill"
                        style={
                          {
                            "--w": `${Math.round(((i + 1) / d.stages.length) * 100)}%`,
                            "--d": `${i * 0.08}s`,
                          } as CSSProperties
                        }
                      />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card id="vocab" title="Vocabulary" sub="Essential terms, A to Z. Click a term for an overview.">
        <div className="mt-3 columns-1 gap-8 text-sm leading-6 sm:columns-2">
          {vocab.map((v) => (
            <p key={v.term} className="mb-2 break-inside-avoid">
              <button
                type="button"
                onClick={() => onOpenTerm(v.term)}
                className="font-semibold text-accent hover:underline"
              >
                {v.term}
              </button>
              <span className="text-mute">: {v.def}</span>
            </p>
          ))}
        </div>
      </Card>

      <Card id="index" title="Your knowledge index" sub="For every topic in this map, keep one linked record with the same structure.">
        <ul className="mt-3 grid gap-x-8 gap-y-1.5 text-sm text-ink/90 sm:grid-cols-2">
          {[
            "Field and subfield: where it sits in the hierarchy",
            "Concepts: the ideas and objects involved",
            "Definitions and symbols: exact meanings and units",
            "Laws and equations: the governing expressions and assumptions",
            "Derivations: how each result follows from first principles",
            "Solvable models: idealized cases with known answers",
            "Methods: analytical and numerical techniques",
            "Experiments and evidence: how predictions are tested",
            "Applications: technologies and uses",
            "Open problems: limits of current understanding",
          ].map((x) => (
            <li key={x} className="flex gap-2">
              <span className="mt-2 h-1 w-1 flex-none rounded-full bg-accent" aria-hidden />
              {x}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-mute">
          Organizing principle: concepts → tools → laws → derivations → models → evidence → applications → open problems.
        </p>
      </Card>
    </>
  );
}
