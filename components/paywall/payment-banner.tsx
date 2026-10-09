"use client";

import { useSyncExternalStore } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import * as usage from "@/lib/usage-store";

/**
 * Full-width banner at the top of the dashboard after returning from Stripe:
 * green when the payment was verified, red when it couldn't be.
 */
export function PaymentBanner() {
  const kind = useSyncExternalStore(usage.subscribe, usage.getBanner, () => null);
  if (!kind) return null;

  const ok = kind === "success";

  return (
    <div
      role={ok ? "status" : "alert"}
      className={`anim-drop fixed inset-x-0 top-0 z-[90] flex items-center justify-center gap-3 border-b border-white/10 px-4 py-3.5 pt-[calc(0.875rem+env(safe-area-inset-top,0px))] text-sm font-semibold text-white ${
        ok
          ? "bg-gradient-to-r from-[#1f9d57] via-[#27b566] to-[#1f9d57] shadow-[0_8px_30px_rgba(31,157,87,0.4)]"
          : "bg-gradient-to-r from-[#b8342d] via-[#d24339] to-[#b8342d] shadow-[0_8px_30px_rgba(210,67,57,0.4)]"
      }`}
    >
      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-white/25">
        {ok ? (
          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        )}
      </span>
      <span>
        {ok
          ? "Payment successful! Your premium mapping access has been unlocked."
          : "We couldn't verify your payment. If you were charged, contact support with your receipt."}
      </span>
      <button
        type="button"
        onClick={usage.dismissBanner}
        aria-label="Dismiss message"
        className="ml-1 flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/20 transition hover:bg-white/30"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
