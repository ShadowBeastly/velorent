"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bike, LogOut } from "lucide-react";

import { NAVIGATION_ITEMS } from "../../utils/navigationItems";

export default function Sidebar({ org, auth, sidebarOpen, darkMode }) {
    const pathname = usePathname();

    return (
        <aside className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ${sidebarOpen ? "w-64" : "w-20"} ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"} border-r`}>
            <div className="flex flex-col h-full">
                {/* Logo */}
                <div className={`flex items-center gap-3 p-6 ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                    <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/20 flex-shrink-0">
                        <Bike className="w-6 h-6 text-white" />
                    </div>
                    {sidebarOpen && (
                        <div className="min-w-0 animate-fade-in">
                            <h1 className="font-bold text-lg tracking-tight truncate font-sans">{org.currentOrg?.name || "VeloRent"}</h1>
                            <p className={`text-xs truncate font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Pro Cloud</p>
                        </div>
                    )}
                </div>

                {/* Org Switcher */}
                {sidebarOpen && org.organizations.length > 1 && (
                    <div className="px-4 mb-4">
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
                <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-2">
                    {NAVIGATION_ITEMS.map(item => {
                        const isActive = item.path === "/app"
                            ? pathname === "/app" || pathname === "/app/"
                            : pathname.startsWith(item.path);
                        return (
                            <Link
                                key={item.id}
                                href={item.path}
                                title={!sidebarOpen ? item.label : undefined}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                                    ? "bg-brand-600 text-white shadow-md shadow-brand-600/20"
                                    : darkMode
                                        ? "text-slate-400 hover:text-white hover:bg-slate-800"
                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? "text-white" : darkMode ? "group-hover:text-white" : "group-hover:text-brand-600"}`} />
                                {sidebarOpen && <span className="font-medium">{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* User */}
                <div className={`p-4 border-t ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                    {sidebarOpen ? (
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-medium text-sm">
                                {auth.profile?.full_name?.charAt(0) || "U"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{auth.profile?.full_name}</p>
                                <p className={`text-xs truncate ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                    {org.currentOrg?.userRole || "Member"}
                                </p>
                            </div>
                            <button
                                onClick={() => auth.signOut()}
                                className={`p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-900"}`}
                                title="Abmelden"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => auth.signOut()}
                            className={`w-full flex justify-center p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-900"}`}
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </aside>
    );
}
