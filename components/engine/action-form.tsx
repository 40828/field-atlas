"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { EngineActionResult } from "@/lib/engine/types";

export function ActionButton({
  label,
  pendingLabel,
  variant = "default",
  size = "default",
  confirm,
  run,
  onDone,
}: {
  label: string;
  pendingLabel?: string;
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
  confirm?: string;
  run: () => Promise<EngineActionResult<unknown>>;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={pending}
        onClick={async () => {
          if (confirm && !window.confirm(confirm)) return;
          setPending(true);
          setError(null);
          const result = await run();
          setPending(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          onDone?.();
          router.refresh();
        }}
      >
        {pending ? (pendingLabel ?? "Working…") : label}
      </Button>
      {error ? <span className="max-w-xs text-xs text-destructive">{error}</span> : null}
    </span>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="text-sm text-destructive">{children}</p>;
}
