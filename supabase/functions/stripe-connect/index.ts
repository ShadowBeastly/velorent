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

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { org_id, org_email, origin } = await req.json();
    if (!org_id) return Response.json({ error: "org_id required" }, { status: 400 });

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
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/app/marketplace?stripe_refresh=1`,
      return_url:  `${origin}/app/marketplace?stripe_return=1`,
      type: "account_onboarding",
    });

    return Response.json({ url: accountLink.url }, { headers: CORS });
  } catch (err) {
    console.error("stripe-connect error:", err);
    return Response.json({ error: (err as Error).message }, { status: 500, headers: CORS });
  }
});
