/**
 * Browser-side data access. Every request is memoised by its JSON body so the
 * same promise can be handed to React's `use()` across renders. Failed requests
 * evict themselves, so an error-boundary retry triggers a fresh fetch.
 */
import type {
  AtlasRequest,
  BookOutline,
  BookPage,
  FieldExtras,
  FieldMap,
  OutlinePage,
  TermOverview,
  Tier,
} from "./types";
import { markLimitReached } from "@/lib/usage-store";

const cache = new Map<string, Promise<unknown>>();

async function post<T>(req: AtlasRequest): Promise<T> {
  let res: Response;
  try {
    res = await fetch("/api/atlas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
  } catch {
    throw new Error("Network error. Check your connection and retry.");
  }
  if (res.status === 402) {
    // Server says the free quota is gone: lock the UI (paywall) and stop here.
    markLimitReached();
    throw new Error("You've used all your free maps. Upgrade to continue.");
  }
  if (!res.ok) throw new Error("Something went wrong. Please retry.");
  return (await res.json()) as T;
}

function cached<T>(req: AtlasRequest): Promise<T> {
  const key = JSON.stringify(req);
  let p = cache.get(key) as Promise<T> | undefined;
  if (!p) {
    p = post<T>(req);
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

export const loadMap = (path: string[]) => cached<FieldMap>({ kind: "map", path });

export const loadExtras = (path: string[]) => cached<FieldExtras>({ kind: "extras", path });

export const loadTerm = (path: string[], term: string) =>
  cached<TermOverview>({ kind: "term", path, term });

export const loadOutline = (path: string[], tier: Tier) =>
  cached<BookOutline>({ kind: "outline", path, tier });

export const loadPage = (path: string[], tier: Tier, pages: OutlinePage[], index: number) =>
  cached<BookPage>({ kind: "page", path, tier, pages, index });
