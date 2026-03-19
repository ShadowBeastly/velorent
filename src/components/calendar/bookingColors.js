/**
 * M7 booking color utilities
 * Color-coding rules:
 * Blue  (#3B82F6) confirmed + paid
 * Yellow (#F59E0B) reserved, not yet paid
 * Green (#10B981) currently rented (start <= today <= end)
 * Red   (#EF4444) overdue (end date passed, not returned)
 * Orange (#F97316) maintenance blocked
 */

export function getBookingColor(booking) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(booking.end_date + "T00:00:00");
    const start = new Date(booking.start_date + "T00:00:00");

    if (booking.status === "cancelled") {
        return { bg: "bg-slate-400", border: "border-slate-500", text: "text-white", hex: "#94a3b8" };
    }
    if (booking.status === "picked_up") {
        if (end < today) {
            return { bg: "bg-red-500", border: "border-red-600", text: "text-white", hex: "#EF4444" };
        }
        return { bg: "bg-emerald-500", border: "border-emerald-600", text: "text-white", hex: "#10B981" };
    }
    if (booking.status === "returned" || booking.status === "completed") {
        return { bg: "bg-slate-400", border: "border-slate-500", text: "text-white", hex: "#94a3b8" };
    }
    if (booking.status === "reserved" || booking.status === "confirmed") {
        if (end < today) {
            return { bg: "bg-red-500", border: "border-red-600", text: "text-white", hex: "#EF4444" };
        }
        if (start <= today && today <= end) {
            return { bg: "bg-emerald-500", border: "border-emerald-600", text: "text-white", hex: "#10B981" };
        }
        if (booking.payment_status === "paid") {
            return { bg: "bg-blue-500", border: "border-blue-600", text: "text-white", hex: "#3B82F6" };
        }
        return { bg: "bg-amber-500", border: "border-amber-600", text: "text-white", hex: "#F59E0B" };
    }
    return { bg: "bg-blue-500", border: "border-blue-600", text: "text-white", hex: "#3B82F6" };
}

export function getStatusLabel(booking) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(booking.end_date + "T00:00:00");
    if (booking.status === "picked_up" && end < today) return "Überfällig";
    const labels = {
        reserved: "Reserviert",
        confirmed: "Bestätigt",
        picked_up: "Abgeholt",
        returned: "Zurückgegeben",
        completed: "Abgeschlossen",
        cancelled: "Storniert",
    };
    return labels[booking.status] || booking.status;
}
