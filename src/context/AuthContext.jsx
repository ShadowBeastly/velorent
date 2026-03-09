"use client";
import { createContext, useContext } from "react";
import { useProvideAuth } from "../hooks/useProvideAuth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const auth = useProvideAuth();
    return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    return useContext(AuthContext);
};
