/**
 * Calculate whether a booking is overdue and what the accumulated late fee is.
 *
 * The fee is a *display-only* calculated value — it is not stored in the DB.
 * Operators can manually add the resulting amount to the invoice at return time.
 *
 * @param {object} booking  - Booking record (must have end_date, total_price, total_days, status)
 * @param {object} orgSettings - Organization record (late_fee_enabled, late_fee_type, late_fee_amount, late_fee_grace_hours)
 * @returns {{ isLate: boolean, fee: number, daysLate: number, hoursLate: number }}
 */
export function calculateLateFee(booking, orgSettings) {
    if (!orgSettings?.late_fee_enabled) {
        return { isLate: false, fee: 0, daysLate: 0, hoursLate: 0 };
    }

    // Only charge fees for bookings that have been picked up but not yet returned
    if (booking.status !== "picked_up") {
        return { isLate: false, fee: 0, daysLate: 0, hoursLate: 0 };
    }

    const now = new Date();
    // Treat end_date as the end of the day in local time (midnight of the next day = start of end_date + 1 day)
    // For simplicity we compare against midnight of end_date, then add grace hours
    const endDate = new Date(booking.end_date + "T00:00:00");
    const graceMs = (orgSettings.late_fee_grace_hours ?? 2) * 60 * 60 * 1000;
    const deadline = new Date(endDate.getTime() + graceMs);

    if (now <= deadline) {
        return { isLate: false, fee: 0, daysLate: 0, hoursLate: 0 };
    }

    // How long past the end_date (not the deadline) are we?
    const msLate = now - endDate;
    const hoursLate = Math.floor(msLate / (1000 * 60 * 60));
    // Round up to full days for fee calculation (minimum 1 day)
    const daysLate = Math.max(1, Math.ceil(msLate / (1000 * 60 * 60 * 24)));

    let fee;
    if (orgSettings.late_fee_type === "percentage") {
        const dailyRate = (booking.total_price || 0) / Math.max(booking.total_days || 1, 1);
        fee = daysLate * (dailyRate * ((orgSettings.late_fee_amount || 0) / 100));
    } else {
        // fixed: flat amount per day
        fee = daysLate * (orgSettings.late_fee_amount || 0);
    }

    return {
        isLate: true,
        fee: Math.round(fee * 100) / 100,
        daysLate,
        hoursLate,
    };
}
