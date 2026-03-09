"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bike, LogOut, X } from "lucide-react";

import { NAVIGATION_ITEMS } from "../../utils/navigationItems";
import { useI18n } from "../../utils/i18n";

export default function Sidebar({ org, auth, sidebarOpen, setSidebarOpen, darkMode }) {
    const pathname = usePathname();
    const { t } = useI18n();

    // showLabels: on desktop, only when sidebar is expanded.
    // On mobile the sidebar is always w-64 (full drawer), so labels always visible there.
    // We still use this flag to control desktop-only collapsed state rendering.
    const showLabels = sidebarOpen;

    return (
        <aside className={`
            fixed top-0 left-0 z-40 h-screen border-r w-64
            transition-all duration-300
            md:translate-x-0
            ${sidebarOpen ? "translate-x-0 md:w-64" : "-translate-x-full md:w-20"}
            ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}
        `}>
            <div className="flex flex-col h-full">
                {/* Logo */}
                <div className={`flex items-center gap-3 p-6 ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                    <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/20 flex-shrink-0">
                        <Bike className="w-6 h-6 text-white" />
                    </div>
                    {/*
                        Title block:
                        - Mobile (< md): always shown — the drawer is always w-64 with labels
                        - Desktop (>= md): shown only when expanded (showLabels)
                    */}
                    {showLabels && (
                        <div className="min-w-0 flex-1 animate-fade-in">
                            <h1 className="font-bold text-lg tracking-tight truncate font-sans">
                                {org.currentOrg?.name || "VeloRent"}
                            </h1>
                            <p className={`text-xs truncate font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                Pro Cloud
                            </p>
                        </div>
                    )}
                    {/* When desktop-collapsed, still show org name on mobile (drawer always open with labels) */}
                    {!showLabels && (
                        <div className="min-w-0 flex-1 animate-fade-in md:hidden">
                            <h1 className="font-bold text-lg tracking-tight truncate font-sans">
                                {org.currentOrg?.name || "VeloRent"}
                            </h1>
                            <p className={`text-xs truncate font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                Pro Cloud
                            </p>
                        </div>
                    )}
                    {/* Close button — mobile only */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className={`md:hidden p-1.5 rounded-lg transition-colors flex-shrink-0 ${darkMode ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"}`}
                        aria-label="Sidebar schließen"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Org Switcher — only when labels are shown */}
                {org.organizations.length > 1 && (
                    <div className={`px-4 mb-4 ${showLabels ? "block" : "hidden md:hidden"}`}>
                        <select
                            value={org.currentOrg?.id || ""}
                            onChange={(e) => org.switchOrg(e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg text-sm font-medium ${darkMode ? "bg-slate-800 border-slate-700 text-slate-300 focus:border-brand-500" : "bg-slate-50 border-slate-200 text-slate-700 focus:border-brand-500"} border outline-none transition-colors`}
                        >
                            {org.organizations.map(o => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Navigation */}
                <nav aria-label="Hauptnavigation" className="flex-1 px-3 space-y-1 overflow-y-auto py-2">
                    {NAVIGATION_ITEMS.map(item => {
                        const isActive = item.path === "/app"
                            ? pathname === "/app" || pathname === "/app/"
                            : pathname.startsWith(item.path);
                        return (
                            <Link
                                key={item.id}
                                href={item.path}
                                onClick={() => {
                                    // Auto-close drawer on mobile after navigating
                                    if (typeof window !== "undefined" && window.innerWidth < 768) {
                                        setSidebarOpen(false);
                                    }
                                }}
                                title={!showLabels ? t(item.labelKey) : undefined}
                                aria-current={isActive ? "page" : undefined}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                                    ? "bg-brand-600 text-white shadow-md shadow-brand-600/20"
                                    : darkMode
                                        ? "text-slate-400 hover:text-white hover:bg-slate-800"
                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? "text-white" : darkMode ? "group-hover:text-white" : "group-hover:text-brand-600"}`} />
                                {/* Label: always on mobile; on desktop only when expanded */}
                                <span className={showLabels ? "font-medium" : "font-medium md:hidden"}>
                                    {t(item.labelKey)}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User section */}
                <div className={`p-4 border-t ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                    {/* Full user info when expanded (or always on mobile) */}
                    <div className={showLabels ? "flex items-center gap-3" : "hidden md:hidden"}>
                        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-medium text-sm flex-shrink-0">
                            {auth.profile?.full_name?.charAt(0) || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{auth.profile?.full_name}</p>
                            <p className={`text-xs truncate ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                {org.currentOrg?.userRole || "Member"}
                            </p>
                        </div>
                        <button
                            onClick={() => auth.signOut()}
                            className={`p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-900"}`}
                            title="Abmelden"
                            aria-label="Abmelden"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                    {/* Mobile full user info when desktop is collapsed (sidebar hidden on mobile anyway, but shown when drawer opens) */}
                    {!showLabels && (
                        <div className="flex items-center gap-3 md:hidden">
                            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-medium text-sm flex-shrink-0">
                                {auth.profile?.full_name?.charAt(0) || "U"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{auth.profile?.full_name}</p>
                                <p className={`text-xs truncate ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    {org.currentOrg?.userRole || "Member"}
                                </p>
                            </div>
                            <button
                                onClick={() => auth.signOut()}
                                className={`p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-900"}`}
                                title="Abmelden"
                                aria-label="Abmelden"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    {/* Desktop collapsed: icon-only logout button */}
                    {!showLabels && (
                        <button
                            onClick={() => auth.signOut()}
                            className={`hidden md:flex w-full justify-center p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-900"}`}
                            title="Abmelden"
                            aria-label="Abmelden"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </aside>
    );
}
