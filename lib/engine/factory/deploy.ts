import "server-only";
import { deployConfigured } from "../config";
import { ConfigError, RetryableError, errorMessage } from "../errors";

/**
 * Deploy a generated file set as a Vercel deployment using a dedicated token.
 * Always called only after a human approval row exists for this task.
 */
export async function deployGeneratedProject(files: Record<string, string>, name: string): Promise<{
  url: string | null;
  deploymentId: string;
  readyState: string;
}> {
  if (!deployConfigured()) {
    throw new ConfigError(
      "Deployment is not configured.",
      "Create a Vercel access token and set ENGINE_VERCEL_DEPLOY_TOKEN (optional ENGINE_VERCEL_TEAM_ID).",
    );
  }

  const token = process.env.ENGINE_VERCEL_DEPLOY_TOKEN!;
  const team = process.env.ENGINE_VERCEL_TEAM_ID;
  const qs = team ? `?teamId=${encodeURIComponent(team)}` : "";

  const fileEntries = Object.entries(files).map(([file, data]) => ({
    file,
    data: Buffer.from(data).toString("base64"),
    encoding: "base64" as const,
  }));

  const res = await fetch(`https://api.vercel.com/v13/deployments${qs}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 40) || "ame-prototype",
      files: fileEntries,
      projectSettings: { framework: null },
    }),
  });

  if (res.status === 429 || res.status >= 500) throw new RetryableError(`Vercel deploy API responded ${res.status}`);
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401 || res.status === 403) {
      throw new ConfigError(`Vercel rejected the deploy token (${res.status}).`, "Rotate ENGINE_VERCEL_DEPLOY_TOKEN and confirm team access.");
    }
    throw new RetryableError(`Vercel deploy API responded ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as { id: string; url?: string; readyState?: string };
  return { url: json.url ? `https://${json.url}` : null, deploymentId: json.id, readyState: json.readyState ?? "QUEUED" };
}

export async function verifyDeployment(url: string): Promise<{ ok: boolean; status: number | null; error?: string }> {
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(15_000) });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, status: null, error: errorMessage(err) };
  }
}
