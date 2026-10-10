import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@clerk/nextjs/server";
import { assertCanAnalyze, getEntitlement } from "@/lib/billing/entitlements";
import { UPLOAD_LIMITS } from "@/lib/solar/options";
import { ActionError } from "@/lib/solar/server/session";

/**
 * Issues short-lived client upload tokens so browsers can send PDFs straight to the private
 * Blob store (bypassing serverless body limits). The token is only minted when:
 *   - the caller is signed in,
 *   - the destination is inside that account's own prefix (`blueprints/<accountId>/`),
 *   - the account still has proposals/analyses left on its plan,
 * and it restricts the upload to a PDF no larger than the app limit.
 */
export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });
  const accountId = orgId ?? userId;

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(`blueprints/${accountId}/`) || pathname.includes("..")) {
          throw new Error("Invalid upload path.");
        }
        assertCanAnalyze(await getEntitlement(accountId));
        return {
          allowedContentTypes: [UPLOAD_LIMITS.mime],
          maximumSizeInBytes: UPLOAD_LIMITS.maxBytes,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ accountId, userId }),
        };
      },
    });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof ActionError ? err.message : "Upload couldn't be started.";
    return Response.json({ error: message }, { status: err instanceof ActionError ? 402 : 400 });
  }
}
