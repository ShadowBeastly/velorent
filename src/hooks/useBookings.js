"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";
import { daysDiff, fmtCurrency } from "../utils/formatters";

export function useBookings(orgId) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!orgId) { setLoading(false); return; }
        setLoading(true);
        const { data } = await supabase
            .from("bookings")
            .select("*, bike:bikes(*), customer:customers(*)")
            .eq("organization_id", orgId)
            .order("start_date", { ascending: false });
        setBookings(data || []);
        setLoading(false);
    }, [orgId]);

    // eslint-disable-next-line
    useEffect(() => { load(); }, [load]);

    const create = async (booking) => {
        const selectedBikes = booking.selectedBikes || [];
        const isGroup = selectedBikes.length > 1;

        // Strip UI-only fields before inserting into bookings table
        // eslint-disable-next-line no-unused-vars
        const { selectedBikes: _sb, ...bookingRow } = booking;

        const insertRow = {
            ...bookingRow,
            organization_id: orgId,
            is_group_booking: isGroup,
            bike_count: isGroup ? selectedBikes.length : 1,
        };

        const { data, error } = await supabase
            .from("bookings")
            .insert(insertRow)
            .select("*, bike:bikes(*), customer:customers(*)")
            .single();

        if (!error) {
            // For group bookings, insert additional bikes as booking_items
            // (the first bike is already stored on bookings.bike_id)
            if (isGroup && selectedBikes.length > 1) {
                const additionalBikes = selectedBikes.slice(1);
                const items = additionalBikes.map(bike => ({
                    booking_id: data.id,
                    bike_id: bike.id,
                    price_per_day: bike.price_per_day ?? null,
                    subtotal: bike.subtotal ?? null,
                }));
                const { error: itemsError } = await supabase
                    .from("booking_items")
                    .insert(items);
                if (itemsError) {
                    console.error("booking_items insert failed:", itemsError);
                }
            }

            setBookings(prev => [data, ...prev]);

            // Trigger Email asynchronously
            if (data.customer?.email) {
                sendConfirmationEmail(data).catch(err => console.error("Email failed:", err));
            }
        } else {
            console.error("Booking creation failed:", error);
        }
        return { data, error };
    };

    const fetchOrg = async () => {
        const { data: org } = await supabase.from("organizations").select("name, email, phone").eq("id", orgId).single();
        return org;
    };

    const buildEmailData = (bookingData, org) => ({
        booking_number: bookingData.booking_number || bookingData.id.slice(0, 8).toUpperCase(),
        customer_name: `${bookingData.customer.first_name} ${bookingData.customer.last_name}`,
        customer_phone: bookingData.customer.phone,
        organization_name: org?.name || "VeloRent Pro",
        organization_email: org?.email,
        organization_phone: org?.phone,
        bike_name: bookingData.bike.name,
        start_date: new Date(bookingData.start_date).toLocaleDateString("de-DE"),
        end_date: new Date(bookingData.end_date).toLocaleDateString("de-DE"),
        total_days: daysDiff(bookingData.start_date, bookingData.end_date),
        total_price: fmtCurrency(bookingData.total_price),
        status: bookingData.status,
    });

    const sendConfirmationEmail = async (bookingData) => {
        const org = await fetchOrg();
        await supabase.functions.invoke('send-email', {
            body: {
                type: "booking_confirmation",
                to: bookingData.customer.email,
                data: buildEmailData(bookingData, org),
            }
        });
    };

    const sendPickupConfirmationEmail = async (bookingData) => {
        const org = await fetchOrg();
        // Reuse booking_confirmation template with status=picked_up so the banner shows "Bestätigt"
        await supabase.functions.invoke('send-email', {
            body: {
                type: "booking_confirmation",
                to: bookingData.customer.email,
                data: {
                    ...buildEmailData(bookingData, org),
                    status: "confirmed",
                },
            }
        });
    };

    const sendReturnReminder = async (bookingData) => {
        const org = await fetchOrg();
        await supabase.functions.invoke('send-email', {
            body: {
                type: "return_reminder",
                to: bookingData.customer.email,
                data: buildEmailData(bookingData, org),
            }
        });
    };

    const update = async (id, updates) => {
        const { data, error } = await supabase
            .from("bookings")
            .update(updates)
            .eq("id", id)
            .eq("organization_id", orgId)
            .select("*, bike:bikes(*), customer:customers(*)")
            .single();
        if (!error) {
            setBookings(prev => prev.map(b => b.id === id ? data : b));

            // Fire-and-forget emails on status transitions
            if (updates.status === "picked_up" && data.customer?.email) {
                sendPickupConfirmationEmail(data).catch(err => console.error("Pickup email failed:", err));
            }
            if (updates.status === "returned" && data.customer?.email) {
                sendReturnReminder(data).catch(err => console.error("Return email failed:", err));
            }
        } else {
            console.error("Booking update failed:", error);
        }
        return { data, error };
    };

    const remove = async (id) => {
        // Soft-delete: Set status to 'cancelled' instead of hard deleting
        const { error } = await supabase
            .from("bookings")
            .update({ status: 'cancelled' })
            .eq("id", id)
            .eq("organization_id", orgId);

        if (!error) {
            // Update local state: keep the booking but mark as cancelled
            setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
        } else {
            console.error("Booking cancellation failed:", error);
        }
        return { error };
    };

    return { bookings, loading, reload: load, create, update, remove, sendReturnReminder };
}
