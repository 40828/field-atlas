import "server-only";
import { gateway, generateText, stepCountIs } from "ai";
import { AI_MODEL } from "../ai";
import { braveConfigured, gatewaySearchEnabled } from "../config";
import { RetryableError } from "../errors";

/**
 * Research providers return REAL retrieved pages/posts or throw. They never synthesise results.
 * Anything they return is untrusted third-party content.
 */
export interface RawSource {
  provider: string;
  url: string;
  title: string;
  snippet: string;
  publishedAt?: string | null;
}

export interface ResearchProvider {
  id: string;
  label: string;
  available(): boolean;
  search(query: string, opts: { signal?: AbortSignal }): Promise<RawSource[]>;
}

function withTimeout(signal: AbortSignal | undefined, ms: number): AbortSignal {
  const t = AbortSignal.timeout(ms);
  return signal ? AbortSignal.any([signal, t]) : t;
}

async function getJson(url: string, init: RequestInit, signal?: AbortSignal): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: withTimeout(signal, 12_000), cache: "no-store" });
  } catch (err) {
    throw new RetryableError(`Network error contacting ${new URL(url).host}`, err);
  }
  if (res.status === 429 || res.status >= 500) throw new RetryableError(`${new URL(url).host} responded ${res.status}`);
  if (!res.ok) throw new RetryableError(`${new URL(url).host} responded ${res.status}`);
  return res.json();
}

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");

interface HnHit {
  objectID: string;
  title?: string | null;
  story_title?: string | null;
  url?: string | null;
  story_url?: string | null;
  story_text?: string | null;
  comment_text?: string | null;
  created_at?: string;
}

export const hackerNewsProvider: ResearchProvider = {
  id: "hackernews",
  label: "Hacker News (Algolia)",
  available: () => true,
  async search(query, { signal }) {
    const url = `https://hn.algolia.com/api/v1/search?${new URLSearchParams({ query, tags: "(story,comment)", hitsPerPage: "10" })}`;
    const json = (await getJson(url, { headers: { Accept: "application/json" } }, signal)) as { hits?: HnHit[] };
    return (json.hits ?? [])
      .map((h): RawSource | null => {
        const text = stripHtml(h.comment_text ?? h.story_text ?? "");
        const title = h.title ?? h.story_title ?? "";
        if (!title && !text) return null;
        return {
          provider: "hackernews",
          url: `https://news.ycombinator.com/item?id=${h.objectID}`,
          title: title || "Hacker News comment",
          snippet: text || title,
          publishedAt: h.created_at ?? null,
        };
      })
      .filter((x): x is RawSource => x !== null);
  },
};

export const braveProvider: ResearchProvider = {
  id: "brave",
  label: "Brave Search",
  available: braveConfigured,
  async search(query, { signal }) {
    const url = `https://api.search.brave.com/res/v1/web/search?${new URLSearchParams({ q: query, count: "10" })}`;
    const json = (await getJson(url, { headers: { Accept: "application/json", "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY ?? "" } }, signal)) as {
      web?: { results?: Array<{ url: string; title: string; description?: string; age?: string }> };
    };
    return (json.web?.results ?? []).map((r) => ({
      provider: "brave",
      url: r.url,
      title: stripHtml(r.title),
      snippet: stripHtml(r.description ?? r.title),
      publishedAt: r.age ?? null,
    }));
  },
};

export const gatewaySearchProvider: ResearchProvider = {
  id: "gateway-search",
  label: "Perplexity via AI Gateway",
  available: gatewaySearchEnabled,
  async search(query, { signal }) {
    try {
      const result = await generateText({
        model: AI_MODEL,
        tools: { perplexity_search: gateway.tools.perplexitySearch({ maxResults: 8 }) },
        stopWhen: stepCountIs(2),
        prompt: `Use the search tool once for this query and then stop: ${query}`,
        abortSignal: withTimeout(signal, 45_000),
      });
      const found: RawSource[] = [];
      for (const step of result.steps ?? []) {
        for (const tr of (step as { toolResults?: Array<{ output?: unknown }> }).toolResults ?? []) {
          const out = tr.output as { results?: Array<{ url: string; title: string; snippet: string; date?: string }> } | undefined;
          for (const r of out?.results ?? []) {
            found.push({ provider: "gateway-search", url: r.url, title: r.title, snippet: r.snippet, publishedAt: r.date ?? null });
          }
        }
      }
      return found;
    } catch (err) {
      throw new RetryableError(`Gateway search failed: ${(err as Error).message}`, err);
    }
  },
};

export const ALL_PROVIDERS: ResearchProvider[] = [hackerNewsProvider, braveProvider, gatewaySearchProvider];

export function activeProviders(): ResearchProvider[] {
  return ALL_PROVIDERS.filter((p) => p.available());
}
