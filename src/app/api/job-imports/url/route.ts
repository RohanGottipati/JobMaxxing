import { z } from "zod";

import { getApplicationById } from "@/lib/applications/repository";
import { routeError } from "@/lib/http/api";
import { importJobUrl } from "@/lib/job-intelligence/url-import";

export const runtime = "nodejs";

const requestSchema = z.object({ applicationId: z.uuid() });

export async function POST(request: Request) {
  try {
    const { applicationId } = requestSchema.parse(await request.json());
    const application = await getApplicationById(applicationId);
    if (!application) throw new Error("Application not found.");
    if (!application.jobUrl) throw new Error("JOB_URL_UNSUPPORTED");
    return Response.json(await importJobUrl(application.jobUrl));
  } catch (error) {
    return routeError(error);
  }
}
