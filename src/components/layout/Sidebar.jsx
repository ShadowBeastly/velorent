"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, X, ChevronDown } from "lucide-react";

import { NAVIGATION_ITEMS, ADVANCED_NAVIGATION_ITEMS } from "../../utils/navigationItems";
import { useI18n } from "../../utils/i18n";

export default function Sidebar({ org, auth, sidebarOpen, setSidebarOpen, darkMode }) {
    const pathname = usePathname();
    const { t } = useI18n();
    const [advancedOpen, setAdvancedOpen] = useState(() => {
        // Auto-open if user is currently on an advanced page
        return ADVANCED_NAVIGATION_ITEMS.some(item => pathname.startsWith(item.path));
    });

    // showLabels: on desktop, only when sidebar is expanded.
    // On mobile the sidebar is always w-64 (full drawer), so labels always visible there.
    // We still use this flag to control desktop-only collapsed state rendering.
    const showLabels = sidebarOpen;

    return (
        <>
        {/* Mobile backdrop overlay */}
        {sidebarOpen && (
            <div
                className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
            />
        )}
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
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#1A7D5A" }}>
                        <span className="text-white font-light text-lg tracking-widest">L</span>
                    </div>
                    {/*
                        Title block:
                        - Mobile (< md): always shown. The drawer is always w-64 with labels
                        - Desktop (>= md): shown only when expanded (showLabels)
                    */}
                    {showLabels && (
                        <div className="min-w-0 flex-1 animate-fade-in">
                            <h1 className="font-bold text-lg tracking-tight truncate font-sans">
                                {org.currentOrg?.name || "Lociva"}
                            </h1>
                            <p className={`text-xs truncate font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                RentCore
                            </p>
                        </div>
                    )}
                    {/* When desktop-collapsed, still show org name on mobile (drawer always open with labels) */}
                    {!showLabels && (
                        <div className="min-w-0 flex-1 animate-fade-in md:hidden">
                            <h1 className="font-bold text-lg tracking-tight truncate font-sans">
                                {org.currentOrg?.name || "Lociva"}
                            </h1>
                            <p className={`text-xs truncate font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                RentCore
                            </p>
                        </div>
                    )}
                    {/* Close button. Mobile only */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className={`md:hidden p-2.5 rounded-lg transition-colors flex-shrink-0 ${darkMode ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"}`}
                        aria-label="Sidebar schließen"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Org Switcher. Only when labels are shown */}
                {org.organizations.length > 1 && (
                    <div className={`px-4 mb-4 ${showLabels ? "block" : "hidden md:hidden"}`}>
                        <select
                            value={org.currentOrg?.id || ""}
                            onChange={(e) => org.switchOrg(e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg text-sm font-medium ${darkMode ? "bg-slate-800 border-slate-700 text-slate-300 focus:border-[#1A7D5A]" : "bg-slate-50 border-slate-200 text-slate-700 focus:border-[#1A7D5A]"} border outline-none transition-colors`}
                        >
                            {org.organizations.map(o => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Navigation */}
                <nav aria-label="Hauptnavigation" className="flex-1 px-3 space-y-1 overflow-y-auto py-2">
                    {(() => {
                        const adminIds = ["admin-hotels", "admin-providers", "admin-regions", "admin-analytics"];
                        const isAdmin = auth.profile?.role === "superadmin";
                        const visibleItems = NAVIGATION_ITEMS.filter(item =>
                            adminIds.includes(item.id) ? isAdmin : true
                        );
                        const regularItems = visibleItems.filter(item => !adminIds.includes(item.id));
                        const adminItems = visibleItems.filter(item => adminIds.includes(item.id));

                        const renderLink = (item) => {
                            const isActive = item.path === "/app"
                                ? pathname === "/app" || pathname === "/app/"
                                : pathname.startsWith(item.path);
                            return (
                                <Link
                                    key={item.id}
                                    href={item.path}
                                    onClick={() => {
                                        if (typeof window !== "undefined" && window.innerWidth < 768) {
                                            setSidebarOpen(false);
                                        }
                                    }}
                                    title={!showLabels ? t(item.labelKey) : undefined}
                                    aria-current={isActive ? "page" : undefined}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                                        ? "text-white"
                                        : darkMode
                                            ? "text-slate-400 hover:text-white hover:bg-slate-800"
                                            : "text-slate-500 hover:text-slate-900 hover:bg-[#F5FAF7]"
                                        }`}
                                    style={isActive ? { background: "#1A7D5A" } : undefined}
                                >
                                    <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? "text-white" : darkMode ? "group-hover:text-white" : "group-hover:text-[#1A7D5A]"}`} />
                                    <span className={showLabels ? "font-medium" : "font-medium md:hidden"}>
                                        {t(item.labelKey)}
                                    </span>
                                </Link>
                            );
                        };

                        return (
                            <>
                                {regularItems.map(renderLink)}
                                {adminItems.length > 0 && (
                                    <>
                                        <div className={`pt-3 pb-1 ${showLabels ? "" : "md:hidden"}`}>
                                            <p className={`px-3 text-[10px] font-bold uppercase tracking-widest ${darkMode ? "text-slate-600" : "text-slate-400"}`}>
                                                Admin
                                            </p>
                                        </div>
                                        {adminItems.length > 0 && !showLabels && (
                                            <div className={`hidden md:flex justify-center py-1`}>
                                                <div className={`w-5 h-px ${darkMode ? "bg-slate-700" : "bg-slate-200"}`} />
                                            </div>
                                        )}
                                        {adminItems.map(renderLink)}
                                    </>
                                )}
                            </>
                        );
                    })()}

                    {/* Erweitert toggle */}
                    <div className="pt-2">
                        <button
                            onClick={() => setAdvancedOpen(prev => !prev)}
                            title={!showLabels ? t("nav.advanced") : undefined}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
                                darkMode
                                    ? "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                            <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${advancedOpen ? "" : "-rotate-90"}`} />
                            <span className={`text-xs font-bold uppercase tracking-wider ${showLabels ? "" : "md:hidden"}`}>
                                {t("nav.advanced")}
                            </span>
                        </button>

                        {advancedOpen && (
                            <div className="mt-1 space-y-1">
                                {ADVANCED_NAVIGATION_ITEMS.map(item => {
                                    const isActive = pathname.startsWith(item.path);
                                    return (
                                        <Link
                                            key={item.id}
                                            href={item.path}
                                            onClick={() => {
                                                if (typeof window !== "undefined" && window.innerWidth < 768) {
                                                    setSidebarOpen(false);
                                                }
                                            }}
                                            title={!showLabels ? t(item.labelKey) : undefined}
                                            aria-current={isActive ? "page" : undefined}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                                                ? "text-white"
                                                : darkMode
                                                    ? "text-slate-400 hover:text-white hover:bg-slate-800"
                                                    : "text-slate-500 hover:text-slate-900 hover:bg-[#F5FAF7]"
                                                }`}
                                            style={isActive ? { background: "#1A7D5A" } : undefined}
                                        >
                                            <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? "text-white" : darkMode ? "group-hover:text-white" : "group-hover:text-[#1A7D5A]"}`} />
                                            <span className={showLabels ? "font-medium" : "font-medium md:hidden"}>
                                                {t(item.labelKey)}
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
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
        </>
    );
}
