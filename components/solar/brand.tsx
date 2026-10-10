import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/** Voltline logomark: amber tile with a bolt, set on a faint blueprint grid. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary text-primary-foreground shadow-[0_4px_18px_-4px_color-mix(in_oklab,var(--primary)_70%,transparent)]",
        className,
      )}
    >
      <span className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.35),transparent_55%)]" />
      <Zap className="relative size-[18px]" strokeWidth={2.5} fill="currentColor" />
    </span>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex flex-col leading-none", className)}>
      <span className="text-[15px] font-semibold tracking-tight">Voltline</span>
      <span className="mt-1 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
        Blueprint → Proposal
      </span>
    </span>
  );
}
