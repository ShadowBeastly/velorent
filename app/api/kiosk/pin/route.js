// app/api/kiosk/pin/route.js
// Public endpoint — validates a kiosk admin PIN for an org.
// POST /api/kiosk/pin  { org_id, pin }

import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req) {
  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ error: "Server configuration error" }, { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { org_id, pin } = body;
  if (!org_id || !pin) {
    return Response.json({ valid: false }, { status: 400 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", org_id)
    .single();

  const storedPin = org?.settings?.kiosk_pin;
  if (!storedPin) {
    // No PIN set — default to "1234" for initial setup
    return Response.json({ valid: pin === "1234" });
  }

  return Response.json({ valid: pin === storedPin });
}
