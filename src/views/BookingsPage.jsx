"use client";
import { useState, useMemo } from "react";
import { Plus, Loader2, Edit, FileText, ArrowUpRight, ArrowDownLeft, Download, Users } from "lucide-react";
import BookingModal from "../components/bookings/BookingModal";
import HandoverModal from "../components/dashboard/HandoverModal";
import { STATUS, BIKE_COLORS } from "../utils/constants";
import { fmtCurrency, fmtDate } from "../utils/formatters";
import { calculateLateFee } from "../utils/calculateLateFee";
import { generateInvoice } from "../utils/InvoiceGenerator";
import { useApp } from "../context/AppContext";
import { useData } from "../context/DataContext";
import { useOrganization } from "../context/OrgContext";
import { useToast } from "../components/ui/Toast";
import { exportToCSV } from "../utils/exportCSV";

export default function BookingsPage() {
    const { darkMode, searchQuery } = useApp();
    const { bikes, bookings, customers, invoices, pricingRules } = useData();
    const org = useOrganization();
    const currentOrg = org.currentOrg;
    const { addToast } = useToast();
    const [statusFilter, setStatusFilter] = useState("all");
    const [showModal, setShowModal] = useState(false);
    const [editBooking, setEditBooking] = useState(null);
    const [handoverBooking, setHandoverBooking] = useState(null);
    const [handoverType, setHandoverType] = useState(null);

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
                email: bookingData.customer_email || null, // Allow null
                phone: bookingData.customer_phone || null, // Allow null
                id_number: bookingData.id_number,
                address: bookingData.customer_address,
                city: bookingData.city || "", // Optional
            };

            const { data: createdCustomer, error } = await customers.create(newCustomer);
            if (error) {
                addToast("Fehler beim Anlegen des Kunden: " + error.message, "error");
                return;
            }
            bookingData.customer_id = createdCustomer.id;
        }

        if (editBooking) {
            const { error } = await bookings.update(editBooking.id, bookingData);
            if (error) {
                addToast("Fehler beim Aktualisieren: " + error.message, "error");
                return;
            }
        } else {
            const { error } = await bookings.create(bookingData);
            if (error) {
                addToast("Fehler beim Erstellen: " + error.message, "error");
                return;
            }
        }
        setShowModal(false);
    };

    const handlePickup = (booking) => {
        setHandoverBooking(booking);
        setHandoverType("pickup");
    };

    const handleReturn = (booking) => {
        setHandoverBooking(booking);
        setHandoverType("return");
    };

    const confirmHandover = async (updatedNotes) => {
        let updates;
        if (handoverType === "pickup") {
            updates = {
                status: "picked_up",
                pickup_notes: updatedNotes,
                deposit_amount: handoverBooking.deposit_amount,
                deposit_status: "held"
            };
        } else {
            updates = {
                status: "returned",
                return_notes: updatedNotes,
                deposit_status: "refunded"
            };
        }
        const { error } = await bookings.update(handoverBooking.id, updates);
        if (error) {
            addToast("Fehler: " + error.message, "error");
        } else {
            addToast("Erfolgreich aktualisiert", "success");
            setHandoverBooking(null);
        }
    };

    const handleInvoice = async (booking) => {
        if (!currentOrg) {
            addToast("Fehler: Organisations-Daten fehlen", "error");
            return;
        }

        // 1. Calculate Amounts
        const total = Number(booking.total_price);
        const taxRate = 19;
        const net = total / (1 + (taxRate / 100));
        const tax = total - net;

        // 2. Prepare Data
        const invoiceNumber = `RE-${(booking.booking_number || '000').replace('VR-', '')}`;
        const items = [{
            description: `Fahrradmiete: ${booking.bike?.name || 'Bike'} (${fmtDate(booking.start_date)} - ${fmtDate(booking.end_date)})`,
            quantity: `${booking.total_days || 1} Tage`,
            unit_price: booking.price_per_day,
            total: total
        }];

        const invoiceData = {
            organization_id: currentOrg.id,
            booking_id: booking.id,
            customer_id: booking.customer_id,
            invoice_number: invoiceNumber,
            subtotal: net,
            tax_rate: taxRate,
            tax_amount: tax,
            total: total,
            status: 'draft',
            due_date: booking.end_date, // Due on return
            items: items
        };

        try {
            // 3. Save to Database
            if (invoices && invoices.create) {
                console.log("Saving invoice to DB...");
                const { data, error } = await invoices.create(invoiceData);
                if (error) {
                    console.error("DB Error:", error);
                    // Continue to offer PDF even if DB Save fails (fallback)
                    // alert("Fehler beim Speichern der Rechnung: " + error.message);
                } else {
                    console.log("Invoice saved:", data);
                }
            }

            // 4. Generate PDF
            const pdfData = {
                ...invoiceData,
                created_at: new Date().toISOString(),
                customer: {
                    first_name: booking.customer_name.split(" ")[0],
                    last_name: booking.customer_name.split(" ").slice(1).join(" ") || "",
                    email: booking.customer_email,
                    address: booking.customer_address
                },
                booking: booking
            };

            generateInvoice(pdfData, currentOrg).save(`${invoiceNumber}.pdf`);

        } catch (err) {
            console.error(err);
            addToast("Fehler beim Erstellen der Rechnung: " + err.message, "error");
        }
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
                        onClick={() => exportToCSV(filtered, [
                            { key: 'booking_number', label: 'Buchungsnr' },
                            { key: 'customer_name', label: 'Kunde' },
                            { key: row => row.bike?.name || '', label: 'Fahrrad' },
                            { key: 'start_date', label: 'Start' },
                            { key: 'end_date', label: 'Ende' },
                            { key: 'total_days', label: 'Tage' },
                            { key: 'status', label: 'Status' },
                            { key: 'total_price', label: 'Preis' },
                        ], 'buchungen')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium border transition-colors ${darkMode ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-300 text-slate-600 hover:bg-slate-100"}`}
                    >
                        <Download className="w-4 h-4" />
                        Exportieren
                    </button>
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
                                    <th className="px-4 py-3">Kaution</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${darkMode ? "divide-slate-800" : "divide-slate-100"}`}>
                                {filtered.map(b => {
                                    const bikeIdx = bikes.bikes.findIndex(x => x.id === b.bike_id);
                                    const lateFee = calculateLateFee(b, currentOrg);
                                    return (
                                        <tr key={b.id} className={`${darkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50"} ${lateFee.isLate ? darkMode ? "bg-red-500/5" : "bg-red-50/60" : ""}`}>
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
                                                    <div>
                                                        <span className="text-sm">{b.bike?.name || "—"}</span>
                                                        {b.is_group_booking && (
                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500 border border-orange-500/20 flex items-center gap-1">
                                                                    <Users className="w-3 h-3" />
                                                                    Gruppe ({b.bike_count || "?"} Räder)
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm">{fmtDate(b.start_date)} → {fmtDate(b.end_date)}</td>
                                            <td className="px-4 py-3 font-medium">{fmtCurrency(b.total_price)}</td>
                                            <td className="px-4 py-3">
                                                {b.deposit_amount ? (
                                                    <div className="text-sm">
                                                        <span className="font-medium">{fmtCurrency(b.deposit_amount)}</span>
                                                        <span className={`ml-1 text-xs ${b.deposit_status === 'held' ? 'text-orange-500' : b.deposit_status === 'refunded' ? 'text-emerald-500' : b.deposit_status === 'deducted' ? 'text-red-500' : 'text-slate-400'}`}>
                                                            {b.deposit_status === 'held' ? '● Hinterlegt' : b.deposit_status === 'refunded' ? '↩ Erstattet' : b.deposit_status === 'deducted' ? '✕ Einbehalten' : ''}
                                                        </span>
                                                    </div>
                                                ) : <span className="text-slate-400 text-sm">—</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`text-xs px-2 py-1 rounded-full border self-start ${STATUS[b.status]?.color}`}>
                                                        {STATUS[b.status]?.label}
                                                    </span>
                                                    {lateFee.isLate && (
                                                        <span className="text-xs px-2 py-1 rounded-full border border-red-400 bg-red-500/10 text-red-600 dark:text-red-400 self-start whitespace-nowrap">
                                                            {lateFee.fee > 0
                                                                ? `+${fmtCurrency(lateFee.fee)} · ${lateFee.daysLate}T`
                                                                : `${lateFee.daysLate}T überfällig`}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    {/* Übergabe: confirmed/reserved → picked_up */}
                                                    {["reserved", "confirmed"].includes(b.status) && (
                                                        <button
                                                            onClick={() => handlePickup(b)}
                                                            className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                                                            title="Übergabe"
                                                        >
                                                            <ArrowUpRight className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {/* Rückgabe: picked_up → returned */}
                                                    {b.status === "picked_up" && (
                                                        <button
                                                            onClick={() => handleReturn(b)}
                                                            className="p-2 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors"
                                                            title="Rückgabe"
                                                        >
                                                            <ArrowDownLeft className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => { setEditBooking(b); setShowModal(true); }}
                                                        className={`p-2 rounded-lg ${darkMode ? "hover:bg-slate-700" : "hover:bg-slate-200"}`}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleInvoice(b)}
                                                        className={`p-2 rounded-lg ${darkMode ? "hover:bg-slate-700" : "hover:bg-slate-200"} text-slate-400 hover:text-green-500`}
                                                        title="Rechnung erstellen"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </button>
                                                </div>
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
                    pricingRules={pricingRules?.rules || []}
                    onSave={handleSave}
                    onDelete={async (id) => {
                        const { error } = await bookings.remove(id);
                        if (error) {
                            addToast("Fehler beim Stornieren: " + error.message, "error");
                        } else {
                            setShowModal(false);
                        }
                    }}
                    onClose={() => setShowModal(false)}
                    darkMode={darkMode}
                />
            )}
            {handoverBooking && (
                <HandoverModal
                    booking={handoverBooking}
                    type={handoverType}
                    onConfirm={confirmHandover}
                    onClose={() => setHandoverBooking(null)}
                    darkMode={darkMode}
                />
            )}
        </div>
    );
}
