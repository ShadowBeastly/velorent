"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

export function usePricingRules(orgId) {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!orgId) { setLoading(false); return; }
        setLoading(true);
        const { data } = await supabase
            .from("pricing_rules")
            .select("*")
            .eq("organization_id", orgId)
            .order("priority", { ascending: false })
            .order("created_at", { ascending: false });
        setRules(data || []);
        setLoading(false);
    }, [orgId]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load(); }, [load]);

    const create = async (rule) => {
        const { data, error } = await supabase
            .from("pricing_rules")
            .insert({ ...rule, organization_id: orgId })
            .select()
            .single();
        if (!error) setRules(prev => [data, ...prev]);
        return { data, error };
    };

    const update = async (id, updates) => {
        const { data, error } = await supabase
            .from("pricing_rules")
            .update(updates)
            .eq("id", id)
            .eq("organization_id", orgId)
            .select()
            .single();
        if (!error) setRules(prev => prev.map(r => r.id === id ? data : r));
        return { data, error };
    };

    const remove = async (id) => {
        const { error } = await supabase
            .from("pricing_rules")
            .delete()
            .eq("id", id)
            .eq("organization_id", orgId);
        if (!error) setRules(prev => prev.filter(r => r.id !== id));
        return { error };
    };

    return { rules, loading, reload: load, create, update, remove };
}
