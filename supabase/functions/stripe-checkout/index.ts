// supabase/functions/stripe-checkout/index.ts
// Creates a Stripe Checkout Session for a guest booking.
// Supports both daily and hourly rental types.
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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

const COMMISSION_RATES: Record<string, number> = {
  "E-Bike": 0.05, "Mountainbike": 0.05, "City-Bike": 0.05, "Trekking": 0.05, "E-MTB": 0.05, "Lastenrad": 0.05,
  "Canoe": 0.10, "SUP": 0.10, "Go-Kart": 0.10, "Climbing": 0.10, "Escape Room": 0.10,
  "Guided Tour": 0.12, "Wine Tasting": 0.12, "Wellness": 0.12, "Spa": 0.12,
  "Hot Air Balloon": 0.15, "Sailing": 0.15,
};

serve(async (req) => {
  const CORS = buildCors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const {
      bike_id, hotel_id, org_id,
      start_date, end_date,
      guest_name, guest_email, guest_phone,
      lang, origin, hotel_slug,
      // Hourly fields (optional)
      rental_type = "daily",
      start_time,
      end_time,
      total_hours,
      // Coupon / price validation
      coupon_code,
      total_price: client_total_price,
    } = await req.json();

    // 1. Fetch bike
    const { data: bike, error: bikeErr } = await supabase
      .from("bikes")
      .select("id, name, category, price_per_day, price_per_hour, deposit, status, organization_id")
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

    // 2b. Verify hotel-provider relationship is active (only if hotel_id is provided)
    if (hotel_id) {
      const { data: hotelProvider } = await supabase
        .from("hotel_providers")
        .select("hotel_id")
        .eq("hotel_id", hotel_id)
        .eq("organization_id", org_id)
        .eq("is_active", true)
        .maybeSingle();
      if (!hotelProvider) {
        return Response.json({ error: "Provider not available for this hotel" }, { status: 400, headers: CORS });
      }
    }

    // 3. Calculate pricing based on rental_type
    const commissionRate = COMMISSION_RATES[bike.category] ?? 0.05;
    let totalPriceEur: number;
    let productName: string;
    let productDescription: string;

    if (rental_type === "hourly") {
      // Hourly pricing
      if (!bike.price_per_hour) {
        return Response.json({ error: "Bike does not support hourly rentals" }, { status: 400, headers: CORS });
      }
      const hours = Number(total_hours);
      if (!hours || hours < 1) {
        return Response.json({ error: "Minimum 1 hour required" }, { status: 400, headers: CORS });
      }
      if (hours > 720) {
        return Response.json({ error: "Maximum 720 hours (30 days)" }, { status: 400, headers: CORS });
      }
      totalPriceEur = hours * bike.price_per_hour;
      productName = `${bike.name}. ${hours} Std.`;
      productDescription = `${start_date} · ${start_time} - ${end_time} · ${org.name}`;
    } else {
      // Daily pricing
      const d1 = new Date(start_date);
      const d2 = new Date(end_date);
      const totalDays = Math.max(1, Math.floor((d2.getTime() - d1.getTime()) / 86400000) + 1);
      totalPriceEur = totalDays * bike.price_per_day;
      productName = `${bike.name}. ${totalDays} ${totalDays === 1 ? "Tag" : "Tage"}`;
      productDescription = `${start_date} bis ${end_date} · ${org.name}`;
    }

    // 3b. Apply coupon discount if provided
    let discountAmountEur = 0;
    let coupon_id: string | null = null;

    if (coupon_code) {
      const { data: coupon, error: couponErr } = await supabase
        .from("coupons")
        .select("id, discount_type, discount_value")
        .eq("code", coupon_code)
        .eq("is_active", true)
        .maybeSingle();

      if (!couponErr && coupon) {
        coupon_id = coupon.id;
        if (coupon.discount_type === "percentage") {
          discountAmountEur = totalPriceEur * (coupon.discount_value / 100);
        } else if (coupon.discount_type === "fixed") {
          discountAmountEur = coupon.discount_value;
        }
        discountAmountEur = Math.min(discountAmountEur, totalPriceEur);
        totalPriceEur = totalPriceEur - discountAmountEur;
      }
    }

    // 3c. BUG-023: Validate server-calculated price against client-sent total_price
    if (client_total_price !== undefined && client_total_price !== null) {
      const diff = Math.abs(totalPriceEur - Number(client_total_price));
      if (diff > 0.01) {
        return Response.json(
          { error: "Price mismatch: client and server totals do not match" },
          { status: 400, headers: CORS }
        );
      }
    }

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
            name: productName,
            description: productDescription,
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
        hotel_id:            hotel_id || "",
        bike_id:             bike_id,
        org_id:              org_id,
        start_date:          start_date,
        end_date:            end_date,
        guest_name:          guest_name,
        guest_email:         guest_email,
        guest_phone:         guest_phone || "",
        lang:                lang || "de",
        hotel_slug:          hotel_slug || "",
        rental_type:         rental_type,
        // Price fields
        total_price:         String(totalPriceEur),
        total_days:          rental_type === "hourly" ? String(total_hours) : String(Math.max(1, Math.floor((new Date(end_date).getTime() - new Date(start_date).getTime()) / 86400000) + 1)),
        commission_rate:     String(commissionRate),
        platform_commission: String(Math.round(totalPriceEur * commissionRate * 100) / 100),
        // Hourly fields (empty string if daily)
        start_time:          start_time || "",
        end_time:            end_time || "",
        total_hours:         total_hours ? String(total_hours) : "",
        // Coupon fields
        coupon_id:           coupon_id || "",
        discount_amount:     String(Math.round(discountAmountEur * 100) / 100),
      },
    });

    return Response.json({ url: session.url, session_id: session.id }, { headers: CORS });
  } catch (err) {
    console.error("stripe-checkout error:", err);
    return Response.json({ error: "Internal error" }, { status: 500, headers: CORS });
  }
});
