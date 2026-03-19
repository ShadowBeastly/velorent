"use client";
import { Trophy } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { fmtCurrency } from "../../utils/formatters";

const RANK_COLORS = [
    "bg-amber-400",   // 1st — gold
    "bg-slate-400",   // 2nd — silver
    "bg-amber-600",   // 3rd — bronze
    "bg-slate-300 dark:bg-slate-600",
    "bg-slate-300 dark:bg-slate-600",
];

export default function TopBikesWidget({ bikes = [] }) {
    const { darkMode } = useApp();

    return (
        <div className="premium-card flex flex-col">
            {/* Header */}
            <div className={`flex items-center gap-2 p-6 pb-4 border-b ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                <Trophy className={`w-5 h-5 ${darkMode ? "text-amber-400" : "text-amber-500"}`} />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Top Bikes</h3>
                <span className={`ml-auto text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                    letzte 30 Tage
                </span>
            </div>

            {/* List */}
            <div className="flex-1 p-4 space-y-3">
                {bikes.length === 0 && (
                    <p className={`text-sm text-center py-4 ${darkMode ? "text-slate-600" : "text-slate-300"}`}>
                        Noch keine Umsatzdaten
                    </p>
                )}
                {bikes.map((bike, idx) => (
                    <div key={bike.bike_id} className="flex items-center gap-3">
                        {/* Rank badge */}
                        <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${RANK_COLORS[idx] || RANK_COLORS[4]}`}>
                            {idx + 1}
                        </div>

                        {/* Name + bar */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{bike.name}</p>
                                <p className={`text-xs font-bold ml-2 shrink-0 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                                    {fmtCurrency(bike.revenue)}
                                </p>
                            </div>
                            {/* Progress bar */}
                            <div className={`h-1.5 rounded-full overflow-hidden ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>
                                <div
                                    className="h-full rounded-full bg-[#1A7D5A] transition-all duration-500"
                                    style={{ width: `${bike.pct}%` }}
                                />
                            </div>
                            <p className={`text-[10px] mt-1 ${darkMode ? "text-slate-600" : "text-slate-400"}`}>
                                {bike.rentals} {bike.rentals === 1 ? "Buchung" : "Buchungen"}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
