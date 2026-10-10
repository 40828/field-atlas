"use client";

import { Button } from "@/components/ui/button";

export default function EngineError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">{error.message || "The page failed to load."}</p>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
