"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, Sun, Moon, Building2 } from "lucide-react";

import { useAuth } from "../../../src/context/AuthContext";
import { AppProvider, useApp } from "../../../src/context/AppContext";
import { supabase } from "../../../src/utils/supabase";
import LocivaSidebar from "../../../src/components/layout/LocivaSidebar";
import LoadingScreen from "../../../src/components/ui/LoadingScreen";
import DemoBanner from "../../../src/components/ui/DemoBanner";
import LocivaHotelContext from "../../../src/context/LocivaHotelContext";

// ---------------------------------------------------------------------------
// Inner shell — needs AppProvider already mounted above it
// ---------------------------------------------------------------------------
function LocivaShell({ children }) {
    const router = useRouter();
    const auth = useAuth();
    const { darkMode, setDarkMode, sidebarOpen, setSidebarOpen } = useApp();

    const [hotel, setHotel] = useState(null);
    const [hotelId, setHotelId] = useState(null);
    const [hasProviderOrg, setHasProviderOrg] = useState(false);
    const [loading, setLoading] = useState(true);
    const [noHotel, setNoHotel] = useState(false);

    // Redirect unauthenticated users
    useEffect(() => {
        if (!auth.loading && !auth.user) {
            router.push("/login");
        }
    }, [auth.loading, auth.user, router]);

    // Load hotel access + optional provider org membership
    useEffect(() => {
        if (auth.loading || !auth.user?.id) return;
        let cancelled = false;

        async function load() {
            setLoading(true);

            // Joined query: hotel_users + hotel details in one round-trip
            const { data, error } = await supabase
                .from("venue_users")
                .select("hotel_id, venues(id, name, slug, address, commission_pct, welcome_message, logo_url, theme_color)")
                .eq("user_id", auth.user.id)
                .maybeSingle();

            if (cancelled) return;

            if (error) {
                console.error("venue_users query failed:", error);
                setNoHotel(true);
                setLoading(false);
                return;
            }

            if (!data?.venues) {
                setNoHotel(true);
                setLoading(false);
                return;
            }

            setHotel(data.venues);
            setHotelId(data.hotel_id);

            // Check if the user also has a provider org (to show "Back to RentCore" link)
            const { data: orgMembers } = await supabase
                .from("organization_members")
                .select("organization_id")
                .eq("user_id", auth.user.id)
                .limit(1);

            if (!cancelled) {
                setHasProviderOrg(!!(orgMembers && orgMembers.length > 0));
                setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [auth.loading, auth.user?.id]);

    // Reload helper exposed to child views via context
    const reload = async () => {
        if (!auth.user?.id) return;
        const { data } = await supabase
            .from("venue_users")
            .select("hotel_id, venues(id, name, slug, address, commission_pct, welcome_message, logo_url, theme_color)")
            .eq("user_id", auth.user.id)
            .maybeSingle();
        if (data?.venues) {
            setHotel(data.venues);
            setHotelId(data.hotel_id);
        }
    };

    // Auth still resolving or hotel query in flight
    if (auth.loading || loading) return <LoadingScreen />;

    // Not authenticated — redirect firing in useEffect, render nothing
    if (!auth.user) return null;

    // User exists but has no hotel_users row
    if (noHotel) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
                <div className="text-center max-w-md px-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${darkMode ? "bg-slate-800" : "bg-[#D4EDE2]"}`}>
                        <Building2 className="w-8 h-8 text-[#1A7D5A]" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Kein Hotel zugeordnet</h2>
                    <p className={`text-sm mb-6 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Ihr Account ist noch keinem Hotel zugeordnet. Bitte kontaktieren Sie uns unter{" "}
                        <a href="mailto:info@lociva.de" className="text-[#1A7D5A] hover:underline">info@lociva.de</a>.
                    </p>
                    <button
                        onClick={() => auth.signOut()}
                        className="text-sm underline"
                        style={{ color: "#1A7D5A" }}
                    >
                        Abmelden
                    </button>
                </div>
            </div>
        );
    }

    const isDemo = auth.user?.email === process.env.NEXT_PUBLIC_DEMO_EMAIL;

    return (
        <LocivaHotelContext.Provider value={{ hotel, hotelId, reload }}>
            <div className={`min-h-screen transition-colors duration-300 ${isDemo ? "pt-10" : ""} ${darkMode ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
                <DemoBanner userEmail={auth.user?.email} onExit={auth.signOut} />
                {/* Skip to main content */}
                <a
                    href="#lociva-main"
                    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:text-white focus:rounded-lg"
                    style={{ background: "#1A7D5A" }}
                >
                    Zum Hauptinhalt springen
                </a>

                {/* Mobile backdrop */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-30 md:hidden"
                        onClick={() => setSidebarOpen(false)}
                        aria-hidden="true"
                    />
                )}

                <LocivaSidebar
                    auth={auth}
                    hotel={hotel}
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                    darkMode={darkMode}
                    hasProviderOrg={hasProviderOrg}
                    bannerOffset={isDemo}
                />

                <main
                    id="lociva-main"
                    className={`transition-all duration-300 ${sidebarOpen ? "md:ml-64" : "md:ml-20"}`}
                >
                    {/* Lociva Header */}
                    <header className={`sticky top-0 z-30 backdrop-blur-xl border-b transition-colors duration-300 ${darkMode ? "bg-slate-900/80 border-slate-800" : "bg-white/80 border-slate-200"}`}>
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
                                {hotel?.name && (
                                    <h2 className="text-base font-semibold tracking-tight truncate min-w-0" style={{ color: "#1A7D5A" }}>
                                        {hotel.name}
                                    </h2>
                                )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => setDarkMode(!darkMode)}
                                    aria-label={darkMode ? "Helles Design aktivieren" : "Dunkles Design aktivieren"}
                                    className={`p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-slate-800 text-amber-400" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"}`}
                                >
                                    {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </header>

                    <div className="p-6">
                        {children}
                    </div>
                </main>
            </div>
        </LocivaHotelContext.Provider>
    );
}

// ---------------------------------------------------------------------------
// Exported layout — wraps shell in AppProvider so darkMode/sidebarOpen work
// ---------------------------------------------------------------------------
export default function LocivaLayout({ children }) {
    return (
        <AppProvider>
            <LocivaShell>{children}</LocivaShell>
        </AppProvider>
    );
}
