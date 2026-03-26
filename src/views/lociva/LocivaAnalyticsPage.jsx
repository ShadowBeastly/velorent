"use client";
import { useState, useEffect, useMemo } from "react";
import {
    BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid,
} from "recharts";
import { BarChart3, QrCode, BookOpen, TrendingUp, AlertCircle } from "lucide-react";
import { useLocivaHotel } from "@/src/context/LocivaHotelContext";
import { useApp } from "@/src/context/AppContext";
import { supabase } from "@/src/utils/supabase";

// ─── Brand palette ───────────────────────────────────────────────────────────
const C = {
    primary: "#1A7D5A",
    light:   "#3BAA82",
    tint:    "#D4EDE2",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const PERIODS = [
    { label: "7 Tage",  days: 7 },
    { label: "30 Tage", days: 30 },
    { label: "90 Tage", days: 90 },
];

function fmtShortDate(iso) {
    return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
}

function buildDayBuckets(days) {
    const buckets = {};
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const key = d.toISOString().slice(0, 10);
        buckets[key] = { date: key, scans: 0, bookings: 0 };
    }
    return buckets;
}

// ─── Custom tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, darkMode }) {
    if (!active || !payload?.length) return null;
    return (
        <div className={`rounded-xl border px-3 py-2 text-xs shadow-lg ${
            darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-700"
        }`}>
            <p className="font-semibold mb-1">{label}</p>
            {payload.map(p => (
                <p key={p.dataKey} style={{ color: p.color }}>
                    {p.name}: <span className="font-bold">{p.value}</span>
                </p>
            ))}
        </div>
    );
}

// ─── Stat mini-card ────────────────────────────────────────────────────────────
function MiniStat({ icon: Icon, label, value, darkMode }) {
    return (
        <div className={`rounded-2xl border p-5 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: C.tint }}>
                    <Icon className="w-4 h-4" style={{ color: C.primary }} />
                </div>
                <span className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                    {label}
                </span>
            </div>
            <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">{value ?? "—"}</p>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LocivaAnalyticsPage() {
    const { hotelId } = useLocivaHotel();
    const { darkMode } = useApp();

    const [periodIdx, setPeriodIdx] = useState(1); // default 30 days
    const [events, setEvents]       = useState([]);
    const [bookings, setBookings]   = useState([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);

    const days = PERIODS[periodIdx].days;

    useEffect(() => {
        if (!hotelId) return;
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);
            const since = new Date(Date.now() - days * 86400000).toISOString();

            try {
                const [evRes, bookingsRes] = await Promise.all([
                    supabase
                        .from("analytics_events")
                        .select("event_type, created_at")
                        .eq("hotel_id", hotelId)
                        .gte("created_at", since)
                        .order("created_at", { ascending: true }),
                    // BUG-041: get_hotel_analytics returns an aggregate stats object, not a
                    // per-booking array. Query bookings directly for the chart and revenue total.
                    supabase
                        .from("bookings")
                        .select("id, created_at, total_price")
                        .eq("hotel_id", hotelId)
                        .gte("created_at", since)
                        .order("created_at", { ascending: true }),
                ]);

                if (evRes.error) throw evRes.error;
                if (bookingsRes.error) throw bookingsRes.error;

                if (!cancelled) {
                    setEvents(evRes.data || []);
                    setBookings(bookingsRes.data || []);
                }
            } catch (err) {
                if (!cancelled) setError(err.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [hotelId, days]);

    // Build time-series data
    const chartData = useMemo(() => {
        const buckets = buildDayBuckets(days);

        events.forEach(e => {
            const key = e.created_at.slice(0, 10);
            if (buckets[key] && e.event_type === "qr_scan") buckets[key].scans += 1;
        });

        bookings.forEach(b => {
            const key = b.created_at.slice(0, 10);
            if (buckets[key]) buckets[key].bookings += 1;
        });

        return Object.values(buckets).map(d => ({
            ...d,
            dateLabel: fmtShortDate(d.date),
        }));
    }, [events, bookings, days]);

    // Top-level stats
    const totalScans    = events.filter(e => e.event_type === "qr_scan").length;
    const totalPageViews = events.filter(e => e.event_type === "page_view").length;
    const totalBookings = bookings.length;
    const totalRevenue  = bookings.reduce((s, b) => s + (b.total_price || 0), 0);

    const isEmpty = !loading && totalScans === 0 && totalBookings === 0;

    const axisStyle  = { fill: darkMode ? "#94a3b8" : "#94a3b8", fontSize: 11 };
    const gridColor  = darkMode ? "#334155" : "#e2e8f0";
    const card       = darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Statistiken</h1>
                    <p className={`text-sm mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Auswertung der Gästeaktivität über Ihren QR-Code.
                    </p>
                </div>
                {/* Period selector */}
                <div className={`flex items-center gap-1 p-1 rounded-xl ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>
                    {PERIODS.map((p, i) => (
                        <button key={i} onClick={() => setPeriodIdx(i)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                                periodIdx === i
                                    ? "text-white shadow-sm"
                                    : darkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-700"
                            }`}
                            style={periodIdx === i ? { background: C.primary } : undefined}>
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
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
            {isEmpty && !error && (
                <div className={`rounded-2xl border p-12 text-center ${card}`}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                        style={{ background: C.tint }}>
                        <BarChart3 className="w-7 h-7" style={{ color: C.primary }} />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Noch keine Daten</h3>
                    <p className={`text-sm max-w-sm mx-auto ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Sobald Gäste Ihren QR-Code scannen, erscheinen hier Statistiken zur Nutzung und Buchungsaktivität.
                    </p>
                </div>
            )}

            {!loading && !isEmpty && (
                <>
                    {/* Stats row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <MiniStat icon={QrCode}    label="QR-Scans"   value={totalScans}    darkMode={darkMode} />
                        <MiniStat icon={TrendingUp} label="Seitenaufrufe" value={totalPageViews} darkMode={darkMode} />
                        <MiniStat icon={BookOpen}  label="Buchungen"  value={totalBookings} darkMode={darkMode} />
                        <MiniStat icon={BarChart3}  label="Umsatz"
                            value={new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(totalRevenue)}
                            darkMode={darkMode} />
                    </div>

                    {/* QR Scans over time */}
                    <div className={`rounded-2xl border p-6 ${card}`}>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
                            QR-Scans (letzte {days} Tage)
                        </h2>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor={C.primary} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={C.primary} stopOpacity={0}   />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                <XAxis dataKey="dateLabel" tick={axisStyle} axisLine={false} tickLine={false}
                                    interval={days <= 7 ? 0 : Math.floor(days / 7)} />
                                <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip content={<ChartTooltip darkMode={darkMode} />} />
                                <Area type="monotone" dataKey="scans" name="QR-Scans"
                                    stroke={C.primary} strokeWidth={2}
                                    fill="url(#scanGrad)" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Bookings over time */}
                    <div className={`rounded-2xl border p-6 ${card}`}>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
                            Buchungen (letzte {days} Tage)
                        </h2>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                <XAxis dataKey="dateLabel" tick={axisStyle} axisLine={false} tickLine={false}
                                    interval={days <= 7 ? 0 : Math.floor(days / 7)} />
                                <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip content={<ChartTooltip darkMode={darkMode} />} />
                                <Bar dataKey="bookings" name="Buchungen"
                                    fill={C.light} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Funnel */}
                    <div className={`rounded-2xl border p-6 ${card}`}>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-5">Buchungs-Funnel</h2>
                        <div className="flex items-center gap-6 flex-wrap">
                            {[
                                { label: "QR Scans",             val: totalScans },
                                { label: "Seitenaufrufe",        val: totalPageViews },
                                { label: "Buchungen gestartet",  val: events.filter(e => e.event_type === "booking_start").length },
                                { label: "Buchungen abgeschl.",  val: bookings.length },
                            ].map((step, i, arr) => (
                                <div key={i} className="flex items-center gap-6">
                                    <div className="text-center min-w-[80px]">
                                        <p className={`text-2xl font-bold tabular-nums ${
                                            i === arr.length - 1 ? "" : "text-slate-900 dark:text-white"
                                        }`} style={i === arr.length - 1 ? { color: C.primary } : undefined}>
                                            {step.val}
                                        </p>
                                        <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                            {step.label}
                                        </p>
                                    </div>
                                    {i < arr.length - 1 && (
                                        <span className={`text-2xl ${darkMode ? "text-slate-600" : "text-slate-300"}`}>→</span>
                                    )}
                                </div>
                            ))}
                        </div>
                        {totalScans > 0 && bookings.length > 0 && (
                            <p className={`text-xs mt-4 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                Konversionsrate:{" "}
                                <span className="font-semibold" style={{ color: C.primary }}>
                                    {((bookings.length / totalScans) * 100).toFixed(1)}%
                                </span>{" "}
                                (Scans → Buchungen)
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
