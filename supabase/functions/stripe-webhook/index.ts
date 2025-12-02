// supabase/functions/stripe-webhook/index.ts
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt

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
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log("Received Stripe event:", event.type);

  try {
    switch (event.type) {
      
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          
          const orgId = subscription.metadata?.organization_id;
          
          if (orgId) {
            const priceId = subscription.items.data[0]?.price.id || "";
            const tier = priceId.toLowerCase().includes("pro") ? "pro" : "starter";

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

            console.log(`Organization ${orgId} upgraded to ${tier}`);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.organization_id;

        if (orgId) {
          const priceId = subscription.items.data[0]?.price.id || "";
          const tier = priceId.toLowerCase().includes("pro") ? "pro" : "starter";
          
          let status = "active";
          if (subscription.status === "past_due") status = "past_due";
          if (subscription.status === "canceled") status = "canceled";
          if (subscription.status === "unpaid") status = "unpaid";

          await supabase
            .from("organizations")
            .update({
              subscription_tier: tier,
              subscription_status: status
            })
            .eq("id", orgId);

          console.log(`Organization ${orgId} subscription updated: ${tier}, ${status}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.organization_id;

        if (orgId) {
          await supabase
            .from("organizations")
            .update({
              subscription_tier: "free",
              subscription_status: "canceled",
              stripe_subscription_id: null
            })
            .eq("id", orgId);

          console.log(`Organization ${orgId} subscription canceled`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Payment failed for customer:", invoice.customer);
        
        // Optional: Send email notification
        // await supabase.functions.invoke("send-email", { ... });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Payment succeeded for customer:", invoice.customer);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Webhook handler error:", error);
    return new Response(`Webhook handler error: ${error.message}`, { status: 500 });
  }
});
