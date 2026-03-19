// app/api/emails/send-confirmation/route.js
// POST — generates confirmation_code + QR PNG, uploads to Supabase Storage,
//         updates the booking, and sends the confirmation email via Resend.
//
// Body: { booking_id: string }
// Auth: called server-side (from useBookings hook fire-and-forget);
//       no user session required — uses service role key.

import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import {
    sendBookingConfirmation,
    logEmail,
} from "../../../../src/utils/email.js";

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
}

/** Generate a random 8-char uppercase alphanumeric code, e.g. "RK7X9M2P" */
function genConfirmationCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid ambiguity
    let code = "";
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    for (const byte of arr) {
        code += chars[byte % chars.length];
    }
    return code;
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

    // 1. Load booking with related data
    const { data: booking, error: fetchErr } = await supabase
        .from("bookings")
        .select("*, bike:bikes(id, name, category), customer:customers(id, first_name, last_name, email, phone)")
        .eq("id", booking_id)
        .single();

    if (fetchErr || !booking) {
        return Response.json({ error: "Booking not found" }, { status: 404 });
    }

    // 2. Generate confirmation_code (idempotent — reuse existing if set)
    const confirmationCode = booking.confirmation_code || genConfirmationCode();

    // 3. Generate QR code PNG
    const checkinUrl = `https://rentcore.de/checkin/${confirmationCode}`;
    let qrBuffer;
    try {
        qrBuffer = await QRCode.toBuffer(checkinUrl, {
            type: "png",
            width: 300,
            margin: 2,
            color: { dark: "#1A7D5A", light: "#FFFFFF" },
        });
    } catch (qrErr) {
        console.error("[send-confirmation] QR generation failed:", qrErr);
        // Continue without QR — email still sends
    }

    // 4. Upload QR PNG to Supabase Storage
    let qrUrl = booking.qr_code_url ?? null;
    if (qrBuffer) {
        const storagePath = `${booking.organization_id}/${booking_id}.png`;
        const { error: uploadErr } = await supabase.storage
            .from("qrcodes")
            .upload(storagePath, qrBuffer, {
                contentType: "image/png",
                upsert: true,
            });

        if (uploadErr) {
            console.error("[send-confirmation] Storage upload failed:", uploadErr);
        } else {
            const { data: urlData } = supabase.storage.from("qrcodes").getPublicUrl(storagePath);
            qrUrl = urlData?.publicUrl ?? null;
        }
    }

    // 5. Update booking: confirmation_code, qr_code_url, email_sent_at
    const { error: updateErr } = await supabase
        .from("bookings")
        .update({
            confirmation_code: confirmationCode,
            qr_code_url: qrUrl,
            email_sent_at: new Date().toISOString(),
        })
        .eq("id", booking_id);

    if (updateErr) {
        console.error("[send-confirmation] Booking update failed:", updateErr);
    }

    // 6. Load org info for email
    const orgId = booking.organization_id;
    let org = null;
    if (orgId) {
        const { data: orgData } = await supabase
            .from("organizations")
            .select("name, email, phone, address")
            .eq("id", orgId)
            .single();
        org = orgData;
    }

    // 7. Send email via Resend (only if customer has email)
    const enrichedBooking = { ...booking, confirmation_code: confirmationCode };
    const { resend_id, error: emailError } = await sendBookingConfirmation(
        enrichedBooking,
        org,
        qrUrl
    );

    // 8. Log to email_log
    await logEmail(
        supabase,
        booking_id,
        "booking_confirmation",
        emailError ? "failed" : "sent",
        resend_id
    );

    if (emailError && emailError !== "no_email") {
        console.error("[send-confirmation] Email send failed:", emailError);
        return Response.json(
            { success: false, error: emailError, confirmation_code: confirmationCode, qr_code_url: qrUrl },
            { status: 500 }
        );
    }

    return Response.json({
        success: true,
        confirmation_code: confirmationCode,
        qr_code_url: qrUrl,
        resend_id,
    });
}
