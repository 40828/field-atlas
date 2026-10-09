import type { AtlasRequest, OutlinePage, Tier } from "./types";

const MAX_TEXT = 200;
const MAX_PATH = 10;
const MAX_PAGES = 8;

function str(v: unknown, max = MAX_TEXT): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > 0 && s.length <= max ? s : null;
}

function parsePath(v: unknown): string[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > MAX_PATH) return null;
  const out: string[] = [];
  for (const item of v) {
    const s = str(item, 80);
    if (!s) return null;
    out.push(s);
  }
  return out;
}

function parseTier(v: unknown): Tier | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const n = str(o.n, 12);
  const name = str(o.name);
  const desc = str(o.desc, 400);
  return n && name && desc ? { n, name, desc } : null;
}

function parsePages(v: unknown): OutlinePage[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > MAX_PAGES) return null;
  const out: OutlinePage[] = [];
  for (const item of v) {
    if (!item || typeof item !== "object") return null;
    const o = item as Record<string, unknown>;
    const title = str(o.title);
    const summary = str(o.summary, 400);
    if (!title || !summary) return null;
    out.push({ title, summary });
  }
  return out;
}

/** Validates untrusted JSON from the client into a typed request. */
export function parseRequest(body: unknown): AtlasRequest | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const path = parsePath(o.path);
  if (!path) return null;

  switch (o.kind) {
    case "map":
    case "extras":
      return { kind: o.kind, path };
    case "term": {
      const term = str(o.term, 80);
      return term ? { kind: "term", path, term } : null;
    }
    case "outline": {
      const tier = parseTier(o.tier);
      return tier ? { kind: "outline", path, tier } : null;
    }
    case "page": {
      const tier = parseTier(o.tier);
      const pages = parsePages(o.pages);
      const index = o.index;
      if (!tier || !pages) return null;
      if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index >= pages.length) {
        return null;
      }
      return { kind: "page", path, tier, pages, index };
    }
    default:
      return null;
  }
}
