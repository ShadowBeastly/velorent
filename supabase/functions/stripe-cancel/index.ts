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

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { booking_id, cancellation_type } = await req.json();
    // cancellation_type: "free" | "partial" | "no_show"
    if (!booking_id || !cancellation_type) {
      return Response.json({ error: "booking_id and cancellation_type required" }, { status: 400, headers: CORS });
    }
    if (!["free", "partial", "no_show"].includes(cancellation_type)) {
      return Response.json({ error: "Invalid cancellation_type" }, { status: 400, headers: CORS });
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

    if (booking.status === "cancelled") {
      return Response.json({ error: "Booking is already cancelled" }, { status: 400, headers: CORS });
    }

    const totalCents = Math.round((booking.total_price || 0) * 100);

    if (cancellation_type === "no_show") {
      // No Stripe call — full amount retained
      await supabase.from("bookings").update({
        status: "cancelled",
        cancellation_status: "no_show",
      }).eq("id", booking_id);
      return Response.json({ success: true, cancellation_type: "no_show", refunded_cents: 0 }, { headers: CORS });
    }

    if (!booking.stripe_payment_intent_id) {
      return Response.json({ error: "No payment intent on file — cannot issue refund" }, { status: 400, headers: CORS });
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
    return Response.json({ error: (err as Error).message }, { status: 500, headers: CORS });
  }
});
