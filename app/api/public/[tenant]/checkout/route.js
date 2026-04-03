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
 * Body: { itemId|bikeId, startDate, endDate, quantity, customer: { name, email, phone }, couponCode?, successUrl, cancelUrl }
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

  const itemId = body.itemId || body.bikeId;
  const { startDate, endDate, quantity = 1, customer, couponCode, successUrl, cancelUrl } = body;

  if (!itemId || !startDate || !endDate || !customer?.email || !customer?.name) {
    return new Response(JSON.stringify({ error: "itemId, startDate, endDate, customer.name and customer.email are required" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  // Verify bike belongs to this tenant
  const { data: bike, error: bikeErr } = await supabase
    .from("items")
    .select("id, name, price_per_day, price_per_hour, organization_id")
    .eq("id", itemId)
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
    p_item_id: itemId,
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
  const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "https://rentcore.de";
  const normalizedSuccessUrl = successUrl || `${origin.replace(/\/$/, "")}?widget_success=1&session_id={CHECKOUT_SESSION_ID}`;
  const normalizedCancelUrl = cancelUrl || `${origin.replace(/\/$/, "")}?widget_cancel=1`;

  const { data, error } = await supabase.functions.invoke("stripe-checkout", {
    body: {
      item_id:        itemId,
      bike_id:        itemId,
      start_date:     startDate,
      end_date:       endDate,
      quantity,
      guest_name:     customer.name,
      guest_email:    customer.email,
      guest_phone:    customer.phone ?? null,
      coupon_code:    couponCode ?? null,
      success_url:    normalizedSuccessUrl,
      cancel_url:     normalizedCancelUrl,
      organization_id: params.tenant,
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
