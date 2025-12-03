import React, { useState, useEffect, useMemo } from "react";
import { X, Trash2, Loader2, Calendar, User, CreditCard, CheckCircle, ChevronRight, ChevronLeft, Search, Plus, FileText } from "lucide-react";
import { fmtISO, addDays, daysDiff, parseDate } from "../../utils/dateUtils";
import { fmtCurrency } from "../../utils/formatUtils";
import { STATUS } from "../../utils/constants";
import ContractModal from "./ContractModal";

const STEPS = [
    { id: 1, label: "Zeitraum & Rad", icon: Calendar },
    { id: 2, label: "Kunde", icon: User },
    { id: 3, label: "Details", icon: CreditCard },
    { id: 4, label: "Abschluss", icon: CheckCircle }
];

export default function BookingModal({ booking, initialDate, initialBikeId, bikes, customers, existingBookings, onSave, onDelete, onClose, darkMode }) {
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [customerSearch, setCustomerSearch] = useState("");
    const [isNewCustomer, setIsNewCustomer] = useState(false);
    const [showContract, setShowContract] = useState(false);

    const [form, setForm] = useState(() => {
        if (booking) return {
            bike_id: booking.bike_id,
            customer_id: booking.customer_id,
            customer_name: booking.customer_name,
            customer_phone: booking.customer_phone || "",
            customer_email: booking.customer_email || "",
            start_date: booking.start_date,
            end_date: booking.end_date,
            total_price: booking.total_price || 0,
            deposit_amount: booking.deposit_amount || 50,
            status: booking.status,
            notes: booking.notes || "",
            pickup_location: booking.pickup_location || "Laden",
            return_location: booking.return_location || "Laden"
        };
        return {
            bike_id: initialBikeId || bikes[0]?.id || "",
            customer_id: "",
            customer_name: "",
            customer_phone: "",
            customer_email: "",
            start_date: initialDate ? fmtISO(initialDate) : fmtISO(new Date()),
            end_date: initialDate ? fmtISO(addDays(initialDate, 2)) : fmtISO(addDays(new Date(), 2)),
            total_price: 0,
            deposit_amount: 50,
            status: "reserved",
            notes: "",
            pickup_location: "Laden",
            return_location: "Laden"
        };
    });

    // Derived State
    const selectedBike = bikes.find(b => b.id === form.bike_id);
    const days = form.start_date && form.end_date ? Math.max(1, daysDiff(form.start_date, form.end_date) + 1) : 1;

    // Auto-calc price if not manually edited (simple logic for now)


    // Filtered Customers
    const filteredCustomers = useMemo(() => {
        return customers.filter(c =>
            `${c.first_name} ${c.last_name}`.toLowerCase().includes(customerSearch.toLowerCase()) ||
            c.email?.toLowerCase().includes(customerSearch.toLowerCase())
        );
    }, [customers, customerSearch]);

    // Availability Check
    const isBikeAvailable = useMemo(() => {
        if (!form.bike_id || !form.start_date || !form.end_date) return true;
        return !existingBookings.some(b =>
            b.id !== booking?.id &&
            b.bike_id === form.bike_id &&
            b.status !== "cancelled" &&
            new Date(b.start_date) <= new Date(form.end_date) &&
            new Date(b.end_date) >= new Date(form.start_date)
        );
    }, [form.bike_id, form.start_date, form.end_date, existingBookings, booking]);

    const handleNext = () => {
        if (step === 1) {
            if (!isBikeAvailable) return alert("Das Rad ist in diesem Zeitraum nicht verfügbar.");
            if (!form.bike_id) return alert("Bitte ein Rad wählen.");
        }
        if (step === 2) {
            if (!form.customer_name) return alert("Bitte einen Kundennamen angeben.");
        }
        setStep(s => s + 1);
    };

    const handleBack = () => setStep(s => s - 1);

    const handleSave = async () => {
        setSaving(true);
        await onSave(form);
        setSaving(false);
    };

    const handleCustomerSelect = (c) => {
        setForm(f => ({
            ...f,
            customer_id: c.id,
            customer_name: `${c.first_name} ${c.last_name}`,
            customer_phone: c.phone || "",
            customer_email: c.email || ""
        }));
        setIsNewCustomer(false);
    };

    const modalBg = darkMode ? "bg-slate-900" : "bg-white";
    const inputStyle = `w-full px-3 py-2 rounded-lg border outline-none transition-colors ${darkMode ? "bg-slate-800 border-slate-700 focus:border-orange-500 text-white" : "bg-white border-slate-300 focus:border-orange-500"}`;
    const labelStyle = `block text-sm font-medium mb-1.5 ${darkMode ? "text-slate-300" : "text-slate-700"}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className={`w-full max-w-2xl flex flex-col max-h-[90vh] rounded-2xl ${modalBg} shadow-2xl overflow-hidden`}>

                {/* Header */}
                <div className={`flex items-center justify-between p-4 border-b ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-lg">
                            <Calendar className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">{booking ? "Buchung bearbeiten" : "Neue Buchung"}</h3>
                            <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                Schritt {step} von 4
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {booking && (
                            <button
                                onClick={() => setShowContract(true)}
                                className={`p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-600"}`}
                                title="Mietvertrag drucken"
                            >
                                <FileText className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={onClose} className={`p-2 rounded-lg ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}>
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Progress Steps */}
                <div className={`flex items-center justify-between px-8 py-4 border-b ${darkMode ? "border-slate-800 bg-slate-800/30" : "border-slate-100 bg-slate-50"}`}>
                    {STEPS.map((s, i) => {
                        const isActive = step === s.id;
                        const isDone = step > s.id;
                        return (
                            <div key={s.id} className="flex flex-col items-center gap-2 relative z-10">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${isActive ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30" :
                                    isDone ? "bg-emerald-500 text-white" :
                                        darkMode ? "bg-slate-800 text-slate-500" : "bg-slate-200 text-slate-500"
                                    }`}>
                                    {isDone ? <CheckCircle className="w-5 h-5" /> : s.icon ? <s.icon className="w-4 h-4" /> : s.id}
                                </div>
                                <span className={`text-xs font-medium ${isActive ? "text-orange-500" : darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                    {s.label}
                                </span>
                            </div>
                        );
                    })}
                    {/* Progress Bar Background (simplified) */}
                    <div className={`absolute left-0 right-0 top-[4.5rem] h-0.5 -z-0 mx-12 ${darkMode ? "bg-slate-800" : "bg-slate-200"}`} />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* STEP 1: DATE & BIKE */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelStyle}>Startdatum</label>
                                    <input type="date" value={form.start_date} onChange={(e) => {
                                        const newStart = e.target.value;
                                        setForm(f => {
                                            const d = newStart && f.end_date ? Math.max(1, daysDiff(newStart, f.end_date) + 1) : 1;
                                            const bike = bikes.find(b => b.id === f.bike_id);
                                            return { ...f, start_date: newStart, total_price: bike ? bike.price_per_day * d : 0 };
                                        });
                                    }} className={inputStyle} />
                                </div>
                                <div>
                                    <label className={labelStyle}>Enddatum</label>
                                    <input type="date" value={form.end_date} onChange={(e) => {
                                        const newEnd = e.target.value;
                                        setForm(f => {
                                            const d = f.start_date && newEnd ? Math.max(1, daysDiff(f.start_date, newEnd) + 1) : 1;
                                            const bike = bikes.find(b => b.id === f.bike_id);
                                            return { ...f, end_date: newEnd, total_price: bike ? bike.price_per_day * d : 0 };
                                        });
                                    }} className={inputStyle} />
                                </div>
                            </div>

                            <div>
                                <label className={labelStyle}>Fahrrad wählen</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                                    {bikes.map(bike => {
                                        const isSelected = form.bike_id === bike.id;
                                        return (
                                            <div
                                                key={bike.id}
                                                onClick={() => setForm(f => {
                                                    const d = f.start_date && f.end_date ? Math.max(1, daysDiff(f.start_date, f.end_date) + 1) : 1;
                                                    return { ...f, bike_id: bike.id, total_price: bike.price_per_day * d };
                                                })}
                                                className={`p-3 rounded-xl border cursor-pointer transition-all ${isSelected
                                                    ? "border-orange-500 bg-orange-500/10 ring-1 ring-orange-500"
                                                    : darkMode ? "border-slate-700 hover:border-slate-600 bg-slate-800" : "border-slate-200 hover:border-slate-300 bg-white"
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="font-medium text-sm">{bike.name}</div>
                                                        <div className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{bike.category} • {bike.size}</div>
                                                    </div>
                                                    <div className="font-semibold text-sm text-orange-500">{fmtCurrency(bike.price_per_day)}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {!isBikeAvailable && (
                                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm flex items-center gap-2">
                                    <X className="w-4 h-4" />
                                    Achtung: Das gewählte Rad ist in diesem Zeitraum bereits gebucht!
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: CUSTOMER */}
                    {step === 2 && (
                        <div className="space-y-6">
                            {!isNewCustomer ? (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Kunden suchen..."
                                            value={customerSearch}
                                            onChange={(e) => setCustomerSearch(e.target.value)}
                                            className={`${inputStyle} pl-9`}
                                            autoFocus
                                        />
                                    </div>

                                    <div className={`border rounded-xl overflow-hidden max-h-60 overflow-y-auto ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                                        {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                                            <div
                                                key={c.id}
                                                onClick={() => handleCustomerSelect(c)}
                                                className={`p-3 border-b last:border-b-0 cursor-pointer flex items-center justify-between ${form.customer_id === c.id
                                                    ? "bg-orange-500/10"
                                                    : darkMode ? "hover:bg-slate-800" : "hover:bg-slate-50"
                                                    } ${darkMode ? "border-slate-700" : "border-slate-200"}`}
                                            >
                                                <div>
                                                    <div className="font-medium text-sm">{c.first_name} {c.last_name}</div>
                                                    <div className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{c.email}</div>
                                                </div>
                                                {form.customer_id === c.id && <CheckCircle className="w-4 h-4 text-orange-500" />}
                                            </div>
                                        )) : (
                                            <div className="p-4 text-center text-sm text-slate-500">Keine Kunden gefunden</div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => { setIsNewCustomer(true); setForm(f => ({ ...f, customer_id: "", customer_name: "", customer_email: "", customer_phone: "" })); }}
                                        className="w-full py-2 border border-dashed rounded-lg text-sm font-medium text-slate-500 hover:text-orange-500 hover:border-orange-500 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Neuen Kunden anlegen
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-medium">Neuer Kunde</h4>
                                        <button onClick={() => setIsNewCustomer(false)} className="text-xs text-orange-500 hover:underline">Zurück zur Suche</button>
                                    </div>
                                    <div>
                                        <label className={labelStyle}>Name *</label>
                                        <input type="text" value={form.customer_name} onChange={(e) => setForm(f => ({ ...f, customer_name: e.target.value }))} className={inputStyle} placeholder="Max Mustermann" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelStyle}>E-Mail</label>
                                            <input type="email" value={form.customer_email} onChange={(e) => setForm(f => ({ ...f, customer_email: e.target.value }))} className={inputStyle} />
                                        </div>
                                        <div>
                                            <label className={labelStyle}>Telefon</label>
                                            <input type="tel" value={form.customer_phone} onChange={(e) => setForm(f => ({ ...f, customer_phone: e.target.value }))} className={inputStyle} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3: DETAILS */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelStyle}>Gesamtpreis (€)</label>
                                    <input type="number" value={form.total_price} onChange={(e) => setForm(f => ({ ...f, total_price: Number(e.target.value) }))} className={inputStyle} />
                                </div>
                                <div>
                                    <label className={labelStyle}>Kaution (€)</label>
                                    <input type="number" value={form.deposit_amount} onChange={(e) => setForm(f => ({ ...f, deposit_amount: Number(e.target.value) }))} className={inputStyle} />
                                </div>
                            </div>

                            <div>
                                <label className={labelStyle}>Status</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(STATUS).map(([key, { label, color }]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, status: key }))}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${form.status === key
                                                ? `${color} ring-2 ring-orange-500 ring-offset-2 ${darkMode ? "ring-offset-slate-900" : "ring-offset-white"}`
                                                : darkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-100 border-slate-200"
                                                }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className={labelStyle}>Notizen</label>
                                <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className={inputStyle} placeholder="Zubehör, Besonderheiten..." />
                            </div>
                        </div>
                    )}

                    {/* STEP 4: SUMMARY */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <div className={`p-4 rounded-xl border ${darkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                                <h4 className="font-medium mb-4 flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                                    Zusammenfassung
                                </h4>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Kunde</span>
                                        <span className="font-medium">{form.customer_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Fahrrad</span>
                                        <span className="font-medium">{selectedBike?.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Zeitraum</span>
                                        <span className="font-medium">{new Date(form.start_date).toLocaleDateString()} - {new Date(form.end_date).toLocaleDateString()} ({days} Tage)</span>
                                    </div>
                                    <div className="border-t my-2 pt-2 flex justify-between text-base">
                                        <span className="font-medium">Gesamtbetrag</span>
                                        <span className="font-bold text-orange-500">{fmtCurrency(form.total_price)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`p-4 border-t flex justify-between items-center ${darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
                    <div>
                        {step === 1 && booking && (
                            <button onClick={() => { if (confirm("Wirklich löschen?")) onDelete(booking.id); }} className="text-rose-500 hover:text-rose-600 text-sm font-medium flex items-center gap-2">
                                <Trash2 className="w-4 h-4" /> Löschen
                            </button>
                        )}
                        {step > 1 && (
                            <button onClick={handleBack} className={`px-4 py-2 rounded-lg text-sm font-medium ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}>
                                Zurück
                            </button>
                        )}
                    </div>

                    <button
                        onClick={step === 4 ? handleSave : handleNext}
                        disabled={saving}
                        className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium shadow-lg shadow-orange-500/25 flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {step === 4 ? "Buchung speichern" : "Weiter"}
                        {step < 4 && <ChevronRight className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {showContract && (
                <ContractModal
                    booking={booking || form}
                    onClose={() => setShowContract(false)}
                    darkMode={darkMode}
                />
            )}
        </div>
    );
}
