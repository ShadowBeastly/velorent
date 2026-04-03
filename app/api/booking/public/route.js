// app/api/booking/public/route.js
// Public booking API. No authentication required.
// GET:  Look up booking by cancellation token (?token=UUID)
// POST: Cancel booking by cancellation token + trigger Stripe refund

import { createClient } from "@supabase/supabase-js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  const token = searchParams.get("token");

  if (!token) {
    return Response.json({ error: "Token required" }, { status: 400 });
  }

  if (!UUID_RE.test(token)) {
    return Response.json({ error: "Invalid token format" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("get_booking_by_token", {
    p_token: token,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return Response.json({ error: "Booking not found" }, { status: 404 });
  }

  return Response.json(data);
}

export async function POST(req) {
  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ error: "Server configuration error" }, { status: 500 });
  }

  const body = await req.json();
  const { token } = body;

  if (!token) {
    return Response.json({ error: "Token required" }, { status: 400 });
  }

  if (!UUID_RE.test(token)) {
    return Response.json({ error: "Invalid token format" }, { status: 400 });
  }

  const { data: bookingInfo, error: bookingErr } = await supabase.rpc("get_booking_by_token", {
    p_token: token,
  });

  if (bookingErr) {
    return Response.json({ error: bookingErr.message }, { status: 500 });
  }

  if (!bookingInfo?.booking_id) {
    return Response.json({ error: "Booking not found" }, { status: 404 });
  }

  if (bookingInfo.status === "cancelled") {
    return Response.json({ error: "Booking is already cancelled" }, { status: 400 });
  }

  const cancellationType = bookingInfo.can_cancel_free ? "free" : "partial";
  const { data: cancelResponse, error: stripeErr } = await supabase.functions.invoke("stripe-cancel", {
    body: {
      booking_id: bookingInfo.booking_id,
      cancellation_type: cancellationType,
    },
    headers: {
      "x-internal-secret": process.env.INTERNAL_FUNCTION_SECRET ?? "",
    },
  });

  if (stripeErr) {
    return Response.json({ error: stripeErr.message }, { status: 500 });
  }

  if (cancelResponse?.error) {
    return Response.json({ error: cancelResponse.error }, { status: 400 });
  }

  // 3. Track analytics event
  try {
    await supabase.rpc("track_analytics_event", {
      p_hotel_id: null,
      p_event_type: "booking_cancelled",
      p_session_id: null,
      p_metadata: {
        booking_id: bookingInfo.booking_id,
        cancellation_type: cancellationType,
      },
    });
  } catch { /* non-fatal */ }

  return Response.json({
    success: true,
    booking_number: bookingInfo.booking_number,
    cancellation_type: cancellationType,
    refund_info:
      cancellationType === "free"
        ? "full_refund"
        : "50_percent_refund",
  });
}
