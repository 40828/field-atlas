import "server-only";
import { generateText, Output } from "ai";
import type { z } from "zod";
import { aiConfigured } from "./config";
import { ConfigError, RetryableError, errorMessage } from "./errors";

/**
 * The only door between the engine and a language model. Handlers depend on this interface, so
 * tests can inject deterministic fakes and production uses the Vercel AI Gateway.
 *
 * Every call is schema-validated by the AI SDK; an invalid or empty object is surfaced as a
 * RetryableError (the orchestrator then retries with backoff) and never "papered over".
 */
export interface EngineAI {
  configured(): boolean;
  object<S extends z.ZodType>(args: {
    system: string;
    prompt: string;
    schema: S;
    maxOutputTokens?: number;
    signal?: AbortSignal;
  }): Promise<z.infer<S>>;
}

export const AI_MODEL = process.env.ENGINE_AI_MODEL ?? "anthropic/claude-sonnet-5.5";

const CONFIG_HINT =
  "Set AI_GATEWAY_API_KEY (create one in the Vercel dashboard → AI Gateway) or run `vercel env pull .env.local` in this linked project.";

function classify(err: unknown): never {
  const msg = errorMessage(err);
  const status = (err as { statusCode?: number })?.statusCode;
  if (status === 401 || status === 403 || /unauthor|invalid api key|authentication|oidc|forbidden|no api key/i.test(msg)) {
    throw new ConfigError(`The AI provider rejected the credentials: ${msg}`, CONFIG_HINT);
  }
  if (status === 402 || /credit|billing|quota exceeded|insufficient/i.test(msg)) {
    throw new ConfigError(`The AI provider reports no available credit: ${msg}`, "Add credits to your Vercel AI Gateway account, then retry the blocked task.");
  }
  throw new RetryableError(`AI provider call failed: ${msg}`, err);
}

export const gatewayAI: EngineAI = {
  configured: aiConfigured,
  async object({ system, prompt, schema, maxOutputTokens, signal }) {
    if (!aiConfigured()) throw new ConfigError("No AI provider is configured.", CONFIG_HINT);
    let output: unknown;
    try {
      const result = await generateText({
        model: AI_MODEL,
        system,
        prompt,
        output: Output.object({ schema }),
        maxOutputTokens: maxOutputTokens ?? 6_000,
        abortSignal: signal,
      });
      output = result.output;
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") throw err;
      return classify(err);
    }
    if (output === undefined || output === null) throw new RetryableError("The model returned no structured output.");
    return output as z.infer<typeof schema>;
  },
};
