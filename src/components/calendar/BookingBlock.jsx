"use client";
import { fmtDate } from "../../utils/formatters";
import { getBookingColor, getStatusLabel } from "./bookingColors";

export { getBookingColor, getStatusLabel };

export default function BookingBlock({ booking, style, onClick, compact = false, className = "" }) {
    const color = getBookingColor(booking);
    const customerName = booking.customer
        ? `${booking.customer.first_name} ${booking.customer.last_name}`.trim()
        : booking.customer_name || "Unbekannt";

    const initials = customerName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return (
        <div
            style={style}
            onClick={(e) => { e.stopPropagation(); onClick?.(booking); }}
            title={`${customerName} · ${fmtDate(booking.start_date)} – ${fmtDate(booking.end_date)} · ${getStatusLabel(booking)}`}
            className={`
                ${color.bg} ${color.border} ${color.text}
                border rounded-md cursor-pointer select-none
                hover:brightness-110 active:brightness-90 transition-all
                flex items-center gap-1.5 overflow-hidden
                ${compact ? "px-1 py-0.5 text-[10px]" : "px-2 py-1 text-xs"}
                ${className}
            `}
        >
            <div className={`rounded-full bg-white/25 font-bold flex-shrink-0 flex items-center justify-center ${compact ? "w-3.5 h-3.5 text-[8px]" : "w-5 h-5 text-[9px]"}`}>
                {initials}
            </div>
            <span className="truncate font-semibold">{customerName}</span>
        </div>
    );
}
