import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

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
        if (!error) setBookings(prev => [data, ...prev]);
        return { data, error };
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
