"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

export function useItems(orgId) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!orgId) { setLoading(false); return; }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("items")
                .select("*")
                .eq("organization_id", orgId)
                .order("created_at", { ascending: true });
            if (error) throw error;
            setItems(data || []);
        } catch (err) {
            console.error("Failed to load items:", err);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => { load(); }, [load]);

    const create = async (item) => {
        const { data, error } = await supabase
            .from("items")
            .insert({ ...item, organization_id: orgId })
            .select()
            .single();
        if (!error) setItems(prev => [...prev, data]);
        return { data, error };
    };

    const update = async (id, updates) => {
        const { data, error } = await supabase
            .from("items")
            .update(updates)
            .eq("id", id)
            .eq("organization_id", orgId)
            .select()
            .single();
        if (!error) setItems(prev => prev.map(i => i.id === id ? data : i));
        return { data, error };
    };

    const remove = async (id) => {
        const { error } = await supabase.from("items").delete().eq("id", id).eq("organization_id", orgId);
        if (!error) setItems(prev => prev.filter(i => i.id !== id));
        return { error };
    };

    return { items, loading, reload: load, create, update, remove };
}
