/**
 * Tiny external store for the free-tier counter, Pro flag and the
 * "payment successful" banner. It is backed by localStorage (with an
 * in-memory fallback for private modes where storage throws) and is consumed
 * through useSyncExternalStore so it stays hydration-safe and syncs across tabs.
 */
import {
  COUNT_STORAGE_KEY,
  FREE_MAP_LIMIT,
  PRO_STORAGE_KEY,
} from "@/lib/constants";

const listeners = new Set<() => void>();

let memCount = 0;
let memPro = false;
let bannerVisible = false;

function emit() {
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    // key === null means storage.clear() ran in another tab.
    if (e.key === null || e.key === COUNT_STORAGE_KEY || e.key === PRO_STORAGE_KEY) {
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getCount(): number {
  let stored = 0;
  try {
    stored = parseInt(localStorage.getItem(COUNT_STORAGE_KEY) ?? "0", 10);
  } catch {
    stored = 0;
  }
  if (!Number.isFinite(stored) || stored < 0) stored = 0;
  return Math.min(FREE_MAP_LIMIT, Math.max(stored, memCount));
}

export function getPro(): boolean {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(PRO_STORAGE_KEY);
  } catch {
    stored = null;
  }
  return memPro || stored === "1";
}

export function getBannerVisible(): boolean {
  return bannerVisible;
}

function writeCount(n: number) {
  memCount = Math.min(FREE_MAP_LIMIT, Math.max(0, n));
  try {
    localStorage.setItem(COUNT_STORAGE_KEY, String(memCount));
  } catch {
    /* storage unavailable: memCount still enforces the limit this session */
  }
}

/** Counts one generated map against the free tier (no-op for Pro users). */
export function recordMap(): void {
  if (getPro()) return;
  writeCount(getCount() + 1);
  emit();
}

/** Unlocks Pro and clears the usage counter immediately. */
export function unlockPro(): void {
  memPro = true;
  try {
    localStorage.setItem(PRO_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
  writeCount(0);
  bannerVisible = true;
  emit();
}

export function dismissBanner(): void {
  bannerVisible = false;
  emit();
}
