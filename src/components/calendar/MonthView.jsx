"use client";
import { useMemo } from "react";
import { fmtISO } from "../../utils/formatters";

const WEEKDAY_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function getMonthGrid(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Start from Monday before first day
    let startDay = firstDay.getDay(); // 0=Sun, 1=Mon...
    // Convert to Mon-based (Mon=0, Sun=6)
    startDay = startDay === 0 ? 6 : startDay - 1;

    const grid = [];
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - startDay);

    // 6 weeks max
    for (let week = 0; week < 6; week++) {
        const weekRow = [];
        for (let d = 0; d < 7; d++) {
            const dayDate = new Date(startDate);
            dayDate.setDate(startDate.getDate() + week * 7 + d);
            weekRow.push(dayDate);
        }
        grid.push(weekRow);
        // Stop if we've passed the last day and completed the row
        const lastCell = weekRow[6];
        if (lastCell > lastDay && week >= 4) break;
    }
    return grid;
}

function getUtilizationColor(rate, darkMode) {
    if (rate === 0) return darkMode ? "bg-slate-800" : "bg-white";
    if (rate < 0.5) return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400";
    if (rate < 0.8) return "bg-amber-500/20 text-amber-700 dark:text-amber-400";
    return "bg-red-500/20 text-red-700 dark:text-red-400";
}

function getUtilizationDotColor(rate) {
    if (rate === 0) return "bg-slate-300 dark:bg-slate-600";
    if (rate < 0.5) return "bg-emerald-500";
    if (rate < 0.8) return "bg-amber-500";
    return "bg-red-500";
}

/**
 * MonthView — classic calendar grid, each day shows utilization as color heatmap
 */
export default function MonthView({ date, bikes, bookings, maintenanceBlocks, onClickDay, darkMode }) {
    const grid = useMemo(() => getMonthGrid(date), [date]);
    const todayStr = fmtISO(new Date());
    const currentMonthIdx = date.getMonth();

    // Precompute utilization per day: ratio of bikes booked that day / total bikes
    const utilizationMap = useMemo(() => {
        const map = {};
        if (bikes.length === 0) return map;

        grid.flat().forEach(day => {
            const dayStr = fmtISO(day);
            const bookedBikeIds = new Set(
                bookings
                    .filter(b =>
                        b.status !== "cancelled" &&
                        b.start_date <= dayStr &&
                        b.end_date >= dayStr
                    )
                    .map(b => b.bike_id)
            );
            const maintBikeIds = new Set(
                maintenanceBlocks
                    .filter(m =>
                        m.status !== "completed" &&
                        m.start_date <= dayStr &&
                        (m.end_date || m.start_date) >= dayStr
                    )
                    .map(m => m.bike_id)
            );
            const unavailable = new Set([...bookedBikeIds, ...maintBikeIds]);
            map[dayStr] = {
                rate: unavailable.size / bikes.length,
                bookingCount: bookedBikeIds.size,
                maintCount: maintBikeIds.size,
                total: bikes.length,
            };
        });
        return map;
    }, [grid, bikes, bookings, maintenanceBlocks]);

    // Get bookings for a specific day (for mini booking list)
    const getDayBookings = (dayStr) =>
        bookings.filter(b =>
            b.status !== "cancelled" &&
            b.start_date <= dayStr &&
            b.end_date >= dayStr
        ).slice(0, 3); // max 3 shown

    return (
        <div className="flex flex-col flex-1 overflow-hidden p-4">
            {/* Weekday header */}
            <div className="grid grid-cols-7 mb-2">
                {WEEKDAY_SHORT.map(d => (
                    <div
                        key={d}
                        className={`text-center text-xs font-bold uppercase tracking-wider py-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}
                    >
                        {d}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="flex-1 grid gap-1" style={{ gridTemplateRows: `repeat(${grid.length}, minmax(0, 1fr))` }}>
                {grid.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 gap-1" style={{ minHeight: "80px" }}>
                        {week.map(day => {
                            const dayStr = fmtISO(day);
                            const isCurrentMonth = day.getMonth() === currentMonthIdx;
                            const isToday = dayStr === todayStr;
                            const util = utilizationMap[dayStr] || { rate: 0, bookingCount: 0, maintCount: 0 };
                            const utilClass = isCurrentMonth ? getUtilizationColor(util.rate, darkMode) : "";
                            const dayBookings = isCurrentMonth ? getDayBookings(dayStr) : [];

                            return (
                                <div
                                    key={dayStr}
                                    onClick={() => isCurrentMonth && onClickDay?.(day)}
                                    className={`
                                        rounded-xl border p-1.5 flex flex-col cursor-pointer transition-all
                                        ${isCurrentMonth ? "hover:ring-2 hover:ring-[#1A7D5A]/40" : "opacity-30"}
                                        ${isToday ? "ring-2 ring-[#1A7D5A]" : ""}
                                        ${isCurrentMonth ? utilClass : ""}
                                        ${darkMode
                                            ? `border-slate-700 ${!isCurrentMonth ? "bg-slate-800/30" : util.rate === 0 ? "bg-slate-800" : ""}`
                                            : `border-slate-200 ${!isCurrentMonth ? "bg-slate-50" : util.rate === 0 ? "bg-white" : ""}`
                                        }
                                    `}
                                >
                                    {/* Day number */}
                                    <div className="flex items-center justify-between mb-1">
                                        <span
                                            className={`
                                                text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full
                                                ${isToday
                                                    ? "bg-[#1A7D5A] text-white"
                                                    : isCurrentMonth
                                                        ? (darkMode ? "text-white" : "text-slate-900")
                                                        : (darkMode ? "text-slate-500" : "text-slate-400")
                                                }
                                            `}
                                        >
                                            {day.getDate()}
                                        </span>
                                        {isCurrentMonth && util.rate > 0 && (
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getUtilizationDotColor(util.rate)}`} />
                                        )}
                                    </div>

                                    {/* Mini booking list */}
                                    {isCurrentMonth && dayBookings.length > 0 && (
                                        <div className="space-y-0.5 overflow-hidden">
                                            {dayBookings.map(b => {
                                                const name = b.customer
                                                    ? `${b.customer.first_name} ${b.customer.last_name}`.trim()
                                                    : b.customer_name || "Gast";
                                                return (
                                                    <div
                                                        key={b.id}
                                                        className="text-[10px] font-semibold truncate px-1 py-0.5 rounded bg-white/40 dark:bg-black/20"
                                                    >
                                                        {name}
                                                    </div>
                                                );
                                            })}
                                            {util.bookingCount > 3 && (
                                                <div className="text-[10px] font-semibold px-1 py-0.5 opacity-60">
                                                    +{util.bookingCount - 3} weitere
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Utilization percentage */}
                                    {isCurrentMonth && util.rate > 0 && (
                                        <div className={`mt-auto text-[10px] font-bold pt-0.5 ${util.rate >= 0.8 ? "text-red-600 dark:text-red-400" : util.rate >= 0.5 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                            {Math.round(util.rate * 100)}%
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 pt-3 mt-2 border-t" style={{ borderColor: darkMode ? "#334155" : "#e2e8f0" }}>
                <span className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Auslastung:</span>
                {[
                    { color: "bg-emerald-500", label: "< 50%" },
                    { color: "bg-amber-500", label: "50–80%" },
                    { color: "bg-red-500", label: "> 80%" },
                ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 rounded-full ${color}`} />
                        <span className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{label}</span>
                    </div>
                ))}
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <span className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Verfügbar</span>
                </div>
            </div>
        </div>
    );
}
