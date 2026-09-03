import {
  deleteAllExtensionApplications,
  extensionApplicationSchema,
  getExtensionAiConsent,
  getExtensionApplications,
  upsertExtensionApplication,
  toExtensionApplication,
} from "@/lib/extension/applications";
import { routeError } from "@/lib/http/api";
import {
  getAuthContextFromRequest,
  requireBearerAuth,
} from "@/lib/supabase/request-client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    requireBearerAuth(request);
    const auth = await getAuthContextFromRequest(request);
    const body = extensionApplicationSchema.parse(await request.json());
    const result = await upsertExtensionApplication(auth, body);

    if (result.duplicate) {
      return Response.json(
        {
          ok: false,
          duplicate: result.duplicate,
          message: "You already tracked a job with this description.",
        },
        { status: 409 },
      );
    }

    const hasAiConsent = await getExtensionAiConsent(auth);

    return Response.json(
      {
        ok: true,
        application: toExtensionApplication(result.application!),
        aiConsent: hasAiConsent,
      },
      { status: result.application && body.id ? 200 : 201 },
    );
  } catch (error) {
    return routeError(error);
  }
}

export async function GET(request: Request) {
  try {
    requireBearerAuth(request);
    const auth = await getAuthContextFromRequest(request);
    const url = new URL(request.url);
    const full = url.searchParams.get("full") === "true";
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : full ? undefined : 10;
    const applications = await getExtensionApplications(auth, {
      full,
      limit: limit && Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : undefined,
    });
    return Response.json({ applications });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    requireBearerAuth(request);
    const auth = await getAuthContextFromRequest(request);
    await deleteAllExtensionApplications(auth);
    return Response.json({ ok: true });
  } catch (error) {
    return routeError(error);
  }
}
