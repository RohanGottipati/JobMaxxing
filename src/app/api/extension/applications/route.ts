import {
  extensionApplicationSchema,
  getExtensionAiConsent,
  getRecentExtensionApplications,
  upsertExtensionApplication,
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
        application: {
          id: result.application!.id,
          companyName: result.application!.company_name,
          roleTitle: result.application!.role_title,
          status: result.application!.status,
          dateApplied: result.application!.date_applied,
          sourceHost: result.application!.source_host,
          recruitingSeason: result.application!.recruiting_season,
        },
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
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? "10");
    const applications = await getRecentExtensionApplications(
      auth,
      Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 10,
    );
    return Response.json({ applications });
  } catch (error) {
    return routeError(error);
  }
}
