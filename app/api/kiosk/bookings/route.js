// app/api/kiosk/bookings/route.js
// Public endpoint — creates a walk-in booking from kiosk (no auth required).
// POST /api/kiosk/bookings

import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req) {
  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ error: "Server configuration error" }, { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    org_id,
    bike_id,
    start_date,
    end_date,
    total_days,
    total_price,
    first_name,
    last_name,
    email,
    phone,
    id_number,
    notes,
  } = body;

  if (!org_id || !bike_id || !start_date || !end_date || !first_name || !last_name) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify kiosk is enabled for org
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("id, settings")
    .eq("id", org_id)
    .single();

  if (orgErr || !org) {
    return Response.json({ error: "Organization not found" }, { status: 404 });
  }

  if (!org.settings?.kiosk_enabled) {
    return Response.json({ error: "Kiosk mode not enabled" }, { status: 403 });
  }

  // Upsert customer by email (or create new)
  let customerId = null;
  if (email) {
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("organization_id", org_id)
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      customerId = existing.id;
    } else {
      const { data: newCustomer } = await supabase
        .from("customers")
        .insert({
          organization_id: org_id,
          first_name,
          last_name,
          email: email || null,
          phone: phone || null,
        })
        .select("id")
        .single();
      customerId = newCustomer?.id ?? null;
    }
  } else {
    const { data: newCustomer } = await supabase
      .from("customers")
      .insert({
        organization_id: org_id,
        first_name,
        last_name,
        phone: phone || null,
      })
      .select("id")
      .single();
    customerId = newCustomer?.id ?? null;
  }

  // Create booking
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .insert({
      organization_id: org_id,
      bike_id,
      customer_id: customerId,
      start_date,
      end_date,
      total_days: total_days || null,
      total_price: total_price || 0,
      status: "confirmed",
      payment_status: "open",
      booking_source: "kiosk",
      customer_id_number: id_number || null,
      notes: notes || null,
    })
    .select("id, booking_number")
    .single();

  if (bookingErr) {
    console.error("Kiosk booking creation failed:", bookingErr);
    return Response.json({ error: bookingErr.message }, { status: 500 });
  }

  return Response.json({
    success: true,
    booking_id: booking.id,
    booking_number: booking.booking_number || booking.id.slice(0, 8).toUpperCase(),
  });
}
