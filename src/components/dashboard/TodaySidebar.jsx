"use client";
import { useMemo } from "react";

export default function TodaySidebar({ bookings, bikes, darkMode, onAction }) {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const months = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
    const todayLabel = `${today.getDate()}. ${months[today.getMonth()]}`;

    const todayPickups = useMemo(() =>
        bookings.filter(b => b.start_date === todayStr && ["reserved", "confirmed"].includes(b.status))
            .sort((a, b) => (a.pickup_time || "09:00").localeCompare(b.pickup_time || "09:00")),
        [bookings, todayStr]
    );

    const todayReturns = useMemo(() => {
        const returns = bookings.filter(b => b.end_date === todayStr && b.status === "picked_up");
        // Also include overdue returns
        const overdue = bookings.filter(b => b.end_date < todayStr && b.status === "picked_up");
        return [...returns, ...overdue]
            .sort((a, b) => (a.return_time || "14:00").localeCompare(b.return_time || "14:00"));
    }, [bookings, todayStr]);

    const getBikeName = (bikeId) => {
        const bike = bikes.find(b => b.id === bikeId);
        return bike?.name || "";
    };

    const getTimeSlot = (booking, type) => {
        if (type === "pickup") return booking.pickup_time || "09:00";
        return booking.return_time || "14:00";
    };

    return (
        <div className={`rounded-xl border shadow-sm flex flex-col overflow-hidden ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            {/* Header */}
            <div className={`p-5 border-b ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    Heute <span className={`text-sm font-normal ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{todayLabel}</span>
                </h2>
            </div>

            <div className="p-5 space-y-7 overflow-y-auto flex-1">
                {/* Pickups */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            <span className="w-2 h-2 rounded-full bg-[#1A7D5A]" />
                            Abholungen ({todayPickups.length})
                        </h3>
                        {todayPickups.length > 3 && (
                            <span className="text-[10px] font-bold text-[#1A7D5A] hover:underline cursor-pointer">Alle sehen</span>
                        )}
                    </div>
                    <div className="space-y-3">
                        {todayPickups.length === 0 && (
                            <p className={`text-sm ${darkMode ? "text-slate-600" : "text-slate-300"}`}>Keine Abholungen heute</p>
                        )}
                        {todayPickups.slice(0, 5).map(booking => (
                            <div
                                key={booking.id}
                                onClick={() => onAction?.(booking, "pickup")}
                                className="flex gap-4 group cursor-pointer"
                            >
                                <div className="shrink-0 flex flex-col items-center">
                                    <p className="text-xs font-bold">{getTimeSlot(booking, "pickup")}</p>
                                    <div className={`w-px flex-1 my-1 ${darkMode ? "bg-slate-800" : "bg-slate-100"}`} />
                                </div>
                                <div className={`flex-1 p-3 rounded-lg border border-transparent transition-all ${darkMode ? "bg-slate-800 group-hover:border-[#1A7D5A]/30" : "bg-slate-50 group-hover:border-[#1A7D5A]/30"}`}>
                                    <p className="text-xs font-bold mb-1">{booking.customer_name}</p>
                                    <p className={`text-[10px] flex items-center gap-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                        • {getBikeName(booking.item_id)}
                                    </p>
                                    <p className={`text-[10px] mt-1 uppercase font-semibold ${darkMode ? "text-slate-600" : "text-slate-300"}`}>
                                        Ref: {booking.booking_number}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Returns */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                            Rückgaben ({todayReturns.length})
                        </h3>
                    </div>
                    <div className="space-y-3">
                        {todayReturns.length === 0 && (
                            <p className={`text-sm ${darkMode ? "text-slate-600" : "text-slate-300"}`}>Keine Rückgaben heute</p>
                        )}
                        {todayReturns.slice(0, 5).map(booking => {
                            const isOverdue = booking.end_date < todayStr;
                            return (
                                <div
                                    key={booking.id}
                                    onClick={() => onAction?.(booking, "return")}
                                    className="flex gap-4 group cursor-pointer"
                                >
                                    <div className="shrink-0 flex flex-col items-center">
                                        <p className="text-xs font-bold">{getTimeSlot(booking, "return")}</p>
                                        <div className={`w-px flex-1 my-1 ${darkMode ? "bg-slate-800" : "bg-slate-100"}`} />
                                    </div>
                                    <div className={`flex-1 p-3 rounded-lg border border-transparent transition-all ${darkMode ? "bg-slate-800 group-hover:border-slate-600" : "bg-slate-50 group-hover:border-slate-300"}`}>
                                        <p className="text-xs font-bold mb-1">{booking.customer_name}</p>
                                        <p className={`text-[10px] flex items-center gap-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                            • {getBikeName(booking.item_id)}
                                        </p>
                                        {isOverdue && (
                                            <div className="mt-2">
                                                <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[8px] font-bold rounded">
                                                    Verspätet
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
