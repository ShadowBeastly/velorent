"use client";
import { useState, useMemo, useEffect } from "react";
import { X, Trash2, Loader2, Calendar, User, CreditCard, CheckCircle, ChevronRight, Search, Plus, FileText, Phone, TrendingUp, TrendingDown, Users } from "lucide-react";
import { fmtISO, addDays, daysDiff, fmtCurrency } from "../../utils/formatters";
import { STATUS } from "../../utils/constants";
import ContractModal from "./ContractModal";
import { calculateDynamicPrice } from "../../utils/calculatePrice";

const STEPS = [
    { id: 1, label: "Zeitraum & Rad", icon: Calendar },
    { id: 2, label: "Kunde", icon: User },
    { id: 3, label: "Details", icon: CreditCard },
    { id: 4, label: "Abschluss", icon: CheckCircle }
];

export default function BookingModal({ booking, initialDate, initialBikeId, bikes, customers, existingBookings, pricingRules, addOns, onSave, onDelete, onClose, darkMode }) {
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [stepError, setStepError] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [customerSearch, setCustomerSearch] = useState("");
    const [isNewCustomer, setIsNewCustomer] = useState(false);
    const [showContract, setShowContract] = useState(false);

    const [isGroupBooking, setIsGroupBooking] = useState(Boolean(booking?.is_group_booking));

    const [form, setForm] = useState(() => {
        if (booking) return {
            bike_id: booking.bike_id,
            customer_id: booking.customer_id,
            customer_name: booking.customer_name,
            customer_phone: booking.customer_phone || "",
            customer_email: booking.customer_email || "",
            customer_address: booking.customer_address || "",
            start_date: booking.start_date,
            end_date: booking.end_date,
            total_price: booking.total_price || 0,
            deposit_amount: booking.deposit_amount || 50,
            status: booking.status,
            notes: booking.notes || "",
            pickup_location: booking.pickup_location || "Laden",
            return_location: booking.return_location || "Laden",
            id_number: booking.customer_id_number || booking.id_number || "",
            selectedBikes: [],
            selectedAddOns: booking.booking_addons?.map(ba => ba.addon_id).filter(Boolean) || [],
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
            return_location: "Laden",
            id_number: "",
            customer_address: "",
            selectedBikes: [],
            selectedAddOns: [],
        };
    });

    // Derived State
    const selectedBike = bikes.find(b => b.id === form.bike_id);
    const days = form.start_date && form.end_date ? Math.max(1, daysDiff(form.start_date, form.end_date)) : 1;

    // Dynamic pricing result for the current selection (used in UI hints — single bike only)
    const pricingResult = useMemo(() => {
        if (isGroupBooking || !selectedBike || !form.start_date || !form.end_date) return null;
        return calculateDynamicPrice(selectedBike, form.start_date, form.end_date, pricingRules || []);
    }, [isGroupBooking, selectedBike, form.start_date, form.end_date, pricingRules]);

    // Auto-calc price using dynamic pricing rules (single bike)
    const calcPrice = (bikeId, start, end) => {
        if (!bikeId || !start || !end) return 0;
        const bike = bikes.find(b => b.id === bikeId);
        if (!bike) return 0;
        return calculateDynamicPrice(bike, start, end, pricingRules || []).totalPrice;
    };

    // Calc total price for all selected bikes in group mode
    const calcGroupTotal = (selectedBikesList, start, end) => {
        return selectedBikesList.reduce((sum, bike) => {
            return sum + calculateDynamicPrice(bike, start, end, pricingRules || []).totalPrice;
        }, 0);
    };

    const updateFormWithPrice = (updates) => {
        setForm(prev => {
            const next = { ...prev, ...updates };
            if (isGroupBooking) {
                // In group mode, recalc total across all selected bikes when dates change
                if ((updates.start_date !== undefined || updates.end_date !== undefined) && next.selectedBikes.length > 0) {
                    const total = calcGroupTotal(next.selectedBikes, next.start_date, next.end_date);
                    if (total > 0) next.total_price = total;
                }
            } else {
                // Single-bike mode: auto-calc price if dates or bike changed
                if (updates.bike_id !== undefined || updates.start_date !== undefined || updates.end_date !== undefined) {
                    const price = calcPrice(next.bike_id, next.start_date, next.end_date);
                    if (price > 0) next.total_price = price;
                }
            }
            return next;
        });
    };

    // Toggle a bike in/out of the group selection
    const toggleGroupBike = (bike) => {
        setForm(prev => {
            const alreadySelected = prev.selectedBikes.some(b => b.id === bike.id);
            let nextSelected;
            if (alreadySelected) {
                nextSelected = prev.selectedBikes.filter(b => b.id !== bike.id);
            } else {
                const subtotal = calculateDynamicPrice(bike, prev.start_date, prev.end_date, pricingRules || []).totalPrice;
                nextSelected = [...prev.selectedBikes, { ...bike, subtotal }];
            }
            const firstBike = nextSelected[0] || null;
            const total = calcGroupTotal(nextSelected, prev.start_date, prev.end_date);
            return {
                ...prev,
                selectedBikes: nextSelected,
                bike_id: firstBike?.id || "",
                total_price: total > 0 ? total : prev.total_price,
            };
        });
    };

    // Add-on total
    const addonTotal = useMemo(() => {
        if (!addOns || !form.selectedAddOns.length) return 0;
        return form.selectedAddOns.reduce((sum, addonId) => {
            const addon = addOns.find(a => a.id === addonId);
            if (!addon) return sum;
            return sum + (addon.price_type === 'per_day' ? addon.price * days : addon.price);
        }, 0);
    }, [form.selectedAddOns, addOns, days]);

    const toggleAddOn = (addonId) => {
        setForm(prev => {
            const isSelected = prev.selectedAddOns.includes(addonId);
            const nextSelected = isSelected
                ? prev.selectedAddOns.filter(id => id !== addonId)
                : [...prev.selectedAddOns, addonId];

            const bikePrice = isGroupBooking
                ? calcGroupTotal(prev.selectedBikes, prev.start_date, prev.end_date)
                : calcPrice(prev.bike_id, prev.start_date, prev.end_date);
            const d = Math.max(1, daysDiff(prev.start_date, prev.end_date));
            const newAddonTotal = nextSelected.reduce((sum, id) => {
                const addon = (addOns || []).find(a => a.id === id);
                if (!addon) return sum;
                return sum + (addon.price_type === 'per_day' ? addon.price * d : addon.price);
            }, 0);

            return {
                ...prev,
                selectedAddOns: nextSelected,
                total_price: (bikePrice || prev.total_price) + newAddonTotal,
            };
        });
    };

    // Filtered Customers
    const filteredCustomers = useMemo(() => {
        return customers.filter(c =>
            `${c.first_name} ${c.last_name}`.toLowerCase().includes(customerSearch.toLowerCase()) ||
            c.email?.toLowerCase().includes(customerSearch.toLowerCase())
        );
    }, [customers, customerSearch]);

    // Availability Check (single bike)
    const conflictingBooking = useMemo(() => {
        if (isGroupBooking) return null; // handled separately for group
        if (!form.bike_id || !form.start_date || !form.end_date) return null;
        return existingBookings.find(b =>
            b.id !== booking?.id &&
            b.bike_id === form.bike_id &&
            !["cancelled", "returned", "deleted"].includes(b.status) &&
            new Date(b.start_date) <= new Date(form.end_date) &&
            new Date(b.end_date) >= new Date(form.start_date)
        );
    }, [isGroupBooking, form.bike_id, form.start_date, form.end_date, existingBookings, booking]);

    // Availability check for ALL bikes in a group selection
    const groupConflicts = useMemo(() => {
        if (!isGroupBooking || form.selectedBikes.length === 0 || !form.start_date || !form.end_date) return [];
        return form.selectedBikes.filter(bike =>
            existingBookings.some(b =>
                b.id !== booking?.id &&
                b.bike_id === bike.id &&
                !["cancelled", "returned", "deleted"].includes(b.status) &&
                new Date(b.start_date) <= new Date(form.end_date) &&
                new Date(b.end_date) >= new Date(form.start_date)
            )
        );
    }, [isGroupBooking, form.selectedBikes, form.start_date, form.end_date, existingBookings, booking]);

    const isBikeAvailable = !conflictingBooking;

    const handleNext = () => {
        setStepError(null);
        if (step === 1) {
            if (isGroupBooking) {
                if (form.selectedBikes.length < 1) { setStepError("Bitte mindestens ein Rad für die Gruppenbuchung wählen."); return; }
                if (groupConflicts.length > 0) { setStepError(`Verfügbarkeitskonflikt: ${groupConflicts.map(b => b.name).join(", ")} ist/sind im gewählten Zeitraum bereits vergeben.`); return; }
            } else {
                if (!form.bike_id) { setStepError("Bitte ein Rad wählen."); return; }
                if (!isBikeAvailable) { setStepError(`Rad nicht verfügbar – Konflikt mit Buchung ${conflictingBooking.booking_number} (${new Date(conflictingBooking.start_date).toLocaleDateString()} – ${new Date(conflictingBooking.end_date).toLocaleDateString()}).`); return; }
            }
        }
        if (step === 2) {
            if (!form.customer_name) { setStepError("Bitte einen Kundennamen angeben."); return; }
        }
        setStep(s => s + 1);
    };

    const handleBack = () => setStep(s => s - 1);

    const handleSave = async () => {
        if (!isGroupBooking && conflictingBooking) {
            console.error("Speichern blockiert: Buchungskonflikt erkannt");
            return;
        }
        if (isGroupBooking && groupConflicts.length > 0) {
            console.error("Speichern blockiert: Gruppenkonflikt erkannt");
            return;
        }
        setSaving(true);
        try {
            // Pass selectedBikes for group bookings; hook handles booking_items insert
            await onSave({
                ...form,
                selectedBikes: isGroupBooking ? form.selectedBikes : [],
            });
        } catch (err) {
            console.error("Fehler beim Speichern:", err);
        } finally {
            setSaving(false);
        }
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

    // Escape key closes the modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="booking-modal-title"
                className={`w-full max-w-2xl flex flex-col max-h-[90dvh] rounded-2xl ${modalBg} shadow-2xl overflow-hidden`}
            >

                {/* Header */}
                <div className={`flex items-center justify-between p-4 border-b ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-lg">
                            <Calendar className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                            <h3 id="booking-modal-title" className="text-lg font-semibold">{booking ? "Buchung bearbeiten" : "Neue Buchung"}</h3>
                            <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
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
                                aria-label="Mietvertrag drucken"
                            >
                                <FileText className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={onClose} aria-label="Schließen" className={`p-2 rounded-lg ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}>
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Progress Steps */}
                <div className={`flex items-center justify-between px-8 py-4 border-b relative ${darkMode ? "border-slate-800 bg-slate-800/30" : "border-slate-100 bg-slate-50"}`}>
                    {STEPS.map((s) => {
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
                    {/* Progress Bar Background */}
                    <div className={`absolute left-0 right-0 top-[4.5rem] h-0.5 -z-0 mx-12 ${darkMode ? "bg-slate-800" : "bg-slate-200"}`} />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* STEP 1: DATE & BIKE */}
                    {step === 1 && (
                        <div className="space-y-6">
                            {/* Date pickers */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelStyle}>Startdatum</label>
                                    <input type="date" value={form.start_date} onChange={(e) => {
                                        updateFormWithPrice({ start_date: e.target.value });
                                    }} className={inputStyle} />
                                </div>
                                <div>
                                    <label className={labelStyle}>Enddatum</label>
                                    <input type="date" value={form.end_date} onChange={(e) => {
                                        updateFormWithPrice({ end_date: e.target.value });
                                    }} className={inputStyle} />
                                </div>
                            </div>

                            {/* Group booking toggle — only for new bookings */}
                            {!booking && (
                                <div
                                    onClick={() => {
                                        setIsGroupBooking(prev => {
                                            const next = !prev;
                                            setForm(f => ({
                                                ...f,
                                                selectedBikes: [],
                                                bike_id: next ? "" : (initialBikeId || bikes[0]?.id || ""),
                                                total_price: next ? 0 : calcPrice(initialBikeId || bikes[0]?.id || "", f.start_date, f.end_date),
                                            }));
                                            return next;
                                        });
                                    }}
                                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all select-none ${isGroupBooking
                                        ? "border-orange-500 bg-orange-500/10"
                                        : darkMode ? "border-slate-700 bg-slate-800 hover:border-slate-600" : "border-slate-200 bg-white hover:border-slate-300"
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Users className={`w-4 h-4 ${isGroupBooking ? "text-orange-500" : darkMode ? "text-slate-400" : "text-slate-500"}`} />
                                        <span className={`text-sm font-medium ${isGroupBooking ? "text-orange-500" : ""}`}>Gruppenbuchung (mehrere Räder)</span>
                                    </div>
                                    {/* Toggle switch */}
                                    <div className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${isGroupBooking ? "bg-orange-500 justify-end" : darkMode ? "bg-slate-700 justify-start" : "bg-slate-200 justify-start"}`}>
                                        <div className="w-4 h-4 rounded-full bg-white shadow" />
                                    </div>
                                </div>
                            )}

                            {/* Single-bike picker */}
                            {!isGroupBooking && (
                                <div>
                                    <label className={labelStyle}>Fahrrad wählen</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                                        {bikes.map(bike => {
                                            const isSelected = form.bike_id === bike.id;
                                            return (
                                                <div
                                                    key={bike.id}
                                                    onClick={() => updateFormWithPrice({ bike_id: bike.id })}
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
                            )}

                            {/* Multi-bike picker for group bookings */}
                            {isGroupBooking && (
                                <div>
                                    <label className={labelStyle}>
                                        Räder wählen
                                        {form.selectedBikes.length > 0 && (
                                            <span className="ml-2 text-orange-500 font-normal">({form.selectedBikes.length} ausgewählt)</span>
                                        )}
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                                        {bikes.map(bike => {
                                            const isSelected = form.selectedBikes.some(b => b.id === bike.id);
                                            const hasConflict = groupConflicts.some(b => b.id === bike.id);
                                            return (
                                                <div
                                                    key={bike.id}
                                                    onClick={() => toggleGroupBike(bike)}
                                                    className={`p-3 rounded-xl border cursor-pointer transition-all ${hasConflict
                                                        ? "border-rose-400 bg-rose-500/10"
                                                        : isSelected
                                                            ? "border-orange-500 bg-orange-500/10 ring-1 ring-orange-500"
                                                            : darkMode ? "border-slate-700 hover:border-slate-600 bg-slate-800" : "border-slate-200 hover:border-slate-300 bg-white"
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-start gap-2">
                                                            <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-orange-500 border-orange-500" : darkMode ? "border-slate-500" : "border-slate-300"}`}>
                                                                {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-sm">{bike.name}</div>
                                                                <div className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{bike.category} • {bike.size}</div>
                                                                {hasConflict && <div className="text-xs text-rose-500 mt-0.5">Nicht verfügbar</div>}
                                                            </div>
                                                        </div>
                                                        <div className="font-semibold text-sm text-orange-500">{fmtCurrency(bike.price_per_day)}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {form.selectedBikes.length > 0 && (
                                        <div className={`mt-3 p-2 rounded-lg text-sm font-medium text-right ${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
                                            Gesamtpreis: <span className="text-orange-500">{fmtCurrency(calcGroupTotal(form.selectedBikes, form.start_date, form.end_date))}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Single-bike conflict warning */}
                            {!isGroupBooking && conflictingBooking && (
                                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm flex items-center gap-2">
                                    <X className="w-4 h-4" />
                                    <span>
                                        Konflikt mit <strong>{conflictingBooking.booking_number || "Buchung"}</strong><br />
                                        ({new Date(conflictingBooking.start_date).toLocaleDateString()} - {new Date(conflictingBooking.end_date).toLocaleDateString()})
                                    </span>
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
                                            aria-label="Kunden suchen"
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
                                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="flex justify-between items-center bg-orange-50 p-3 rounded-lg border border-orange-100">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-orange-500 rounded text-white"><User className="w-4 h-4" /></div>
                                            <h4 className="font-semibold text-orange-900">Schnell-Check-in</h4>
                                        </div>
                                        <button onClick={() => setIsNewCustomer(false)} className="text-sm font-medium text-orange-600 hover:text-orange-700 hover:underline">
                                            Zurück zur Suche
                                        </button>
                                    </div>

                                    {/* Primary Row: Name */}
                                    <div>
                                        <label className={labelStyle}>Name des Gastes <span className="text-rose-500">*</span></label>
                                        <input
                                            type="text"
                                            value={form.customer_name}
                                            onChange={(e) => setForm(f => ({ ...f, customer_name: e.target.value }))}
                                            className={`${inputStyle} text-lg font-medium`}
                                            placeholder="z.B. Max Mustermann"
                                            autoFocus
                                        />
                                    </div>

                                    {/* Security Row: ID & Mobile */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelStyle}>Ausweis-Nr. <span className="text-slate-400 font-normal">(Sicherheit)</span></label>
                                            <div className="relative">
                                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={form.id_number || ""}
                                                    onChange={(e) => setForm(f => ({ ...f, id_number: e.target.value }))}
                                                    className={`${inputStyle} pl-9`}
                                                    placeholder="L8822..."
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelStyle}>Mobilnummer <span className="text-rose-500">*</span></label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="tel"
                                                    value={form.customer_phone}
                                                    onChange={(e) => setForm(f => ({ ...f, customer_phone: e.target.value }))}
                                                    className={`${inputStyle} pl-9`}
                                                    placeholder="0171..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Optional Context Row */}
                                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-dashed ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                                        <div>
                                            <label className={`${labelStyle} flex justify-between`}>
                                                <span>Zimmer / Adresse</span>
                                                <span className="text-xs text-slate-400 font-normal">Optional</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={form.customer_address || ""}
                                                onChange={(e) => setForm(f => ({ ...f, customer_address: e.target.value }))}
                                                className={inputStyle}
                                                placeholder="Hotelzimmer..."
                                            />
                                        </div>
                                        <div>
                                            <label className={`${labelStyle} flex justify-between`}>
                                                <span>E-Mail</span>
                                                <span className="text-xs text-slate-400 font-normal">Optional</span>
                                            </label>
                                            <input
                                                type="email"
                                                value={form.customer_email}
                                                onChange={(e) => setForm(f => ({ ...f, customer_email: e.target.value }))}
                                                className={inputStyle}
                                                placeholder="@"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3: DETAILS */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className={inputStyle} placeholder="Besonderheiten..." />
                            </div>

                            {/* Add-ons */}
                            {addOns && addOns.filter(a => a.is_active).length > 0 && (
                                <div>
                                    <label className={labelStyle}>Zubehör & Add-ons</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {addOns.filter(a => a.is_active).map(addon => {
                                            const isSelected = form.selectedAddOns.includes(addon.id);
                                            const addonPrice = addon.price_type === 'per_day' ? addon.price * days : addon.price;
                                            return (
                                                <div
                                                    key={addon.id}
                                                    onClick={() => toggleAddOn(addon.id)}
                                                    className={`p-3 rounded-xl border cursor-pointer transition-all ${isSelected
                                                        ? "border-orange-500 bg-orange-500/10 ring-1 ring-orange-500"
                                                        : darkMode ? "border-slate-700 bg-slate-800 hover:border-slate-600" : "border-slate-200 bg-white hover:border-slate-300"
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <div className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${isSelected ? "bg-orange-500 border-orange-500" : darkMode ? "border-slate-500" : "border-slate-300"}`}>
                                                            {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-medium text-sm truncate">{addon.name}</div>
                                                            <div className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                                                {fmtCurrency(addonPrice)}{addon.price_type === "per_day" ? "/Tag" : " einmalig"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {form.selectedAddOns.length > 0 && (
                                        <div className={`mt-2 text-xs text-right ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                            Zubehör: <span className="font-medium text-orange-500">{fmtCurrency(addonTotal)}</span>
                                        </div>
                                    )}
                                </div>
                            )}
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

                                    {/* Bike display — single vs group */}
                                    {isGroupBooking ? (
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-slate-500 flex items-center gap-1">
                                                    <Users className="w-3.5 h-3.5" />
                                                    Gruppe ({form.selectedBikes.length} Räder)
                                                </span>
                                            </div>
                                            <div className="space-y-1 pl-2">
                                                {form.selectedBikes.map(bike => {
                                                    const bikeTotal = calculateDynamicPrice(bike, form.start_date, form.end_date, pricingRules || []).totalPrice;
                                                    return (
                                                        <div key={bike.id} className="flex justify-between text-xs">
                                                            <span className={darkMode ? "text-slate-400" : "text-slate-600"}>{bike.name}</span>
                                                            <span className={darkMode ? "text-slate-300" : "text-slate-700"}>{fmtCurrency(bikeTotal)}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Fahrrad</span>
                                            <span className="font-medium">{selectedBike?.name}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Zeitraum</span>
                                        <span className="font-medium">{new Date(form.start_date).toLocaleDateString()} - {new Date(form.end_date).toLocaleDateString()} ({days} Tage)</span>
                                    </div>
                                    {/* Add-ons summary */}
                                    {form.selectedAddOns.length > 0 && addOns && (
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-slate-500">Zubehör</span>
                                                <span className="font-medium text-orange-500">{fmtCurrency(addonTotal)}</span>
                                            </div>
                                            <div className="space-y-0.5 pl-2">
                                                {form.selectedAddOns.map(addonId => {
                                                    const addon = addOns.find(a => a.id === addonId);
                                                    if (!addon) return null;
                                                    const price = addon.price_type === "per_day" ? addon.price * days : addon.price;
                                                    return (
                                                        <div key={addonId} className="flex justify-between text-xs">
                                                            <span className={darkMode ? "text-slate-400" : "text-slate-600"}>{addon.name}</span>
                                                            <span className={darkMode ? "text-slate-300" : "text-slate-700"}>{fmtCurrency(price)}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="border-t my-2 pt-2 flex justify-between text-base">
                                        <span className="font-medium">Gesamtbetrag</span>
                                        <div className="text-right">
                                            <span className="font-bold text-orange-500">{fmtCurrency(form.total_price)}</span>
                                            {!isGroupBooking && pricingResult && pricingResult.baseTotal !== pricingResult.totalPrice && (
                                                <div className={`text-xs mt-0.5 ${pricingResult.totalPrice < pricingResult.baseTotal ? "text-emerald-500" : "text-amber-500"}`}>
                                                    {pricingResult.totalPrice < pricingResult.baseTotal
                                                        ? <span className="flex items-center gap-1 justify-end"><TrendingDown className="w-3 h-3" />Rabatt: statt {fmtCurrency(pricingResult.baseTotal)}</span>
                                                        : <span className="flex items-center gap-1 justify-end"><TrendingUp className="w-3 h-3" />Aufschlag: statt {fmtCurrency(pricingResult.baseTotal)}</span>
                                                    }
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`p-4 border-t flex flex-col gap-3 ${darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
                    {stepError && (
                        <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm flex items-center gap-2">
                            <X className="w-4 h-4 flex-shrink-0" />
                            {stepError}
                        </div>
                    )}
                    {confirmDelete && (
                        <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm flex items-center justify-between gap-3">
                            <span className="text-rose-600 font-medium">Buchung wirklich stornieren?</span>
                            <div className="flex gap-2">
                                <button onClick={() => setConfirmDelete(false)} className="px-3 py-1 rounded-lg text-slate-500 hover:bg-slate-100 text-sm">Abbrechen</button>
                                <button onClick={() => { setConfirmDelete(false); onDelete(booking.id); }} className="px-3 py-1 rounded-lg bg-rose-500 text-white text-sm hover:bg-rose-600">Ja, stornieren</button>
                            </div>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                            {booking && (
                                <button
                                    onClick={() => { if (booking.status !== "cancelled") setConfirmDelete(true); }}
                                    disabled={booking.status === "cancelled"}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${booking.status === "cancelled"
                                        ? "text-slate-400 cursor-not-allowed"
                                        : "text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                                        }`}
                                >
                                    <Trash2 className="w-4 h-4" />
                                    {booking.status === "cancelled" ? "Storniert" : "Stornieren"}
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
