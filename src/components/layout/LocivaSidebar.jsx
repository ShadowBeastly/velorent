"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, X, ArrowLeft } from "lucide-react";

import { LOCIVA_NAVIGATION_ITEMS } from "../../utils/locivaNavigationItems";

export default function LocivaSidebar({ auth, hotel, sidebarOpen, setSidebarOpen, darkMode, hasProviderOrg, bannerOffset }) {
    const pathname = usePathname();
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
                fixed ${bannerOffset ? "top-10" : "top-0"} left-0 z-40 ${bannerOffset ? "h-[calc(100vh-2.5rem)]" : "h-screen"} border-r w-64
                transition-all duration-300
                md:translate-x-0
                ${sidebarOpen ? "translate-x-0 md:w-64" : "-translate-x-full md:w-20"}
                ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}
            `}>
                <div className="flex flex-col h-full">

                    {/* Logo */}
                    <div className={`flex items-center gap-3 p-6 border-b ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                        {/* Icon mark */}
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: "#1A7D5A" }}
                        >
                            <span className="text-white font-light text-lg tracking-widest">L</span>
                        </div>

                        {/* Title block: shown when expanded on desktop, always on mobile */}
                        {showLabels && (
                            <div className="min-w-0 flex-1 animate-fade-in">
                                <h1
                                    className="font-light text-lg uppercase tracking-widest truncate"
                                    style={{ color: "#1A7D5A", letterSpacing: "6px" }}
                                >
                                    LOCIVA
                                </h1>
                                <p className={`text-xs truncate font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    Unterkunft Partner
                                </p>
                            </div>
                        )}
                        {!showLabels && (
                            <div className="min-w-0 flex-1 animate-fade-in md:hidden">
                                <h1
                                    className="font-light text-lg uppercase tracking-widest truncate"
                                    style={{ color: "#1A7D5A", letterSpacing: "6px" }}
                                >
                                    LOCIVA
                                </h1>
                                <p className={`text-xs truncate font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    Unterkunft Partner
                                </p>
                            </div>
                        )}

                        {/* Close button — mobile only */}
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className={`md:hidden p-2.5 rounded-lg transition-colors flex-shrink-0 ${darkMode ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"}`}
                            aria-label="Sidebar schließen"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Hotel name chip — shown when labels visible */}
                    {hotel?.name && (
                        <div className={`px-4 pt-4 pb-2 ${showLabels ? "block" : "hidden md:hidden"}`}>
                            <div className={`px-3 py-2 rounded-lg text-sm font-medium truncate ${darkMode ? "bg-slate-800 text-slate-300" : "bg-[#D4EDE2] text-[#1A7D5A]"}`}>
                                {hotel.name}
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <nav aria-label="Lociva Navigation" className="flex-1 px-3 space-y-1 overflow-y-auto py-3">
                        {LOCIVA_NAVIGATION_ITEMS.map((item) => {
                            const isActive = item.path === "/hotel"
                                ? pathname === "/hotel" || pathname === "/hotel/"
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
                                    title={!showLabels ? item.labelKey : undefined}
                                    aria-current={isActive ? "page" : undefined}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                                        isActive
                                            ? ""
                                            : darkMode
                                                ? "text-slate-400 hover:text-white hover:bg-slate-800"
                                                : "text-slate-500 hover:text-slate-900 hover:bg-[#F5FAF7]"
                                    }`}
                                    style={isActive
                                        ? { background: "#D4EDE2", color: "#1A7D5A" }
                                        : undefined
                                    }
                                >
                                    <item.icon
                                        className={`w-5 h-5 flex-shrink-0 transition-colors ${
                                            isActive
                                                ? ""
                                                : darkMode
                                                    ? "group-hover:text-white"
                                                    : "group-hover:text-[#1A7D5A]"
                                        }`}
                                        style={isActive ? { color: "#1A7D5A" } : undefined}
                                    />
                                    <span className={`font-medium ${showLabels ? "" : "md:hidden"}`}>
                                        {item.labelKey}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Bottom section */}
                    <div className={`p-4 border-t space-y-2 ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                        {/* Back to RentCore link — only if user also has a provider org */}
                        {hasProviderOrg && (
                            <Link
                                href="/app"
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                                    darkMode
                                        ? "text-slate-400 hover:text-white hover:bg-slate-800"
                                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                }`}
                                title={!showLabels ? "Zurück zu RentCore" : undefined}
                            >
                                <ArrowLeft className="w-4 h-4 flex-shrink-0" />
                                <span className={`text-xs font-medium ${showLabels ? "" : "md:hidden"}`}>
                                    Zurück zu RentCore
                                </span>
                            </Link>
                        )}

                        {/* User info row — expanded */}
                        <div className={showLabels ? "flex items-center gap-3" : "hidden md:hidden"}>
                            <div className="w-9 h-9 rounded-full flex items-center justify-center font-medium text-sm flex-shrink-0 text-white"
                                style={{ background: "#1A7D5A" }}>
                                {auth?.profile?.full_name?.charAt(0) || "U"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{auth?.profile?.full_name}</p>
                                <p className={`text-xs truncate ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    Unterkunft Manager
                                </p>
                            </div>
                            <button
                                onClick={() => auth?.signOut?.()}
                                className={`p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-900"}`}
                                title="Abmelden"
                                aria-label="Abmelden"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>

                        {/* User info row — mobile (drawer open, desktop collapsed) */}
                        {!showLabels && (
                            <div className="flex items-center gap-3 md:hidden">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center font-medium text-sm flex-shrink-0 text-white"
                                    style={{ background: "#1A7D5A" }}>
                                    {auth?.profile?.full_name?.charAt(0) || "U"}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{auth?.profile?.full_name}</p>
                                    <p className={`text-xs truncate ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                        Unterkunft Manager
                                    </p>
                                </div>
                                <button
                                    onClick={() => auth?.signOut?.()}
                                    className={`p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-900"}`}
                                    title="Abmelden"
                                    aria-label="Abmelden"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Desktop collapsed: icon-only logout */}
                        {!showLabels && (
                            <button
                                onClick={() => auth?.signOut?.()}
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
