import React from "react";
import { CheckCircle, Clock, ArrowRight, ArrowLeft } from "lucide-react";
import { fmtDateShort } from "../../utils/dateUtils";

export default function ActivityList({ title, items, type, onAction, darkMode }) {
    const isPickup = type === "pickup";
    const emptyMessage = isPickup ? "Keine Abholungen heute" : "Keine Rückgaben heute";
    const icon = isPickup ? ArrowRight : ArrowLeft;
    const actionLabel = isPickup ? "Check-out" : "Check-in";

    const getInitials = (name) => name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??";

    return (
        <div className="premium-card p-6 h-full flex flex-col animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg flex items-center gap-3 tracking-tight text-slate-900 dark:text-white">
                    <div className={`p-2 rounded-lg ${isPickup ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"}`}>
                        {isPickup ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                    </div>
                    {title}
                </h3>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                    {items.length}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {items.length === 0 ? (
                    <div className={`h-40 flex flex-col items-center justify-center text-sm gap-4 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${darkMode ? "bg-slate-800/50" : "bg-slate-50"}`}>
                            <CheckCircle className="w-8 h-8 opacity-20" />
                        </div>
                        <p className="font-medium">{emptyMessage}</p>
                    </div>
                ) : (
                    items.map((booking, idx) => (
                        <div
                            key={booking.id}
                            className={`group p-4 rounded-xl border transition-all duration-200 ${darkMode ? "bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800" : "bg-white border-slate-100 hover:border-brand-200 hover:shadow-md"}`}
                            style={{ animationDelay: `${idx * 0.05}s` }}
                        >
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                                        {getInitials(booking.customer_name)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{booking.customer_name}</div>
                                        <div className={`text-xs font-medium ${darkMode ? "text-slate-500" : "text-slate-500"}`}>
                                            {booking.bike?.name}
                                        </div>
                                    </div>
                                </div>
                                <div className={`text-xs font-bold px-2.5 py-1 rounded-md tabular-nums ${isPickup ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"}`}>
                                    {isPickup ? fmtDateShort(booking.start_date) : fmtDateShort(booking.end_date)}
                                </div>
                            </div>

                            <button
                                onClick={() => onAction(booking)}
                                className={`w-full py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0
                                    ${isPickup
                                        ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                                        : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                                    }`}
                            >
                                {isPickup ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                {actionLabel.toUpperCase()}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
