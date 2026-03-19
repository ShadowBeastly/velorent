/**
 * CORS helper for /api/public/* routes.
 * Reads widget_allowed_domains from the organization and validates the request Origin.
 * Returns { allowed, headers } - if not allowed, respond with 403.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Resolves CORS headers for a widget request.
 * @param {Request} req
 * @param {string} tenantId
 * @returns {{ allowed: boolean, headers: Record<string, string> }}
 */
export async function resolveWidgetCors(req, tenantId) {
  const origin = req.headers.get("origin") || "";

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("widget_enabled, widget_allowed_domains")
    .eq("id", tenantId)
    .single();

  if (!org || !org.widget_enabled) {
    return { allowed: false, headers: {} };
  }

  const domains = org.widget_allowed_domains ?? [];
  const allowAll = domains.length === 0; // empty list = dev / allow-all
  const originAllowed = allowAll || domains.includes(origin);

  const headers = {
    "Access-Control-Allow-Origin": originAllowed
      ? origin || "*"
      : "null",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
  };

  return { allowed: originAllowed, headers };
}

/** Respond to CORS preflight OPTIONS requests. */
export function corsPreflightResponse(headers) {
  return new Response(null, { status: 204, headers });
}
