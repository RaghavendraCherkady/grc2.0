import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const startTime = performance.now();
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

  try {
    const dbStart = performance.now();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: dbError } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);

    checks.database = {
      status: dbError ? "unhealthy" : "healthy",
      latency: performance.now() - dbStart,
      error: dbError?.message,
    };
  } catch (error: any) {
    checks.database = {
      status: "unhealthy",
      error: error.message,
    };
  }

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    checks.openai = {
      status: openaiKey ? "configured" : "not_configured",
    };
  } catch (error: any) {
    checks.openai = {
      status: "error",
      error: error.message,
    };
  }

  const overallStatus =
    Object.values(checks).every((check) =>
      check.status === "healthy" || check.status === "configured"
    )
      ? "healthy"
      : "degraded";

  const totalLatency = performance.now() - startTime;

  return new Response(
    JSON.stringify({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      latency: totalLatency,
      checks,
      version: "1.0.0",
    }),
    {
      status: overallStatus === "healthy" ? 200 : 503,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
});
