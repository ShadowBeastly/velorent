"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";
import { daysDiff, fmtCurrency, fmtDate } from "../utils/formatters";

export function useBookings(orgId) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async ({ silent = false } = {}) => {
        if (!orgId) { setLoading(false); return; }
        if (!silent) setLoading(true);
        try {
            const { data, error } = await supabase
                .from("bookings")
                .select("*, bike:bikes(*), customer:customers(*), booking_items:booking_items(*, bike:bikes(id, name, category, price_per_day)), booking_addons:booking_addons(*, addon:add_ons(id, name))")
                .eq("organization_id", orgId)
                .order("start_date", { ascending: false });
            if (error) throw error;
            setBookings(data || []);
        } catch (err) {
            console.error("Failed to load bookings:", err);
            if (!silent) setBookings([]);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [orgId]);

    useEffect(() => { load(); }, [load]);

    const normalizeBookingPayload = (booking) => {
        const {
            selectedBikes = [],
            selectedAddOns = [],
            id_number,
            customer_id_number,
            ...bookingRow
        } = booking;

        if (customer_id_number !== undefined || id_number !== undefined) {
            bookingRow.customer_id_number = (customer_id_number ?? id_number) || null;
        }

        return { selectedBikes, selectedAddOns, bookingRow };
    };

    const saveBookingAddons = async (bookingId, selectedAddOns, addOnsData, totalDays) => {
        if (!selectedAddOns || selectedAddOns.length === 0) return;
        const rows = selectedAddOns.map(addonId => {
            const addon = (addOnsData || []).find(a => a.id === addonId);
            const unitPrice = addon?.price ?? 0;
            const priceType = addon?.price_type ?? 'per_day';
            const totalPrice = priceType === 'per_day' ? unitPrice * Math.max(1, totalDays) : unitPrice;
            return {
                booking_id: bookingId,
                addon_id: addonId,
                addon_name: addon?.name ?? addonId,
                price_type: priceType,
                unit_price: unitPrice,
                total_price: totalPrice,
            };
        });
        const { error } = await supabase.from("booking_addons").insert(rows);
        if (error) {
            console.error("booking_addons insert failed:", error);
            throw error;
        }
    };

    const create = async (booking, addOnsData) => {
        const { selectedBikes, selectedAddOns, bookingRow } = normalizeBookingPayload(booking);
        const isGroup = selectedBikes.length > 1;

        const insertRow = {
            ...bookingRow,
            organization_id: orgId,
            is_group_booking: isGroup,
            bike_count: isGroup ? selectedBikes.length : 1,
            total_days: bookingRow.start_date && bookingRow.end_date
                ? daysDiff(bookingRow.start_date, bookingRow.end_date)
                : (bookingRow.total_days || null),
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

            // Save selected add-ons (non-blocking — booking is already created)
            if (selectedAddOns.length > 0) {
                try {
                    await saveBookingAddons(data.id, selectedAddOns, addOnsData, insertRow.total_days || 1);
                } catch (addonErr) {
                    console.error("booking_addons insert failed (booking was created):", addonErr);
                }
            }

            // Optimistic update, then silent reload to get complete joins
            setBookings(prev => [data, ...prev]);
            load({ silent: true }).catch(() => {});

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
        try {
            const { data, error } = await supabase.from("organizations").select("name, email, phone").eq("id", orgId).single();
            if (error) throw error;
            return data;
        } catch (err) {
            console.error("fetchOrg failed:", err);
            return null;
        }
    };

    const buildEmailData = (bookingData, org) => ({
        booking_number: bookingData.booking_number || bookingData.id?.slice(0, 8).toUpperCase() || "",
        customer_name: bookingData.customer
            ? `${bookingData.customer.first_name} ${bookingData.customer.last_name}`
            : (bookingData.customer_name || "Gast"),
        customer_phone: bookingData.customer?.phone ?? "",
        organization_name: org?.name || "Lociva",
        organization_email: org?.email,
        organization_phone: org?.phone,
        bike_name: bookingData.bike?.name || bookingData.booking_items?.[0]?.bike?.name || "Fahrrad",
        start_date: bookingData.start_date ? fmtDate(bookingData.start_date) : "",
        end_date: bookingData.end_date ? fmtDate(bookingData.end_date) : "",
        total_days: bookingData.start_date && bookingData.end_date ? daysDiff(bookingData.start_date, bookingData.end_date) : 1,
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
        // Reuse booking_confirmation template with status=picked_up so the banner shows "Bestaetigt"
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

    const sendReturnConfirmation = async (bookingData) => {
        const org = await fetchOrg();
        await supabase.functions.invoke('send-email', {
            body: {
                type: "return_confirmation",
                to: bookingData.customer.email,
                data: buildEmailData(bookingData, org),
            }
        });
    };

    const update = async (id, updates, addOnsData) => {
        // BUG-007: also extract selectedBikes so group booking_items can be updated
        const { selectedBikes, selectedAddOns, bookingRow } = normalizeBookingPayload(updates);
        const { data, error } = await supabase
            .from("bookings")
            .update(bookingRow)
            .eq("id", id)
            .eq("organization_id", orgId)
            .select("*, bike:bikes(*), customer:customers(*)")
            .single();
        if (!error) {
            // Optimistic update immediately so the UI stays responsive
            setBookings(prev => prev.map(b => b.id === id ? data : b));

            // BUG-007: Re-sync booking_items for group bookings so old bikes don't persist
            if (selectedBikes.length > 0) {
                try {
                    await supabase.from("booking_items").delete().eq("booking_id", id);
                    const additionalBikes = selectedBikes.slice(1); // first bike lives on bookings.bike_id
                    if (additionalBikes.length > 0) {
                        const items = additionalBikes.map(bike => ({
                            booking_id: id,
                            bike_id: bike.id,
                            price_per_day: bike.price_per_day ?? null,
                            subtotal: bike.subtotal ?? null,
                        }));
                        const { error: itemsErr } = await supabase.from("booking_items").insert(items);
                        if (itemsErr) console.error("booking_items update failed:", itemsErr);
                    }
                    load({ silent: true }).catch(() => {});
                } catch (itemsErr) {
                    console.error("booking_items update failed:", itemsErr);
                }
            }

            // Re-save add-ons if caller explicitly passed addOnsData (empty selection removes all)
            if (addOnsData) {
                try {
                    await supabase.from("booking_addons").delete().eq("booking_id", id);
                    if (selectedAddOns.length > 0) {
                        const totalDays = bookingRow.total_days
                            || (bookingRow.start_date && bookingRow.end_date ? daysDiff(bookingRow.start_date, bookingRow.end_date) : null)
                            || 1;
                        await saveBookingAddons(id, selectedAddOns, addOnsData, totalDays);
                    }
                } catch (addonErr) {
                    console.error("booking_addons update failed:", addonErr);
                }
                // Silent reload to get fresh booking_addons data without spinner
                load({ silent: true }).catch(() => {});
            }

            // Fire-and-forget emails on status transitions
            if (updates.status === "picked_up" && data.customer?.email) {
                sendPickupConfirmationEmail(data).catch(err => console.error("Pickup email failed:", err));
            }
            if (updates.status === "returned" && data.customer?.email) {
                sendReturnConfirmation(data).catch(err => console.error("Return email failed:", err));
            }
        } else {
            console.error("Booking update failed:", error);
        }
        return { data, error };
    };

    const remove = async (id, cancellationStatus = null) => {
        // Soft-delete: Set status to 'cancelled' instead of hard deleting
        const updates = { status: 'cancelled' };
        if (cancellationStatus) updates.cancellation_status = cancellationStatus;

        const { error } = await supabase
            .from("bookings")
            .update(updates)
            .eq("id", id)
            .eq("organization_id", orgId);

        if (!error) {
            setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled', ...(cancellationStatus ? { cancellation_status: cancellationStatus } : {}) } : b));
        } else {
            console.error("Booking cancellation failed:", error);
        }
        return { error };
    };

    return { bookings, loading, reload: load, create, update, remove };
}