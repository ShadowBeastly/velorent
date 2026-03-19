// app/checkin/[code]/page.jsx
// Public QR check-in page — no authentication required.
// Loaded when a provider scans the guest's booking QR code at pickup.
// Shows booking details and an "Übergabe starten" button (links to /app/bookings).

import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
}

function fmtDate(dateStr) {
    if (!dateStr) return "–";
    return new Date(dateStr).toLocaleDateString("de-DE", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

function fmtCurrency(value) {
    if (value == null) return "–";
    return Number(value).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

export default async function CheckinPage({ params }) {
    const { code } = await params;

    const supabase = getSupabase();
    if (!supabase) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">Server configuration error.</p>
            </div>
        );
    }

    const { data: booking, error } = await supabase
        .from("bookings")
        .select("*, bike:bikes(id, name, category, price_per_day), customer:customers(id, first_name, last_name, email, phone)")
        .eq("confirmation_code", code.toUpperCase())
        .single();

    if (error || !booking) {
        notFound();
    }

    const customerName = booking.customer
        ? `${booking.customer.first_name} ${booking.customer.last_name}`
        : "Gast";
    const bikeName = booking.bike?.name ?? "Fahrzeug";
    const days = booking.total_days ?? 1;

    const statusColors = {
        reserved: "bg-yellow-100 text-yellow-800",
        confirmed: "bg-blue-100 text-blue-800",
        picked_up: "bg-green-100 text-green-800",
        returned: "bg-gray-100 text-gray-700",
        cancelled: "bg-red-100 text-red-700",
    };
    const statusLabels = {
        reserved: "Reserviert",
        confirmed: "Bestätigt",
        picked_up: "Ausgegeben",
        returned: "Zurückgegeben",
        cancelled: "Storniert",
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start py-10 px-4">
            {/* Header */}
            <div className="w-full max-w-md">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-[#1A7D5A] rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-gray-900">Buchungs-Check-in</h1>
                        <p className="text-sm text-gray-500">RentCore</p>
                    </div>
                </div>

                {/* Status badge */}
                <div className="flex justify-end mb-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusColors[booking.status] ?? "bg-gray-100 text-gray-700"}`}>
                        {statusLabels[booking.status] ?? booking.status}
                    </span>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Booking number */}
                    <div className="bg-[#1A7D5A] px-6 py-4">
                        <p className="text-xs text-green-100 uppercase tracking-wider font-medium">Buchungsnummer</p>
                        <p className="text-2xl font-bold text-white tracking-widest font-mono mt-0.5">
                            {booking.booking_number || booking.id?.slice(0, 8).toUpperCase()}
                        </p>
                    </div>

                    {/* Details */}
                    <div className="px-6 py-5 space-y-4">
                        <Row label="Kunde" value={customerName} />
                        {booking.customer?.phone && <Row label="Telefon" value={booking.customer.phone} />}
                        <Row label="Fahrzeug" value={bikeName} />
                        <Row label="Abholung" value={fmtDate(booking.start_date)} />
                        <Row label="Rückgabe" value={fmtDate(booking.end_date)} />
                        <Row label="Dauer" value={`${days} ${days === 1 ? "Tag" : "Tage"}`} />
                        <Row label="Betrag" value={fmtCurrency(booking.total_price)} bold />
                    </div>
                </div>

                {/* Action */}
                {booking.status !== "cancelled" && booking.status !== "returned" && (
                    <a
                        href={`/app/bookings`}
                        className="mt-5 block w-full text-center bg-[#1A7D5A] hover:bg-[#15694a] text-white font-semibold py-3.5 rounded-xl transition-colors text-base"
                    >
                        Übergabe starten →
                    </a>
                )}

                {booking.status === "returned" && (
                    <p className="mt-5 text-center text-sm text-gray-500">
                        Diese Buchung wurde bereits abgeschlossen.
                    </p>
                )}
                {booking.status === "cancelled" && (
                    <p className="mt-5 text-center text-sm text-red-500">
                        Diese Buchung wurde storniert.
                    </p>
                )}

                <p className="text-center text-xs text-gray-400 mt-6">
                    Buchungscode: <span className="font-mono">{code.toUpperCase()}</span>
                </p>
            </div>
        </div>
    );
}

function Row({ label, value, bold }) {
    return (
        <div className="flex justify-between items-start">
            <span className="text-sm text-gray-500 shrink-0 w-28">{label}</span>
            <span className={`text-sm text-right ${bold ? "font-bold text-gray-900" : "text-gray-800"}`}>
                {value}
            </span>
        </div>
    );
}

export async function generateMetadata({ params }) {
    const { code } = await params;
    return { title: `Check-in ${code.toUpperCase()} | RentCore` };
}
