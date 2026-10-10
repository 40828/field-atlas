import { FileUp, ScanSearch, Send, type LucideIcon } from "lucide-react";
import { Section, SectionHeading } from "./section";

interface Step {
  icon: LucideIcon;
  title: string;
  body: string;
}

const STEPS: readonly Step[] = [
  {
    icon: FileUp,
    title: "Upload the plan set",
    body: "Drop in a roof plan PDF and confirm the site: address, building type, target material and local jurisdiction.",
  },
  {
    icon: ScanSearch,
    title: "We measure the roof",
    body: "A vision model reads the sheets for roof area, perimeter and penetrations, then drafts the quantities and a verification checklist for wind, snow, fire and zoning.",
  },
  {
    icon: Send,
    title: "Review, edit and send",
    body: "Tune the priced bill of materials in a spreadsheet-style grid, swap in your supplier pricing, then export a clean PDF and a CSV.",
  },
];

export function HowItWorks() {
  return (
    <Section id="how-it-works">
      <SectionHeading
        eyebrow="How it works"
        title="Three steps from PDF to purchase order"
        description="No more re-measuring in a CAD viewer, then rebuilding the same takeoff in a spreadsheet."
      />

      <ol className="relative mt-14 grid gap-6 md:grid-cols-3">
        {/* connector line (desktop) */}
        <div
          aria-hidden
          className="absolute top-12 right-[16.6%] left-[16.6%] hidden border-t border-dashed border-border md:block"
        />
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <li
            key={title}
            className="group relative rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
          >
            <div className="flex items-center gap-4">
              <span className="relative grid size-12 place-items-center rounded-xl bg-primary/12 text-brand transition-transform duration-300 group-hover:scale-105">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="font-mono text-xs tracking-[0.2em] text-muted-foreground">
                STEP 0{i + 1}
              </span>
            </div>
            <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
