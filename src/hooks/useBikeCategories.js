"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

export function useBikeCategories(orgId) {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!orgId) { setLoading(false); return; }
        setLoading(true);
        const { data } = await supabase
            .from("bike_categories")
            .select("*")
            .eq("organization_id", orgId)
            .order("sort_order", { ascending: true });
        setCategories(data || []);
        setLoading(false);
    }, [orgId]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load(); }, [load]);

    const create = async (category) => {
        const { data, error } = await supabase
            .from("bike_categories")
            .insert({ ...category, organization_id: orgId })
            .select()
            .single();
        if (!error) setCategories(prev => [...prev, data]);
        return { data, error };
    };

    const update = async (id, updates) => {
        const { data, error } = await supabase
            .from("bike_categories")
            .update(updates)
            .eq("id", id)
            .eq("organization_id", orgId)
            .select()
            .single();
        if (!error) setCategories(prev => prev.map(c => c.id === id ? data : c));
        return { data, error };
    };

    const remove = async (id) => {
        const { error } = await supabase.from("bike_categories").delete().eq("id", id).eq("organization_id", orgId);
        if (!error) setCategories(prev => prev.filter(c => c.id !== id));
        return { error };
    };

    return { categories, loading, reload: load, create, update, remove };
}
