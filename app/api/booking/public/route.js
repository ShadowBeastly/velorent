// app/api/booking/public/route.js
// Public booking API — no authentication required.
// GET:  Look up booking by cancellation token (?token=UUID)
// POST: Cancel booking by cancellation token + trigger Stripe refund

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
  const token = searchParams.get("token");

  if (!token) {
    return Response.json({ error: "Token required" }, { status: 400 });
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

  // 1. Cancel in DB (determines free vs partial)
  const { data: cancelResult, error: cancelErr } = await supabase.rpc(
    "cancel_booking_by_token",
    { p_token: token }
  );

  if (cancelErr) {
    return Response.json({ error: cancelErr.message }, { status: 500 });
  }

  if (cancelResult?.error) {
    return Response.json({ error: cancelResult.error }, { status: 400 });
  }

  // 2. If there's a Stripe payment intent, trigger refund via stripe-cancel Edge Function
  if (cancelResult.stripe_pi) {
    try {
      const { error: stripeErr } = await supabase.functions.invoke("stripe-cancel", {
        body: {
          booking_id: cancelResult.booking_id,
          cancellation_type: cancelResult.cancellation_type,
        },
      });
      if (stripeErr) {
        console.error("Stripe cancel failed:", stripeErr);
        // Booking is already marked cancelled in DB — log but don't fail
      }
    } catch (err) {
      console.error("Stripe cancel error:", err);
    }
  }

  // 3. Track analytics event
  try {
    await supabase.rpc("track_analytics_event", {
      p_hotel_id: null,
      p_event_type: "booking_cancelled",
      p_session_id: null,
      p_metadata: {
        booking_id: cancelResult.booking_id,
        cancellation_type: cancelResult.cancellation_type,
      },
    });
  } catch { /* non-fatal */ }

  return Response.json({
    success: true,
    booking_number: cancelResult.booking_number,
    cancellation_type: cancelResult.cancellation_type,
    refund_info:
      cancelResult.cancellation_type === "free"
        ? "full_refund"
        : "50_percent_refund",
  });
}
