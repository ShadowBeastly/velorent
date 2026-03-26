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

export async function GET(req, { params }) {
  const { allowed, headers } = await resolveWidgetCors(req, params.tenant);

  if (!allowed) {
    return new Response(JSON.stringify({ error: "Widget not enabled or origin not allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data, error } = await supabase.rpc("get_public_bikes", {
    p_tenant: params.tenant,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ bikes: data ?? [] }), {
    status: 200,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
