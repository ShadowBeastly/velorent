"use client";

import { useMemo } from "react";
import { Building2, ArrowRight } from "lucide-react";
import { fmtDateShort, fmtCurrency } from "../../utils/formatters";

const SOURCE_LABELS = {
    hotel_qr: "Hotel QR",
    direct: "Direkt",
    widget: "Widget",
};

const SOURCE_STYLES = {
    hotel_qr: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
    direct: "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    widget: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
};

export default function HotelBookingsCard({ bookings = [], darkMode, onViewAll }) {
    const hotelBookings = useMemo(
        () => bookings.filter(b => b.booking_source === "hotel_qr" && b.status !== "cancelled"),
        [bookings]
    );

    const recentHotel = hotelBookings.slice(0, 5);

    const totalRevenue = useMemo(
        () => hotelBookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0),
        [hotelBookings]
    );

    const totalCommission = useMemo(
        () => hotelBookings.reduce((sum, b) => sum + (Number(b.platform_commission) || 0), 0),
        [hotelBookings]
    );

    return (
        <div className="premium-card p-6 animate-fade-in-up" style={{ animationDelay: "0.35s" }}>
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                            Lociva Hotel-Buchungen
                        </h3>
                        <p className={`text-xs font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            {hotelBookings.length} Buchungen · {fmtCurrency(totalRevenue)} Umsatz · {fmtCurrency(totalRevenue - totalCommission)} netto
                        </p>
                    </div>
                </div>
                {onViewAll && (
                    <button
                        onClick={onViewAll}
                        className="text-sm font-medium text-[#1A7D5A] hover:text-[#155e43] dark:text-[#3BAA82] flex items-center gap-1"
                    >
                        Alle <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {recentHotel.length === 0 ? (
                <div className={`text-center py-8 rounded-xl border-2 border-dashed ${darkMode ? "border-slate-700 text-slate-500" : "border-slate-200 text-slate-400"}`}>
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">Noch keine Hotel-Buchungen</p>
                    <p className="text-xs mt-1">Buchungen via Hotel-QR-Code erscheinen hier.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className={`text-xs uppercase font-bold ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            <tr>
                                <th className="pb-3 pl-2">Gast</th>
                                <th className="pb-3 hidden sm:table-cell">Zeitraum</th>
                                <th className="pb-3">Quelle</th>
                                <th className="pb-3 text-right pr-2">Betrag</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${darkMode ? "divide-slate-800" : "divide-slate-100"}`}>
                            {recentHotel.map(b => (
                                <tr key={b.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="py-3 pl-2">
                                        <p className="font-medium text-slate-900 dark:text-white">
                                            {b.customer_name || b.guest_email || "Gast"}
                                        </p>
                                        {b.guest_email && b.customer_name && (
                                            <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                                {b.guest_email}
                                            </p>
                                        )}
                                    </td>
                                    <td className={`py-3 hidden sm:table-cell ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                        {fmtDateShort(b.start_date)} - {fmtDateShort(b.end_date)}
                                    </td>
                                    <td className="py-3">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${SOURCE_STYLES[b.booking_source] || SOURCE_STYLES.direct}`}>
                                            {SOURCE_LABELS[b.booking_source] || b.booking_source}
                                        </span>
                                    </td>
                                    <td className="py-3 text-right pr-2 font-medium tabular-nums text-slate-900 dark:text-white">
                                        {fmtCurrency(b.total_price)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
