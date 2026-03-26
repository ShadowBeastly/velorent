// supabase/functions/stripe-cancel/index.ts
// Deploy: supabase functions deploy stripe-cancel
// Processes a cancellation for a Lociva guest booking:
//   - Determines tier (free / partial / no_show) from start_date
//   - Issues Stripe refund if applicable
//   - Updates bookings.cancellation_status + bookings.status

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const ALLOWED_ORIGINS = [
  "https://lociva.de",
  "https://www.lociva.de",
  "https://rentcore.de",
  "http://localhost:3000",
];

function buildCors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
    "Vary": "Origin",
  };
}

serve(async (req) => {
  const CORS = buildCors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Auth check: require service-role JWT or internal secret
  const authHeader = req.headers.get("authorization") || "";
  const internalSecret = req.headers.get("x-internal-secret") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const functionSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const isAuthorized =
    (bearerToken && bearerToken === serviceRoleKey) ||
    (functionSecret && internalSecret === functionSecret);
  if (!isAuthorized) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  }

  try {
    const { booking_id, cancellation_type: body_cancellation_type } = await req.json();
    if (!booking_id) {
      return Response.json({ error: "booking_id required" }, { status: 400, headers: CORS });
    }

    // Fetch booking
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, status, cancellation_status, stripe_payment_intent_id, total_price, platform_commission, start_date")
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) {
      return Response.json({ error: "Booking not found" }, { status: 404, headers: CORS });
    }

    // BUG-004: The public guest-cancel route (cancel_booking_by_token RPC) already sets
    // status='cancelled' before calling this function. When cancellation_type is provided
    // in the body, we trust it and skip the already-cancelled guard so the Stripe refund
    // can still be issued.
    // BUG-004/#031: Only reject "already cancelled" when no override was provided (provider route).
    if (booking.status === "cancelled" && !body_cancellation_type) {
      return Response.json({ error: "Booking is already cancelled" }, { status: 400, headers: CORS });
    }

    // Determine cancellation tier:
    //   1. Explicit override from caller (public guest-cancel route, already computed by DB RPC)
    //   2. DB's cancellation_status when it has been set to a real tier (not 'none')
    //   3. Recompute from start_date (provider-initiated cancel on a fresh booking)
    let cancellation_type: "free" | "partial" | "no_show";
    if (body_cancellation_type && ["free", "partial", "no_show"].includes(body_cancellation_type)) {
      cancellation_type = body_cancellation_type as "free" | "partial" | "no_show";
    } else if (booking.cancellation_status && booking.cancellation_status !== "none") {
      // BUG-026: previously `if (booking.cancellation_status)` which is truthy for 'none',
      // causing the refund tier to be set to 'none' instead of being computed from start_date.
      cancellation_type = booking.cancellation_status as "free" | "partial" | "no_show";
    } else {
      const now = new Date();
      const startDate = new Date(booking.start_date);
      const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilStart > 24) {
        cancellation_type = "free";
      } else if (hoursUntilStart > 0) {
        cancellation_type = "partial";
      } else {
        cancellation_type = "no_show";
      }
    }

    const totalCents = Math.round((booking.total_price || 0) * 100);

    if (cancellation_type === "no_show") {
      // No Stripe call. Full amount retained
      await supabase.from("bookings").update({
        status: "cancelled",
        cancellation_status: "no_show",
      }).eq("id", booking_id);
      return Response.json({ success: true, cancellation_type: "no_show", refunded_cents: 0 }, { headers: CORS });
    }

    if (!booking.stripe_payment_intent_id) {
      return Response.json({ error: "No payment intent on file. Cannot issue refund" }, { status: 400, headers: CORS });
    }

    let refundedCents = 0;

    if (cancellation_type === "free") {
      // Full refund including application fee
      const refund = await stripe.refunds.create({
        payment_intent: booking.stripe_payment_intent_id,
        reason: "requested_by_customer",
        refund_application_fee: true,
      });
      refundedCents = refund.amount;
      await supabase.from("bookings").update({
        status: "cancelled",
        cancellation_status: "free",
        platform_commission: 0,
      }).eq("id", booking_id);
    } else {
      // partial: 50% refund to guest, platform keeps commission on retained amount
      const refundAmount = Math.round(totalCents * 0.5);
      const refund = await stripe.refunds.create({
        payment_intent: booking.stripe_payment_intent_id,
        amount: refundAmount,
        refund_application_fee: false,
      });
      refundedCents = refund.amount;
      const commissionRate = (booking.platform_commission || 0) / (booking.total_price || 1);
      const newCommission = Math.round((booking.total_price || 0) * 0.5 * commissionRate * 100) / 100;
      await supabase.from("bookings").update({
        status: "cancelled",
        cancellation_status: "partial",
        platform_commission: newCommission,
      }).eq("id", booking_id);
    }

    return Response.json({
      success: true,
      cancellation_type,
      refunded_cents: refundedCents,
      refunded_eur: (refundedCents / 100).toFixed(2),
    }, { headers: CORS });

  } catch (err) {
    console.error("stripe-cancel error:", err);
    return Response.json({ error: "Internal error" }, { status: 500, headers: CORS });
  }
});
