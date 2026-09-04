import {
  deleteExtensionApplication,
  extensionApplicationPackageUpdateSchema,
  getExtensionApplication,
  saveExtensionApplicationPackage,
} from "@/lib/extension/applications";
import { routeError } from "@/lib/http/api";
import {
  getAuthContextFromRequest,
  requireBearerAuth,
} from "@/lib/supabase/request-client";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireBearerAuth(request);
    const auth = await getAuthContextFromRequest(request);
    const { id } = await context.params;
    const application = await getExtensionApplication(auth, id);
    if (!application) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Application not found." } },
        { status: 404 },
      );
    }
    return Response.json({ application });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireBearerAuth(request);
    const auth = await getAuthContextFromRequest(request);
    const { id } = await context.params;
    const body = extensionApplicationPackageUpdateSchema.parse({
      ...(await request.json()),
      id,
    });
    const result = await saveExtensionApplicationPackage(auth, body);
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
    return Response.json({
      ok: true,
      application: result.application,
      package: result.package,
    });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireBearerAuth(_request);
    const auth = await getAuthContextFromRequest(_request);
    const { id } = await context.params;
    await deleteExtensionApplication(auth, id);
    return Response.json({ ok: true });
  } catch (error) {
    return routeError(error);
  }
}
