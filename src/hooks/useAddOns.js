"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

export function useAddOns(orgId) {
    const [addOns, setAddOns] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!orgId) { setLoading(false); return; }
        setLoading(true);
        const { data } = await supabase
            .from("add_ons")
            .select("*")
            .eq("organization_id", orgId)
            .order("name", { ascending: true });
        setAddOns(data || []);
        setLoading(false);
    }, [orgId]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load(); }, [load]);

    const create = async (addOn) => {
        const { data, error } = await supabase
            .from("add_ons")
            .insert({ ...addOn, organization_id: orgId })
            .select()
            .single();
        if (!error) setAddOns(prev => [...prev, data]);
        return { data, error };
    };

    const update = async (id, updates) => {
        const { data, error } = await supabase
            .from("add_ons")
            .update(updates)
            .eq("id", id)
            .eq("organization_id", orgId)
            .select()
            .single();
        if (!error) setAddOns(prev => prev.map(a => a.id === id ? data : a));
        return { data, error };
    };

    const remove = async (id) => {
        const { error } = await supabase.from("add_ons").delete().eq("id", id).eq("organization_id", orgId);
        if (!error) setAddOns(prev => prev.filter(a => a.id !== id));
        return { error };
    };

    return { addOns, loading, reload: load, create, update, remove };
}
