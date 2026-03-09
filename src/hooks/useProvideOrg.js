"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

export function useProvideOrganization(userId) {
    const [organizations, setOrganizations] = useState([]);
    const [currentOrg, setCurrentOrg] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadOrganizations = useCallback(async () => {
        if (!userId) return; // Guard clause

        const { data } = await supabase
            .from("organization_members")
            .select(`
        role,
        organization:organizations(*)
      `)
            .eq("user_id", userId)
            .eq("status", "active");

        const orgs = data?.map(d => ({ ...d.organization, userRole: d.role })) || [];
        setOrganizations(orgs);

        // Auto-select first org or from localStorage
        const savedOrgId = localStorage.getItem("currentOrgId");
        const savedOrg = orgs.find(o => o.id === savedOrgId);
        setCurrentOrg(savedOrg || orgs[0] || null);
        setLoading(false);
    }, [userId]);

    useEffect(() => {
        if (!userId) {
            if (loading) {
                // Prevent synchronous setState warning
                const t = setTimeout(() => setLoading(false), 0);
                return () => clearTimeout(t);
            }
            return;
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadOrganizations();
    }, [userId, loadOrganizations, loading]);

    const switchOrg = (orgId) => {
        const org = organizations.find(o => o.id === orgId);
        if (org) {
            setCurrentOrg(org);
            localStorage.setItem("currentOrgId", orgId);
        }
    };

    const createOrganization = async (name, slug) => {
        const { data: org, error } = await supabase
            .from("organizations")
            .insert({ name, slug, created_by: userId })
            .select()
            .single();

        if (error) return { error };

        // Add creator as owner
        const { error: memberError } = await supabase.from("organization_members").insert({
            organization_id: org.id,
            user_id: userId,
            role: "owner",
            status: "active",
            joined_at: new Date().toISOString()
        });

        if (memberError) {
            // Rollback: delete the org since it has no owner
            await supabase.from("organizations").delete().eq("id", org.id);
            return { error: memberError };
        }

        await loadOrganizations();
        return { data: org };
    };

    return { organizations, currentOrg, loading, switchOrg, createOrganization, reload: loadOrganizations };
}
