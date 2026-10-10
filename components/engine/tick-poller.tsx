"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** While a mission is running, wake the worker and refresh the page every 8s. */
export function TickPoller() {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    const beat = async () => {
      try {
        await fetch("/api/engine/tick", { method: "POST" });
      } catch {
        /* next beat */
      }
      if (!cancelled) router.refresh();
    };
    const id = window.setInterval(beat, 8_000);
    void beat();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [router]);
  return null;
}
