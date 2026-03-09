"use client";

import { fmtDateShort, fmtCurrency } from "../../utils/formatters";

export default function RecentBookingsTable({ bookings, darkMode, onViewAll }) {
    const recentBookings = bookings.slice(0, 5);

    const getStatusBadge = (status) => {
        const styles = {
            reserved: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
            picked_up: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
            completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
            cancelled: "bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400"
        };
        const labels = {
            reserved: "Reserviert",
            picked_up: "Abgeholt",
            completed: "Abgeschlossen",
            cancelled: "Storniert"
        };
        return (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${styles[status] || styles.reserved}`}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="premium-card p-6 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Neueste Buchungen</h3>
                <button onClick={onViewAll} className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
                    Alle anzeigen
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className={`text-xs uppercase font-bold ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                        <tr>
                            <th className="pb-3 pl-2">Kunde</th>
                            <th className="pb-3">Fahrrad</th>
                            <th className="pb-3">Zeitraum</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3 text-right pr-2">Preis</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? "divide-slate-800" : "divide-slate-100"}`}>
                        {recentBookings.map((booking) => (
                            <tr key={booking.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="py-3 pl-2 font-medium text-slate-900 dark:text-white">
                                    {booking.customer_name}
                                </td>
                                <td className={`py-3 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    {booking.bike?.name}
                                </td>
                                <td className={`py-3 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    {fmtDateShort(booking.start_date)} - {fmtDateShort(booking.end_date)}
                                </td>
                                <td className="py-3">
                                    {getStatusBadge(booking.status)}
                                </td>
                                <td className="py-3 text-right pr-2 font-medium tabular-nums text-slate-900 dark:text-white">
                                    {fmtCurrency(booking.total_price)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
