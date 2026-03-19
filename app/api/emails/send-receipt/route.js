// app/api/emails/send-receipt/route.js
// POST — sends a receipt email after a booking is marked "returned".
// Body: { booking_id: string }

import { createClient } from "@supabase/supabase-js";
import { sendReceipt, logEmail } from "../../../../src/utils/email.js";

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
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { booking_id } = body;
    if (!booking_id) {
        return Response.json({ error: "booking_id required" }, { status: 400 });
    }

    const { data: booking, error: fetchErr } = await supabase
        .from("bookings")
        .select("*, bike:bikes(id, name), customer:customers(id, first_name, last_name, email)")
        .eq("id", booking_id)
        .single();

    if (fetchErr || !booking) {
        return Response.json({ error: "Booking not found" }, { status: 404 });
    }

    let org = null;
    if (booking.organization_id) {
        const { data } = await supabase
            .from("organizations")
            .select("name, email, phone, address")
            .eq("id", booking.organization_id)
            .single();
        org = data;
    }

    const { resend_id, error: emailError } = await sendReceipt(booking, org);

    await logEmail(
        supabase,
        booking_id,
        "receipt",
        emailError ? "failed" : "sent",
        resend_id
    );

    if (emailError && emailError !== "no_email") {
        return Response.json({ success: false, error: emailError }, { status: 500 });
    }

    return Response.json({ success: true, resend_id });
}
