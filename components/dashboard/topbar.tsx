"use client";

import { Filter, Search, Sparkles } from "lucide-react";
import { useAtlas } from "@/components/providers/atlas-provider";
import { UpgradeLink } from "@/components/paywall/upgrade-link";
import { UsageInline } from "./usage-meter";

interface TopbarProps {
  draft: string;
  filter: string;
  path: string[];
  onDraft: (v: string) => void;
  onFilter: (v: string) => void;
  onSubmit: () => void;
  onCrumb: (index: number) => void;
}

export function Topbar({ draft, filter, path, onDraft, onFilter, onSubmit, onCrumb }: TopbarProps) {
  const { isPro } = useAtlas();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/80 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl">
      <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="brand-gradient mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white lg:hidden" aria-hidden>
            FA
          </span>

          <form
            className="flex min-w-[240px] flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            <label className="relative flex-1">
              <span className="sr-only">Field to map</span>
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-mute" aria-hidden />
              <input
                type="text"
                value={draft}
                onChange={(e) => onDraft(e.target.value)}
                placeholder="Map any field: Physics, Economics, Genetics..."
                maxLength={80}
                className="w-full rounded-xl border border-line-strong bg-surface py-2.5 pr-3 pl-10 text-sm text-ink placeholder:text-mute/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </label>
            <button
              type="submit"
              className="brand-gradient flex-none rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(91,120,255,0.3)] transition hover:brightness-110"
            >
              Map it
            </button>
          </form>

          <label className="relative hidden w-48 sm:block">
            <span className="sr-only">Filter topics</span>
            <Filter className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-mute" aria-hidden />
            <input
              type="text"
              value={filter}
              onChange={(e) => onFilter(e.target.value)}
              placeholder="Filter topics..."
              className="w-full rounded-xl border border-line-strong bg-surface py-2.5 pr-3 pl-9 text-sm text-ink placeholder:text-mute/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </label>

          {!isPro && (
            <UpgradeLink
              aria-label="Upgrade to Pro"
              className="brand-gradient inline-flex flex-none items-center gap-1.5 rounded-full px-3.5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(91,120,255,0.3)] transition hover:-translate-y-px hover:brightness-110 lg:hidden"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              <span className="hidden min-[420px]:inline">Upgrade</span>
            </UpgradeLink>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <nav aria-label="Breadcrumb" className="flex min-h-5 flex-wrap items-center gap-1 text-[13px] text-mute">
            {path.map((p, i) => (
              <span key={`${p}-${i}`} className="flex items-center gap-1">
                {i > 0 && <span aria-hidden>›</span>}
                {i < path.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => onCrumb(i)}
                    className="text-accent underline-offset-2 hover:underline"
                  >
                    {p}
                  </button>
                ) : (
                  <b className="font-semibold text-ink" aria-current="page">
                    {p}
                  </b>
                )}
              </span>
            ))}
          </nav>
          <div className="lg:hidden">
            <UsageInline />
          </div>
        </div>
      </div>
    </header>
  );
}
