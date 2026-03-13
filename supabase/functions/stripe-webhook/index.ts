// supabase/functions/stripe-webhook/index.ts
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20"
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

      // ----------------------------------------------------------------
      // Lociva: Guest booking payment completed
      // ----------------------------------------------------------------
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata ?? {};

        // Lociva guest booking (has bike_id in metadata)
        if (meta.bike_id && meta.org_id) {
          const { data: booking, error: rpcErr } = await supabase.rpc("create_guest_booking", {
            p_organization_id: meta.org_id,
            p_bike_id:         meta.bike_id,
            p_hotel_id:        meta.hotel_id || null,
            p_start_date:      meta.start_date,
            p_end_date:        meta.end_date,
            p_guest_name:      meta.guest_name,
            p_guest_email:     meta.guest_email,
            p_guest_phone:     meta.guest_phone || null,
            p_language:        meta.lang || "de",
          });

          if (rpcErr) {
            console.error("create_guest_booking failed:", rpcErr);
          } else {
            const piId = typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id;
            await supabase.from("bookings").update({
              stripe_checkout_session_id: session.id,
              stripe_payment_intent_id:   piId ?? null,
              status: "confirmed",
            }).eq("id", booking.booking_id);
            console.log("Lociva booking created:", booking.booking_number);
          }
          break;
        }

        // Legacy RentCore: SaaS subscription checkout
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          const orgId = subscription.metadata?.organization_id;

          if (orgId) {
            const priceId = subscription.items.data[0]?.price.id || "";
            let tier = "basic";
            if (priceId.toLowerCase().includes("pro")) tier = "pro";
            if (priceId.toLowerCase().includes("unlimited")) tier = "unlimited";

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
          let tier = "basic";
          if (priceId.toLowerCase().includes("pro")) tier = "pro";
          if (priceId.toLowerCase().includes("unlimited")) tier = "unlimited";

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

      // ----------------------------------------------------------------
      // Lociva: Provider Express account status changed
      // ----------------------------------------------------------------
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await supabase.from("organizations").update({
          stripe_charges_enabled:     account.charges_enabled,
          stripe_payouts_enabled:     account.payouts_enabled,
          stripe_onboarding_complete: account.details_submitted,
        }).eq("stripe_account_id", account.id);
        console.log("Provider account updated:", account.id, "charges:", account.charges_enabled);
        break;
      }

      // ----------------------------------------------------------------
      // Lociva: Refund processed → update cancellation_status
      // ----------------------------------------------------------------
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const piId = typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
        if (!piId) break;
        const refundedRatio = charge.amount_refunded / charge.amount;
        const cancellationStatus = refundedRatio >= 0.99 ? "free" : "partial";
        await supabase.from("bookings").update({
          cancellation_status: cancellationStatus,
          status: "cancelled",
        }).eq("stripe_payment_intent_id", piId);
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
