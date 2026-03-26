// app/api/stripe/cancel/route.ts
// Proxy to the stripe-cancel Supabase Edge Function.
// Requires authenticated provider session.

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  // Verify the caller is an authenticated provider (uses anon SSR client for auth check only)
  const cookieStore = await cookies();
  const anonClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Use service-role client to invoke stripe-cancel so the Bearer token
  // satisfies stripe-cancel's auth check (bearerToken === serviceRoleKey).
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await serviceClient.functions.invoke("stripe-cancel", { body });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
