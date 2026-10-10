import {
  Calculator,
  ClipboardCheck,
  FileSpreadsheet,
  Landmark,
  Ruler,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Section, SectionHeading } from "./section";

interface Feature {
  icon: LucideIcon;
  title: string;
  body: string;
  /** Tailwind column span on the lg grid. */
  span: string;
}

const FEATURES: readonly Feature[] = [
  {
    icon: Ruler,
    title: "Automatic dimension takeoff",
    body: "Roof area, perimeter and penetrations read from your plan set by an AI model, plus any wind, snow or framing values the drawings actually state. Anything not stated stays blank.",
    span: "lg:col-span-4",
  },
  {
    icon: ClipboardCheck,
    title: "Code & structural checklist",
    body: "Wind uplift, added dead load, snow drift, fire class, listings and drainage, each with its code reference and the values the plans do (or don't) state, ready for your engineer to confirm.",
    span: "lg:col-span-2",
  },
  {
    icon: Landmark,
    title: "Zoning & permit checklist",
    body: "Setbacks, height limits, fire access and permit pathway listed for the jurisdiction and zoning code you enter, so nothing is missed at the counter.",
    span: "lg:col-span-2",
  },
  {
    icon: FileSpreadsheet,
    title: "Excel-style bill of materials",
    body: "Brackets, fasteners, reinforcements, sealants and labor in a keyboard-friendly grid. Arrow keys, Enter to move down, add or remove rows in place.",
    span: "lg:col-span-4",
  },
  {
    icon: Calculator,
    title: "Live pricing math",
    body: "Line totals, category subtotals, contingency and labor hours recalculate on every keystroke, and the proposal narrative follows along.",
    span: "lg:col-span-3",
  },
  {
    icon: Workflow,
    title: "PDF & CSV export",
    body: "Print a clean proposal to PDF for the customer, or download the bill of materials as CSV for purchasing and your accounting tools.",
    span: "lg:col-span-3",
  },
];

export function Features() {
  return (
    <Section id="features" className="bg-card/30">
      <SectionHeading
        eyebrow="Features"
        title="Everything the estimator does, minus the busywork"
        description="A fast, consistent first draft from the same source, so your numbers always agree. You review and own the result."
      />

      <div className="mt-14 grid gap-4 lg:grid-cols-6">
        {FEATURES.map(({ icon: Icon, title, body, span }) => (
          <article
            key={title}
            className={cn(
              "group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/40",
              span,
            )}
          >
            <div className="pointer-events-none absolute -top-16 -right-16 size-44 rounded-full bg-primary/0 blur-3xl transition-colors duration-500 group-hover:bg-primary/15" />
            <span className="relative grid size-10 place-items-center rounded-lg bg-primary/12 text-brand transition-transform duration-300 group-hover:scale-110">
              <Icon className="size-[18px]" aria-hidden />
            </span>
            <h3 className="relative mt-5 text-lg font-semibold tracking-tight">{title}</h3>
            <p className="relative mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
              {body}
            </p>
          </article>
        ))}
      </div>
    </Section>
  );
}
