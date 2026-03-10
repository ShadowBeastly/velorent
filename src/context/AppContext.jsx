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

    // After hydration, adjust sidebar based on screen width (avoid SSR mismatch)
    useEffect(() => {
        if (typeof window !== "undefined" && window.innerWidth < 768) {
            setSidebarOpen(false);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("darkMode", String(darkMode));
        // Sync Tailwind `dark:` class variants with our darkMode state
        if (typeof document !== "undefined") {
            document.documentElement.classList.toggle("dark", darkMode);
        }
    }, [darkMode]);

    // Apply dark class on initial hydration before first paint
    useEffect(() => {
        if (typeof document !== "undefined") {
            document.documentElement.classList.toggle("dark", darkMode);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
