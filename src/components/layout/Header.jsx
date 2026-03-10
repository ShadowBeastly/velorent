"use client";
import { useState, useRef, useEffect } from "react";
import { Menu, Search, Bell, Sun, Moon, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { NAVIGATION_ITEMS } from "../../utils/navigationItems";
import { useApp } from "../../context/AppContext";
import { useData } from "../../context/DataContext";

export default function Header() {
    const pathname = usePathname();
    const { sidebarOpen, setSidebarOpen, searchQuery, setSearchQuery, darkMode, setDarkMode } = useApp();
    const { notifications } = useData();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const currentItem = NAVIGATION_ITEMS.find(item => item.path === pathname) || NAVIGATION_ITEMS[0];
    const notifRef = useRef(null);

    useEffect(() => {
        if (!showNotifications) return;
        const handler = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showNotifications]);

    return (
        <header className={`sticky top-0 z-30 ${darkMode ? "bg-slate-900/80 border-slate-800" : "bg-white/80 border-slate-200"} backdrop-blur-xl border-b transition-colors duration-300`}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        aria-label={sidebarOpen ? "Seitenleiste schließen" : "Seitenleiste öffnen"}
                        aria-expanded={sidebarOpen}
                        className={`shrink-0 p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"}`}
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-semibold tracking-tight font-sans truncate min-w-0">
                        {currentItem.label}
                    </h2>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {/* Search — desktop */}
                    <div className="relative hidden md:block">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? "text-slate-500" : "text-slate-400"}`} />
                        <input
                            type="text"
                            placeholder="Suchen..."
                            aria-label="Suchen"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-64 pl-10 pr-4 py-2 rounded-lg border outline-none transition-all duration-200 text-sm ${darkMode
                                ? "bg-slate-800 border-slate-700 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                : "bg-slate-50 border-slate-200 text-slate-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:bg-white"
                                }`}
                        />
                    </div>

                    {/* Search toggle — mobile */}
                    <button
                        onClick={() => setShowMobileSearch(prev => !prev)}
                        aria-label={showMobileSearch ? "Suche schließen" : "Suchen"}
                        className={`md:hidden p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"}`}
                    >
                        {showMobileSearch ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                    </button>

                    {/* Notifications */}
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => setShowNotifications(prev => !prev)}
                            aria-label="Benachrichtigungen"
                            aria-expanded={showNotifications}
                            aria-haspopup="true"
                            className={`relative p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"}`}
                        >
                            <Bell className="w-5 h-5" />
                            {notifications.length > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
                            )}
                        </button>
                        {showNotifications && (
                            <div className={`absolute right-0 top-10 w-72 max-w-[calc(100vw-2rem)] border rounded-lg shadow-lg z-50 p-4 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                                <p className={`text-sm font-semibold mb-2 ${darkMode ? "text-white" : "text-slate-900"}`}>Benachrichtigungen</p>
                                {notifications && notifications.length > 0 ? (
                                    notifications.slice(0, 5).map((n, i) => (
                                        <div key={i} className={`text-sm py-1 border-b last:border-0 ${darkMode ? "text-slate-300 border-slate-700" : "text-slate-600 border-slate-100"}`}>
                                            {n.message || n.title || n.msg || JSON.stringify(n)}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-400">Keine neuen Benachrichtigungen</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Dark Mode */}
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        aria-label={darkMode ? "Helles Design aktivieren" : "Dunkles Design aktivieren"}
                        className={`p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-slate-800 text-amber-400" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"}`}
                    >
                        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile search bar */}
            {showMobileSearch && (
                <div className="md:hidden px-4 pb-3">
                    <div className="relative">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? "text-slate-500" : "text-slate-400"}`} />
                        <input
                            type="text"
                            placeholder="Suchen..."
                            aria-label="Suchen"
                            autoFocus
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-10 pr-4 py-2 rounded-lg border outline-none text-sm ${darkMode
                                ? "bg-slate-800 border-slate-700 text-white focus:border-brand-500"
                                : "bg-slate-50 border-slate-200 text-slate-900 focus:border-brand-500 focus:bg-white"
                                }`}
                        />
                    </div>
                </div>
            )}
        </header>
    );
}
