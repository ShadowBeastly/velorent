/**
 * CORS helper for /api/public/* routes.
 * Reads widget_allowed_domains from the organization and validates the request Origin.
 * Returns { allowed, headers } - if not allowed, respond with 403.
 */

import { createClient } from "@supabase/supabase-js";

// SEC-12: Require service_role key — do not fall back to anon key
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = serviceRoleKey
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
      serviceRoleKey
    )
  : null;

/**
 * Resolves CORS headers for a widget request.
 * @param {Request} req
 * @param {string} tenantId
 * @returns {{ allowed: boolean, headers: Record<string, string> }}
 */
export async function resolveWidgetCors(req, tenantId) {
  // SEC-12: If service_role key is missing, block all widget requests
  if (!supabaseAdmin) {
    return { allowed: false, headers: {} };
  }

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
  // SEC-05: Empty domain list = blocked (not allow-all). Orgs must configure domains.
  const originAllowed = domains.length > 0 && domains.includes(origin);

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
