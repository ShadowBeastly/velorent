"use client";
import { useState, useMemo } from "react";
import { Plus, Loader2, Edit, FileText, ArrowUpRight, ArrowDownLeft, Download, Users, ChevronRight, Calendar } from "lucide-react";
import BookingModal from "../components/bookings/BookingModal";
import HandoverModal from "../components/dashboard/HandoverModal";
import { STATUS } from "../utils/constants";
import { fmtCurrency, fmtDate } from "../utils/formatters";
import { calculateLateFee } from "../utils/calculateLateFee";
import { generateInvoice } from "../utils/InvoiceGenerator";
import { useApp } from "../context/AppContext";
import { useData } from "../context/DataContext";
import { useOrganization } from "../context/OrgContext";
import { useToast } from "../components/ui/Toast";
import { exportToCSV } from "../utils/exportCSV";

const PAGE_SIZE = 20;

const PAYMENT_STATUSES = [
    { value: "all", label: "Alle" },
    { value: "paid", label: "Bezahlt" },
    { value: "open", label: "Offen" },
    { value: "refunded", label: "Rückerstattet" },
];

const SOURCES = [
    { value: "all", label: "Alle" },
    { value: "website", label: "Website" },
    { value: "walk_in", label: "Vor Ort" },
    { value: "phone", label: "Telefonisch" },
    { value: "hotel_qr", label: "Hotel QR" },
];

export default function BookingsPage() {
    const { darkMode, searchQuery } = useApp();
    const { bikes, bookings, customers, invoices, pricingRules, addOns, bikeCategories, coupons } = useData();
    const org = useOrganization();
    const currentOrg = org.currentOrg;
    const { addToast } = useToast();
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [paymentFilter, setPaymentFilter] = useState("all");
    const [sourceFilter, setSourceFilter] = useState("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editBooking, setEditBooking] = useState(null);
    const [handoverBooking, setHandoverBooking] = useState(null);
    const [handoverType, setHandoverType] = useState(null);

    // Build category list from bikeCategories or fallback from bikes
    const categories = useMemo(() => {
        if (bikeCategories?.categories?.length > 0) {
            return bikeCategories.categories.map(c => c.name);
        }
        return [...new Set(bikes.bikes.map(b => b.category).filter(Boolean))];
    }, [bikeCategories.categories, bikes.bikes]);

    const filtered = useMemo(() => {
        return bookings.bookings.filter(b => {
            if (statusFilter !== "all" && b.status !== statusFilter) return false;
            if (searchQuery && !(b.customer_name || "").toLowerCase().includes(searchQuery.toLowerCase())) return false;

            // Category filter. match on bike's category
            if (categoryFilter !== "all") {
                const bike = bikes.bikes.find(bk => bk.id === b.bike_id);
                if (!bike || bike.category !== categoryFilter) return false;
            }

            // Payment filter
            if (paymentFilter !== "all") {
                if (paymentFilter === "paid" && b.deposit_status !== "held" && b.deposit_status !== "refunded") return false;
                if (paymentFilter === "open" && b.deposit_status === "held") return false;
                if (paymentFilter === "refunded" && b.deposit_status !== "refunded") return false;
            }

            // Source filter
            if (sourceFilter !== "all" && b.booking_source !== sourceFilter) return false;

            // Date range filter
            if (dateFrom && b.start_date < dateFrom) return false;
            if (dateTo && b.end_date > dateTo) return false;

            return true;
        });
    }, [bookings.bookings, statusFilter, searchQuery, categoryFilter, paymentFilter, sourceFilter, dateFrom, dateTo, bikes.bikes]);

    // Reset page when filters change
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const hasActiveFilters = categoryFilter !== "all" || paymentFilter !== "all" || sourceFilter !== "all" || dateFrom || dateTo;

    const handleSave = async (data) => {
        const { _couponId, _couponDiscountAmount, ...rest } = data;
        let bookingData = { ...rest };

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
            const { error } = await bookings.update(editBooking.id, bookingData, addOns.addOns);
            if (error) {
                addToast("Fehler beim Aktualisieren: " + error.message, "error");
                return;
            }
        } else {
            const { data: newBooking, error } = await bookings.create(bookingData, addOns.addOns);
            if (error) {
                addToast("Fehler beim Erstellen: " + error.message, "error");
                return;
            }
            if (newBooking?.id && _couponId && _couponDiscountAmount) {
                await coupons.recordUsage(_couponId, newBooking.id, _couponDiscountAmount);
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

    const confirmHandover = async (protocol) => {
        const notesText = [
            protocol.notes,
            protocol.damages?.length ? `Schäden: ${protocol.damages.join(", ")}` : null,
            `Akku: ${protocol.batteryLevel}%`,
        ].filter(Boolean).join("\n");

        let updates;
        if (handoverType === "pickup") {
            updates = {
                status: "picked_up",
                pickup_notes: notesText,
                pickup_protocol: protocol,
                deposit_amount: handoverBooking.deposit_amount,
                deposit_status: "held"
            };
        } else {
            updates = {
                status: "returned",
                return_notes: notesText,
                return_protocol: protocol,
                deposit_status: protocol.damages?.length ? "held" : "refunded"
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
        const taxRate = currentOrg?.tax_rate ?? 19;
        const net = total / (1 + (taxRate / 100));
        const tax = total - net;

        // 2. Prepare Data
        const invoiceNumber = `RE-${(booking.booking_number || '000').replace(/^[A-Z]+-/, '')}`;
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
                const { error } = await invoices.create(invoiceData);
                if (error) {
                    console.error("DB Error:", error);
                    // Continue to offer PDF even if DB Save fails (fallback)
                }
            }

            // 4. Generate PDF
            const pdfData = {
                ...invoiceData,
                created_at: new Date().toISOString(),
                customer: {
                    first_name: (booking.customer_name || "").split(" ")[0] || "",
                    last_name: (booking.customer_name || "").split(" ").slice(1).join(" ") || "",
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

    // Helper: get initials from customer name
    const getInitials = (name) => {
        if (!name) return "?";
        const parts = name.trim().split(" ");
        return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0][0]?.toUpperCase() || "?";
    };

    return (
        <div className="space-y-6">
            {/* Header: Title + Status Pills + Actions */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Buchungen</h2>
                    <div className="flex items-center gap-3">
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
                            <span className="hidden sm:inline">Exportieren</span>
                        </button>
                        <button
                            onClick={() => { setEditBooking(null); setShowModal(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1A7D5A] to-[#3BAA82] text-white rounded-lg font-medium shadow-lg shadow-[#1A7D5A]/25"
                        >
                            <Plus className="w-4 h-4" />
                            Neue Buchung
                        </button>
                    </div>
                </div>

                {/* Status Pills + Date Range */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex gap-2 overflow-x-auto py-1">
                        {["all", ...Object.keys(STATUS)].map(s => (
                            <button
                                key={s}
                                onClick={() => { setStatusFilter(s); setPage(1); }}
                                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${statusFilter === s
                                    ? "bg-[#1A7D5A] text-white shadow-sm"
                                    : darkMode
                                        ? "bg-slate-800 border border-slate-700 text-slate-400 hover:border-[#3BAA82]"
                                        : "bg-white border border-slate-200 text-slate-600 hover:border-[#1A7D5A]"
                                    }`}
                            >
                                {s === "all" ? "Alle" : STATUS[s]?.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                                className={`pl-9 pr-3 py-2 rounded-lg text-sm border outline-none focus:ring-1 focus:ring-[#1A7D5A] ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-700"}`}
                                placeholder="Von"
                            />
                        </div>
                        <span className="text-slate-400 text-sm"></span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => { setDateTo(e.target.value); setPage(1); }}
                            className={`px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1 focus:ring-[#1A7D5A] ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-700"}`}
                            placeholder="Bis"
                        />
                    </div>
                </div>
            </div>

            {/* Advanced Filters Section */}
            <div className={`rounded-xl border shadow-sm overflow-hidden transition-all ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`w-full flex items-center justify-between px-5 py-3 text-sm font-semibold transition-colors ${darkMode ? "text-slate-300 hover:bg-slate-800/50" : "text-slate-600 hover:bg-slate-50"}`}
                >
                    <span className="flex items-center gap-2">
                        Filter {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-[#1A7D5A]" />}
                    </span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${showFilters ? "rotate-90" : ""}`} />
                </button>

                {showFilters && (
                    <div className={`px-5 pb-5 space-y-5 border-t ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                        {/* Fahrrad-Kategorie */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-5">
                            <span className={`text-xs font-bold uppercase tracking-wider w-32 shrink-0 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                Fahrrad-Kategorie
                            </span>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => { setCategoryFilter("all"); setPage(1); }}
                                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${categoryFilter === "all"
                                        ? "bg-[#1A7D5A] text-white shadow-sm"
                                        : darkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        }`}
                                >
                                    Alle
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => { setCategoryFilter(cat); setPage(1); }}
                                        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${categoryFilter === cat
                                            ? "bg-[#1A7D5A] text-white shadow-sm"
                                            : darkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={`h-px ${darkMode ? "bg-slate-800" : "bg-slate-100"}`} />

                        {/* Zahlungsstatus */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <span className={`text-xs font-bold uppercase tracking-wider w-32 shrink-0 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                Zahlungsstatus
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {PAYMENT_STATUSES.map(ps => (
                                    <button
                                        key={ps.value}
                                        onClick={() => { setPaymentFilter(ps.value); setPage(1); }}
                                        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${paymentFilter === ps.value
                                            ? "bg-[#1A7D5A] text-white shadow-sm"
                                            : darkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                    >
                                        {ps.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={`h-px ${darkMode ? "bg-slate-800" : "bg-slate-100"}`} />

                        {/* Quelle */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <span className={`text-xs font-bold uppercase tracking-wider w-32 shrink-0 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                Quelle
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {SOURCES.map(src => (
                                    <button
                                        key={src.value}
                                        onClick={() => { setSourceFilter(src.value); setPage(1); }}
                                        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${sourceFilter === src.value
                                            ? "bg-[#1A7D5A] text-white shadow-sm"
                                            : darkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                    >
                                        {src.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Reset filters */}
                        {hasActiveFilters && (
                            <button
                                onClick={() => { setCategoryFilter("all"); setPaymentFilter("all"); setSourceFilter("all"); setDateFrom(""); setDateTo(""); setPage(1); }}
                                className="text-xs font-semibold text-[#1A7D5A] hover:text-[#3BAA82] transition-colors"
                            >
                                Filter zurücksetzen
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Data Table */}
            <div className={`rounded-xl border shadow-sm overflow-hidden ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                {bookings.loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-[#1A7D5A]" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`border-b ${darkMode ? "bg-slate-800/50 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                                    <th className={`px-6 py-4 text-[11px] font-bold uppercase tracking-wider ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Buchungs-Nr.</th>
                                    <th className={`px-6 py-4 text-[11px] font-bold uppercase tracking-wider ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Kunde</th>
                                    <th className={`px-6 py-4 text-[11px] font-bold uppercase tracking-wider hidden sm:table-cell ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Fahrrad</th>
                                    <th className={`px-6 py-4 text-[11px] font-bold uppercase tracking-wider hidden lg:table-cell ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Zeitraum</th>
                                    <th className={`px-6 py-4 text-[11px] font-bold uppercase tracking-wider ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Preis</th>
                                    <th className={`px-6 py-4 text-[11px] font-bold uppercase tracking-wider ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Status</th>
                                    <th className={`px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-right ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Aktionen</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${darkMode ? "divide-slate-800" : "divide-slate-100"}`}>
                                {paginated.map(b => {
                                    const lateFee = calculateLateFee(b, currentOrg);
                                    return (
                                        <tr key={b.id} className={`transition-colors ${darkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50"} ${lateFee.isLate ? darkMode ? "bg-red-500/5" : "bg-red-50/60" : ""}`}>
                                            {/* Buchungs-Nr */}
                                            <td className="px-6 py-4">
                                                <span className="font-semibold text-[#1A7D5A] text-sm">{b.booking_number}</span>
                                            </td>
                                            {/* Kunde. Avatar + Name + Email/Phone */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-[#D4EDE2] dark:bg-[#1A7D5A]/20 flex items-center justify-center text-[#1A7D5A] text-xs font-bold shrink-0">
                                                        {getInitials(b.customer_name)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-bold truncate">{b.customer_name}</div>
                                                        <div className={`text-[10px] truncate ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                                            {b.customer_email || b.customer_phone || ""}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Fahrrad */}
                                            <td className="px-6 py-4 hidden sm:table-cell">
                                                <div className="text-sm font-medium">{b.bike?.name || ""}</div>
                                                {b.is_group_booking && (
                                                    <span className="text-xs px-1.5 py-0.5 rounded bg-[#1A7D5A]/10 text-[#1A7D5A] mt-0.5 inline-flex items-center gap-1">
                                                        <Users className="w-3 h-3" /> {b.bike_count || "?"}x
                                                    </span>
                                                )}
                                            </td>
                                            {/* Zeitraum */}
                                            <td className="px-6 py-4 hidden lg:table-cell">
                                                <div className="text-sm font-medium">{fmtDate(b.start_date)}</div>
                                                <div className={`text-[10px] ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                                    {b.total_days || "?"} {(b.total_days || 0) === 1 ? "Tag" : "Tage"}
                                                </div>
                                            </td>
                                            {/* Preis */}
                                            <td className="px-6 py-4 text-sm font-bold">{fmtCurrency(b.total_price)}</td>
                                            {/* Status */}
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide self-start ${
                                                        b.status === "confirmed" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                                        : b.status === "reserved" ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                                                        : b.status === "picked_up" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                                        : b.status === "returned" ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                                        : b.status === "cancelled" ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                                        : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                                                    }`}>
                                                        {STATUS[b.status]?.label}
                                                    </span>
                                                    {lateFee.isLate && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold self-start whitespace-nowrap">
                                                            {lateFee.fee > 0
                                                                ? `+${fmtCurrency(lateFee.fee)} · ${lateFee.daysLate}T`
                                                                : `${lateFee.daysLate}T überfällig`}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            {/* Aktionen */}
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-1">
                                                    {["reserved", "confirmed"].includes(b.status) && (
                                                        <button onClick={() => handlePickup(b)} className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors" title="Übergabe">
                                                            <ArrowUpRight className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {b.status === "picked_up" && (
                                                        <button onClick={() => handleReturn(b)} className="p-1.5 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Rückgabe">
                                                            <ArrowDownLeft className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => { setEditBooking(b); setShowModal(true); }}
                                                        className={`p-1.5 rounded transition-colors ${darkMode ? "text-slate-400 hover:text-[#3BAA82] hover:bg-slate-800" : "text-slate-400 hover:text-[#1A7D5A] hover:bg-slate-100"}`}
                                                        title="Bearbeiten"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleInvoice(b)}
                                                        className={`p-1.5 rounded transition-colors ${darkMode ? "text-slate-400 hover:text-[#3BAA82] hover:bg-slate-800" : "text-slate-400 hover:text-[#1A7D5A] hover:bg-slate-100"}`}
                                                        title="Rechnung"
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

                {/* Pagination */}
                {!bookings.loading && filtered.length > 0 && (
                    <div className={`px-6 py-4 border-t flex items-center justify-between ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                        <p className={`text-xs font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            Anzeige von {((currentPage - 1) * PAGE_SIZE) + 1}-{Math.min(currentPage * PAGE_SIZE, filtered.length)} von {filtered.length} Buchungen
                        </p>
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-40 ${darkMode ? "border border-slate-700 hover:bg-slate-800" : "border border-slate-200 hover:bg-slate-50"}`}
                            >
                                Zurück
                            </button>
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPage(pageNum)}
                                        className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${currentPage === pageNum
                                            ? "bg-[#1A7D5A] text-white shadow-sm"
                                            : darkMode ? "border border-slate-700 hover:bg-slate-800" : "border border-slate-200 hover:bg-slate-50"
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-40 ${darkMode ? "border border-slate-700 hover:bg-slate-800" : "border border-slate-200 hover:bg-slate-50"}`}
                            >
                                Weiter
                            </button>
                        </div>
                    </div>
                )}

                {!bookings.loading && filtered.length === 0 && (
                    <div className={`text-center py-16 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">Keine Buchungen gefunden</p>
                        {statusFilter === "all" && !hasActiveFilters && (
                            <button
                                onClick={() => { setEditBooking(null); setShowModal(true); }}
                                className="mt-4 px-4 py-2 bg-gradient-to-r from-[#1A7D5A] to-[#3BAA82] text-white rounded-lg text-sm font-medium shadow-lg shadow-[#1A7D5A]/25"
                            >
                                Erste Buchung erstellen
                            </button>
                        )}
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
                    addOns={addOns.addOns}
                    validateCoupon={coupons?.validateCoupon}
                    onSave={handleSave}
                    onDelete={async (id, cancellationStatus) => {
                        const { error } = await bookings.remove(id, cancellationStatus);
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
                    onClose={() => { setHandoverBooking(null); setHandoverType(null); }}
                    darkMode={darkMode}
                />
            )}
        </div>
    );
}
