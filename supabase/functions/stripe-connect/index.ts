// supabase/functions/stripe-connect/index.ts
// Creates or retrieves a Stripe Express account for a provider and
// returns an Account Link URL for Express Onboarding.

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

serve(async (req) => {
  const CORS = buildCors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { org_id, org_email, origin: _clientOrigin } = await req.json();
    if (!org_id) return Response.json({ error: "org_id required" }, { status: 400, headers: CORS });

    // Ownership check: caller must be owner or admin of org_id
    const authHeader = req.headers.get("authorization") || "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
    }
    const { data: membership, error: memberError } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", org_id)
      .eq("user_id", user.id)
      .single();
    if (memberError || !membership || !["owner", "admin"].includes(membership.role)) {
      return Response.json({ error: "Forbidden: owner or admin role required" }, { status: 403, headers: CORS });
    }

    // 1. Check if org already has a Stripe account
    const { data: org } = await supabase
      .from("organizations")
      .select("stripe_account_id, stripe_charges_enabled")
      .eq("id", org_id)
      .single();

    let accountId = org?.stripe_account_id;

    // 2. Create Express account if none exists
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "DE",
        email: org_email || undefined,
        capabilities: { transfers: { requested: true } },
        business_profile: { mcc: "7999" }, // Recreation services
        settings: { payouts: { schedule: { interval: "weekly", weekly_anchor: "monday" } } },
      });
      accountId = account.id;

      await supabase
        .from("organizations")
        .update({ stripe_account_id: accountId })
        .eq("id", org_id);
    }

    // 3. Create Account Link for onboarding (or re-onboarding)
    // SEC-07: Derive origin from request header allowlist, not from client body
    const requestOrigin = req.headers.get("origin") || "";
    const safeOrigin = ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : "https://rentcore.de";

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${safeOrigin}/app/marketplace?stripe_refresh=1`,
      return_url:  `${safeOrigin}/app/marketplace?stripe_return=1`,
      type: "account_onboarding",
    });

    return Response.json({ url: accountLink.url }, { headers: CORS });
  } catch (err) {
    console.error("stripe-connect error:", err);
    return Response.json({ error: "Internal error" }, { status: 500, headers: CORS });
  }
});
