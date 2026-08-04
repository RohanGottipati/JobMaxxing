import { createResumeImportSchema } from "@/lib/resume-imports/schemas";
import { createPasteImport, createUploadImport } from "@/lib/resume-imports/repository";
import { routeError } from "@/lib/http/api";

export async function POST(request: Request) {
  try {
    const input = createResumeImportSchema.parse(await request.json());
    if (input.sourceKind === "paste") {
      const importId = await createPasteImport(input.text);
      return Response.json({ importId }, { status: 201 });
    }
    const result = await createUploadImport(input);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}

