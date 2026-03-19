"use client";
import { useMemo } from "react";
import { Wrench } from "lucide-react";
import { fmtISO } from "../../utils/formatters";
import { getBookingColor } from "./bookingColors";

const HOUR_START = 6;
const HOUR_END = 22;
const TOTAL_HOURS = HOUR_END - HOUR_START; // 16

// eslint-disable-next-line no-unused-vars
function getBookingTopPercent(_booking, _date) {
    // For day view: position booking by time if it has time info, else full-day blocks
    // Most bookings are date-only, so we default to treating them as the full visible block for that day
    return 0;
}

/**
 * DayView — vertical time axis 06:00–22:00, one column per bike
 */
export default function DayView({ date, bikes, bookings, maintenanceBlocks, onClickSlot, onClickBooking, darkMode }) {
    const dateStr = fmtISO(date);
    const today = fmtISO(new Date());
    const isToday = dateStr === today;

    const hours = useMemo(() => {
        const h = [];
        for (let i = HOUR_START; i <= HOUR_END; i++) h.push(i);
        return h;
    }, []);

    // For each bike, compute bookings that overlap this day
    const getBikeBookingsForDay = (bikeId) => {
        return bookings.filter(b =>
            b.bike_id === bikeId &&
            b.status !== "cancelled" &&
            b.start_date <= dateStr &&
            b.end_date >= dateStr
        );
    };

    const getBikeMaintenanceForDay = (bikeId) => {
        return maintenanceBlocks.filter(m =>
            m.bike_id === bikeId &&
            m.status !== "completed" &&
            m.start_date <= dateStr &&
            (m.end_date || m.start_date) >= dateStr
        );
    };

    const hourHeight = 64; // px per hour row

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            {/* Bike header row */}
            <div className={`flex border-b sticky top-0 z-20 ${darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
                {/* Time gutter */}
                <div className="w-16 flex-shrink-0 border-r" style={{ borderColor: darkMode ? "#334155" : "#e2e8f0" }} />
                <div className="flex-1 overflow-x-auto">
                    <div className="flex" style={{ minWidth: `${Math.max(bikes.length * 160, 320)}px` }}>
                        {bikes.map(bike => (
                            <div
                                key={bike.id}
                                className={`flex-1 min-w-[160px] px-3 py-2.5 border-r last:border-r-0 text-center ${darkMode ? "border-slate-700" : "border-slate-200"}`}
                            >
                                <p className={`text-sm font-bold truncate ${darkMode ? "text-white" : "text-slate-900"}`}>{bike.name}</p>
                                <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{bike.category}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Scrollable time grid */}
            <div className="flex-1 overflow-auto">
                <div className="flex" style={{ minWidth: `${Math.max(bikes.length * 160, 320) + 64}px` }}>
                    {/* Time axis */}
                    <div className="w-16 flex-shrink-0 border-r" style={{ borderColor: darkMode ? "#334155" : "#e2e8f0" }}>
                        {hours.map(h => (
                            <div
                                key={h}
                                className={`flex items-start justify-end pr-2 pt-1 text-xs font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`}
                                style={{ height: `${hourHeight}px`, borderBottom: `1px solid ${darkMode ? "#1e293b" : "#f1f5f9"}` }}
                            >
                                {String(h).padStart(2, "0")}:00
                            </div>
                        ))}
                    </div>

                    {/* Bike columns */}
                    <div className="flex flex-1">
                        {bikes.map(bike => {
                            const bikeBookings = getBikeBookingsForDay(bike.id);
                            const bikeMaint = getBikeMaintenanceForDay(bike.id);
                            const hasMaint = bikeMaint.length > 0;

                            return (
                                <div
                                    key={bike.id}
                                    className={`flex-1 min-w-[160px] relative border-r last:border-r-0 ${darkMode ? "border-slate-700" : "border-slate-200"}`}
                                    style={{ height: `${hourHeight * TOTAL_HOURS}px` }}
                                >
                                    {/* Hour grid lines */}
                                    {hours.slice(0, -1).map(h => (
                                        <div
                                            key={h}
                                            className="absolute left-0 right-0"
                                            style={{
                                                top: `${(h - HOUR_START) * hourHeight}px`,
                                                height: `${hourHeight}px`,
                                                borderBottom: `1px solid ${darkMode ? "#1e293b" : "#f1f5f9"}`,
                                            }}
                                        />
                                    ))}

                                    {/* Click targets for each hour slot */}
                                    {hours.slice(0, -1).map(h => (
                                        <div
                                            key={`slot-${h}`}
                                            className={`absolute left-0 right-0 cursor-pointer hover:bg-[#1A7D5A]/10 transition-colors z-[1]`}
                                            style={{
                                                top: `${(h - HOUR_START) * hourHeight}px`,
                                                height: `${hourHeight}px`,
                                            }}
                                            onClick={() => onClickSlot?.(date, bike.id, h)}
                                        />
                                    ))}

                                    {/* Maintenance overlay */}
                                    {hasMaint && (
                                        <div
                                            className="absolute inset-0 z-[2] flex items-center justify-center pointer-events-none"
                                            style={{
                                                backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 8px, rgba(249,115,22,0.12) 8px, rgba(249,115,22,0.12) 16px)",
                                                border: "1.5px dashed #f97316",
                                            }}
                                        >
                                            <div className="flex flex-col items-center gap-1 px-2">
                                                <Wrench className="w-5 h-5 text-orange-500" />
                                                <span className="text-orange-600 dark:text-orange-400 text-xs font-semibold text-center">
                                                    {bikeMaint[0]?.description || "Wartung"}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Booking blocks (full-day style for date-only bookings) */}
                                    {!hasMaint && bikeBookings.map((booking, idx) => {
                                        const color = getBookingColor(booking);
                                        const customerName = booking.customer
                                            ? `${booking.customer.first_name} ${booking.customer.last_name}`.trim()
                                            : booking.customer_name || "Unbekannt";
                                        const initials = customerName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

                                        // Full block for date-only bookings
                                        const topPx = 4;
                                        const heightPx = (HOUR_END - HOUR_START) * hourHeight - 8;

                                        return (
                                            <div
                                                key={booking.id}
                                                onClick={(e) => { e.stopPropagation(); onClickBooking?.(booking); }}
                                                className={`absolute z-[3] rounded-xl cursor-pointer hover:brightness-110 transition-all flex flex-col justify-between p-3 ${color.bg} ${color.text}`}
                                                style={{
                                                    top: `${topPx + idx * 4}px`,
                                                    left: `${4 + idx * 4}%`,
                                                    right: `${4 + idx * 4}%`,
                                                    height: `${heightPx}px`,
                                                    opacity: 0.95,
                                                }}
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-white/25 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                            {initials}
                                                        </div>
                                                        <span className="font-semibold text-sm truncate">{customerName}</span>
                                                    </div>
                                                    {booking.bike?.name && (
                                                        <p className="text-white/80 text-xs mt-1.5 font-medium">{booking.bike.name}</p>
                                                    )}
                                                </div>
                                                <div className="text-white/70 text-xs">
                                                    {booking.total_days != null ? `${booking.total_days} Tage` : "—"}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Current time indicator */}
                {isToday && (() => {
                    const now = new Date();
                    const currentHour = now.getHours() + now.getMinutes() / 60;
                    if (currentHour < HOUR_START || currentHour > HOUR_END) return null;
                    const topPx = (currentHour - HOUR_START) * hourHeight;
                    return (
                        <div
                            className="absolute left-16 right-0 z-10 pointer-events-none flex items-center"
                            style={{ top: `${topPx}px` }}
                        >
                            <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                            <div className="flex-1 h-0.5 bg-red-500" />
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
