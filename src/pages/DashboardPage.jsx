import { useState } from "react";
import { Bike, TrendingUp, Users, BarChart3 } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import ActivityList from "../components/dashboard/ActivityList";
import RevenueChart from "../components/dashboard/RevenueChart";
import RecentBookingsTable from "../components/dashboard/RecentBookingsTable";
import HandoverModal from "../components/dashboard/HandoverModal";
import { fmtCurrency } from "../utils/formatUtils";

export default function DashboardPage({ bikes, bookings, customers, darkMode }) {
    const today = new Date().toISOString().slice(0, 10);

    // Stats
    const activeBookings = bookings.bookings.filter(b => b.status === "picked_up").length;
    const totalRevenue = bookings.bookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
    const totalCustomers = customers.customers.length;
    const utilization = Math.round((activeBookings / (bikes.bikes.length || 1)) * 100);

    // Daily Ops Lists
    const pickupsToday = bookings.bookings.filter(b =>
        b.start_date === today && b.status === "reserved"
    );

    const returnsToday = bookings.bookings.filter(b =>
        b.end_date === today && b.status === "picked_up"
    );

    // Combine for Activity Feed (just for demo, usually would be a real feed)
    const todaysActivity = [...pickupsToday, ...returnsToday].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    const [handoverBooking, setHandoverBooking] = useState(null);
    const [handoverType, setHandoverType] = useState(null);

    const handleAction = (booking, type) => {
        setHandoverBooking(booking);
        setHandoverType(type);
    };

    const confirmHandover = async (updatedNotes) => {
        if (!handoverBooking) return;

        const newStatus = handoverType === "pickup" ? "picked_up" : "completed";
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
                    <button className="btn-primary shadow-lg shadow-brand-500/20">
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
                    trend={{ value: 12, isPositive: true }}
                />
                <StatCard
                    title="Auslastung"
                    value={`${utilization}%`}
                    subtitle="der Flotte vermietet"
                    icon={BarChart3}
                    color="violet"
                    darkMode={darkMode}
                    trend={{ value: 5, isPositive: true }}
                />
                <StatCard
                    title="Kunden"
                    value={totalCustomers}
                    subtitle="Registrierte Kunden"
                    icon={Users}
                    color="blue"
                    darkMode={darkMode}
                    trend={{ value: 2, isPositive: true }}
                />
                <StatCard
                    title="Umsatz"
                    value={fmtCurrency(totalRevenue)}
                    subtitle="Gesamtumsatz"
                    icon={TrendingUp}
                    color="emerald"
                    darkMode={darkMode}
                    trend={{ value: 8, isPositive: true }}
                />
            </div>

            {/* Middle Row: Chart + Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <RevenueChart darkMode={darkMode} />
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
                <RecentBookingsTable bookings={bookings.bookings} darkMode={darkMode} />
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
