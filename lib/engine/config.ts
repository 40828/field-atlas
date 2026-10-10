import "server-only";

/**
 * Integration status. Reads which environment variables are PRESENT; never returns their values.
 * The UI renders this on the Integrations page and the setup screen.
 */
export interface IntegrationStatus {
  id: string;
  name: string;
  configured: boolean;
  /** Required for the core mission workflow. */
  required: boolean;
  /** Variables that must be set (names only). */
  env: string[];
  what: string;
  howToConfigure: string;
  cost: string;
}

const has = (k: string) => Boolean(process.env[k]);

export const aiConfigured = () => has("AI_GATEWAY_API_KEY") || has("VERCEL_OIDC_TOKEN");
export const databaseConfigured = () => has("DATABASE_URL") || has("POSTGRES_URL");
export const clerkConfigured = () => has("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY") && has("CLERK_SECRET_KEY");
export const braveConfigured = () => has("BRAVE_SEARCH_API_KEY");
export const gatewaySearchEnabled = () => process.env.ENGINE_GATEWAY_WEB_SEARCH === "1" && aiConfigured();
export const sandboxConfigured = () => has("VERCEL_OIDC_TOKEN") || (has("VERCEL_TOKEN") && has("VERCEL_TEAM_ID") && has("VERCEL_PROJECT_ID"));
export const deployConfigured = () => has("ENGINE_VERCEL_DEPLOY_TOKEN");
export const stripeConfigured = () => has("STRIPE_SECRET_KEY");
export const cronConfigured = () => has("CRON_SECRET");

export function integrationStatuses(): IntegrationStatus[] {
  const dbOk = has("DATABASE_URL") || has("POSTGRES_URL");
  return [
    {
      id: "clerk",
      name: "Authentication (Clerk)",
      configured: clerkConfigured(),
      required: true,
      env: ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"],
      what: "Sign-in, sessions and organization tenancy.",
      howToConfigure: "Create a Clerk application (free tier), copy the publishable and secret keys into .env.local and the Vercel project.",
      cost: "Free tier available",
    },
    {
      id: "database",
      name: "Database (Neon Postgres)",
      configured: dbOk,
      required: true,
      env: ["DATABASE_URL"],
      what: "Persists missions, the task queue, evidence, events and the ledger.",
      howToConfigure: "vercel integration add neon, then `vercel env pull .env.local`, then `npm run db:migrate`.",
      cost: "Free tier available",
    },
    {
      id: "ai",
      name: "AI model (Vercel AI Gateway)",
      configured: aiConfigured(),
      required: true,
      env: ["AI_GATEWAY_API_KEY  (or VERCEL_OIDC_TOKEN on Vercel / after `vercel env pull`)"],
      what: "Reasoning, research synthesis, product specs, code generation and marketing drafts.",
      howToConfigure: "Create an AI Gateway key in the Vercel dashboard and set AI_GATEWAY_API_KEY, or run `vercel env pull .env.local`.",
      cost: "Pay per token (AI Gateway credits). Free credits may apply.",
    },
    {
      id: "hn",
      name: "Research: Hacker News search",
      configured: true,
      required: false,
      env: [],
      what: "Keyless public search of Hacker News stories and comments for demand signals. Always on. Covers tech/startup topics only.",
      howToConfigure: "Nothing to configure.",
      cost: "Free",
    },
    {
      id: "brave",
      name: "Research: Brave Search API",
      configured: braveConfigured(),
      required: false,
      env: ["BRAVE_SEARCH_API_KEY"],
      what: "General web search results, used as additional evidence.",
      howToConfigure: "Create a key at brave.com/search/api and set BRAVE_SEARCH_API_KEY.",
      cost: "Free tier, then paid",
    },
    {
      id: "gateway-search",
      name: "Research: Perplexity via AI Gateway",
      configured: gatewaySearchEnabled(),
      required: false,
      env: ["ENGINE_GATEWAY_WEB_SEARCH=1"],
      what: "Web search through the AI Gateway search tool. Bills against AI Gateway credits.",
      howToConfigure: "Set ENGINE_GATEWAY_WEB_SEARCH=1 once the AI model integration works.",
      cost: "Per search",
    },
    {
      id: "sandbox",
      name: "Code sandbox (Vercel Sandbox)",
      configured: sandboxConfigured(),
      required: false,
      env: ["VERCEL_OIDC_TOKEN  (or VERCEL_TOKEN + VERCEL_TEAM_ID + VERCEL_PROJECT_ID)"],
      what: "Isolated microVMs where generated code is installed, type-checked, tested and built. Required for the software factory.",
      howToConfigure: "Run `vercel env pull .env.local` in this linked project (OIDC token), or set the three VERCEL_* variables.",
      cost: "Usage-based; Hobby includes a monthly free allotment",
    },
    {
      id: "deploy",
      name: "Deployment (Vercel API)",
      configured: deployConfigured(),
      required: false,
      env: ["ENGINE_VERCEL_DEPLOY_TOKEN", "ENGINE_VERCEL_TEAM_ID (optional)"],
      what: "Publishes a verified generated app as its own Vercel deployment. Always requires per-deployment approval.",
      howToConfigure: "Create a Vercel access token scoped to a team/project you control and set ENGINE_VERCEL_DEPLOY_TOKEN.",
      cost: "Free tier available",
    },
    {
      id: "stripe",
      name: "Subscription billing (Stripe)",
      configured: stripeConfigured() && has("STRIPE_ENGINE_WEBHOOK_SECRET"),
      required: false,
      env: ["STRIPE_SECRET_KEY", "STRIPE_ENGINE_WEBHOOK_SECRET"],
      what: "Pro/Scale subscriptions for this platform. Webhook endpoint: /api/engine/stripe/webhook.",
      howToConfigure: "Run `npm run engine:stripe-setup`, then add the webhook endpoint in Stripe and set the signing secret.",
      cost: "Stripe fees only on real charges",
    },
    {
      id: "cron",
      name: "Scheduled worker (cron)",
      configured: cronConfigured(),
      required: false,
      env: ["CRON_SECRET"],
      what: "Lets Vercel Cron or an external scheduler wake the worker at /api/engine/tick when no browser tab is open.",
      howToConfigure: "Set CRON_SECRET to a long random string. Vercel Hobby cron runs daily at most; use a Pro plan or an external scheduler for tighter intervals.",
      cost: "Free (daily) / Pro plan for frequent",
    },
    {
      id: "publishing",
      name: "Social publishing",
      configured: false,
      required: false,
      env: [],
      what: "Not implemented. Marketing assets are drafts that you publish yourself; engagement numbers are entered by you.",
      howToConfigure: "Requires platform OAuth integrations (not built).",
      cost: "—",
    },
    {
      id: "email",
      name: "Outbound email",
      configured: false,
      required: false,
      env: [],
      what: "Not implemented. Outreach is drafted and tracked; you send each message yourself.",
      howToConfigure: "Requires an email provider integration (not built).",
      cost: "—",
    },
  ];
}
