import { runRequest } from "@/lib/atlas/engine";
import { parseRequest } from "@/lib/atlas/validate";
import { FREE_MAP_LIMIT } from "@/lib/constants";
import { readState, writeState } from "@/lib/server/state";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const req = parseRequest(body);
  if (!req) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  // Free-tier enforcement lives here, not in the browser. Generating a new map is
  // the metered action; follow-up requests (extras, term overviews, reader pages)
  // belong to a map that was already paid for or counted.
  if (req.kind === "map") {
    const state = await readState();
    if (!state.pro) {
      if (state.n >= FREE_MAP_LIMIT) {
        return Response.json(
          { error: "free_limit_reached", message: "You've used all free maps." },
          { status: 402, headers: { "Cache-Control": "no-store" } },
        );
      }
      await writeState({ ...state, n: state.n + 1 });
    }
  }

  return Response.json(runRequest(req), { headers: { "Cache-Control": "no-store" } });
}
