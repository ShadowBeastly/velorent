"use client";
import { createContext, useContext, useState, useEffect } from "react";

const AppContext = createContext(null);

export function AppProvider({ children }) {
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window === "undefined") return true;
        const stored = localStorage.getItem("darkMode");
        return stored === null ? true : stored === "true";
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        localStorage.setItem("darkMode", String(darkMode));
    }, [darkMode]);

    return (
        <AppContext.Provider value={{
            darkMode, setDarkMode,
            searchQuery, setSearchQuery,
            sidebarOpen, setSidebarOpen
        }}>
            {children}
        </AppContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
    const context = useContext(AppContext);
    if (!context) throw new Error("useApp must be used within AppProvider");
    return context;
}
