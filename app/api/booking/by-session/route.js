// GET /api/booking/by-session?session_id=cs_xxx
// Returns cancellation_token and booking_number for a given Stripe checkout session.
// Used by the guest confirmation page (Step 4) to display the pickup QR code
// after the webhook has created the booking.

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
  const sessionId = searchParams.get("session_id");

  if (!sessionId || !sessionId.startsWith("cs_")) {
    return Response.json({ error: "Invalid session_id" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("booking_number, cancellation_token, status, total_price, start_date, end_date")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return Response.json({ error: "Booking not found" }, { status: 404 });
  }

  return Response.json(data);
}
