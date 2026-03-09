"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Bike, TrendingUp, Users, BarChart3 } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import ActivityList from "../components/dashboard/ActivityList";
import RevenueChart from "../components/dashboard/RevenueChart";
import RecentBookingsTable from "../components/dashboard/RecentBookingsTable";
import HandoverModal from "../components/dashboard/HandoverModal";
import { fmtCurrency } from "../utils/formatters";
import { useApp } from "../context/AppContext";
import { useData } from "../context/DataContext";

export default function DashboardPage() {
    const { darkMode } = useApp();
    const { bikes, bookings, customers } = useData();
    const router = useRouter();
    const today = new Date().toISOString().slice(0, 10);

    // Stats
    const activeBookings = bookings.bookings.filter(b => b.status === "picked_up").length;
    const totalRevenue = bookings.bookings
        .filter(b => ["picked_up", "returned", "completed"].includes(b.status))
        .reduce((sum, b) => sum + (b.total_price || 0), 0);
    const totalCustomers = customers.customers.length;
    const utilization = Math.round((activeBookings / (bikes.bikes.length || 1)) * 100);

    // Combine for Activity Feed (Derived from real bookings)
    // In a larger app, this might be a dedicated API endpoint (e.g. /activities?date=today)
    const todaysActivity = useMemo(() => {
        const pickups = bookings.bookings.filter(b => b.start_date === today && b.status === "reserved");
        const returns = bookings.bookings.filter(b => b.end_date === today && b.status === "picked_up");

        return [...pickups, ...returns].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    }, [bookings.bookings, today]);

    const [handoverBooking, setHandoverBooking] = useState(null);
    const [handoverType, setHandoverType] = useState(null);

    const handleAction = (booking, type) => {
        setHandoverBooking(booking);
        setHandoverType(type);
    };

    const confirmHandover = async (updatedNotes) => {
        if (!handoverBooking) return;

        const newStatus = handoverType === "pickup" ? "picked_up" : "returned";
        await bookings.update(handoverBooking.id, {
            status: newStatus,
            notes: updatedNotes
        });

        setHandoverBooking(null);
        setHandoverType(null);
    };

    return (
        <div className="space-y-8 h-full flex flex-col pb-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Willkommen zurück, {bookings.currentOrg?.name || "Admin"} 👋
                    </h1>
                    <p className={`mt-1 text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Hier ist der Überblick über Ihre Fahrradvermietung für heute.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => router.push('/app/calendar')} className="btn-primary shadow-lg shadow-brand-500/20">
                        + Neue Buchung
                    </button>
                </div>
            </div>

            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 flex-shrink-0">
                <StatCard
                    title="Aktive Mieten"
                    value={activeBookings}
                    subtitle="Fahrräder unterwegs"
                    icon={Bike}
                    color="orange"
                    darkMode={darkMode}
                />
                <StatCard
                    title="Auslastung"
                    value={`${utilization}%`}
                    subtitle="der Flotte vermietet"
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
                    value={fmtCurrency(totalRevenue)}
                    subtitle="Gesamtumsatz"
                    icon={TrendingUp}
                    color="emerald"
                    darkMode={darkMode}
                />
            </div>

            {/* Middle Row: Chart + Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <RevenueChart bookings={bookings.bookings} darkMode={darkMode} />
                </div>
                <div className="lg:col-span-1 h-[400px]">
                    <ActivityList
                        title="Heute"
                        items={todaysActivity}
                        type="pickup" // Defaulting to pickup style for mixed list for now, or could split
                        onAction={(b) => handleAction(b, b.status === 'reserved' ? 'pickup' : 'return')}
                        darkMode={darkMode}
                    />
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
