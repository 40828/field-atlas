"use client";

import { useSyncExternalStore } from "react";
import { Check, X } from "lucide-react";
import * as usage from "@/lib/usage-store";

/** Green payment confirmation shown across the top of the dashboard after ?pay_success=true. */
export function SuccessBanner() {
  const visible = useSyncExternalStore(usage.subscribe, usage.getBannerVisible, () => false);
  if (!visible) return null;

  return (
    <div
      role="status"
      className="anim-drop fixed inset-x-0 top-0 z-[90] flex items-center justify-center gap-3 border-b border-white/10 bg-gradient-to-r from-[#1f9d57] via-[#27b566] to-[#1f9d57] px-4 py-3.5 pt-[calc(0.875rem+env(safe-area-inset-top,0px))] text-sm font-semibold text-white shadow-[0_8px_30px_rgba(31,157,87,0.4)]"
    >
      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-white/25">
        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
      </span>
      <span>Payment successful! Your premium mapping access has been unlocked.</span>
      <button
        type="button"
        onClick={usage.dismissBanner}
        aria-label="Dismiss payment confirmation"
        className="ml-1 flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/20 transition hover:bg-white/30"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
