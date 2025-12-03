import { useState, useMemo } from "react";
import { Plus, Loader2, Edit } from "lucide-react";
import BookingModal from "../components/bookings/BookingModal";
import { STATUS, BIKE_COLORS } from "../utils/constants";
import { fmtCurrency } from "../utils/formatUtils";
import { fmtDate } from "../utils/dateUtils";

export default function BookingsPage({ bikes, bookings, customers, darkMode, searchQuery }) {
    const [statusFilter, setStatusFilter] = useState("all");
    const [showModal, setShowModal] = useState(false);
    const [editBooking, setEditBooking] = useState(null);

    const filtered = useMemo(() => {
        return bookings.bookings
            .filter(b => statusFilter === "all" || b.status === statusFilter)
            .filter(b => searchQuery === "" || b.customer_name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [bookings.bookings, statusFilter, searchQuery]);

    const cardStyle = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";

    const handleSave = async (data) => {
        let bookingData = { ...data };

        // Handle new customer creation
        if (!bookingData.customer_id && bookingData.customer_name) {
            const nameParts = bookingData.customer_name.trim().split(" ");
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(" ") || "";

            const newCustomer = {
                first_name: firstName,
                last_name: lastName,
                email: bookingData.customer_email,
                phone: bookingData.customer_phone,
            };

            const { data: createdCustomer, error } = await customers.create(newCustomer);
            if (error) {
                alert("Fehler beim Anlegen des Kunden: " + error.message);
                return;
            }
            bookingData.customer_id = createdCustomer.id;
        }

        if (editBooking) await bookings.update(editBooking.id, bookingData);
        else await bookings.create(bookingData);
        setShowModal(false);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className={`rounded-2xl border p-4 ${cardStyle}`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        {["all", ...Object.keys(STATUS)].map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s
                                    ? "bg-orange-500 text-white"
                                    : darkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"
                                    }`}
                            >
                                {s === "all" ? "Alle" : STATUS[s]?.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => { setEditBooking(null); setShowModal(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium shadow-lg shadow-orange-500/25"
                    >
                        <Plus className="w-4 h-4" />
                        Neue Buchung
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className={`rounded-2xl border overflow-hidden ${cardStyle}`}>
                {bookings.loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className={darkMode ? "bg-slate-800/50" : "bg-slate-50"}>
                                <tr className={`text-left text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    <th className="px-4 py-3">Nr.</th>
                                    <th className="px-4 py-3">Kunde</th>
                                    <th className="px-4 py-3">Rad</th>
                                    <th className="px-4 py-3">Zeitraum</th>
                                    <th className="px-4 py-3">Preis</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${darkMode ? "divide-slate-800" : "divide-slate-100"}`}>
                                {filtered.map(b => {
                                    const bikeIdx = bikes.bikes.findIndex(x => x.id === b.bike_id);
                                    return (
                                        <tr key={b.id} className={darkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50"}>
                                            <td className="px-4 py-3 font-mono text-sm">{b.booking_number}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{b.customer_name}</div>
                                                <div className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{b.customer_phone}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-6 h-6 rounded ${BIKE_COLORS[bikeIdx % BIKE_COLORS.length]} flex items-center justify-center text-white text-xs font-bold`}>
                                                        {bikeIdx + 1}
                                                    </div>
                                                    <span className="text-sm">{b.bike?.name || "—"}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm">{fmtDate(b.start_date)} → {fmtDate(b.end_date)}</td>
                                            <td className="px-4 py-3 font-medium">{fmtCurrency(b.total_price)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2 py-1 rounded-full border ${STATUS[b.status]?.color}`}>
                                                    {STATUS[b.status]?.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => { setEditBooking(b); setShowModal(true); }}
                                                    className={`p-2 rounded-lg ${darkMode ? "hover:bg-slate-700" : "hover:bg-slate-200"}`}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {!bookings.loading && filtered.length === 0 && (
                    <div className={`text-center py-12 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                        Keine Buchungen gefunden
                    </div>
                )}
            </div>

            {showModal && (
                <BookingModal
                    booking={editBooking}
                    initialDate={new Date()}
                    bikes={bikes.bikes}
                    customers={customers.customers}
                    existingBookings={bookings.bookings}
                    onSave={handleSave}
                    onDelete={async (id) => { await bookings.remove(id); setShowModal(false); }}
                    onClose={() => setShowModal(false)}
                    darkMode={darkMode}
                />
            )}
        </div>
    );
}
