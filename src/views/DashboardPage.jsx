"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bike, TrendingUp, Users, BarChart3, AlertTriangle } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import RevenueChart from "../components/dashboard/RevenueChart";
import WeeklyCalendar from "../components/dashboard/WeeklyCalendar";
import TodaySidebar from "../components/dashboard/TodaySidebar";
import RecentBookingsTable from "../components/dashboard/RecentBookingsTable";
import HotelBookingsCard from "../components/dashboard/HotelBookingsCard";
import StripePayoutCard from "../components/dashboard/StripePayoutCard";
import LocivaBadge from "../components/dashboard/LocivaBadge";
import HandoverModal from "../components/dashboard/HandoverModal";
import MaintenanceDueWidget from "../components/dashboard/MaintenanceDueWidget";
import UpcomingBookingsWidget from "../components/dashboard/UpcomingBookingsWidget";
import TopBikesWidget from "../components/dashboard/TopBikesWidget";
import RevenueChartWidget from "../components/dashboard/RevenueChartWidget";
import { fmtCurrency } from "../utils/formatters";
import { calculateLateFee } from "../utils/calculateLateFee";
import { useApp } from "../context/AppContext";
import { useData } from "../context/DataContext";
import { useOrganization } from "../context/OrgContext";

const REVENUE_STATUSES = ["picked_up", "returned"];

const PERIODS = [
    { label: "7 Tage", value: "7d", days: 7 },
    { label: "30 Tage", value: "30d", days: 30 },
    { label: "90 Tage", value: "90d", days: 90 },
    { label: "12 Monate", value: "12m", days: 365 },
];

function getDateRanges(periodDays) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const currentStart = new Date(today);
    currentStart.setDate(currentStart.getDate() - (periodDays - 1));
    currentStart.setHours(0, 0, 0, 0);

    const prevEnd = new Date(currentStart);
    prevEnd.setDate(prevEnd.getDate() - 1);
    prevEnd.setHours(23, 59, 59, 999);

    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - (periodDays - 1));
    prevStart.setHours(0, 0, 0, 0);

    const fmt = (d) => d.toISOString().slice(0, 10);

    return {
        currentStart: fmt(currentStart),
        currentEnd: fmt(today),
        prevStart: fmt(prevStart),
        prevEnd: fmt(prevEnd),
    };
}

function calcTrend(current, previous) {
    if (previous === 0) return null;
    const pct = Math.round(((current - previous) / previous) * 100);
    return { value: Math.abs(pct), isPositive: pct >= 0 };
}

export default function DashboardPage() {
    const { darkMode } = useApp();
    const { bikes, bookings, customers, deposits } = useData();
    const org = useOrganization();
    const router = useRouter();
    const today = new Date().toISOString().slice(0, 10);

    const [period, setPeriod] = useState("7d");

    // ── Dashboard API stats (single server call, 5-min cache) ────────────
    const [dashStats, setDashStats] = useState(null);

    const fetchDashStats = useCallback(async () => {
        const orgId = org.currentOrg?.id;
        if (!orgId) return;
        try {
            const res = await fetch(`/api/dashboard?orgId=${orgId}`);
            if (res.ok) setDashStats(await res.json());
        } catch {
            // non-fatal — widgets fall back gracefully
        }
    }, [org.currentOrg?.id]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchDashStats(); }, [fetchDashStats]);

    const periodDays = PERIODS.find(p => p.value === period)?.days ?? 7;
    const { currentStart, currentEnd, prevStart, prevEnd } = useMemo(
        () => getDateRanges(periodDays),
        [periodDays]
    );

    // Revenue filtered by period (use end_date — revenue is earned at return)
    const periodRevenue = useMemo(() =>
        bookings.bookings
            .filter(b => REVENUE_STATUSES.includes(b.status) && b.end_date >= currentStart && b.end_date <= currentEnd)
            .reduce((sum, b) => sum + (b.total_price || 0), 0),
        [bookings.bookings, currentStart, currentEnd]
    );

    const prevRevenue = useMemo(() =>
        bookings.bookings
            .filter(b => REVENUE_STATUSES.includes(b.status) && b.end_date >= prevStart && b.end_date <= prevEnd)
            .reduce((sum, b) => sum + (b.total_price || 0), 0),
        [bookings.bookings, prevStart, prevEnd]
    );

    // Active bookings in period (picked_up with rental span overlapping the period)
    const periodActiveBookings = useMemo(() =>
        bookings.bookings.filter(
            b => b.status === "picked_up" && b.start_date <= currentEnd && b.end_date >= currentStart
        ).length,
        [bookings.bookings, currentStart, currentEnd]
    );

    const prevActiveBookings = useMemo(() =>
        bookings.bookings.filter(
            b => b.status === "picked_up" && b.start_date <= prevEnd && b.end_date >= prevStart
        ).length,
        [bookings.bookings, prevStart, prevEnd]
    );

    const revenueTrend = calcTrend(periodRevenue, prevRevenue);
    const activeBookingsTrend = calcTrend(periodActiveBookings, prevActiveBookings);

    // Stats that don't change with period
    const totalCustomers = customers.customers.length;
    const currentlyActive = bookings.bookings.filter(b => b.status === "picked_up").length;
    const utilization = Math.round((currentlyActive / (bikes.bikes.length || 1)) * 100);

    // Overdue bookings with late fee calculation
    const overdueBookings = useMemo(() => {
        const orgSettings = org.currentOrg;
        return bookings.bookings
            .filter(b => b.status === "picked_up" && b.end_date < today)
            .map(b => ({ ...b, lateFee: calculateLateFee(b, orgSettings) }));
    }, [bookings.bookings, today, org.currentOrg]);

    const totalLateFees = useMemo(
        () => overdueBookings.reduce((sum, b) => sum + (b.lateFee?.fee || 0), 0),
        [overdueBookings]
    );

    // Pending deposits
    const pendingDeposits = useMemo(
        () => (deposits?.deposits || []).filter(d => d.status === "pending"),
        [deposits?.deposits]
    );
    const pendingDepositsTotal = useMemo(
        () => pendingDeposits.reduce((sum, d) => sum + Number(d.amount || 0), 0),
        [pendingDeposits]
    );

    const [handoverBooking, setHandoverBooking] = useState(null);
    const [handoverType, setHandoverType] = useState(null);

    const handleAction = (booking, type) => {
        setHandoverBooking(booking);
        setHandoverType(type);
    };

    const confirmHandover = async (protocol) => {
        if (!handoverBooking) return;
        const notesText = typeof protocol === 'string' ? protocol : [
            protocol.notes,
            protocol.damages?.length ? `Schäden: ${protocol.damages.join(", ")}` : null,
            protocol.batteryLevel != null ? `Akku: ${protocol.batteryLevel}%` : null,
        ].filter(Boolean).join("\n");

        let updates;
        if (handoverType === "pickup") {
            updates = {
                status: "picked_up",
                pickup_notes: notesText,
                pickup_protocol: typeof protocol === 'object' ? protocol : undefined,
            };
        } else {
            updates = {
                status: "returned",
                return_notes: notesText,
                return_protocol: typeof protocol === 'object' ? protocol : undefined,
                deposit_status: protocol.damages?.length ? "held" : "refunded",
            };
        }
        await bookings.update(handoverBooking.id, updates);
        setHandoverBooking(null);
        setHandoverType(null);
        fetchDashStats();
    };

    const periodLabel = PERIODS.find(p => p.value === period)?.label ?? "";

    return (
        <div className="space-y-8 h-full flex flex-col pb-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Willkommen zurück, {org.currentOrg?.name || "Admin"} 👋
                        </h1>
                        <LocivaBadge org={org.currentOrg} darkMode={darkMode} />
                    </div>
                    <p className={`mt-1 text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Hier ist der Überblick über Ihre Fahrradvermietung für heute.
                    </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {/* Period filter pills */}
                    <div className={`flex items-center gap-1 p-1 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        {PERIODS.map(p => (
                            <button
                                key={p.value}
                                onClick={() => setPeriod(p.value)}
                                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                                    period === p.value
                                        ? 'bg-[#3BAA82] text-white shadow-sm'
                                        : darkMode
                                            ? 'text-slate-400 hover:text-slate-200'
                                            : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => router.push('/app/calendar')} className="btn-primary shadow-lg shadow-[#1A7D5A]/20 whitespace-nowrap">
                        + Neue Buchung
                    </button>
                </div>
            </div>

            {/* Overdue Warning Banner */}
            {overdueBookings.length > 0 && (
                <div className={`rounded-2xl border p-4 flex items-start gap-3 ${darkMode ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200"}`}>
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-red-600 dark:text-red-400">
                            {overdueBookings.length} {overdueBookings.length === 1 ? "Buchung überfällig" : "Buchungen überfällig"}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                            {overdueBookings.map(b => (
                                <span key={b.id} className={`text-sm ${darkMode ? "text-red-300/80" : "text-red-700"}`}>
                                    {b.customer_name}
                                    {b.lateFee?.isLate && b.lateFee.fee > 0 && (
                                        <span className="ml-1 font-semibold">
                                            · {fmtCurrency(b.lateFee.fee)} ({b.lateFee.daysLate}T)
                                        </span>
                                    )}
                                </span>
                            ))}
                        </div>
                        {org.currentOrg?.late_fee_enabled && totalLateFees > 0 && (
                            <p className={`mt-1 text-sm font-semibold ${darkMode ? "text-red-400" : "text-red-600"}`}>
                                Gesamt Verspätungsgebühren: {fmtCurrency(totalLateFees)}
                            </p>
                        )}
                        {!org.currentOrg?.late_fee_enabled && (
                            <p className={`mt-1 text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                Verspätungsgebühren aktivieren unter Einstellungen
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 flex-shrink-0">
                <StatCard
                    title="Aktive Mieten"
                    value={periodActiveBookings}
                    subtitle={`Buchungen – ${periodLabel}`}
                    icon={Bike}
                    color="orange"
                    darkMode={darkMode}
                    trend={activeBookingsTrend}
                />
                <StatCard
                    title="Auslastung"
                    value={`${utilization}%`}
                    subtitle="der Flotte unterwegs"
                    icon={BarChart3}
                    color="violet"
                    darkMode={darkMode}
                />
                <StatCard
                    title="Kunden"
                    value={totalCustomers}
                    subtitle="Registrierte Kunden"
                    icon={Users}
                    color="blue"
                    darkMode={darkMode}
                />
                <StatCard
                    title="Umsatz"
                    value={fmtCurrency(periodRevenue)}
                    subtitle={`Letzte ${periodLabel}`}
                    icon={TrendingUp}
                    color="emerald"
                    darkMode={darkMode}
                    trend={revenueTrend}
                />
            </div>

            {/* Offene Kautionen Widget */}
            {pendingDeposits.length > 0 && (
                <div
                    onClick={() => router.push('/app/bookings')}
                    className={`rounded-2xl border p-5 flex items-center justify-between gap-4 cursor-pointer transition-all hover:shadow-md ${darkMode ? "bg-slate-900 border-slate-800 hover:border-yellow-600/40" : "bg-yellow-50 border-yellow-200 hover:border-yellow-400"}`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${darkMode ? "bg-yellow-500/10 text-yellow-400" : "bg-yellow-100 text-yellow-600"}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <div>
                            <p className={`text-sm font-bold ${darkMode ? "text-yellow-300" : "text-yellow-800"}`}>Offene Kautionen</p>
                            <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-yellow-700"}`}>
                                {pendingDeposits.length} {pendingDeposits.length === 1 ? "Kaution" : "Kautionen"} ausstehend
                            </p>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <p className={`text-2xl font-bold tabular-nums ${darkMode ? "text-yellow-300" : "text-yellow-800"}`}>{fmtCurrency(pendingDepositsTotal)}</p>
                        <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-500" : "text-yellow-600"}`}>Gesamt</p>
                    </div>
                </div>
            )}

            {/* Weekly Calendar + Today Sidebar */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
                <WeeklyCalendar
                    bikes={bikes.bikes}
                    bookings={bookings.bookings}
                    darkMode={darkMode}
                    onBookingClick={() => router.push('/app/bookings')}
                />
                <TodaySidebar
                    bookings={bookings.bookings}
                    bikes={bikes.bikes}
                    darkMode={darkMode}
                    onAction={(b, type) => handleAction(b, type)}
                />
            </div>

            {/* Maintenance alert (only shown when there are issues) */}
            {(dashStats?.maintenanceOverdue > 0 || dashStats?.maintenanceDueSoon > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MaintenanceDueWidget
                        overdue={dashStats?.maintenanceOverdue ?? 0}
                        dueSoon={dashStats?.maintenanceDueSoon ?? 0}
                    />
                </div>
            )}

            {/* Revenue Chart — 12-month bar (full width) */}
            {dashStats?.monthlyRevenue?.length > 0 && (
                <RevenueChartWidget data={dashStats.monthlyRevenue} />
            )}

            {/* Revenue Chart (area, period-switchable) */}
            <div>
                <RevenueChart bookings={bookings.bookings} darkMode={darkMode} />
            </div>

            {/* Upcoming Bookings + Top Bikes */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
                <UpcomingBookingsWidget
                    bookings={dashStats?.upcomingBookings ?? []}
                    onHandover={(b) => handleAction(b, "pickup")}
                />
                <TopBikesWidget bikes={dashStats?.topBikes ?? []} />
            </div>

            {/* Bottom Row: Recent Bookings */}
            <div>
                <RecentBookingsTable bookings={bookings.bookings} darkMode={darkMode} onViewAll={() => router.push('/app/bookings')} />
            </div>

            {/* Lociva Section: Hotel Bookings + Stripe Payouts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <HotelBookingsCard
                    bookings={bookings.bookings}
                    darkMode={darkMode}
                    onViewAll={() => router.push('/app/bookings')}
                />
                <StripePayoutCard
                    bookings={bookings.bookings}
                    org={org.currentOrg}
                    darkMode={darkMode}
                />
            </div>

            {handoverBooking && (
                <HandoverModal
                    booking={handoverBooking}
                    type={handoverType}
                    onConfirm={confirmHandover}
                    onClose={() => { setHandoverBooking(null); setHandoverType(null); }}
                    darkMode={darkMode}
                />
            )}
        </div>
    );
}
