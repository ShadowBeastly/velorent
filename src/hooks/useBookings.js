import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

// Simple utils to avoid circular dependencies if possible, or import them
const daysDiff = (a, b) => Math.ceil((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24)) + 1;
const fmtCurrency = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);

export function useBookings(orgId) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!orgId) return;
        setLoading(true);
        const { data } = await supabase
            .from("bookings")
            .select("*, bike:bikes(*), customer:customers(*)")
            .eq("organization_id", orgId)
            .order("start_date", { ascending: false });
        setBookings(data || []);
        setLoading(false);
    }, [orgId]);

    useEffect(() => { load(); }, [load]);

    const create = async (booking) => {
        const { data, error } = await supabase
            .from("bookings")
            .insert({ ...booking, organization_id: orgId })
            .select("*, bike:bikes(*), customer:customers(*)")
            .single();

        if (!error) {
            setBookings(prev => [data, ...prev]);

            // Trigger Email asynchronously
            if (data.customer?.email) {
                sendConfirmationEmail(data).catch(err => console.error("Email failed:", err));
            }
        }
        return { data, error };
    };

    const sendConfirmationEmail = async (bookingData) => {
        // Fetch Org Name if needed, or use a placeholder if not available in bookingData
        // For now, we'll try to get it from the session or assume it's passed, 
        // but since we don't have it easily, we'll use a generic fallback or fetch it.
        // Optimization: We could fetch org details once in the hook.

        const { data: org } = await supabase.from("organizations").select("name, email, phone").eq("id", orgId).single();

        await supabase.functions.invoke('send-email', {
            body: {
                type: "booking_confirmation",
                to: bookingData.customer.email,
                data: {
                    booking_number: bookingData.id.slice(0, 8).toUpperCase(), // Fallback ID
                    customer_name: `${bookingData.customer.first_name} ${bookingData.customer.last_name}`,
                    organization_name: org?.name || "VeloRent Pro",
                    organization_email: org?.email,
                    organization_phone: org?.phone,
                    bike_name: bookingData.bike.name,
                    start_date: new Date(bookingData.start_date).toLocaleDateString("de-DE"),
                    end_date: new Date(bookingData.end_date).toLocaleDateString("de-DE"),
                    total_days: daysDiff(bookingData.start_date, bookingData.end_date),
                    total_price: fmtCurrency(bookingData.total_price),
                    status: bookingData.status
                }
            }
        });
    };

    const update = async (id, updates) => {
        const { data, error } = await supabase
            .from("bookings")
            .update(updates)
            .eq("id", id)
            .select("*, bike:bikes(*), customer:customers(*)")
            .single();
        if (!error) setBookings(prev => prev.map(b => b.id === id ? data : b));
        return { data, error };
    };

    const remove = async (id) => {
        const { error } = await supabase.from("bookings").delete().eq("id", id);
        if (!error) setBookings(prev => prev.filter(b => b.id !== id));
        return { error };
    };

    return { bookings, loading, reload: load, create, update, remove };
}
