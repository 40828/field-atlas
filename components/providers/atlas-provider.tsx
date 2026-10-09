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
import { FREE_MAP_LIMIT, PAYMENT_PARAM, SESSION_PARAM } from "@/lib/constants";
import { fetchEntitlement, verifyPayment } from "@/lib/payments-client";
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

  /*
    ---- Global mount check (runs once, before any user action) ----
    1. If Stripe just redirected back (?pay_success=true&session_id=...), ask the
       server to confirm the payment with Stripe. Only a confirmed payment unlocks
       Pro, clears the counter and shows the green banner.
    2. Otherwise (or afterwards) pull the server's view of this browser so a
       tampered localStorage can't keep the UI "unlocked".
  */
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return; // React StrictMode runs effects twice in dev
    started.current = true;

    const url = new URL(window.location.href);
    const flagged = url.searchParams.get(PAYMENT_PARAM) === "true";
    const sessionId = url.searchParams.get(SESSION_PARAM);

    if (flagged || sessionId) {
      // Strip the keywords so a refresh/shared link doesn't re-trigger anything.
      url.searchParams.delete(PAYMENT_PARAM);
      url.searchParams.delete(SESSION_PARAM);
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }

    void (async () => {
      if (flagged || sessionId) {
        const ok = sessionId ? await verifyPayment(sessionId) : false;
        if (ok) {
          usage.unlockPro();
          return;
        }
        usage.showPaymentError();
      }
      const server = await fetchEntitlement();
      if (server) usage.applyServerState(server);
    })();
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
