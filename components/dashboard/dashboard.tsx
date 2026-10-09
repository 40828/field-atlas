"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAtlas } from "@/components/providers/atlas-provider";
import { loadExtras, loadMap } from "@/lib/atlas/client";
import type { Tier } from "@/lib/atlas/types";
import { lockScroll } from "@/lib/scroll-lock";
import { MapView } from "./map-view";
import { Reader } from "./reader";
import { Sidebar } from "./sidebar";
import { TermSheet } from "./term-sheet";
import { Topbar } from "./topbar";
import { Welcome } from "./welcome";

interface Nav {
  path: string[];
  /** Unique per navigation action so usage is counted exactly once. */
  id: number;
  /** Whether finishing this navigation consumes one free map. */
  counted: boolean;
}

interface ReaderState {
  tiers: Tier[];
  tier: number;
}

const MAX_RECENT = 6;

export function Dashboard() {
  const { gate, recordMap } = useAtlas();

  const [nav, setNav] = useState<Nav | null>(null);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("");
  const [term, setTerm] = useState<string | null>(null);
  const [reader, setReader] = useState<ReaderState | null>(null);
  const [recent, setRecent] = useState<string[][]>([]);

  const seq = useRef(0);
  const countedIds = useRef(new Set<number>());

  const openMap = useCallback((path: string[], counted: boolean) => {
    // Kick both requests off immediately so they run in parallel.
    loadMap(path).catch(() => {});
    loadExtras(path).catch(() => {});

    setTerm(null);
    setReader(null);
    setNav({ path, id: ++seq.current, counted });
    setRecent((prev) => {
      const key = path.join(" > ");
      return [path, ...prev.filter((p) => p.join(" > ") !== key)].slice(0, MAX_RECENT);
    });
    window.scrollTo({ top: 0 });
  }, []);

  /** Start a fresh map from a field name (free-tier gated). */
  const start = useCallback(
    (raw: string) => {
      const field = raw.trim();
      if (!field) return;
      if (!gate()) return;
      setDraft(field);
      openMap([field], true);
    },
    [gate, openMap],
  );

  /** Map a term as its own sub-field (free-tier gated). */
  const drill = useCallback(
    (t: string) => {
      if (!nav) return;
      if (!gate()) return;
      openMap([...nav.path, t], true);
    },
    [gate, nav, openMap],
  );

  /** Count one map the first time its content has rendered. */
  const handleReady = useCallback(() => {
    if (!nav?.counted) return;
    if (countedIds.current.has(nav.id)) return;
    countedIds.current.add(nav.id);
    recordMap();
  }, [nav, recordMap]);

  const closeReader = useCallback(() => setReader(null), []);
  const closeTerm = useCallback(() => setTerm(null), []);

  // Escape closes the top-most layer: term sheet, then reader.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (term) setTerm(null);
      else if (reader) setReader(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [term, reader]);

  // Lock page scroll behind the reader.
  useEffect(() => {
    if (!reader) return;
    return lockScroll();
  }, [reader]);

  const path = nav?.path ?? [];
  const activeKey = nav ? nav.path.join(" > ") : null;

  return (
    <div className="aurora relative min-h-screen lg:flex">
      <div className="grid-fade pointer-events-none absolute inset-x-0 top-0 h-[480px]" aria-hidden />

      <Sidebar
        hasMap={!!nav}
        recent={recent}
        activeKey={activeKey}
        onNew={() => {
          setNav(null);
          setReader(null);
          setTerm(null);
          setDraft("");
        }}
        onOpenRecent={(p) => openMap(p, false)}
      />

      <div className="relative min-w-0 flex-1">
        <Topbar
          draft={draft}
          filter={filter}
          path={path}
          onDraft={setDraft}
          onFilter={setFilter}
          onSubmit={() => start(draft)}
          onCrumb={(i) => nav && openMap(nav.path.slice(0, i + 1), false)}
        />

        <main className="mx-auto max-w-5xl px-4 pt-6 pb-24 sm:px-6">
          {nav ? (
            <MapView
              key={nav.id}
              path={nav.path}
              filter={filter}
              onOpenTerm={setTerm}
              onOpenReader={(tiers, tier) => setReader({ tiers, tier })}
              onReady={handleReady}
            />
          ) : (
            <Welcome onStart={start} />
          )}
        </main>
      </div>

      {nav && reader && (
        <Reader
          path={nav.path}
          tiers={reader.tiers}
          tier={reader.tier}
          onClose={closeReader}
          onTier={(tier) => setReader({ tiers: reader.tiers, tier })}
          onOpenTerm={setTerm}
        />
      )}

      {nav && term && (
        <TermSheet
          term={term}
          path={nav.path}
          onClose={closeTerm}
          onOpenTerm={setTerm}
          onMap={drill}
        />
      )}
    </div>
  );
}
