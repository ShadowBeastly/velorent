"use client";
import { useRouter } from "next/navigation";
import { Calendar, ArrowRight } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useData } from "../../context/DataContext";

const STATUS_LABELS = {
    reserved: { label: "Reserviert", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" },
    confirmed: { label: "Bestätigt", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" },
};

const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

function fmtDate(dateStr) {
    if (!dateStr) return "—";
    const [, m, d] = dateStr.split("-");
    return `${parseInt(d)}. ${MONTHS[parseInt(m) - 1]}`;
}

export default function UpcomingBookingsWidget({ bookings = [], onHandover }) {
    const { darkMode } = useApp();
    const { bikes } = useData();
    const router = useRouter();

    const bikeName = (bikeId) => {
        const b = bikes.bikes.find(b => b.id === bikeId);
        return b?.name || "—";
    };

    return (
        <div className="premium-card flex flex-col">
            {/* Header */}
            <div className={`flex items-center justify-between p-6 pb-4 border-b ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                <div className="flex items-center gap-2">
                    <Calendar className={`w-5 h-5 ${darkMode ? "text-slate-400" : "text-slate-500"}`} />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Nächste Buchungen</h3>
                </div>
                <button
                    onClick={() => router.push("/app/bookings")}
                    className={`text-xs font-semibold flex items-center gap-1 ${darkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700"} transition-colors`}
                >
                    Alle <ArrowRight className="w-3 h-3" />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800">
                {bookings.length === 0 && (
                    <div className={`p-6 text-sm text-center ${darkMode ? "text-slate-600" : "text-slate-300"}`}>
                        Keine bevorstehenden Buchungen
                    </div>
                )}
                {bookings.map((b) => {
                    const statusCfg = STATUS_LABELS[b.status] || STATUS_LABELS.reserved;
                    return (
                        <div key={b.id} className={`flex items-center gap-3 px-6 py-3.5 transition-colors ${darkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50"}`}>
                            {/* Date pill */}
                            <div className={`shrink-0 w-12 text-center rounded-xl py-1.5 ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>
                                <p className={`text-[10px] font-bold uppercase ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                    {b.start_date ? MONTHS[parseInt(b.start_date.split("-")[1]) - 1] : "—"}
                                </p>
                                <p className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                                    {b.start_date ? parseInt(b.start_date.split("-")[2]) : "—"}
                                </p>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                    {b.customer_name || "Unbekannt"}
                                </p>
                                <p className={`text-xs truncate mt-0.5 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                    🚲 {bikeName(b.bike_id)} · bis {fmtDate(b.end_date)}
                                </p>
                            </div>

                            {/* Status / Action */}
                            <div className="shrink-0 flex items-center gap-2">
                                {b.isToday ? (
                                    <button
                                        onClick={() => onHandover?.(b)}
                                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#1A7D5A] text-white hover:bg-[#155f44] transition-colors whitespace-nowrap"
                                    >
                                        Übergabe
                                    </button>
                                ) : (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusCfg.cls}`}>
                                        {statusCfg.label}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
