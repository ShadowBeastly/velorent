import { createClient } from "@supabase/supabase-js";
import { resolveWidgetCors, corsPreflightResponse } from "../../_cors";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"
);

export async function OPTIONS(req, { params }) {
  const { headers } = await resolveWidgetCors(req, params.tenant);
  return corsPreflightResponse(headers);
}

/**
 * POST /api/public/[tenant]/checkout
 * Body: { bikeId, startDate, endDate, quantity, customer: { name, email, phone }, couponCode?, successUrl, cancelUrl }
 * Returns: { checkoutUrl } - redirect to Stripe Checkout
 */
export async function POST(req, { params }) {
  const { allowed, headers } = await resolveWidgetCors(req, params.tenant);

  if (!allowed) {
    return new Response(JSON.stringify({ error: "Widget not enabled or origin not allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const { bikeId, startDate, endDate, quantity = 1, customer, couponCode, successUrl, cancelUrl } = body;

  if (!bikeId || !startDate || !endDate || !customer?.email || !customer?.name) {
    return new Response(JSON.stringify({ error: "bikeId, startDate, endDate, customer.name and customer.email are required" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  // Verify bike belongs to this tenant
  const { data: bike, error: bikeErr } = await supabase
    .from("items")
    .select("id, name, price_per_day, price_per_hour, organization_id")
    .eq("id", bikeId)
    .eq("organization_id", params.tenant)
    .single();

  if (bikeErr || !bike) {
    return new Response(JSON.stringify({ error: "Bike not found for this tenant" }), {
      status: 404,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  // Check availability
  const { data: avail } = await supabase.rpc("check_public_availability", {
    p_tenant:  params.tenant,
    p_item_id: bikeId,
    p_start:   startDate,
    p_end:     endDate,
  });

  const availResult = Array.isArray(avail) ? avail[0] : avail;
  if (!availResult?.available) {
    return new Response(JSON.stringify({ error: "Bike is not available for the selected dates" }), {
      status: 409,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  // Delegate to the existing stripe-checkout Edge Function
  const origin = req.headers.get("origin") || successUrl || process.env.NEXT_PUBLIC_APP_URL || "https://rentcore.de";

  const { data, error } = await supabase.functions.invoke("stripe-checkout", {
    body: {
      // Map widget payload to the format stripe-checkout Edge Function expects
      bike_id:        bikeId,
      start_date:     startDate,
      end_date:       endDate,
      quantity,
      guest_name:     customer.name,
      guest_email:    customer.email,
      guest_phone:    customer.phone ?? null,
      coupon_code:    couponCode ?? null,
      success_url:    successUrl ?? `${origin}?widget_success=1`,
      cancel_url:     cancelUrl  ?? `${origin}?widget_cancel=1`,
      // Widget bookings are scoped to a specific org, not a hotel slug
      org_id:         params.tenant,
      source:         "widget",
      origin,
    },
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
