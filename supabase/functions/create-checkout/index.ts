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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

serve(async (req) => {
  const corsHeaders = buildCors(req);

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

    // SEC-03: Verify caller is owner or admin of the organization
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
    // SEC-03: Derive origin from allowlist, do not trust client-supplied URLs
    const requestOrigin = req.headers.get("origin") || "";
    const safeOrigin = ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : "https://rentcore.de";
    const safeSuccessUrl = `${safeOrigin}/app/settings?success=true`;
    const safeCancelUrl = `${safeOrigin}/app/settings?canceled=true`;

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card", "sepa_debit"],
      line_items: [{
        price: PRICES[priceKey],
        quantity: 1
      }],
      success_url: safeSuccessUrl,
      cancel_url: safeCancelUrl,
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
      JSON.stringify({ error: "Internal error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
