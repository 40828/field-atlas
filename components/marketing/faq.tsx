import { ChevronDown } from "lucide-react";
import { Section, SectionHeading } from "./section";

const FAQS = [
  {
    q: "What file types can I upload?",
    a: "PDF roof plans and architectural sets up to 25 MB. We check the file type, size and PDF signature on our servers before anything is analyzed. Exporting only the roof-plan sheets gives the best results.",
  },
  {
    q: "How accurate is the takeoff?",
    a: "An AI model reads your drawings using their scale and dimension strings, and reports a confidence score with every analysis. It can misread a scale or miss a penetration, so spot-check the measurements against your plans. Everything downstream is editable.",
  },
  {
    q: "Does Voltline replace our structural engineer?",
    a: "No. Voltline is not engineering advice. Wind, snow, dead-load, fire and zoning items are listed as a checklist with the values your plans state (or a note that they don't) so your engineer of record and the local authority can confirm each one before permit submission.",
  },
  {
    q: "Can I change the numbers it generates?",
    a: "Yes. Every BOM line (quantity, unit cost, description) is editable in the spreadsheet-style grid. Unit costs start as default assumptions, so replace them with your supplier pricing. Totals, contingency, labor hours and the proposal narrative recalculate instantly.",
  },
  {
    q: "Which materials and building types are supported?",
    a: "Commercial, industrial and residential buildings, with six material families: standing-seam metal, TPO, EPDM, modified bitumen, and ballasted or attached solar PV.",
  },
  {
    q: "What happens to my files?",
    a: "Plans are stored in a private store tied to your account and are only read by you and by the AI model that measures them. Proposals are scoped to your account or organization.",
  },
  {
    q: "Can I export the proposal for the customer?",
    a: "Yes. Export to PDF produces a clean, light-themed document regardless of the theme you're working in, and the bill of materials downloads as CSV.",
  },
  {
    q: "How does billing work?",
    a: "Your first 2 proposals are free with no card. Paid plans start with a 14-day trial, are billed monthly or annually through Stripe, and can be changed or canceled any time from the billing portal.",
  },
] as const;

/** Native <details> accordion: keyboard accessible and works without JavaScript. */
export function Faq() {
  return (
    <Section id="faq">
      <SectionHeading eyebrow="FAQ" title="Questions estimators ask first" />

      <div className="mx-auto mt-12 max-w-3xl divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {FAQS.map(({ q, a }) => (
          <details key={q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-medium transition-colors outline-none hover:bg-accent/50 focus-visible:bg-accent/50 [&::-webkit-details-marker]:hidden">
              {q}
              <ChevronDown
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180"
              />
            </summary>
            <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
