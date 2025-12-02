// =====================================================
// VELORENT PRO - STRIPE BILLING INTEGRATION
// =====================================================
//
// SETUP:
// 1. Stripe Account: https://dashboard.stripe.com
// 2. Produkte erstellen in Stripe Dashboard:
//    - "VeloRent Starter" = 29€/Monat (price_starter_monthly)
//    - "VeloRent Pro" = 79€/Monat (price_pro_monthly)
// 3. Webhook Endpoint erstellen: https://yourapp.com/api/webhooks/stripe
// 4. Environment Variables setzen:
//    - STRIPE_SECRET_KEY
//    - STRIPE_WEBHOOK_SECRET
//    - STRIPE_STARTER_PRICE_ID
//    - STRIPE_PRO_PRICE_ID
//
// =====================================================

// ----- SUPABASE EDGE FUNCTION: create-checkout -----
// File: supabase/functions/create-checkout/index.ts

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

const PRICES = {
  starter_monthly: Deno.env.get("STRIPE_STARTER_MONTHLY_PRICE_ID"),
  starter_yearly: Deno.env.get("STRIPE_STARTER_YEARLY_PRICE_ID"),
  pro_monthly: Deno.env.get("STRIPE_PRO_MONTHLY_PRICE_ID"),
  pro_yearly: Deno.env.get("STRIPE_PRO_YEARLY_PRICE_ID")
};

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Unauthorized");

    const { priceKey, organizationId, successUrl, cancelUrl } = await req.json();

    // Get organization
    const { data: org } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single();

    if (!org) throw new Error("Organization not found");

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
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card", "sepa_debit"],
      line_items: [
        {
          price: PRICES[priceKey],
          quantity: 1
        }
      ],
      success_url: successUrl || `${req.headers.get("origin")}/settings?success=true`,
      cancel_url: cancelUrl || `${req.headers.get("origin")}/settings?canceled=true`,
      subscription_data: {
        metadata: {
          organization_id: organizationId
        },
        trial_period_days: 14
      },
      allow_promotion_codes: true,
      billing_address_collection: "required",
      customer_update: {
        address: "auto",
        name: "auto"
      }
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
});


// ----- SUPABASE EDGE FUNCTION: stripe-webhook -----
// File: supabase/functions/stripe-webhook/index.ts

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

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response("Webhook Error", { status: 400 });
  }

  console.log("Received event:", event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.subscription?.metadata?.organization_id ||
                      session.metadata?.organization_id;

        if (orgId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          const priceId = subscription.items.data[0].price.id;
          const tier = priceId.includes("pro") ? "pro" : "starter";

          await supabase
            .from("organizations")
            .update({
              stripe_subscription_id: subscription.id,
              subscription_tier: tier,
              subscription_status: "active",
              trial_ends_at: subscription.trial_end 
                ? new Date(subscription.trial_end * 1000).toISOString()
                : null
            })
            .eq("id", orgId);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata.organization_id;

        if (orgId) {
          const priceId = subscription.items.data[0].price.id;
          const tier = priceId.includes("pro") ? "pro" : "starter";

          await supabase
            .from("organizations")
            .update({
              subscription_tier: tier,
              subscription_status: subscription.status === "active" ? "active" : subscription.status
            })
            .eq("id", orgId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata.organization_id;

        if (orgId) {
          await supabase
            .from("organizations")
            .update({
              subscription_tier: "free",
              subscription_status: "canceled",
              stripe_subscription_id: null
            })
            .eq("id", orgId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        // TODO: Send email notification about failed payment
        console.log("Payment failed for customer:", invoice.customer);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Webhook handler error:", error);
    return new Response("Webhook handler error", { status: 500 });
  }
});


// ----- SUPABASE EDGE FUNCTION: create-portal -----
// File: supabase/functions/create-portal/index.ts

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const { data: { user } } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (!user) throw new Error("Unauthorized");

    const { organizationId, returnUrl } = await req.json();

    const { data: org } = await supabase
      .from("organizations")
      .select("stripe_customer_id")
      .eq("id", organizationId)
      .single();

    if (!org?.stripe_customer_id) {
      throw new Error("No Stripe customer found");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: returnUrl || `${req.headers.get("origin")}/settings`
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
});
