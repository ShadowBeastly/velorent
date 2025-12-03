import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";
import { useAuth } from "./AuthContext";

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
    const { user } = useAuth();
    const org = useProvideOrganization(user?.id);
    return <OrgContext.Provider value={org}>{children}</OrgContext.Provider>;
}

export const useOrganization = () => {
    return useContext(OrgContext);
};

function useProvideOrganization(userId) {
    const [organizations, setOrganizations] = useState([]);
    const [currentOrg, setCurrentOrg] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadOrganizations = useCallback(async () => {
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
            setLoading(false);
            return;
        }
        loadOrganizations();
    }, [userId, loadOrganizations]);

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
        await supabase.from("organization_members").insert({
            organization_id: org.id,
            user_id: userId,
            role: "owner",
            status: "active",
            joined_at: new Date().toISOString()
        });

        await loadOrganizations();
        return { data: org };
    };

    return { organizations, currentOrg, loading, switchOrg, createOrganization, reload: loadOrganizations };
}
