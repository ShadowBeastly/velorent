"use client";
import { useState, useEffect } from "react";
import { MapPin, Bike, Users, AlertCircle } from "lucide-react";
import { useLocivaHotel } from "@/src/context/LocivaHotelContext";
import { useApp } from "@/src/context/AppContext";
import { supabase } from "@/src/utils/supabase";

// ─── Brand palette ───────────────────────────────────────────────────────────
const C = {
    primary: "#1A7D5A",
    light:   "#3BAA82",
    tint:    "#D4EDE2",
};

// ─── Provider card ────────────────────────────────────────────────────────────
function ProviderCard({ provider, darkMode }) {
    return (
        <div className={`rounded-2xl border p-6 transition-shadow hover:shadow-md ${
            darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
        }`}>
            {/* Top row */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                        {provider.organizations?.name ?? provider.provider_name ?? "Anbieter"}
                    </h3>
                    {provider.organizations?.city && (
                        <div className="flex items-center gap-1 mt-1">
                            <MapPin className={`w-3.5 h-3.5 shrink-0 ${darkMode ? "text-slate-500" : "text-slate-400"}`} />
                            <span className={`text-xs truncate ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                {provider.organizations.city}
                            </span>
                        </div>
                    )}
                </div>
                <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    provider.is_active
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                }`}>
                    {provider.is_active ? "Aktiv" : "Inaktiv"}
                </span>
            </div>

            {/* Description */}
            {provider.organizations?.description && (
                <p className={`text-sm line-clamp-2 mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                    {provider.organizations.description}
                </p>
            )}

            {/* Meta */}
            <div className={`flex items-center gap-4 text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                {provider.distance_km != null && (
                    <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{provider.distance_km} km entfernt</span>
                    </div>
                )}
                {provider.bike_count != null && (
                    <div className="flex items-center gap-1">
                        <Bike className="w-3.5 h-3.5" />
                        <span>{provider.bike_count} Fahrzeuge</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LocivaProvidersPage() {
    const { hotelId } = useLocivaHotel();
    const { darkMode } = useApp();

    const [providers, setProviders] = useState([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);

    useEffect(() => {
        if (!hotelId) return;
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);
            try {
                const { data, error: err } = await supabase
                    .from("hotel_providers")
                    .select(`
                        id,
                        is_active,
                        distance_km,
                        organizations (
                            id,
                            name,
                            city,
                            description
                        )
                    `)
                    .eq("hotel_id", hotelId)
                    .order("distance_km", { ascending: true });

                if (err) throw err;
                if (!cancelled) setProviders(data || []);
            } catch (err) {
                if (!cancelled) setError(err.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [hotelId]);

    const card = darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Anbieter in der Nähe</h1>
                <p className={`text-sm mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Diese Anbieter sind mit Ihrem Hotel verknüpft und buchbar über Ihren QR-Code.
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-red-700 dark:text-red-400">Fehler beim Laden</p>
                        <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center h-40">
                    <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: C.light, borderTopColor: "transparent" }} />
                </div>
            )}

            {/* Empty state */}
            {!loading && providers.length === 0 && !error && (
                <div className={`rounded-2xl border p-12 text-center ${card}`}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                        style={{ background: C.tint }}>
                        <Users className="w-7 h-7" style={{ color: C.primary }} />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Noch keine Anbieter verknüpft</h3>
                    <p className={`text-sm max-w-sm mx-auto ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Noch keine Anbieter in Ihrer Nähe. Lociva wird bald passende Partner für Sie finden.
                    </p>
                    <p className={`text-sm mt-3 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                        Bei Fragen:{" "}
                        <a href="mailto:info@lociva.de" className="hover:underline" style={{ color: C.primary }}>
                            info@lociva.de
                        </a>
                    </p>
                </div>
            )}

            {/* Provider grid */}
            {!loading && providers.length > 0 && (
                <>
                    <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                        {providers.length} {providers.length === 1 ? "Anbieter" : "Anbieter"} verknüpft
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                        {providers.map(p => (
                            <ProviderCard key={p.id} provider={p} darkMode={darkMode} />
                        ))}
                    </div>

                    {/* Read-only notice */}
                    <div className={`rounded-xl border p-4 flex items-start gap-3 ${
                        darkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}>
                        <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${darkMode ? "text-slate-500" : "text-slate-400"}`} />
                        <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            Anbieter werden von Lociva verwaltet. Möchten Sie neue Anbieter in Ihrer Nähe hinzufügen?
                            Kontaktieren Sie uns unter{" "}
                            <a href="mailto:info@lociva.de" className="hover:underline" style={{ color: C.primary }}>
                                info@lociva.de
                            </a>.
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}
