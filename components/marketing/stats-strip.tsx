const STATS = [
  { value: "6", label: "Material families", note: "TPO, EPDM, mod-bit, metal and two solar PV systems" },
  { value: "6", label: "Code checklist items", note: "Wind, snow, dead load, fire, listing, drainage" },
  { value: "4", label: "Zoning checklist items", note: "Setbacks, height, coverage, permitting" },
  { value: "1", label: "Editable source of truth", note: "BOM and proposal narrative stay in sync" },
] as const;

export function StatsStrip() {
  return (
    <section aria-label="At a glance" className="border-y border-border bg-card/40 px-4 py-10 sm:px-6">
      <dl className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="flex flex-col">
            {/* DOM order is term → details; `order-*` shows the big number first. */}
            <dt className="order-2 mt-1 text-sm font-medium">{s.label}</dt>
            <dd className="num order-1 text-4xl font-semibold tracking-tight text-gradient-amber">
              {s.value}
            </dd>
            <dd className="order-3 mt-1 text-xs leading-relaxed text-muted-foreground">{s.note}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
