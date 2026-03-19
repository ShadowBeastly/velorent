"use client";
import { useState } from "react";
import { X, Loader2, Calendar, User, Bike } from "lucide-react";
import { fmtISO, addDays, daysDiff } from "../../utils/formatters";

export default function QuickBookingModal({ initialDate, initialBikeId, bikes, onSave, onClose, darkMode }) {
    const startDateStr = initialDate ? fmtISO(initialDate) : fmtISO(new Date());
    const [bikeId, setBikeId] = useState(initialBikeId || (bikes?.[0]?.id ?? ""));
    const [startDate, setStartDate] = useState(startDateStr);
    const [endDate, setEndDate] = useState(fmtISO(addDays(startDateStr, 1)));
    const [customerName, setCustomerName] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const selectedBike = bikes?.find(b => b.id === bikeId);
    const totalDays = startDate && endDate ? daysDiff(startDate, endDate) : 1;
    const totalPrice = selectedBike ? (selectedBike.price_per_day || 0) * totalDays : 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!bikeId || !startDate || !endDate || !customerName.trim()) {
            setError("Bitte alle Pflichtfelder ausfüllen.");
            return;
        }
        setError(null);
        setSaving(true);
        try {
            const [first, ...rest] = customerName.trim().split(/\s+/);
            await onSave({
                bike_id: bikeId,
                start_date: startDate,
                end_date: endDate,
                customer_name: customerName,
                customer_email: customerEmail || null,
                customer_phone: customerPhone || null,
                total_days: totalDays,
                total_price: totalPrice,
                status: "reserved",
                payment_status: "unpaid",
                // pass split name for customer creation in parent
                _first_name: first,
                _last_name: rest.join(" ") || "Gast",
            });
            onClose();
        } catch (err) {
            setError(err.message || "Fehler beim Speichern.");
        } finally {
            setSaving(false);
        }
    };

    const inputClass = `w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
        darkMode
            ? "bg-slate-800 border-slate-600 text-white placeholder-slate-400 focus:border-[#1A7D5A]"
            : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#1A7D5A] focus:bg-white"
    }`;

    const labelClass = `block text-xs font-semibold uppercase tracking-wider mb-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${darkMode ? "bg-slate-900 border border-slate-700" : "bg-white border border-slate-200"}`}>
                {/* Header */}
                <div className="bg-[#1A7D5A] px-6 py-5 flex items-center justify-between">
                    <div>
                        <p className="text-[#A7D5C4] text-xs font-semibold uppercase tracking-wider">Schnellbuchung</p>
                        <h2 className="text-white text-xl font-bold mt-0.5">Neue Buchung</h2>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Bike */}
                    <div>
                        <label className={labelClass}>
                            <span className="flex items-center gap-1.5"><Bike className="w-3.5 h-3.5" />Fahrrad *</span>
                        </label>
                        <select
                            value={bikeId}
                            onChange={e => setBikeId(e.target.value)}
                            className={inputClass}
                            required
                        >
                            <option value="">Fahrrad wählen...</option>
                            {bikes?.map(b => (
                                <option key={b.id} value={b.id}>
                                    {b.name} {b.category ? `(${b.category})` : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>
                                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Von *</span>
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => {
                                    setStartDate(e.target.value);
                                    if (e.target.value >= endDate) {
                                        setEndDate(fmtISO(addDays(e.target.value, 1)));
                                    }
                                }}
                                className={inputClass}
                                required
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Bis *</label>
                            <input
                                type="date"
                                value={endDate}
                                min={startDate}
                                onChange={e => setEndDate(e.target.value)}
                                className={inputClass}
                                required
                            />
                        </div>
                    </div>

                    {/* Duration info */}
                    {startDate && endDate && selectedBike && (
                        <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
                            <span className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                                {totalDays} {totalDays === 1 ? "Tag" : "Tage"} × {selectedBike.price_per_day ?? 0} €
                            </span>
                            <span className="text-[#1A7D5A] dark:text-[#3BAA82] font-bold">
                                {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(totalPrice)}
                            </span>
                        </div>
                    )}

                    {/* Customer */}
                    <div>
                        <label className={labelClass}>
                            <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />Name Kunde *</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Max Mustermann"
                            value={customerName}
                            onChange={e => setCustomerName(e.target.value)}
                            className={inputClass}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>E-Mail</label>
                            <input
                                type="email"
                                placeholder="max@example.com"
                                value={customerEmail}
                                onChange={e => setCustomerEmail(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Telefon</label>
                            <input
                                type="tel"
                                placeholder="+49 ..."
                                value={customerPhone}
                                onChange={e => setCustomerPhone(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm font-medium">{error}</p>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${darkMode ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                        >
                            Abbrechen
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A7D5A] hover:bg-[#156849] text-white text-sm font-semibold transition-colors disabled:opacity-60"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {saving ? "Speichern..." : "Buchung erstellen"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
