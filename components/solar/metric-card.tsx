import type { CSSProperties } from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  icon: LucideIcon;
  /** Percent change vs. the previous 30 days; `null` when there is no earlier data to compare. */
  delta: number | null;
  /** When true a *negative* delta is good news (e.g. fewer pending approvals). */
  lowerIsBetter?: boolean;
  caption: string;
  /** Staggers the entrance animation. */
  index?: number;
}

export function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  delta,
  lowerIsBetter = false,
  caption,
  index = 0,
}: MetricCardProps) {
  const good = delta === null ? true : lowerIsBetter ? delta <= 0 : delta >= 0;
  const Arrow = delta !== null && delta < 0 ? ArrowDownRight : ArrowUpRight;

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

      <p className="num text-3xl font-semibold tracking-tight whitespace-nowrap">
        {value}
        {unit && <span className="ml-1 text-base font-medium text-muted-foreground">{unit}</span>}
      </p>

      <div className="flex items-center gap-2 text-xs">
        {delta !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium",
              good ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive",
            )}
          >
            <Arrow className="size-3" />
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        <span className="truncate text-muted-foreground">{caption}</span>
      </div>
    </Card>
  );
}
