"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

export function useMaintenanceBlocks(orgId) {
    const [blocks, setBlocks] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!orgId) { setLoading(false); return; }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("maintenance_logs")
                .select("*, bike:bikes(id, name, category)")
                .eq("organization_id", orgId)
                .order("created_at", { ascending: false });
            if (error) throw error;
            setBlocks(data || []);
        } catch (err) {
            console.error("Failed to load maintenance blocks:", err);
            setBlocks([]);
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => { load(); }, [load]);

    const create = async (block) => {
        const { data, error } = await supabase
            .from("maintenance_logs")
            .insert({ ...block, organization_id: orgId })
            .select("*, bike:bikes(id, name, category)")
            .single();
        if (!error) setBlocks(prev => [data, ...prev]);
        return { data, error };
    };

    const update = async (id, updates) => {
        const { data, error } = await supabase
            .from("maintenance_logs")
            .update(updates)
            .eq("id", id)
            .eq("organization_id", orgId)
            .select("*, bike:bikes(id, name, category)")
            .single();
        if (!error) setBlocks(prev => prev.map(b => b.id === id ? data : b));
        return { data, error };
    };

    const remove = async (id) => {
        const { error } = await supabase.from("maintenance_logs").delete().eq("id", id).eq("organization_id", orgId);
        if (!error) setBlocks(prev => prev.filter(b => b.id !== id));
        return { error };
    };

    return { blocks, loading, reload: load, create, update, remove };
}
