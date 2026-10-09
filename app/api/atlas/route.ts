import { runRequest } from "@/lib/atlas/engine";
import { parseRequest } from "@/lib/atlas/validate";

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

  return Response.json(runRequest(req));
}
