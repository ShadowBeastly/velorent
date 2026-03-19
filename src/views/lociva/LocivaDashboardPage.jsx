"use client";
import { useState, useEffect } from "react";
import {
    QrCode, BookOpen, Zap, BedDouble, TrendingUp, ArrowRight,
    Sparkles, CheckCircle2, AlertCircle,
} from "lucide-react";
import { useLocivaHotel } from "@/src/context/LocivaHotelContext";
import { useApp } from "@/src/context/AppContext";
import { supabase } from "@/src/utils/supabase";

// ─── Brand palette ───────────────────────────────────────────────────────────
const C = {
    primary: "#1A7D5A",
    light: "#3BAA82",
    tint: "#D4EDE2",
    dark: "#1E2D26",
    bg: "#F5FAF7",
    neutral: "#6B7280",
    white: "#FFFFFF",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtEur(n) {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);
}

function fmtDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_LABEL = {
    reserved: "Reserviert",
    confirmed: "Bestätigt",
    picked_up: "Aktiv",
    returned: "Abgeschlossen",
    cancelled: "Storniert",
};

const STATUS_COLOR = {
    reserved: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
    confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    picked_up: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    returned: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, darkMode }) {
    return (
        <div className={`rounded-2xl border p-6 transition-shadow hover:shadow-md ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: C.tint }}>
                    <Icon className="w-5 h-5" style={{ color: C.primary }} />
                </div>
            </div>
            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{label}</p>
            <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">{value ?? "—"}</p>
            {sub && <p className={`text-sm mt-1 ${darkMode ? "text-slate-500" : "text-slate-500"}`}>{sub}</p>}
        </div>
    );
}

function GettingStartedCard({ darkMode }) {
    const steps = [
        { icon: BedDouble, text: "Zimmer anlegen und QR-Codes generieren" },
        { icon: Zap, text: "Aktivitäten für Ihre Gäste hinzufügen" },
        { icon: QrCode, text: "QR-Codes in den Zimmern platzieren" },
        { icon: TrendingUp, text: "Buchungen und Statistiken beobachten" },
    ];
    return (
        <div className={`rounded-2xl border p-6 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: C.tint }}>
                    <Sparkles className="w-5 h-5" style={{ color: C.primary }} />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Erste Schritte</h3>
                    <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>So starten Sie mit Lociva</p>
                </div>
            </div>
            <ol className="space-y-3">
                {steps.map(({ icon: Icon, text }, i) => (
                    <li key={i} className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${darkMode ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-500"}`}>
                            {i + 1}
                        </div>
                        <Icon className={`w-4 h-4 shrink-0 ${darkMode ? "text-slate-400" : "text-slate-400"}`} />
                        <span className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{text}</span>
                    </li>
                ))}
            </ol>
        </div>
    );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function LocivaDashboardPage() {
    const { hotel, hotelId } = useLocivaHotel();
    const { darkMode } = useApp();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!hotelId) return;
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);
            try {
                // Try RPC first, fall back to individual queries
                const { data: rpcData, error: rpcErr } = await supabase.rpc("get_hotel_dashboard", { p_hotel_id: hotelId });

                if (!rpcErr && rpcData && !cancelled) {
                    setData(rpcData);
                    setLoading(false);
                    return;
                }

                // Fallback: run queries in parallel
                const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
                const [evRes, bkRes, actRes, roomRes] = await Promise.all([
                    supabase.from("analytics_events")
                        .select("event_type", { count: "exact", head: false })
                        .eq("hotel_id", hotelId)
                        .gte("created_at", since30),
                    supabase.from("bookings")
                        .select("id, booking_number, guest_name, total_price, status, created_at, start_date, end_date")
                        .eq("hotel_id", hotelId)
                        .eq("booking_source", "hotel_qr")
                        .order("created_at", { ascending: false })
                        .limit(8),
                    supabase.from("hotel_activities")
                        .select("id, is_active", { count: "exact" })
                        .eq("hotel_id", hotelId),
                    supabase.from("hotel_rooms")
                        .select("id, has_qr_code", { count: "exact" })
                        .eq("hotel_id", hotelId),
                ]);

                if (cancelled) return;

                const events = evRes.data || [];
                const qrScans = events.filter(e => e.event_type === "qr_scan").length;
                const bookings30 = bkRes.data || [];
                const activeActivities = (actRes.data || []).filter(a => a.is_active).length;
                const roomsWithQr = (roomRes.data || []).filter(r => r.has_qr_code).length;

                setData({
                    qr_scans_30d: qrScans,
                    bookings_30d: bookings30.length,
                    active_activities: activeActivities,
                    rooms_with_qr: roomsWithQr,
                    recent_bookings: bookings30,
                });
            } catch (err) {
                if (!cancelled) setError(err.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [hotelId]);

    const isEmpty = data && data.qr_scans_30d === 0 && data.bookings_30d === 0 && data.active_activities === 0;

    const card = darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
    const th = `text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-slate-500" : "text-slate-400"}`;

    return (
        <div className="space-y-8 pb-10">
            {/* ── Hero header ────────────────────────────────────────────── */}
            <div className="relative rounded-2xl overflow-hidden p-6 sm:p-8"
                style={{ background: `linear-gradient(135deg, ${C.dark} 0%, ${C.primary} 60%, ${C.light} 100%)` }}>
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 0%, transparent 60%)" }} />
                <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60 mb-1">LOCIVA · Hotel Partner</p>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight truncate">
                            {hotel?.name ?? "Hotel Dashboard"}
                        </h1>
                        {hotel?.city && (
                            <p className="text-white/70 text-sm mt-1">{hotel.address ? `${hotel.address}, ` : ""}{hotel.city}</p>
                        )}
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10">
                            <QrCode className="w-5 h-5 text-white" />
                        </div>
                        {hotel?.slug && (
                            <a
                                href={`/hotel/${hotel.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors text-white text-sm font-medium"
                            >
                                Gastseite <ArrowRight className="w-4 h-4" />
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Error ──────────────────────────────────────────────────── */}
            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-red-700 dark:text-red-400">Fehler beim Laden</p>
                        <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {/* ── Loading ────────────────────────────────────────────────── */}
            {loading && (
                <div className="flex items-center justify-center h-48">
                    <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: C.light, borderTopColor: "transparent" }} />
                </div>
            )}

            {!loading && data && (
                <>
                    {/* ── Stats ──────────────────────────────────────────── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            icon={QrCode}
                            label="QR-Scans (30 Tage)"
                            value={data.qr_scans_30d}
                            sub="Gäste haben gescannt"
                            darkMode={darkMode}
                        />
                        <StatCard
                            icon={BookOpen}
                            label="Buchungen (30 Tage)"
                            value={data.bookings_30d}
                            sub="über Ihren QR-Code"
                            darkMode={darkMode}
                        />
                        <StatCard
                            icon={Zap}
                            label="Aktive Aktivitäten"
                            value={data.active_activities}
                            sub="sichtbar für Gäste"
                            darkMode={darkMode}
                        />
                        <StatCard
                            icon={BedDouble}
                            label="Zimmer mit QR"
                            value={data.rooms_with_qr}
                            sub="QR-Code generiert"
                            darkMode={darkMode}
                        />
                    </div>

                    {/* ── Empty state ────────────────────────────────────── */}
                    {isEmpty && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Welcome card */}
                            <div className={`rounded-2xl border p-6 ${card}`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: C.tint }}>
                                        <CheckCircle2 className="w-5 h-5" style={{ color: C.primary }} />
                                    </div>
                                    <h3 className="font-semibold text-slate-900 dark:text-white">Willkommen bei Lociva!</h3>
                                </div>
                                <p className={`text-sm leading-relaxed ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    Ihr Hotel-Dashboard ist bereit. Sobald Gäste Ihren QR-Code scannen und buchen, sehen Sie hier live Statistiken und alle Buchungen in der Übersicht.
                                </p>
                                <p className={`text-sm mt-3 leading-relaxed ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    Starten Sie, indem Sie Ihre Zimmer anlegen und QR-Codes generieren.
                                </p>
                            </div>
                            <GettingStartedCard darkMode={darkMode} />
                        </div>
                    )}

                    {/* ── Recent bookings ────────────────────────────────── */}
                    {!isEmpty && (
                        <div className={`rounded-2xl border overflow-hidden ${card}`}>
                            <div className={`px-5 py-4 border-b ${darkMode ? "border-slate-700" : "border-slate-200"} flex items-center justify-between`}>
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Letzte Buchungen</h2>
                                <a href="/hotel/analytics"
                                    className="text-sm font-medium flex items-center gap-1 hover:underline"
                                    style={{ color: C.primary }}>
                                    Alle Statistiken <ArrowRight className="w-3.5 h-3.5" />
                                </a>
                            </div>
                            {(!data.recent_bookings || data.recent_bookings.length === 0) ? (
                                <div className="text-center py-12">
                                    <BookOpen className={`w-10 h-10 mx-auto mb-3 ${darkMode ? "text-slate-600" : "text-slate-300"}`} />
                                    <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                        Noch keine Buchungen über Ihren QR-Code.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className={`border-b ${darkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-100 bg-slate-50"}`}>
                                            <tr>
                                                {["Datum", "Gast", "Zeitraum", "Betrag", "Status"].map(h => (
                                                    <th key={h} className={th}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.recent_bookings.map(b => (
                                                <tr key={b.id}
                                                    className={`border-b last:border-0 transition-colors ${darkMode ? "border-slate-700 hover:bg-slate-700/30" : "border-slate-100 hover:bg-slate-50"}`}>
                                                    <td className={`px-4 py-3 text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                                        {fmtDate(b.created_at)}
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                                        {b.guest_name || "—"}
                                                    </td>
                                                    <td className={`px-4 py-3 text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                                        {b.start_date} – {b.end_date}
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                                                        {fmtEur(b.total_price)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[b.status] ?? "bg-slate-100 text-slate-600"}`}>
                                                            {STATUS_LABEL[b.status] ?? b.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
