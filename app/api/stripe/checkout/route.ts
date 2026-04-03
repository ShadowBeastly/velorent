// app/api/stripe/checkout/route.ts
// Proxy to the stripe-checkout Supabase Edge Function.
// Creates a Stripe Checkout Session for a guest booking and returns the URL.
// No authentication required. Guests are unauthenticated.

import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

// Use anon key. The Edge Function uses service role internally.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"
);

const ALLOWED_ORIGINS = ["https://lociva.de", "https://www.lociva.de", "http://localhost:3000"];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const requestOrigin = req.headers.get("origin") || "";
  const origin = ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0];
  const hotelSlug = body.hotel_slug || body.slug || null;
  const successUrl = hotelSlug
    ? `${origin}/hotel/${hotelSlug}?session_id={CHECKOUT_SESSION_ID}`
    : body.success_url;
  const cancelUrl = hotelSlug
    ? `${origin}/hotel/${hotelSlug}?cancelled=1`
    : body.cancel_url;

  const { data, error } = await supabase.functions.invoke("stripe-checkout", {
    body: {
      ...body,
      item_id: body.item_id || body.bike_id,
      bike_id: body.item_id || body.bike_id,
      venue_id: body.venue_id || body.hotel_id || null,
      hotel_id: body.venue_id || body.hotel_id || null,
      organization_id: body.organization_id || body.org_id,
      org_id: body.organization_id || body.org_id,
      hotel_slug: hotelSlug,
      success_url: successUrl,
      cancel_url: cancelUrl,
      origin,
    },
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
