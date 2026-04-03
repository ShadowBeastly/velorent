// app/api/stripe/connect/route.ts
// Proxy to the stripe-connect Supabase Edge Function.
// Creates a Stripe Express Account and returns the onboarding URL.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const ALLOWED_ORIGINS = ["https://lociva.de", "https://www.lociva.de", "http://localhost:3000"];
const isAllowedOrigin = (o?: string) => typeof o === "string" && o.length > 0 && (ALLOWED_ORIGINS.includes(o) || o.endsWith(".vercel.app"));

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const requestOrigin = req.headers.get("origin") || "";
  const origin = isAllowedOrigin(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0];

  const { data, error } = await supabase.functions.invoke("stripe-connect", {
    body: { ...body, origin },
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
