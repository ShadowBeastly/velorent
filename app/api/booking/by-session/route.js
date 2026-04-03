// GET /api/booking/by-session?session_id=cs_xxx
// Returns booking details for a given Stripe checkout session.
// Used by the guest confirmation page (Step 4) to display the pickup QR code
// after the webhook has created the booking.
// SEC-02: cancellation_token is needed for the confirmation page QR code.
// Mitigations: strict session_id format check, no-cache headers, generic error messages.

import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  "Pragma": "no-cache",
};

export async function GET(req) {
  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ error: "Server error" }, { status: 500, headers: NO_CACHE_HEADERS });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");

  // Strict format: Stripe checkout session IDs are cs_ followed by alphanumeric chars
  if (!sessionId || !/^cs_[a-zA-Z0-9]{10,}$/.test(sessionId)) {
    return Response.json({ error: "Invalid request" }, { status: 400, headers: NO_CACHE_HEADERS });
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("booking_number, cancellation_token, status, total_price, start_date, end_date")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (error) {
    return Response.json({ error: "Server error" }, { status: 500, headers: NO_CACHE_HEADERS });
  }

  if (!data) {
    return Response.json({ error: "Not found" }, { status: 404, headers: NO_CACHE_HEADERS });
  }

  return Response.json(data, { headers: NO_CACHE_HEADERS });
}
