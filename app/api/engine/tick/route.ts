import { auth } from "@clerk/nextjs/server";
import { tickEngine } from "@/lib/engine/worker";
import { cronConfigured, databaseConfigured } from "@/lib/engine/config";

/**
 * Wake the durable worker.
 *  - `Authorization: Bearer $CRON_SECRET` processes any account (Vercel Cron / external scheduler).
 *  - A signed-in Clerk session processes only that account (in-app polling).
 */
export async function POST(request: Request) {
  if (!databaseConfigured()) return Response.json({ error: "Database is not configured." }, { status: 503 });

  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  const cronOk = Boolean(secret && header === `Bearer ${secret}`);

  let accountId: string | undefined;
  if (!cronOk) {
    const session = await auth();
    if (!session.userId) return Response.json({ error: "Unauthorized." }, { status: 401 });
    accountId = session.orgId ?? session.userId;
  } else if (!cronConfigured()) {
    return Response.json({ error: "CRON_SECRET is not set." }, { status: 401 });
  }

  const result = await tickEngine({ accountId, maxTasks: cronOk ? 3 : 1 });
  return Response.json(result);
}

export async function GET(request: Request) {
  return POST(request);
}
