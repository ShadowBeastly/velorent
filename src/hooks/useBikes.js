"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

export function useBikes(orgId) {
    const [bikes, setBikes] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!orgId) { setLoading(false); return; }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("bikes")
                .select("*")
                .eq("organization_id", orgId)
                .order("created_at", { ascending: true });
            if (error) throw error;
            setBikes(data || []);
        } catch (err) {
            console.error("Failed to load bikes:", err);
            setBikes([]);
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => { load(); }, [load]);

    const create = async (bike) => {
        const { data, error } = await supabase
            .from("bikes")
            .insert({ ...bike, organization_id: orgId })
            .select()
            .single();
        if (!error) setBikes(prev => [...prev, data]);
        return { data, error };
    };

    const update = async (id, updates) => {
        const { data, error } = await supabase
            .from("bikes")
            .update(updates)
            .eq("id", id)
            .eq("organization_id", orgId)
            .select()
            .single();
        if (!error) setBikes(prev => prev.map(b => b.id === id ? data : b));
        return { data, error };
    };

    const remove = async (id) => {
        const { error } = await supabase.from("bikes").delete().eq("id", id).eq("organization_id", orgId);
        if (!error) setBikes(prev => prev.filter(b => b.id !== id));
        return { error };
    };

    return { bikes, loading, reload: load, create, update, remove };
}
