import { BookOpen, Network, Sparkles } from "lucide-react";
import { EXAMPLE_FIELDS } from "@/lib/constants";
import { ConceptNode } from "./concept-node";

const FEATURES = [
  {
    icon: Network,
    title: "Concept nodes",
    body: "Every area decomposes into tappable topics with instant, animated overviews.",
  },
  {
    icon: BookOpen,
    title: "Read it like a book",
    body: "Walk each tier of the hierarchy page by page, in teaching order.",
  },
  {
    icon: Sparkles,
    title: "Drill infinitely",
    body: "Map any term as its own field and follow the breadcrumb path back.",
  },
];

export function Welcome({ onStart }: { onStart: (field: string) => void }) {
  return (
    <section className="relative mx-auto max-w-3xl py-12 text-center sm:py-20">
      <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface-2/80 px-3.5 py-1.5 font-mono text-[11px] tracking-[0.16em] text-mute uppercase">
        <span className="h-1.5 w-1.5 rounded-full bg-aqua" aria-hidden /> Field Atlas
      </p>
      <h1 className="mt-5 text-4xl leading-[1.08] font-semibold tracking-tight sm:text-6xl">
        Map any field of <span className="text-gradient">knowledge</span>.
      </h1>
      <p className="mx-auto mt-5 max-w-2xl leading-7 text-mute sm:text-lg sm:leading-8">
        Name any field and get its complete map: every area and subtopic, the core equations, open problems, how the
        parts connect, the best learning order, and a full vocabulary. Tap any topic for a quick overview, then choose
        to map it.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {EXAMPLE_FIELDS.map((f) => (
          <ConceptNode key={f} label={f} title={`Map ${f}`} onClick={() => onStart(f)} />
        ))}
      </div>

      <div className="mt-14 grid gap-3 text-left sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl border border-line bg-surface/70 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Icon className="h-4.5 w-4.5" aria-hidden />
            </div>
            <h2 className="mt-3 text-sm font-semibold">{title}</h2>
            <p className="mt-1 text-sm leading-5 text-mute">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
