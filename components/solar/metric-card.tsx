import type { CSSProperties } from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  icon: LucideIcon;
  /** Percent change vs. previous period. */
  delta: number;
  /** When true a *negative* delta is good news (e.g. fewer pending approvals). */
  lowerIsBetter?: boolean;
  caption: string;
  /** Eight-ish points used to draw the decorative trend line. */
  series: number[];
  /** Staggers the entrance animation. */
  index?: number;
}

function sparkPath(series: number[], w = 120, h = 36) {
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const step = w / (series.length - 1);
  return series
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - 4 - ((v - min) / range) * (h - 8)).toFixed(1)}`)
    .join(" ");
}

export function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  delta,
  lowerIsBetter = false,
  caption,
  series,
  index = 0,
}: MetricCardProps) {
  const good = lowerIsBetter ? delta <= 0 : delta >= 0;
  const Arrow = delta >= 0 ? ArrowUpRight : ArrowDownRight;
  const line = sparkPath(series);

  return (
    <Card
      className="@container sp-fade-up group relative gap-3 overflow-hidden p-5 hover:border-primary/40"
      style={{ "--sp-delay": `${index * 70}ms` } as CSSProperties}
    >
      {/* hover halo */}
      <div className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-primary/0 blur-3xl transition-colors duration-500 group-hover:bg-primary/15" />

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="grid size-8 place-items-center rounded-lg bg-primary/12 text-brand transition-transform duration-300 group-hover:scale-110">
          <Icon className="size-4" />
        </span>
      </div>

      <div className="flex items-end justify-between gap-3">
        <p className="num text-3xl font-semibold tracking-tight whitespace-nowrap">
          {value}
          {unit && <span className="ml-1 text-base font-medium text-muted-foreground">{unit}</span>}
        </p>
        {/* Container query: the trend line only appears when the card is wide enough to fit it beside the value. */}
        <svg viewBox="0 0 120 36" className="hidden h-9 w-[120px] shrink-0 overflow-visible @[19rem]:block" aria-hidden>
          <path
            d={line}
            pathLength={1}
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("sp-draw", good ? "stroke-primary" : "stroke-destructive")}
          />
        </svg>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium",
            good ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive",
          )}
        >
          <Arrow className="size-3" />
          {Math.abs(delta).toFixed(1)}%
        </span>
        <span className="truncate text-muted-foreground">{caption}</span>
      </div>
    </Card>
  );
}
