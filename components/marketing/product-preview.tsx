import { TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Section, SectionHeading } from "./section";

const CHECKS = [
  { title: "Wind uplift on roof attachments", ref: "ASCE 7-22 Ch. 26–30" },
  { title: "Existing framing: added dead load", ref: "IBC 2021 §1607" },
  { title: "Snow & drift load combinations", ref: "ASCE 7-22 Ch. 7" },
  { title: "Roof assembly fire classification", ref: "IBC 2021 §1505" },
] as const;

const BOM = [
  { cat: "Fasteners", sku: "FST-SDS-14", desc: "#14 × 2-1/2\" roofing screw w/ plate", qty: 71940, cost: 0.41 },
  { cat: "Fasteners", sku: "FST-ANC-38", desc: "3/8\" expansion anchor", qty: 233, cost: 1.92 },
  { cat: "Sealants", sku: "SLT-SEAM-10", desc: "Seam sealant, 10.1 oz cartridge", qty: 412, cost: 7.8 },
  { cat: "Reinforcement", sku: "RFT-LVL-24", desc: "Sistered LVL stiffener, 24'", qty: 18, cost: 112.5 },
] as const;

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const int = new Intl.NumberFormat("en-US");

/** Static, illustrative preview of the proposal workspace (no live data). */
export function ProductPreview() {
  const total = BOM.reduce((sum, r) => sum + r.qty * r.cost, 0);

  return (
    <Section id="preview">
      <SectionHeading
        eyebrow="The workspace"
        title="A proposal draft on the left. A live spreadsheet on the right."
        description="Edit a quantity and the total and the proposal narrative update together."
      />

      <div className="mt-14 grid gap-4 lg:grid-cols-[minmax(0,4fr)_minmax(0,5fr)]">
        {/* document pane */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="font-mono text-[10px] tracking-[0.2em] text-brand uppercase">
            03 · Code &amp; structural checklist
          </p>
          <ul className="mt-4 space-y-3">
            {CHECKS.map((c) => (
              <li
                key={c.title}
                className="flex items-start gap-3 rounded-xl border border-border bg-background/50 p-3 transition-colors hover:border-primary/30"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{c.title}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{c.ref}</p>
                </div>
                <Badge variant="warning">Verify</Badge>
              </li>
            ))}
          </ul>
        </div>

        {/* spreadsheet pane */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <p className="text-sm font-semibold">Bill of Materials</p>
            <Badge variant="outline" className="font-mono">
              {BOM.length} lines
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-sm">
              <caption className="sr-only">Sample bill of materials</caption>
              <thead>
                <tr className="bg-muted/50 text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                  {["#", "SKU", "Description", "Qty", "Unit", "Line total"].map((h, i) => (
                    <th
                      key={h}
                      scope="col"
                      className={`border-b border-border px-3 py-2 font-medium ${i >= 3 ? "text-right" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BOM.map((r, i) => (
                  <tr key={r.sku} className="transition-colors hover:bg-accent/60">
                    <td className="border-b border-border px-3 py-2.5 font-mono text-xs text-muted-foreground">
                      {i + 1}
                    </td>
                    <td className="border-b border-border px-3 py-2.5 font-mono text-xs whitespace-nowrap">{r.sku}</td>
                    <td className="border-b border-border px-3 py-2.5">{r.desc}</td>
                    <td className="num border-b border-border px-3 py-2.5 text-right">{int.format(r.qty)}</td>
                    <td className="num border-b border-border px-3 py-2.5 text-right text-muted-foreground">
                      {currency.format(r.cost)}
                    </td>
                    <td className="num border-b border-border px-3 py-2.5 text-right font-medium">
                      {currency.format(r.qty * r.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-primary/8">
                  <th scope="row" colSpan={5} className="px-3 py-3 text-right text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    Materials subtotal
                  </th>
                  <td className="num px-3 py-3 text-right text-base font-semibold text-brand">
                    {currency.format(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Illustrative sample with placeholder numbers. Unit costs in your own proposals are editable defaults.
      </p>
    </Section>
  );
}
