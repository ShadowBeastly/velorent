// app/api/stripe/checkout/route.ts
// Proxy to the stripe-checkout Supabase Edge Function.
// Creates a Stripe Checkout Session for a guest booking and returns the URL.
// No authentication required — guests are unauthenticated.

import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

// Use anon key — the Edge Function uses service role internally
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ALLOWED_ORIGINS = ["https://lociva.de", "https://www.lociva.de", "http://localhost:3000"];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const requestOrigin = req.headers.get("origin") || "";
  const origin = ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0];

  const { data, error } = await supabase.functions.invoke("stripe-checkout", {
    body: { ...body, origin },
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
