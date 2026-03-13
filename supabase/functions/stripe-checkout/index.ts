// supabase/functions/stripe-checkout/index.ts
// Creates a Stripe Checkout Session for a guest booking.
// Commission is calculated per bike category and set as application_fee_amount.
// The booking itself is created ONLY after payment via the webhook.

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

const COMMISSION_RATES: Record<string, number> = {
  "E-Bike": 0.05, "Mountainbike": 0.05, "City-Bike": 0.05, "Trekking": 0.05,
  "Canoe": 0.10, "SUP": 0.10, "Go-Kart": 0.10, "Climbing": 0.10, "Escape Room": 0.10,
  "Guided Tour": 0.12, "Wine Tasting": 0.12, "Wellness": 0.12, "Spa": 0.12,
  "Hot Air Balloon": 0.15, "Sailing": 0.15,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const {
      bike_id, hotel_id, org_id,
      start_date, end_date,
      guest_name, guest_email, guest_phone,
      lang, origin, hotel_slug,
    } = await req.json();

    // 1. Fetch bike
    const { data: bike, error: bikeErr } = await supabase
      .from("bikes")
      .select("id, name, category, price_per_day, deposit, status, organization_id")
      .eq("id", bike_id)
      .eq("organization_id", org_id)
      .single();

    if (bikeErr || !bike) {
      return Response.json({ error: "Bike not found or not available" }, { status: 404, headers: CORS });
    }

    // 2. Fetch provider Stripe account
    const { data: org } = await supabase
      .from("organizations")
      .select("stripe_account_id, stripe_charges_enabled, name")
      .eq("id", org_id)
      .single();

    if (!org?.stripe_account_id || !org?.stripe_charges_enabled) {
      return Response.json({ error: "Provider Stripe account not ready" }, { status: 400, headers: CORS });
    }

    // 3. Calculate pricing
    const d1 = new Date(start_date);
    const d2 = new Date(end_date);
    const totalDays = Math.max(1, Math.floor((d2.getTime() - d1.getTime()) / 86400000) + 1);
    const totalPriceEur = totalDays * bike.price_per_day;
    const commissionRate = COMMISSION_RATES[bike.category] ?? 0.05;
    const applicationFeeAmount = Math.round(totalPriceEur * commissionRate * 100); // in Cent

    // 4. Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "eur",
          unit_amount: Math.round(totalPriceEur * 100),
          product_data: {
            name: `${bike.name} — ${totalDays} ${totalDays === 1 ? "Tag" : "Tage"}`,
            description: `${start_date} bis ${end_date} · ${org.name}`,
          },
        },
        quantity: 1,
      }],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        on_behalf_of: org.stripe_account_id,
        transfer_data: { destination: org.stripe_account_id },
      },
      customer_email: guest_email,
      locale: lang === "en" ? "en" : "de",
      success_url: `${origin}/hotel/${hotel_slug}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/hotel/${hotel_slug}?cancelled=1`,
      metadata: {
        hotel_id:           hotel_id || "",
        bike_id:            bike_id,
        org_id:             org_id,
        start_date:         start_date,
        end_date:           end_date,
        guest_name:         guest_name,
        guest_email:        guest_email,
        guest_phone:        guest_phone || "",
        lang:               lang || "de",
        total_days:         String(totalDays),
        total_price:        String(totalPriceEur),
        commission_rate:    String(commissionRate),
        platform_commission: String(Math.round(totalPriceEur * commissionRate * 100) / 100),
      },
    });

    return Response.json({ url: session.url, session_id: session.id }, { headers: CORS });
  } catch (err) {
    console.error("stripe-checkout error:", err);
    return Response.json({ error: (err as Error).message }, { status: 500, headers: CORS });
  }
});
