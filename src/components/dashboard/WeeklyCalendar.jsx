"use client";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAY_NAMES = ["SO", "MO", "DI", "MI", "DO", "FR", "SA"];


function getWeekDates(baseDate) {
    const d = new Date(baseDate);
    const day = d.getDay(); // 0 = Sunday
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - day); // back to Sunday (getDay()===0 → no shift)
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const dd = new Date(sunday);
        dd.setDate(sunday.getDate() + i);
        dates.push(dd);
    }
    return dates;
}

function getMonthDates(baseDate) {
    const d = new Date(baseDate);
    const year = d.getFullYear();
    const month = d.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dates = [];
    for (let i = 1; i <= daysInMonth; i++) {
        dates.push(new Date(year, month, i));
    }
    return dates;
}

function fmtIso(d) {
    return d.toISOString().slice(0, 10);
}

function fmtDateRange(dates) {
    if (dates.length === 0) return "";
    const first = dates[0];
    const last = dates[dates.length - 1];
    const months = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
    if (first.getMonth() === last.getMonth()) {
        return `${first.getDate()}. - ${last.getDate()}. ${months[first.getMonth()]} ${first.getFullYear()}`;
    }
    return `${first.getDate()}. ${months[first.getMonth()]} - ${last.getDate()}. ${months[last.getMonth()]} ${last.getFullYear()}`;
}

const STATUS_COLORS = {
    reserved: { bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-l-blue-500", text: "text-blue-900 dark:text-blue-100", sub: "text-blue-600 dark:text-blue-400", label: "Reserviert", icon: "schedule" },
    confirmed: { bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-l-emerald-500", text: "text-emerald-900 dark:text-emerald-100", sub: "text-emerald-600 dark:text-emerald-400", label: "Bestätigt", icon: "check_circle" },
    picked_up: { bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-l-orange-500", text: "text-orange-900 dark:text-orange-100", sub: "text-orange-600 dark:text-orange-400", label: "Abgeholt", icon: "directions_bike" },
    overdue: { bg: "bg-red-50 dark:bg-red-900/20", border: "border-l-red-500", text: "text-red-900 dark:text-red-100", sub: "text-red-600 dark:text-red-400", label: "Verspätet", icon: "warning" },
};

export default function WeeklyCalendar({ bikes, bookings, darkMode, onBookingClick }) {
    const [viewMode, setViewMode] = useState("week");
    const [baseDate, setBaseDate] = useState(new Date());
    const todayStr = fmtIso(new Date());

    const dates = useMemo(() => {
        return viewMode === "week" ? getWeekDates(baseDate) : getMonthDates(baseDate);
    }, [baseDate, viewMode]);

    const navigate = (dir) => {
        const d = new Date(baseDate);
        if (viewMode === "week") d.setDate(d.getDate() + dir * 7);
        else d.setMonth(d.getMonth() + dir);
        setBaseDate(d);
    };

    const goToday = () => setBaseDate(new Date());

    // Build booking blocks per bike
    const bikeBookings = useMemo(() => {
        const dateRange = { start: fmtIso(dates[0]), end: fmtIso(dates[dates.length - 1]) };
        return bikes.map(bike => {
            const bBookings = bookings.filter(b =>
                b.bike_id === bike.id &&
                b.start_date <= dateRange.end &&
                b.end_date >= dateRange.start &&
                !["cancelled", "no_show"].includes(b.status)
            ).map(b => {
                const isOverdue = b.status === "picked_up" && b.end_date < todayStr;
                return { ...b, displayStatus: isOverdue ? "overdue" : b.status };
            });
            return { bike, bookings: bBookings };
        }).filter(bb => bb.bookings.length > 0 || bikes.length <= 20); // Show all if fleet is small
    }, [bikes, bookings, dates, todayStr]);

    // Only show first 7 days in week view for the grid
    const visibleDates = viewMode === "week" ? dates : dates.slice(0, Math.min(dates.length, 31));
    const gridCols = visibleDates.length;

    return (
        <div className={`rounded-xl border shadow-sm overflow-hidden flex flex-col ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            {/* Header Controls */}
            <div className={`p-5 border-b flex flex-wrap items-center justify-between gap-4 ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
                <div className="flex items-center gap-5">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Wochenplan</h2>
                    <div className={`flex items-center p-1 rounded-lg ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>
                        <button
                            onClick={() => setViewMode("week")}
                            className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${viewMode === "week"
                                ? darkMode ? "bg-slate-700 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm border border-slate-200"
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            }`}
                        >
                            Woche
                        </button>
                        <button
                            onClick={() => setViewMode("month")}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${viewMode === "month"
                                ? darkMode ? "bg-slate-700 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm border border-slate-200"
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            }`}
                        >
                            Monat
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={goToday}
                        className={`px-4 py-2 text-sm font-bold rounded-lg border transition-colors ${darkMode ? "border-slate-700 hover:bg-slate-800" : "border-slate-200 hover:bg-slate-50"}`}
                    >
                        Heute
                    </button>
                    <div className={`flex items-center rounded-lg border overflow-hidden ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                        <button onClick={() => navigate(-1)} className={`p-2 transition-colors border-r ${darkMode ? "border-slate-700 hover:bg-slate-800" : "border-slate-200 hover:bg-slate-50"}`}>
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className={`text-sm font-bold px-4 py-2 ${darkMode ? "bg-slate-800/50" : "bg-slate-50/50"}`}>
                            {fmtDateRange(visibleDates)}
                        </span>
                        <button onClick={() => navigate(1)} className={`p-2 transition-colors ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-50"}`}>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Legend */}
                <div className={`hidden lg:flex items-center gap-4 text-xs font-bold ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Reserviert</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Bestätigt</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Verspätet</div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-x-auto">
                <div style={{ minWidth: viewMode === "week" ? "800px" : "1200px" }}>
                    {/* Day Headers */}
                    <div className={`grid border-b ${darkMode ? "border-slate-800" : "border-slate-100"}`} style={{ gridTemplateColumns: `200px repeat(${gridCols}, 1fr)` }}>
                        <div className={`p-4 border-r flex items-center ${darkMode ? "bg-slate-800/30 border-slate-800" : "bg-slate-50/50 border-slate-100"}`}>
                            <span className={`text-xs font-bold uppercase tracking-widest ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Angebot</span>
                        </div>
                        {visibleDates.map((date, i) => {
                            const isToday = fmtIso(date) === todayStr;
                            return (
                                <div key={i} className={`p-3 text-center relative ${isToday ? "bg-[#1A7D5A]/5" : ""} ${i < visibleDates.length - 1 ? (darkMode ? "border-r border-slate-800/50" : "border-r border-slate-50") : ""}`}>
                                    {isToday && <div className="absolute inset-x-0 top-0 h-1 bg-[#1A7D5A]" />}
                                    <p className={`text-[10px] font-bold uppercase ${isToday ? "text-[#1A7D5A]" : darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                        {isToday ? `${DAY_NAMES[date.getDay()]} (Heute)` : DAY_NAMES[date.getDay()]}
                                    </p>
                                    <p className={`text-sm font-bold ${isToday ? "text-[#1A7D5A]" : ""}`}>{date.getDate()}</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Bike Rows */}
                    <div className={`divide-y ${darkMode ? "divide-slate-800" : "divide-slate-100"}`}>
                        {bikeBookings.map(({ bike, bookings: bBookings }) => (
                            <div key={bike.id} className="grid group" style={{ gridTemplateColumns: `200px repeat(${gridCols}, 1fr)` }}>
                                {/* Bike label */}
                                <div className={`p-4 border-r flex items-center gap-3 sticky left-0 z-[5] ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"}`}>
                                    <div className={`w-9 h-9 rounded-lg ${darkMode ? "bg-slate-800" : "bg-slate-100"} flex items-center justify-center`}>
                                        <span className={`text-xl ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                            {bike.battery ? "⚡" : "•"}
                                        </span>
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-xs font-bold truncate">{bike.internal_id || `B-RC ${bikes.indexOf(bike) + 1}`}</p>
                                        <p className={`text-[10px] truncate ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{bike.name}</p>
                                    </div>
                                </div>

                                {/* Booking cells. Relative container */}
                                <div className="relative h-20" style={{ gridColumn: `2 / ${gridCols + 2}` }}>
                                    {/* Column backgrounds */}
                                    <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
                                        {visibleDates.map((date, i) => (
                                            <div key={i} className={`${fmtIso(date) === todayStr ? "bg-[#1A7D5A]/[0.02]" : ""} ${i < visibleDates.length - 1 ? (darkMode ? "border-r border-slate-800/50" : "border-r border-slate-100") : ""}`} />
                                        ))}
                                    </div>

                                    {/* Booking blocks */}
                                    {bBookings.map(booking => {
                                        const startDate = new Date(booking.start_date);
                                        const endDate = new Date(booking.end_date);
                                        const rangeStart = dates[0];
                                        const rangeEnd = dates[dates.length - 1];

                                        const clampStart = startDate < rangeStart ? rangeStart : startDate;
                                        const clampEnd = endDate > rangeEnd ? rangeEnd : endDate;

                                        const startIdx = Math.round((clampStart - rangeStart) / (1000 * 60 * 60 * 24));
                                        const endIdx = Math.round((clampEnd - rangeStart) / (1000 * 60 * 60 * 24));

                                        const leftPct = (startIdx / gridCols) * 100;
                                        const widthPct = ((endIdx - startIdx + 1) / gridCols) * 100;

                                        const colors = STATUS_COLORS[booking.displayStatus] || STATUS_COLORS.reserved;

                                        return (
                                            <div
                                                key={booking.id}
                                                onClick={() => onBookingClick?.(booking)}
                                                className={`absolute top-3 bottom-3 ${colors.bg} border-l-4 ${colors.border} rounded-r-lg shadow-sm px-3 flex items-center justify-between cursor-pointer hover:brightness-95 transition-all overflow-hidden`}
                                                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                            >
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className={`text-[11px] font-bold truncate ${colors.text}`}>
                                                        {booking.customer_name}
                                                    </span>
                                                    <span className={`text-[9px] font-semibold uppercase ${colors.sub}`}>
                                                        {colors.label}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {bikeBookings.length === 0 && (
                            <div className={`p-12 text-center ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                Keine Buchungen in diesem Zeitraum.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
