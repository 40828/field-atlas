/**
 * Client-side mirror of the server's usage state.
 *
 * The signed cookie behind /api/atlas is the source of truth; this store only
 * keeps the UI instant (and in sync across tabs) via localStorage. On every page
 * load the provider overwrites it with the server's answer, so editing
 * localStorage can change what the UI shows for a moment but never what the
 * server allows.
 */
import {
  COUNT_STORAGE_KEY,
  FREE_MAP_LIMIT,
  PRO_STORAGE_KEY,
} from "@/lib/constants";

export type BannerKind = "success" | "error";

const listeners = new Set<() => void>();

let memCount = 0;
let memPro = false;
let banner: BannerKind | null = null;

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

export function getBanner(): BannerKind | null {
  return banner;
}

function writeCount(n: number) {
  memCount = Math.min(FREE_MAP_LIMIT, Math.max(0, n));
  try {
    localStorage.setItem(COUNT_STORAGE_KEY, String(memCount));
  } catch {
    /* storage unavailable: memCount still tracks usage this session */
  }
}

function writePro(pro: boolean) {
  memPro = pro;
  try {
    if (pro) localStorage.setItem(PRO_STORAGE_KEY, "1");
    else localStorage.removeItem(PRO_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Counts one generated map in the UI (the server counts independently). */
export function recordMap(): void {
  if (getPro()) return;
  writeCount(getCount() + 1);
  emit();
}

/** Replace local state with what the server says. */
export function applyServerState(state: { pro: boolean; count: number }): void {
  writePro(state.pro);
  writeCount(state.pro ? 0 : state.count);
  emit();
}

/** The server refused a map (HTTP 402): the free quota is used up. */
export function markLimitReached(): void {
  applyServerState({ pro: false, count: FREE_MAP_LIMIT });
}

/** Server verified a payment: unlock Pro, clear the counter, raise the green banner. */
export function unlockPro(): void {
  writePro(true);
  writeCount(0);
  banner = "success";
  emit();
}

export function showPaymentError(): void {
  banner = "error";
  emit();
}

export function dismissBanner(): void {
  banner = null;
  emit();
}
