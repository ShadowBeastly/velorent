// app/api/cron/reminders/route.js
// GET — Vercel Cron job that runs daily at 08:00 UTC.
// Finds bookings with pickup or return tomorrow, sends Resend reminders.
//
// Protected by CRON_SECRET header to prevent unauthorized triggers.

import { createClient } from "@supabase/supabase-js";
import {
    sendPickupReminder,
    sendReturnReminder,
    logEmail,
} from "../../../../src/utils/email.js";

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
}

/** Returns tomorrow's date as "YYYY-MM-DD" in UTC. */
function tomorrowUTC() {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
}

export async function GET(req) {
    // Guard: Vercel sends Authorization: Bearer <CRON_SECRET>
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const auth = req.headers.get("authorization");
        if (auth !== `Bearer ${cronSecret}`) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    const supabase = getSupabase();
    if (!supabase) {
        return Response.json({ error: "Server configuration error" }, { status: 500 });
    }

    const tomorrow = tomorrowUTC();
    const results = { pickup: [], return: [], errors: [] };

    // --- Pickup reminders ---
    const { data: pickups, error: pickupErr } = await supabase
        .from("bookings")
        .select("*, bike:bikes(id, name), customer:customers(id, first_name, last_name, email)")
        .eq("start_date", tomorrow)
        .in("status", ["reserved", "confirmed"])
        .not("customer.email", "is", null);

    if (pickupErr) {
        console.error("[reminders] pickups query failed:", pickupErr);
        results.errors.push({ type: "pickup_query", error: pickupErr.message });
    } else {
        for (const booking of pickups ?? []) {
            const { resend_id, error } = await sendPickupReminder(booking);
            await logEmail(
                supabase,
                booking.id,
                "pickup_reminder",
                error ? "failed" : "sent",
                resend_id
            );
            if (error) {
                results.errors.push({ type: "pickup", booking_id: booking.id, error });
            } else {
                results.pickup.push(booking.id);
            }
        }
    }

    // --- Return reminders ---
    const { data: returns, error: returnErr } = await supabase
        .from("bookings")
        .select("*, bike:bikes(id, name), customer:customers(id, first_name, last_name, email)")
        .eq("end_date", tomorrow)
        .in("status", ["picked_up"])
        .not("customer.email", "is", null);

    if (returnErr) {
        console.error("[reminders] returns query failed:", returnErr);
        results.errors.push({ type: "return_query", error: returnErr.message });
    } else {
        for (const booking of returns ?? []) {
            const { resend_id, error } = await sendReturnReminder(booking);
            await logEmail(
                supabase,
                booking.id,
                "return_reminder",
                error ? "failed" : "sent",
                resend_id
            );
            if (error) {
                results.errors.push({ type: "return", booking_id: booking.id, error });
            } else {
                results.return.push(booking.id);
            }
        }
    }

    console.log(`[reminders] ${tomorrow} — pickup: ${results.pickup.length}, return: ${results.return.length}, errors: ${results.errors.length}`);

    return Response.json({
        date: tomorrow,
        pickup_sent: results.pickup.length,
        return_sent: results.return.length,
        errors: results.errors,
    });
}
