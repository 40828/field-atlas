import { FREE_MAP_LIMIT } from "@/lib/constants";
import { readState } from "@/lib/server/state";

/** What the server believes about this browser: Pro status and free maps used. */
export async function GET() {
  const state = await readState();
  return Response.json(
    { pro: state.pro, count: Math.min(state.n, FREE_MAP_LIMIT), limit: FREE_MAP_LIMIT },
    { headers: { "Cache-Control": "no-store" } },
  );
}
