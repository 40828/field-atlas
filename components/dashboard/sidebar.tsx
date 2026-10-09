"use client";

import {
  BookA,
  Compass,
  GraduationCap,
  History,
  Layers,
  ListTree,
  Network,
  Plus,
  Sigma,
  Telescope,
  BarChart3,
  Hash,
  type LucideIcon,
} from "lucide-react";
import { UsageCard } from "./usage-meter";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "#overview", label: "Overview", icon: Compass },
  { href: "#hier", label: "Master hierarchy", icon: Layers },
  { href: "#glance", label: "At a glance", icon: BarChart3 },
  { href: "#contents", label: "Contents", icon: ListTree },
  { href: "#eqs", label: "Equations", icon: Sigma },
  { href: "#front", label: "Frontier", icon: Telescope },
  { href: "#conn", label: "How it connects", icon: Network },
  { href: "#order", label: "Learning order", icon: GraduationCap },
  { href: "#vocab", label: "Vocabulary", icon: BookA },
  { href: "#index", label: "Knowledge index", icon: Hash },
];

interface SidebarProps {
  hasMap: boolean;
  recent: string[][];
  activeKey: string | null;
  onNew: () => void;
  onOpenRecent: (path: string[]) => void;
}

export function Sidebar({ hasMap, recent, activeKey, onNew, onOpenRecent }: SidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[268px] flex-none flex-col gap-6 overflow-y-auto border-r border-line bg-surface/50 p-5 backdrop-blur-xl lg:flex">
      <div className="flex items-center gap-3">
        <div className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-[0_8px_24px_rgba(91,120,255,0.35)]">
          <Compass className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <div className="text-[17px] leading-tight font-semibold tracking-tight">Field Atlas</div>
          <div className="font-mono text-[10px] tracking-[0.18em] text-mute uppercase">Knowledge maps</div>
        </div>
      </div>

      <button
        type="button"
        onClick={onNew}
        className="flex items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface-2 px-3 py-2.5 text-sm font-semibold transition hover:border-accent hover:bg-tint"
      >
        <Plus className="h-4 w-4" aria-hidden /> New map
      </button>

      {hasMap && (
        <nav aria-label="On this map" className="flex flex-col gap-0.5">
          <p className="mb-1 px-2 font-mono text-[10px] tracking-[0.18em] text-mute uppercase">On this map</p>
          {NAV.map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-mute transition hover:bg-tint hover:text-ink"
            >
              <Icon className="h-4 w-4 flex-none" aria-hidden />
              {label}
            </a>
          ))}
        </nav>
      )}

      {recent.length > 0 && (
        <div className="flex min-h-0 flex-col gap-0.5">
          <p className="mb-1 flex items-center gap-1.5 px-2 font-mono text-[10px] tracking-[0.18em] text-mute uppercase">
            <History className="h-3 w-3" aria-hidden /> Recent maps
          </p>
          {recent.map((p) => {
            const key = p.join(" > ");
            return (
              <button
                key={key}
                type="button"
                onClick={() => onOpenRecent(p)}
                title={p.join(" › ")}
                aria-current={key === activeKey ? "page" : undefined}
                className={`truncate rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-tint hover:text-ink ${
                  key === activeKey ? "bg-tint text-ink" : "text-mute"
                }`}
              >
                {p[p.length - 1]}
                {p.length > 1 && <span className="ml-1.5 text-xs text-mute/70">in {p[0]}</span>}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-auto">
        <UsageCard />
      </div>
    </aside>
  );
}
