import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WIZARD_STEPS } from "./types";

interface StepperProps {
  current: 1 | 2 | 3;
  /** Highest step the user is allowed to jump back/forward to. */
  maxReached: 1 | 2 | 3;
  onGo: (step: 1 | 2 | 3) => void;
}

export function Stepper({ current, maxReached, onGo }: StepperProps) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3" aria-label="Progress">
      {WIZARD_STEPS.map((step, i) => {
        const done = step.id < current;
        const active = step.id === current;
        const reachable = step.id <= maxReached && !active;
        return (
          <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onGo(step.id)}
              aria-current={active ? "step" : undefined}
              className={cn(
                "group flex min-w-0 items-center gap-3 rounded-lg p-1 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                reachable && "cursor-pointer",
              )}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full border text-sm font-semibold transition-all duration-300",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary bg-primary/15 text-brand shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_15%,transparent)]",
                  !done && !active && "border-border bg-card text-muted-foreground",
                  reachable && "group-hover:border-primary/60",
                )}
              >
                {done ? <Check className="size-4" strokeWidth={3} /> : step.id}
              </span>
              <span className="hidden min-w-0 leading-tight md:block">
                <span className={cn("block truncate text-sm font-medium", !active && !done && "text-muted-foreground")}>
                  {step.title}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{step.caption}</span>
              </span>
            </button>
            {i < WIZARD_STEPS.length - 1 && (
              <span className="relative h-px flex-1 bg-border" aria-hidden>
                <span
                  className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-500"
                  style={{ width: done ? "100%" : "0%" }}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
