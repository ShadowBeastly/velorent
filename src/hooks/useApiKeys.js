"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

export function useApiKeys(orgId) {
    const [apiKeys, setApiKeys] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!orgId) { setLoading(false); return; }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("api_keys")
                .select("id, name, key_prefix, permissions, is_active, last_used_at, expires_at, created_at")
                .eq("organization_id", orgId)
                .order("created_at", { ascending: false });
            if (error) throw error;
            setApiKeys(data || []);
        } catch (err) {
            console.error("Failed to load API keys:", err);
            setApiKeys([]);
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => { load(); }, [load]);

    /**
     * Create a new API key.
     * Generates a random key client-side, hashes it via SubtleCrypto,
     * stores only the hash + prefix. Returns the raw key ONCE.
     */
    const createApiKey = async ({ name, permissions = [] }) => {
        // Generate a cryptographically random key: rc_ + 40 hex chars
        const bytes = crypto.getRandomValues(new Uint8Array(20));
        const rawKey = "rc_" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
        const prefix = rawKey.slice(0, 8); // "rc_XXXXX"

        // SHA-256 hash
        const enc = new TextEncoder();
        const buf = await crypto.subtle.digest("SHA-256", enc.encode(rawKey));
        const keyHash = Array.from(new Uint8Array(buf))
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");

        const { data, error } = await supabase
            .from("api_keys")
            .insert({ organization_id: orgId, name, key_hash: keyHash, key_prefix: prefix, permissions, is_active: true })
            .select("id, name, key_prefix, permissions, is_active, last_used_at, expires_at, created_at")
            .single();

        if (error) return { data: null, rawKey: null, error };
        setApiKeys(prev => [data, ...prev]);
        return { data, rawKey, error: null };
    };

    const revokeApiKey = async (id) => {
        const { error } = await supabase
            .from("api_keys")
            .update({ is_active: false })
            .eq("id", id)
            .eq("organization_id", orgId);
        if (!error) setApiKeys(prev => prev.map(k => k.id === id ? { ...k, is_active: false } : k));
        return { error };
    };

    const deleteApiKey = async (id) => {
        const { error } = await supabase
            .from("api_keys")
            .delete()
            .eq("id", id)
            .eq("organization_id", orgId);
        if (!error) setApiKeys(prev => prev.filter(k => k.id !== id));
        return { error };
    };

    return { apiKeys, loading, createApiKey, revokeApiKey, deleteApiKey, reload: load };
}
