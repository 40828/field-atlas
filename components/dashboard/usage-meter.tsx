"use client";

import { Crown, Sparkles } from "lucide-react";
import { useAtlas } from "@/components/providers/atlas-provider";
import { UpgradeLink } from "@/components/paywall/upgrade-link";

/** Full usage card for the sidebar. */
export function UsageCard() {
  const { count, limit, remaining, isPro } = useAtlas();

  if (isPro) {
    return (
      <div className="rounded-2xl border border-ok/30 bg-ok/10 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ok">
          <Crown className="h-4 w-4" aria-hidden /> Pro unlocked
        </div>
        <p className="mt-1 text-xs leading-5 text-mute">Unlimited mapping is active on this device.</p>
      </div>
    );
  }

  const pct = Math.round((count / limit) * 100);
  const tone = remaining === 0 ? "bg-danger" : remaining <= 3 ? "bg-warn" : "brand-gradient";

  return (
    <div className="rounded-2xl border border-line-strong bg-surface-2 p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold tracking-wide text-mute uppercase">Free maps</span>
        <span className="font-mono text-sm" role="status" aria-live="polite">
          <b className={remaining === 0 ? "text-danger" : remaining <= 3 ? "text-warn" : "text-ink"}>
            {remaining}
          </b>
          <span className="text-mute">/{limit} left</span>
        </span>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-tint"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={count}
        aria-label="Free maps used"
      >
        <div className={`h-full rounded-full transition-[width] duration-700 ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <UpgradeLink className="brand-gradient mt-4 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(91,120,255,0.3)] transition hover:brightness-110">
        <Sparkles className="h-4 w-4" aria-hidden /> Upgrade to Pro
      </UpgradeLink>
    </div>
  );
}

/** Compact one-line status for the top bar (mobile). */
export function UsageInline() {
  const { remaining, limit, isPro } = useAtlas();
  if (isPro) {
    return (
      <span className="text-xs font-semibold text-ok" role="status">
        Pro: unlimited mapping unlocked
      </span>
    );
  }
  return (
    <span className="text-xs text-mute" role="status" aria-live="polite">
      Free maps remaining:{" "}
      <b className={remaining === 0 ? "text-danger" : remaining <= 3 ? "text-warn" : "text-ink"}>
        {remaining}/{limit}
      </b>
    </span>
  );
}
