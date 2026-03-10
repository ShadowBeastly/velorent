"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Bike, TrendingUp, Users, BarChart3, AlertTriangle } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import ActivityList from "../components/dashboard/ActivityList";
import RevenueChart from "../components/dashboard/RevenueChart";
import RecentBookingsTable from "../components/dashboard/RecentBookingsTable";
import HandoverModal from "../components/dashboard/HandoverModal";
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
    const { bikes, bookings, customers } = useData();
    const org = useOrganization();
    const router = useRouter();
    const today = new Date().toISOString().slice(0, 10);

    const [period, setPeriod] = useState("7d");

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

    // Activity Feed — split into pickups and returns
    const todayPickups = useMemo(() =>
        bookings.bookings.filter(b => b.start_date === today && b.status === "reserved"),
        [bookings.bookings, today]
    );
    const todayReturns = useMemo(() =>
        bookings.bookings.filter(b => b.end_date === today && b.status === "picked_up"),
        [bookings.bookings, today]
    );

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
    };

    const periodLabel = PERIODS.find(p => p.value === period)?.label ?? "";

    return (
        <div className="space-y-8 h-full flex flex-col pb-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Willkommen zurück, {org.currentOrg?.name || "Admin"} 👋
                    </h1>
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
                                        ? 'bg-brand-500 text-white shadow-sm'
                                        : darkMode
                                            ? 'text-slate-400 hover:text-slate-200'
                                            : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => router.push('/app/calendar')} className="btn-primary shadow-lg shadow-brand-500/20 whitespace-nowrap">
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

            {/* Middle Row: Chart + Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <RevenueChart bookings={bookings.bookings} darkMode={darkMode} />
                </div>
                <div className="lg:col-span-1 min-h-[300px] lg:h-[400px] flex flex-col gap-4 overflow-y-auto">
                    {todayPickups.length > 0 && (
                        <ActivityList
                            title="Abholungen"
                            items={todayPickups}
                            type="pickup"
                            onAction={(b) => handleAction(b, 'pickup')}
                            darkMode={darkMode}
                        />
                    )}
                    {todayReturns.length > 0 && (
                        <ActivityList
                            title="Rückgaben"
                            items={todayReturns}
                            type="return"
                            onAction={(b) => handleAction(b, 'return')}
                            darkMode={darkMode}
                        />
                    )}
                    {todayPickups.length === 0 && todayReturns.length === 0 && (
                        <ActivityList
                            title="Heute"
                            items={[]}
                            type="pickup"
                            onAction={() => {}}
                            darkMode={darkMode}
                        />
                    )}
                </div>
            </div>

            {/* Bottom Row: Recent Bookings */}
            <div>
                <RecentBookingsTable bookings={bookings.bookings} darkMode={darkMode} onViewAll={() => router.push('/app/bookings')} />
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
