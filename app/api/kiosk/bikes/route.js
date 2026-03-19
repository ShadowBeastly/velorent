// app/api/kiosk/bikes/route.js
// Public endpoint — returns available bikes for an org (kiosk mode, no auth required).
// GET /api/kiosk/bikes?org=ORG_ID

import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req) {
  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("org");

  if (!orgId) {
    return Response.json({ error: "org parameter required" }, { status: 400 });
  }

  // Fetch org info (name, logo) + available bikes
  const [orgResult, bikesResult] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, logo_url, settings")
      .eq("id", orgId)
      .single(),
    supabase
      .from("bikes")
      .select("id, name, category, price_per_day, price_per_hour, description, image_url, status, deposit_amount")
      .eq("organization_id", orgId)
      .in("status", ["available", "rented"])
      .order("name", { ascending: true }),
  ]);

  if (orgResult.error) {
    return Response.json({ error: "Organization not found" }, { status: 404 });
  }

  const org = orgResult.data;

  // Check kiosk is enabled
  if (!org.settings?.kiosk_enabled) {
    return Response.json({ error: "Kiosk mode not enabled for this organization" }, { status: 403 });
  }

  return Response.json({
    org: { id: org.id, name: org.name, logo_url: org.logo_url },
    bikes: bikesResult.data || [],
  });
}
