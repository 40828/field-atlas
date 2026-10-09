"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Check, Crown } from "lucide-react";
import { useAtlas } from "@/components/providers/atlas-provider";
import { lockScroll } from "@/lib/scroll-lock";
import { UpgradeLink } from "./upgrade-link";

const PERKS = [
  "Unlimited field maps and drill-downs",
  "Full book-style reader for every tier",
  "Priority access to new visual scenes",
];

export function PaywallModal() {
  const { paywallOpen, limit } = useAtlas();
  const ctaRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!paywallOpen) return;
    const unlock = lockScroll();
    const id = window.setTimeout(() => ctaRef.current?.focus(), 60);
    return () => {
      window.clearTimeout(id);
      unlock();
    };
  }, [paywallOpen]);

  if (!paywallOpen) return null;

  return (
    <div
      className="anim-fade fixed inset-0 z-[100] flex items-center justify-center bg-[#04060c]/75 p-5 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
      aria-describedby="paywall-desc"
    >
      <div className="anim-modal relative w-full max-w-md overflow-hidden rounded-3xl border border-line-strong bg-surface p-8 text-center shadow-[0_30px_90px_rgba(0,0,0,0.6)]">
        <div className="brand-gradient absolute inset-x-0 top-0 h-1" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />

        <div className="brand-gradient relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-[0_10px_30px_rgba(91,120,255,0.4)]">
          <Crown className="h-7 w-7" aria-hidden />
        </div>

        <p className="relative font-mono text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">
          Field Atlas Pro
        </p>
        <h2 id="paywall-title" className="relative mt-2 text-2xl font-semibold tracking-tight">
          You&apos;ve reached your free limit.
        </h2>
        <p id="paywall-desc" className="relative mt-2 text-sm leading-6 text-mute">
          You&apos;ve used all {limit} free maps. Upgrade to Pro for unlimited mapping access.
        </p>

        <ul className="relative mx-auto mt-5 max-w-xs space-y-2 text-left text-sm text-ink/90">
          {PERKS.map((p) => (
            <li key={p} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full bg-ok/20 text-ok">
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
              </span>
              {p}
            </li>
          ))}
        </ul>

        <UpgradeLink
          ref={ctaRef}
          id="paywall-upgrade"
          className="brand-gradient group relative mt-7 flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-base font-semibold text-white shadow-[0_10px_28px_rgba(91,120,255,0.4)] transition hover:brightness-110 focus-visible:outline-offset-4"
        >
          Upgrade to Pro
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
        </UpgradeLink>

        <p className="relative mt-4 font-mono text-xs text-mute">
          {limit} of {limit} free maps used
        </p>
      </div>
    </div>
  );
}
