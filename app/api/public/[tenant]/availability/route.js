import { createClient } from "@supabase/supabase-js";
import { resolveWidgetCors, corsPreflightResponse } from "../../_cors";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"
);

export async function OPTIONS(req, { params }) {
  const { headers } = await resolveWidgetCors(req, params.tenant);
  return corsPreflightResponse(headers);
}

/**
 * GET /api/public/[tenant]/availability?bikeId=UUID&start=YYYY-MM-DD&end=YYYY-MM-DD
 */
export async function GET(req, { params }) {
  const { allowed, headers } = await resolveWidgetCors(req, params.tenant);

  if (!allowed) {
    return new Response(JSON.stringify({ error: "Widget not enabled or origin not allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { searchParams } = new URL(req.url);
  const bikeId = searchParams.get("bikeId");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!bikeId || !start || !end) {
    return new Response(JSON.stringify({ error: "bikeId, start and end are required" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const { data, error } = await supabase.rpc("check_public_availability", {
    p_tenant:  params.tenant,
    p_bike_id: bikeId,
    p_start:   start,
    p_end:     end,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const result = Array.isArray(data) ? data[0] : data;

  return new Response(JSON.stringify(result ?? { available: false, conflict_count: 0 }), {
    status: 200,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
