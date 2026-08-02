import { getSupabaseConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEALTH_TIMEOUT_MS = 5_000;

export async function GET() {
  try {
    const { url, anonKey } = getSupabaseConfig();
    const headers = {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    };
    const signal = AbortSignal.timeout(HEALTH_TIMEOUT_MS);

    const [authResponse, dataResponse] = await Promise.all([
      fetch(new URL("/auth/v1/health", url), {
        cache: "no-store",
        headers,
        signal,
      }),
      fetch(new URL("/rest/v1/applications?select=id&limit=0", url), {
        cache: "no-store",
        headers,
        signal,
      }),
    ]);

    const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);

    if (!authResponse.ok || !dataResponse.ok || !geminiConfigured) {
      console.error("[health] Dependency check failed", {
        authStatus: authResponse.status,
        dataStatus: dataResponse.status,
        geminiConfigured,
      });
      return Response.json({ status: "unhealthy" }, { status: 503 });
    }

    return Response.json({ status: "ok" });
  } catch (error) {
    console.error(
      "[health] Dependency check could not complete",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json({ status: "unhealthy" }, { status: 503 });
  }
}
