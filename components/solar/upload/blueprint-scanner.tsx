import { cn } from "@/lib/utils";

interface BlueprintScannerProps {
  /** 0 → N analysis stages completed; drives which overlays have appeared. */
  stage: number;
  scanning: boolean;
  className?: string;
}

/**
 * Stylised roof-plan "x-ray" that fills in as structural analysis progresses.
 * Purely decorative (aria-hidden) — progress is also exposed as text.
 */
export function BlueprintScanner({ stage, scanning, className }: BlueprintScannerProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-background/70",
        className,
      )}
    >
      <div className="bg-blueprint absolute inset-0 opacity-80" />

      <svg viewBox="0 0 400 300" className="absolute inset-0 size-full">
        {/* outer walls */}
        <rect
          x="40" y="50" width="320" height="200" rx="3"
          fill="none" strokeWidth="2"
          className={cn("stroke-muted-foreground/50 transition-all duration-700", stage >= 1 && "stroke-foreground/70")}
        />
        {/* roof planes */}
        <g className={cn("transition-opacity duration-700", stage >= 3 ? "opacity-100" : "opacity-0")}>
          <rect x="52" y="62" width="150" height="176" fill="var(--primary)" fillOpacity="0.14" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="5 3" />
          <rect x="210" y="62" width="138" height="82" fill="var(--primary)" fillOpacity="0.1" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="5 3" />
          <rect x="210" y="152" width="138" height="86" fill="var(--primary)" fillOpacity="0.18" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="5 3" />
        </g>
        {/* dimension strings */}
        <g className={cn("font-mono transition-opacity duration-700", stage >= 4 ? "opacity-100" : "opacity-0")}>
          <path d="M40 270 H360 M40 264 V276 M360 264 V276" stroke="var(--info)" strokeWidth="1.2" fill="none" />
          <text x="200" y="288" textAnchor="middle" fontSize="11" fill="var(--info)">320′-0″</text>
          <path d="M18 50 V250 M12 50 H24 M12 250 H24" stroke="var(--info)" strokeWidth="1.2" fill="none" />
          <text x="12" y="150" fontSize="11" fill="var(--info)" transform="rotate(-90 12 150)" textAnchor="middle">200′-0″</text>
        </g>
        {/* penetrations */}
        <g className={cn("transition-opacity duration-700", stage >= 5 ? "opacity-100" : "opacity-0")}>
          {[
            [90, 100], [150, 180], [260, 100], [310, 200], [240, 210], [120, 120],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="9" fill="none" stroke="var(--destructive)" strokeWidth="1.5" />
              <circle cx={x} cy={y} r="2.5" fill="var(--destructive)" />
            </g>
          ))}
        </g>
        {/* load checks */}
        <g className={cn("transition-opacity duration-700", stage >= 6 ? "opacity-100" : "opacity-0")}>
          {[70, 110, 150, 190].map((y) => (
            <path key={y} d={`M56 ${y + 12} H198`} stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 6" />
          ))}
        </g>
      </svg>

      {scanning && <div className="sp-scan-line" />}
      <div className="absolute top-2 left-2 rounded bg-background/80 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase backdrop-blur">
        Sheet A-101 · Roof plan
      </div>
    </div>
  );
}
