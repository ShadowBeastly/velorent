"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

export function useCustomers(orgId) {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!orgId) { setLoading(false); return; }
        setLoading(true);
        const { data } = await supabase
            .from("customers")
            .select("*")
            .eq("organization_id", orgId)
            .order("last_name", { ascending: true });
        setCustomers(data || []);
        setLoading(false);
    }, [orgId]);

    // eslint-disable-next-line
    useEffect(() => { load(); }, [load]);

    const create = async (customer) => {
        const { data, error } = await supabase
            .from("customers")
            .insert({ ...customer, organization_id: orgId })
            .select()
            .single();
        if (!error) setCustomers(prev => [...prev, data]);
        return { data, error };
    };

    const update = async (id, updates) => {
        const { data, error } = await supabase
            .from("customers")
            .update(updates)
            .eq("id", id)
            .eq("organization_id", orgId)
            .select()
            .single();
        if (!error) setCustomers(prev => prev.map(c => c.id === id ? data : c));
        return { data, error };
    };

    const remove = async (id) => {
        const { error } = await supabase.from("customers").delete().eq("id", id).eq("organization_id", orgId);
        if (!error) setCustomers(prev => prev.filter(c => c.id !== id));
        return { error };
    };

    return { customers, loading, reload: load, create, update, remove };
}
