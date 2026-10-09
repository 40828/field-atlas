"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { FREE_MAP_LIMIT, PAYMENT_PARAM } from "@/lib/constants";
import * as usage from "@/lib/usage-store";

interface AtlasContextValue {
  /** Maps generated on the free tier. */
  count: number;
  limit: number;
  remaining: number;
  isPro: boolean;
  /** Free quota exhausted and not Pro. */
  locked: boolean;
  /** Paywall overlay is visible. */
  paywallOpen: boolean;
  /** Call before any map action. Returns false (and shows the paywall) if blocked. */
  gate: () => boolean;
  /** Count one successfully generated map. */
  recordMap: () => void;
}

const AtlasContext = createContext<AtlasContextValue | null>(null);

export function useAtlas(): AtlasContextValue {
  const ctx = useContext(AtlasContext);
  if (!ctx) throw new Error("useAtlas must be used inside <AtlasProvider>");
  return ctx;
}

export function AtlasProvider({ children }: { children: ReactNode }) {
  const count = useSyncExternalStore(usage.subscribe, usage.getCount, () => 0);
  const isPro = useSyncExternalStore(usage.subscribe, usage.getPro, () => false);
  const locked = !isPro && count >= FREE_MAP_LIMIT;

  const [armed, setArmed] = useState(false);
  const mappedThisSession = useRef(false);

  /* ---- Unlock listener: runs once on mount, before any user action ---- */
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get(PAYMENT_PARAM) !== "true") return;

    usage.unlockPro(); // sets Pro, resets the counter, raises the success banner

    // Strip the keyword so a refresh/share link doesn't re-trigger the unlock.
    url.searchParams.delete(PAYMENT_PARAM);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);

  /* ---- Arm the paywall once the limit is hit ---- */
  useEffect(() => {
    if (!locked) return;
    // Right after the 15th map lands, let it paint before the overlay fades in.
    const delay = mappedThisSession.current ? 700 : 0;
    const id = window.setTimeout(() => {
      // Re-read the store: a ?pay_success unlock may have landed in between.
      if (usage.getPro() || usage.getCount() < FREE_MAP_LIMIT) return;
      setArmed(true);
    }, delay);
    return () => window.clearTimeout(id);
  }, [locked]);

  const gate = useCallback(() => {
    if (usage.getPro()) return true;
    if (usage.getCount() >= FREE_MAP_LIMIT) {
      setArmed(true);
      return false;
    }
    return true;
  }, []);

  const recordMap = useCallback(() => {
    mappedThisSession.current = true;
    usage.recordMap();
  }, []);

  const value = useMemo<AtlasContextValue>(
    () => ({
      count,
      limit: FREE_MAP_LIMIT,
      remaining: Math.max(0, FREE_MAP_LIMIT - count),
      isPro,
      locked,
      paywallOpen: locked && armed,
      gate,
      recordMap,
    }),
    [count, isPro, locked, armed, gate, recordMap],
  );

  return <AtlasContext.Provider value={value}>{children}</AtlasContext.Provider>;
}
