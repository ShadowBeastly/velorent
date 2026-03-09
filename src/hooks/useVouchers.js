"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

export function useVouchers(orgId) {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!orgId) return;
        setLoading(true);
        const { data } = await supabase
            .from("vouchers")
            .select("*")
            .eq("organization_id", orgId)
            .order("created_at", { ascending: false });
        setVouchers(data || []);
        setLoading(false);
    }, [orgId]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load(); }, [load]);

    const create = async (voucher) => {
        const { data, error } = await supabase
            .from("vouchers")
            .insert({ ...voucher, organization_id: orgId })
            .select()
            .single();
        if (!error) setVouchers(prev => [data, ...prev]);
        return { data, error };
    };

    const update = async (id, updates) => {
        const { data, error } = await supabase
            .from("vouchers")
            .update(updates)
            .eq("id", id)
            .eq("organization_id", orgId)
            .select()
            .single();
        if (!error) setVouchers(prev => prev.map(v => v.id === id ? data : v));
        return { data, error };
    };

    const remove = async (id) => {
        const { error } = await supabase.from("vouchers").delete().eq("id", id).eq("organization_id", orgId);
        if (!error) setVouchers(prev => prev.filter(v => v.id !== id));
        return { error };
    };

    return { vouchers, loading, reload: load, create, update, remove };
}
