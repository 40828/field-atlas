import { auth } from "@clerk/nextjs/server";
import { listEvents } from "@/lib/engine/repo/core";
import type { EngineEventStatus } from "@/lib/engine/types";

export async function GET(request: Request) {
  const session = await auth();
  if (!session.userId) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const accountId = session.orgId ?? session.userId;
  const url = new URL(request.url);
  const status = url.searchParams.get("status") as EngineEventStatus | null;
  const events = await listEvents(accountId, {
    missionId: url.searchParams.get("missionId") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    status: status ?? undefined,
    limit: 80,
  });
  return Response.json({ events });
}
