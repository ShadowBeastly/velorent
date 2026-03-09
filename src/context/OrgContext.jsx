"use client";
import { createContext, useContext } from "react";
import { useAuth } from "./AuthContext";
import { useProvideOrganization } from "../hooks/useProvideOrg";

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
    const { user } = useAuth();
    const org = useProvideOrganization(user?.id);
    return <OrgContext.Provider value={org}>{children}</OrgContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useOrganization = () => {
    return useContext(OrgContext);
};
