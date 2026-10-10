import { cn } from "@/lib/utils";

/**
 * Decorative engineering-style roof plan: outline, detected planes, rooftop units and
 * dimension callouts. Purely presentational (`aria-hidden`).
 */
export function BlueprintPlan({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 300"
      fill="none"
      aria-hidden
      className={cn("text-muted-foreground", className)}
    >
      {/* roof outline (L-shape) */}
      <path
        d="M40 40 H300 V120 H440 V260 H40 Z"
        className="fill-primary/5 stroke-foreground/50"
        strokeWidth={1.5}
      />
      {/* detected planes */}
      <path d="M40 150 H300 M170 40 V260 M300 120 V260" stroke="currentColor" strokeOpacity={0.35} strokeDasharray="4 4" />
      {/* rooftop units */}
      <rect x="70" y="68" width="48" height="34" rx="3" className="fill-primary/20 stroke-primary" />
      <rect x="215" y="180" width="64" height="40" rx="3" className="fill-primary/20 stroke-primary" />
      <rect x="340" y="160" width="40" height="28" rx="3" className="fill-primary/20 stroke-primary" />
      {/* drains */}
      {[
        [110, 190],
        [240, 80],
        [390, 225],
        [95, 235],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={6} stroke="currentColor" strokeOpacity={0.7} />
      ))}
      {/* dimension lines */}
      <g className="stroke-primary" strokeWidth={1}>
        <path d="M40 22 H300 M40 16 V28 M300 16 V28" />
        <path d="M24 40 V260 M18 40 H30 M18 260 H30" />
        <path d="M440 276 H40 M40 270 V282 M440 270 V282" />
      </g>
      <g className="fill-primary font-mono" fontSize={10}>
        <text x="170" y="14" textAnchor="middle">
          260′ 0″
        </text>
        <text x="12" y="150" textAnchor="middle" transform="rotate(-90 12 150)">
          220′ 0″
        </text>
        <text x="240" y="294" textAnchor="middle">
          400′ 0″
        </text>
      </g>
      <g className="fill-muted-foreground font-mono" fontSize={9}>
        <text x="70" y="62">RTU-1</text>
        <text x="215" y="174">RTU-2</text>
        <text x="340" y="154">RTU-3</text>
      </g>
    </svg>
  );
}
