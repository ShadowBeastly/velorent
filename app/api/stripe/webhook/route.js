// app/api/stripe/webhook/route.js
// ACTIVE Stripe webhook handler. Registered at /api/stripe/webhook in the Stripe Dashboard.
// See also: supabase/functions/stripe-webhook/ (legacy, keep for reference)
// Events: checkout.session.completed, account.updated, charge.refunded
//
// Configure in Stripe Dashboard → Webhooks → Endpoint URL:
//   https://lociva.de/api/stripe/webhook
// Events to listen for:
//   checkout.session.completed, account.updated, charge.refunded

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Lazy-initialize to avoid build-time crash when env vars are missing
let _stripe;
function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });
  }
  return _stripe;
}

let _supabase;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return _supabase;
}

// Next.js App Router: disable body parsing so we get the raw body for signature verification
export const runtime = "nodejs";

export async function POST(req) {
  const stripe = getStripe();
  const supabase = getSupabase();

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  console.log("Received Stripe event:", event.type);

  // Idempotency guard: upsert the event ID with ignoreDuplicates.
  // count === 0 means the row already existed (conflict was ignored) → skip.
  const { error: idempotencyError, count } = await supabase
    .from("stripe_events")
    .upsert({ id: event.id }, { onConflict: "id", ignoreDuplicates: true, count: "exact" });

  if (idempotencyError) {
    console.error("Idempotency check failed:", idempotencyError);
    return new Response("Internal error", { status: 500 });
  }

  if (count === 0) {
    console.log("Duplicate Stripe event, skipping:", event.id);
    return Response.json({ received: true });
  }

  try {
    switch (event.type) {
      // ---------------------------------------------------------------
      // Guest booking payment completed
      // ---------------------------------------------------------------
      case "checkout.session.completed": {
        const session = event.data.object;
        const meta = session.metadata ?? {};

        // Lociva guest booking
        const itemId = meta.item_id;
        if (itemId && meta.org_id) {
          // Idempotency check: skip if booking already exists for this session
          const { data: existingBooking } = await supabase
            .from("bookings")
            .select("id, booking_number")
            .eq("stripe_checkout_session_id", session.id)
            .maybeSingle();
          if (existingBooking) {
            console.log("Duplicate webhook. Booking already exists:", existingBooking.booking_number);
            return Response.json({ received: true });
          }

          const rpcParams = {
              p_organization_id: meta.org_id,
              p_bike_id: itemId,
              p_hotel_id: meta.hotel_id || null,
              p_start_date: meta.start_date,
              p_end_date: meta.end_date,
              p_guest_name: meta.guest_name,
              p_guest_email: meta.guest_email,
              p_guest_phone: meta.guest_phone || null,
              p_language: meta.lang || "de",
              p_rental_type: meta.rental_type || "daily",
              // BUG-027: pass the Stripe-verified (post-discount) price so the DB stores
              // the amount the guest actually paid rather than recomputing undiscounted price.
              p_total_price: meta.total_price ? parseFloat(meta.total_price) : null,
            };
          if (meta.rental_type === "hourly") {
            rpcParams.p_total_hours = parseFloat(meta.total_hours) || 1;
            rpcParams.p_start_time = meta.start_time || null;
            rpcParams.p_end_time = meta.end_time || null;
          }

          const { error: rpcErr } = await supabase.rpc(
            "create_guest_booking",
            rpcParams
          );

          if (rpcErr) {
            console.error("create_guest_booking failed:", rpcErr);
            return new Response(JSON.stringify({ error: "create_guest_booking failed" }), { status: 500 });
          }

          // Look up the booking that was just created by its unique fields.
          // This avoids relying on the RPC return shape (which varies across
          // supabase-js / PostgREST versions and can wrap JSONB unexpectedly).
          const { data: freshBooking, error: lookupErr } = await supabase
            .from("bookings")
            .select("id, booking_number, cancellation_token")
            .eq("guest_email", meta.guest_email)
            .eq("item_id", itemId)
            .eq("start_date", meta.start_date)
            .eq("end_date", meta.end_date)
            .eq("status", "reserved")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (lookupErr || !freshBooking) {
            console.error("Post-RPC booking lookup failed:", lookupErr);
            return new Response("Booking lookup failed", { status: 500 });
          }

          console.log("Booking lookup found:", freshBooking.id, freshBooking.booking_number);

          const piId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id;

          const { error: updateErr } = await supabase
            .from("bookings")
            .update({
              stripe_checkout_session_id: session.id,
              stripe_payment_intent_id: piId ?? null,
              status: "confirmed",
            })
            .eq("id", freshBooking.id);

          if (updateErr) {
            console.error("Booking update failed:", updateErr);
            return new Response("Booking update failed", { status: 500 });
          }

          const bookingData = freshBooking;
          console.log("Lociva booking confirmed:", bookingData.booking_number, "session:", session.id);

          // Send guest confirmation email with cancellation token link (non-fatal)
          try {
            const itemName = meta.item_name;
            const [{ data: itemData }, { data: orgData }] =
              await Promise.all([
                supabase
                  .from("items")
                  .select("name")
                  .eq("id", itemId)
                  .single(),
                supabase
                  .from("organizations")
                  .select("name, provider_address, provider_phone")
                  .eq("id", meta.org_id)
                  .single(),
              ]);

            const siteUrl =
              process.env.NEXT_PUBLIC_SITE_URL || "https://lociva.de";
            const hotelSlug = meta.hotel_slug || "demo";
            const resolvedCancelToken = freshBooking.cancellation_token || "";
            const cancellationUrl = resolvedCancelToken
              ? `${siteUrl}/hotel/${hotelSlug}/cancel?token=${resolvedCancelToken}`
              : "";

            await supabase.functions.invoke("send-email", {
              body: {
                type: "lociva_guest_confirmation",
                to: meta.guest_email,
                data: {
                  guest_name: meta.guest_name,
                  booking_number: bookingData?.booking_number,
                  item_name: itemName || itemData?.name || "",
                  start_date: meta.start_date,
                  end_date: meta.end_date,
                  total_days: meta.total_days,
                  total_price: `${meta.total_price} €`,
                  provider_name: orgData?.name || "",
                  provider_address: orgData?.provider_address || "",
                  provider_phone: orgData?.provider_phone || "",
                  lang: meta.lang || "de",
                  cancellation_url: cancellationUrl,
                },
              },
            });
            console.log("Confirmation email sent for booking:", bookingData?.booking_number || session.id);
          } catch (emailErr) {
            console.error("Failed to send confirmation email:", emailErr);
          }

          // Track analytics event (non-fatal)
          if (meta.hotel_id) {
            try {
              await supabase.from("analytics_events").insert({
                hotel_id: meta.hotel_id,
                event_type: "booking_complete",
                metadata: {
                  booking_id: freshBooking.id,
                  booking_number: freshBooking.booking_number,
                  total_price: meta.total_price,
                },
              });
            } catch (analyticsErr) {
              console.error("Analytics insert failed (non-fatal):", analyticsErr);
            }
          }
        }
        break;
      }

      // ---------------------------------------------------------------
      // Provider Express account status changed
      // ---------------------------------------------------------------
      case "account.updated": {
        const account = event.data.object;

        const { error } = await supabase
          .from("organizations")
          .update({
            stripe_charges_enabled: account.charges_enabled,
            stripe_payouts_enabled: account.payouts_enabled,
            stripe_onboarding_complete: account.details_submitted,
          })
          .eq("stripe_account_id", account.id);

        if (error) {
          console.error(
            "Failed to update org for account:",
            account.id,
            error
          );
        } else {
          console.log(
            "Provider account updated: charges:",
            account.charges_enabled,
            "payouts:",
            account.payouts_enabled
          );
        }
        break;
      }

      // ---------------------------------------------------------------
      // Refund processed → update cancellation_status
      // ---------------------------------------------------------------
      case "charge.refunded": {
        const charge = event.data.object;
        const piId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;

        if (!piId) break;

        const refundedRatio = charge.amount_refunded / charge.amount;
        const cancellationStatus = refundedRatio >= 0.99 ? "free" : "partial";

        await supabase
          .from("bookings")
          .update({
            cancellation_status: cancellationStatus,
            status: "cancelled",
          })
          .eq("stripe_payment_intent_id", piId);

        console.log(
          "Refund processed, status:",
          cancellationStatus
        );
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return new Response("Internal error", { status: 500 });
  }
}
