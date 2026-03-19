"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

export function usePricingRules(orgId) {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!orgId) { setLoading(false); return; }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("pricing_rules")
                .select("*, pricing_rule_conditions(*)")
                .eq("organization_id", orgId)
                .order("priority", { ascending: false })
                .order("created_at", { ascending: false });
            if (error) throw error;
            setRules(data || []);
        } catch (err) {
            console.error("Failed to load pricing rules:", err);
            setRules([]);
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => { load(); }, [load]);

    // ── pricing_rules CRUD ───────────────────────────────────────────────────────

    const create = async (rule) => {
        const { data, error } = await supabase
            .from("pricing_rules")
            .insert({ ...rule, organization_id: orgId })
            .select("*, pricing_rule_conditions(*)")
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
            .select("*, pricing_rule_conditions(*)")
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

    // ── pricing_rule_conditions CRUD ─────────────────────────────────────────────

    const createCondition = async (ruleId, conditionData) => {
        const { data, error } = await supabase
            .from("pricing_rule_conditions")
            .insert({ ...conditionData, rule_id: ruleId })
            .select()
            .single();
        if (!error) {
            setRules(prev => prev.map(r => r.id === ruleId
                ? { ...r, pricing_rule_conditions: [...(r.pricing_rule_conditions || []), data] }
                : r
            ));
        }
        return { data, error };
    };

    const updateCondition = async (conditionId, ruleId, updates) => {
        const { data, error } = await supabase
            .from("pricing_rule_conditions")
            .update(updates)
            .eq("id", conditionId)
            .select()
            .single();
        if (!error) {
            setRules(prev => prev.map(r => r.id === ruleId
                ? {
                    ...r,
                    pricing_rule_conditions: (r.pricing_rule_conditions || [])
                        .map(c => c.id === conditionId ? data : c)
                }
                : r
            ));
        }
        return { data, error };
    };

    const removeCondition = async (conditionId, ruleId) => {
        const { error } = await supabase
            .from("pricing_rule_conditions")
            .delete()
            .eq("id", conditionId);
        if (!error) {
            setRules(prev => prev.map(r => r.id === ruleId
                ? {
                    ...r,
                    pricing_rule_conditions: (r.pricing_rule_conditions || [])
                        .filter(c => c.id !== conditionId)
                }
                : r
            ));
        }
        return { error };
    };

    return {
        rules,
        loading,
        reload: load,
        create,
        update,
        remove,
        createCondition,
        updateCondition,
        removeCondition,
    };
}
