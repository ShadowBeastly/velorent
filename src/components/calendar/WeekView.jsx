"use client";
import { useMemo } from "react";
import { Wrench } from "lucide-react";
import { fmtISO } from "../../utils/formatters";
import { getBookingColor } from "./bookingColors";

const WEEKDAY_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function getWeekDays(date) {
    // Start on Monday of the week containing `date`
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun, 1=Mon...
    const diff = (day === 0 ? -6 : 1 - day); // adjust so Monday=0
    d.setDate(d.getDate() + diff);
    const days = [];
    for (let i = 0; i < 7; i++) {
        days.push(new Date(d.getFullYear(), d.getMonth(), d.getDate() + i));
    }
    return days;
}

/**
 * WeekView — 7 columns Mon-Sun, bikes as rows, bookings as horizontal bars
 */
export default function WeekView({ date, bikes, bookings, maintenanceBlocks, onClickSlot, onClickBooking, darkMode }) {
    const weekDays = useMemo(() => getWeekDays(date), [date]);
    const todayStr = fmtISO(new Date());

    const weekStart = fmtISO(weekDays[0]);
    const weekEnd = fmtISO(weekDays[6]);

    // Filter bookings that overlap this week
    const visibleBookings = useMemo(() =>
        bookings.filter(b =>
            b.status !== "cancelled" &&
            b.start_date <= weekEnd &&
            b.end_date >= weekStart
        ),
        [bookings, weekStart, weekEnd]
    );

    // For a booking on a specific day+bike: check overlap
    const getMaintenanceForBikeDay = (bikeId, dayStr) =>
        maintenanceBlocks.filter(m =>
            m.bike_id === bikeId &&
            m.status !== "completed" &&
            m.start_date <= dayStr &&
            (m.end_date || m.start_date) >= dayStr
        );

    // For each bike row, compute booking spans across the week
    const getBikeWeekBookings = (bikeId) => {
        const bikeBookings = visibleBookings.filter(b => b.bike_id === bikeId);
        return bikeBookings.map(booking => {
            const bStart = booking.start_date < weekStart ? weekStart : booking.start_date;
            const bEnd = booking.end_date > weekEnd ? weekEnd : booking.end_date;
            const startIdx = weekDays.findIndex(d => fmtISO(d) === bStart);
            const endIdx = weekDays.findIndex(d => fmtISO(d) === bEnd);
            const colStart = startIdx >= 0 ? startIdx : 0;
            const colEnd = endIdx >= 0 ? endIdx : 6;
            const span = colEnd - colStart + 1;
            return { ...booking, colStart, span };
        });
    };

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header: days */}
            <div className={`flex border-b sticky top-0 z-20 ${darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
                {/* Resource column header */}
                <div className={`w-32 md:w-48 flex-shrink-0 border-r px-3 py-3 text-xs font-bold uppercase tracking-wider ${darkMode ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500"}`}>
                    Ressource
                </div>
                {/* Day headers */}
                <div className="flex-1 grid grid-cols-7">
                    {weekDays.map((day) => {
                        const dayStr = fmtISO(day);
                        const isToday = dayStr === todayStr;
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        return (
                            <div
                                key={dayStr}
                                className={`
                                    text-center py-3 border-r last:border-r-0 relative
                                    ${darkMode ? "border-slate-700" : "border-slate-200"}
                                    ${isWeekend ? (darkMode ? "bg-slate-800/40" : "bg-slate-50") : ""}
                                    ${isToday ? (darkMode ? "bg-[#1A7D5A]/15" : "bg-[#D4EDE2]/40") : ""}
                                `}
                            >
                                <p className={`text-xs font-semibold uppercase tracking-wider ${isToday ? "text-[#1A7D5A]" : (darkMode ? "text-slate-400" : "text-slate-500")}`}>
                                    {WEEKDAY_SHORT[day.getDay()]}
                                </p>
                                <p className={`text-base font-bold mt-0.5 ${isToday ? "text-[#1A7D5A]" : (darkMode ? "text-white" : "text-slate-900")}`}>
                                    {day.getDate()}
                                </p>
                                <p className={`text-[10px] ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                    {day.toLocaleDateString("de-DE", { month: "short" })}
                                </p>
                                {isToday && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[#1A7D5A]" />}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Body: bike rows */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {bikes.map(bike => {
                    const weekBookings = getBikeWeekBookings(bike.id);

                    return (
                        <div
                            key={bike.id}
                            className={`flex border-b last:border-b-0 min-h-[72px] ${darkMode ? "border-slate-700 hover:bg-slate-800/40" : "border-slate-100 hover:bg-slate-50/60"} transition-colors`}
                        >
                            {/* Resource label */}
                            <div className={`w-32 md:w-48 flex-shrink-0 border-r flex items-center gap-2 md:gap-3 px-2 md:px-3 sticky left-0 z-10 ${darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${bike.category === "E-Bike" ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"}`}>
                                    {bike.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-sm font-bold truncate ${darkMode ? "text-white" : "text-slate-900"}`}>{bike.name}</p>
                                    <p className={`text-xs truncate ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{bike.category}</p>
                                </div>
                            </div>

                            {/* 7-day grid */}
                            <div className="flex-1 relative grid grid-cols-7">
                                {/* Background cells (click targets) */}
                                {weekDays.map(day => {
                                    const dayStr = fmtISO(day);
                                    const isToday = dayStr === todayStr;
                                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                    const maint = getMaintenanceForBikeDay(bike.id, dayStr);
                                    const hasMaint = maint.length > 0;

                                    return (
                                        <div
                                            key={dayStr}
                                            onClick={() => !hasMaint && onClickSlot?.(day, bike.id)}
                                            className={`
                                                border-r last:border-r-0 h-full min-h-[72px] relative
                                                ${darkMode ? "border-slate-700" : "border-slate-100"}
                                                ${isWeekend ? (darkMode ? "bg-slate-800/20" : "bg-slate-50/40") : ""}
                                                ${isToday ? (darkMode ? "bg-[#1A7D5A]/5" : "bg-[#D4EDE2]/20") : ""}
                                                ${!hasMaint ? "cursor-pointer hover:bg-[#1A7D5A]/10" : "cursor-default"}
                                                transition-colors
                                            `}
                                        >
                                            {hasMaint && (
                                                <div
                                                    className="absolute inset-0 flex items-center justify-center"
                                                    style={{
                                                        backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 6px, rgba(249,115,22,0.1) 6px, rgba(249,115,22,0.1) 12px)",
                                                    }}
                                                    title={`Wartung: ${maint[0]?.description || maint[0]?.type || "Wartung"}`}
                                                >
                                                    <Wrench className="w-3.5 h-3.5 text-orange-500 opacity-60" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Booking bars overlay — positioned using CSS grid */}
                                {weekBookings.map((booking, idx) => {
                                    const color = getBookingColor(booking);
                                    const customerName = booking.customer
                                        ? `${booking.customer.first_name} ${booking.customer.last_name}`.trim()
                                        : booking.customer_name || "Unbekannt";
                                    const initials = customerName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

                                    return (
                                        <div
                                            key={booking.id}
                                            onClick={(e) => { e.stopPropagation(); onClickBooking?.(booking); }}
                                            className={`absolute top-3 flex items-center gap-1.5 rounded-lg px-2 py-1.5 cursor-pointer hover:brightness-110 transition-all shadow-sm overflow-hidden ${color.bg} ${color.text}`}
                                            style={{
                                                left: `calc(${booking.colStart} * (100% / 7) + 4px)`,
                                                width: `calc(${booking.span} * (100% / 7) - 8px)`,
                                                top: `${8 + idx * 30}px`,
                                                height: "26px",
                                                zIndex: 10 + idx,
                                            }}
                                            title={customerName}
                                        >
                                            <div className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center text-[8px] font-bold flex-shrink-0">
                                                {initials}
                                            </div>
                                            <span className="text-xs font-semibold truncate">{customerName}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {bikes.length === 0 && (
                    <div className={`p-16 text-center ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                        <p className="text-lg font-medium">Keine Fahrräder gefunden</p>
                    </div>
                )}
            </div>
        </div>
    );
}
