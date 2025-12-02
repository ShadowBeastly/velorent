// supabase/functions/create-checkout/index.ts
// Deploy: supabase functions deploy create-checkout

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16"
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const PRICES: Record<string, string> = {
  basic_monthly: Deno.env.get("STRIPE_BASIC_MONTHLY_PRICE_ID") || "",
  basic_yearly: Deno.env.get("STRIPE_BASIC_YEARLY_PRICE_ID") || "",
  pro_monthly: Deno.env.get("STRIPE_PRO_MONTHLY_PRICE_ID") || "",
  pro_yearly: Deno.env.get("STRIPE_PRO_YEARLY_PRICE_ID") || "",
  unlimited_monthly: Deno.env.get("STRIPE_UNLIMITED_MONTHLY_PRICE_ID") || "",
  unlimited_yearly: Deno.env.get("STRIPE_UNLIMITED_YEARLY_PRICE_ID") || ""
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { priceKey, organizationId, successUrl, cancelUrl } = await req.json();

    if (!PRICES[priceKey]) {
      throw new Error(`Invalid price key: ${priceKey}`);
    }

    // Get organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single();

    if (orgError || !org) {
      throw new Error("Organization not found");
    }

    // Get or create Stripe customer
    let stripeCustomerId = org.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org.name,
        metadata: {
          organization_id: organizationId,
          user_id: user.id
        }
      });
      stripeCustomerId = customer.id;

      // Save to database
      await supabase
        .from("organizations")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", organizationId);
    }

    // Create checkout session
    const origin = req.headers.get("origin") || "https://velorent.de";

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card", "sepa_debit"],
      line_items: [{
        price: PRICES[priceKey],
        quantity: 1
      }],
      success_url: successUrl || `${origin}/app/settings?success=true`,
      cancel_url: cancelUrl || `${origin}/app/settings?canceled=true`,
      subscription_data: {
        metadata: {
          organization_id: organizationId
        },
        trial_period_days: 14
      },
      allow_promotion_codes: true,
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      customer_update: {
        address: "auto",
        name: "auto"
      }
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
