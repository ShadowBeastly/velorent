"use client";
import { useState, useMemo, useEffect } from "react";
import { X, Trash2, Loader2, Calendar, User, CreditCard, CheckCircle, ChevronRight, Search, Plus, FileText, Phone, TrendingUp, TrendingDown, Users, AlertTriangle, Tag } from "lucide-react"; // eslint-disable-line no-unused-vars
import { fmtISO, addDays, daysDiff, fmtCurrency } from "../../utils/formatters";
import { STATUS } from "../../utils/constants";
import ContractModal from "./ContractModal";
import { calculatePriceSync } from "../../utils/pricingEngine";

function getCancellationScenario(startDate) {
    const now = new Date();
    const start = new Date(startDate + "T00:00:00");
    const hoursUntilStart = (start - now) / (1000 * 60 * 60);
    if (hoursUntilStart < 0) return "no_show";
    if (hoursUntilStart < 24) return "partial";
    return "free";
}

const CANCEL_SCENARIO_META = {
    free: {
        label: "Kostenlose Stornierung",
        sublabel: "Mehr als 24h vor Mietbeginn — voller Refund",
        color: "border-green-600/50 bg-green-900/20",
        badgeColor: "bg-green-700 text-green-100",
        guestBack: (total) => total,
        providerGets: () => 0,
        platformGets: () => 0,
        retained: () => 0,
        stripeAction: "Refund (full)",
        dbStatus: "free",
    },
    partial: {
        label: "50% Stornierungsgebühr",
        sublabel: "Weniger als 24h vor Mietbeginn",
        color: "border-amber-600/50 bg-amber-900/20",
        badgeColor: "bg-amber-700 text-amber-100",
        guestBack: (total) => total * 0.5,
        providerGets: (total) => Math.round(total * 0.5 * 0.95 * 100) / 100,
        platformGets: (total) => Math.round(total * 0.5 * 0.05 * 100) / 100,
        retained: (total) => total * 0.5,
        stripeAction: "Partial Refund (50%)",
        dbStatus: "partial",
    },
    no_show: {
        label: "No-Show",
        sublabel: "Mietbeginn überschritten — kein Refund",
        color: "border-red-700/50 bg-red-900/20",
        badgeColor: "bg-red-700 text-red-100",
        guestBack: () => 0,
        providerGets: (total) => Math.round(total * 0.95 * 100) / 100,
        platformGets: (total) => Math.round(total * 0.05 * 100) / 100,
        retained: (total) => total,
        stripeAction: "Kein Refund",
        dbStatus: "no_show",
    },
};

function fmtEur(n) {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);
}

const STEPS = [
    { id: 1, label: "Zeitraum & Rad", icon: Calendar },
    { id: 2, label: "Kunde", icon: User },
    { id: 3, label: "Details", icon: CreditCard },
    { id: 4, label: "Abschluss", icon: CheckCircle }
];

export default function BookingModal({ booking, initialDate, initialBikeId, bikes, customers, existingBookings, pricingRules, addOns, validateCoupon, onSave, onDelete, onClose, darkMode }) {
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [stepError, setStepError] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [showCancelBreakdown, setShowCancelBreakdown] = useState(false);

    // Coupon state
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null); // { coupon, discountAmount }
    // eslint-disable-next-line no-unused-vars
    const [couponError, setCouponError] = useState('');
    // eslint-disable-next-line no-unused-vars
    const [couponLoading, setCouponLoading] = useState(false);

    const isMarketplaceBooking = booking?.booking_source === "hotel_qr";
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
        return calculatePriceSync(selectedBike, form.start_date, form.end_date, 1, pricingRules || []);
    }, [isGroupBooking, selectedBike, form.start_date, form.end_date, pricingRules]);

    // Auto-calc price using dynamic pricing rules (single bike)
    const calcPrice = (bikeId, start, end) => {
        if (!bikeId || !start || !end) return 0;
        const bike = bikes.find(b => b.id === bikeId);
        if (!bike) return 0;
        return calculatePriceSync(bike, start, end, 1, pricingRules || []).totalPrice;
    };

    // Calc total price for all selected bikes in group mode
    const calcGroupTotal = (selectedBikesList, start, end) => {
        const qty = selectedBikesList.length;
        return selectedBikesList.reduce((sum, bike) => {
            return sum + calculatePriceSync(bike, start, end, qty, pricingRules || []).totalPrice;
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
                const subtotal = calculatePriceSync(bike, prev.start_date, prev.end_date, 1, pricingRules || []).totalPrice;
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

    // eslint-disable-next-line no-unused-vars
    const applyCoupon = async () => {
        if (!couponCode.trim()) return;
        if (!validateCoupon) { setCouponError('Gutschein-Validierung nicht verfügbar.'); return; }
        setCouponLoading(true);
        setCouponError('');
        setAppliedCoupon(null);
        const bikeQty = isGroupBooking ? form.selectedBikes.length : 1;
        const selectedBikeObj = bikes.find(b => b.id === form.bike_id);
        const result = await validateCoupon(couponCode.trim().toUpperCase(), {
            totalPrice: form.total_price,
            durationDays: days,
            quantity: bikeQty,
            categoryId: selectedBikeObj?.category_id,
            bikeId: form.bike_id,
        });
        setCouponLoading(false);
        if (result.valid) {
            setAppliedCoupon(result);
            setCouponCode('');
        } else {
            setCouponError(result.reason || 'Ungültiger Gutschein.');
        }
    };

    // eslint-disable-next-line no-unused-vars
    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCouponError('');
        setCouponCode('');
    };

    // Filtered Customers
    const filteredCustomers = useMemo(() => {
        return customers.filter(c =>
            `${c.first_name} ${c.last_name}`.toLowerCase().includes(customerSearch.toLowerCase()) ||
            c.email?.toLowerCase().includes(customerSearch.toLowerCase())
        );
    }, [customers, customerSearch]);

    // Helper: get effective end of an existing booking including its buffer
    const getBufferedEnd = (existingBooking) => {
        const bikeData = bikes.find(bk => bk.id === existingBooking.bike_id);
        const bufferMins = bikeData?.buffer_minutes ?? 0;
        if (!bufferMins) return new Date(existingBooking.end_date);
        const end = new Date(existingBooking.end_date);
        end.setMinutes(end.getMinutes() + bufferMins);
        return end;
    };

    // Availability Check (single bike) — buffer extends the blocked window after end_date
    const conflictingBooking = useMemo(() => {
        if (isGroupBooking) return null; // handled separately for group
        if (!form.bike_id || !form.start_date || !form.end_date) return null;
        return existingBookings.find(b =>
            b.id !== booking?.id &&
            b.bike_id === form.bike_id &&
            !["cancelled", "returned", "deleted"].includes(b.status) &&
            new Date(b.start_date) <= new Date(form.end_date) &&
            getBufferedEnd(b) >= new Date(form.start_date)
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isGroupBooking, form.bike_id, form.start_date, form.end_date, existingBookings, booking, bikes]);

    // Availability check for ALL bikes in a group selection
    const groupConflicts = useMemo(() => {
        if (!isGroupBooking || form.selectedBikes.length === 0 || !form.start_date || !form.end_date) return [];
        return form.selectedBikes.filter(bike =>
            existingBookings.some(b =>
                b.id !== booking?.id &&
                b.bike_id === bike.id &&
                !["cancelled", "returned", "deleted"].includes(b.status) &&
                new Date(b.start_date) <= new Date(form.end_date) &&
                getBufferedEnd(b) >= new Date(form.start_date)
            )
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isGroupBooking, form.selectedBikes, form.start_date, form.end_date, existingBookings, booking, bikes]);

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
            const discountAmount = appliedCoupon?.discountAmount || 0;
            const finalPrice = Math.max(0, form.total_price - discountAmount);
            // Pass selectedBikes for group bookings; hook handles booking_items insert
            await onSave({
                ...form,
                total_price: finalPrice,
                selectedBikes: isGroupBooking ? form.selectedBikes : [],
                _couponId: appliedCoupon?.coupon?.id || null,
                _couponDiscountAmount: discountAmount || null,
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
    const inputStyle = `w-full px-3 py-2 rounded-lg border outline-none transition-colors ${darkMode ? "bg-slate-800 border-slate-700 focus:border-[#1A7D5A] text-white" : "bg-white border-slate-300 focus:border-[#1A7D5A]"}`;
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
                        <div className="p-2 bg-[#1A7D5A]/10 rounded-lg">
                            <Calendar className="w-5 h-5 text-[#1A7D5A]" />
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
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${isActive ? "bg-[#1A7D5A] text-white shadow-lg shadow-[#1A7D5A]/30" :
                                    isDone ? "bg-emerald-500 text-white" :
                                        darkMode ? "bg-slate-800 text-slate-500" : "bg-slate-200 text-slate-500"
                                    }`}>
                                    {isDone ? <CheckCircle className="w-5 h-5" /> : s.icon ? <s.icon className="w-4 h-4" /> : s.id}
                                </div>
                                <span className={`text-xs font-medium ${isActive ? "text-[#1A7D5A]" : darkMode ? "text-slate-500" : "text-slate-400"}`}>
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
                                        ? "border-[#1A7D5A] bg-[#1A7D5A]/10"
                                        : darkMode ? "border-slate-700 bg-slate-800 hover:border-slate-600" : "border-slate-200 bg-white hover:border-slate-300"
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Users className={`w-4 h-4 ${isGroupBooking ? "text-[#1A7D5A]" : darkMode ? "text-slate-400" : "text-slate-500"}`} />
                                        <span className={`text-sm font-medium ${isGroupBooking ? "text-[#1A7D5A]" : ""}`}>Gruppenbuchung (mehrere Räder)</span>
                                    </div>
                                    {/* Toggle switch */}
                                    <div className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${isGroupBooking ? "bg-[#1A7D5A] justify-end" : darkMode ? "bg-slate-700 justify-start" : "bg-slate-200 justify-start"}`}>
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
                                                        ? "border-[#1A7D5A] bg-[#1A7D5A]/10 ring-1 ring-[#1A7D5A]"
                                                        : darkMode ? "border-slate-700 hover:border-slate-600 bg-slate-800" : "border-slate-200 hover:border-slate-300 bg-white"
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="font-medium text-sm">{bike.name}</div>
                                                            <div className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{bike.category} • {bike.size}</div>
                                                        </div>
                                                        <div className="font-semibold text-sm text-[#1A7D5A]">{fmtCurrency(bike.price_per_day)}</div>
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
                                            <span className="ml-2 text-[#1A7D5A] font-normal">({form.selectedBikes.length} ausgewählt)</span>
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
                                                            ? "border-[#1A7D5A] bg-[#1A7D5A]/10 ring-1 ring-[#1A7D5A]"
                                                            : darkMode ? "border-slate-700 hover:border-slate-600 bg-slate-800" : "border-slate-200 hover:border-slate-300 bg-white"
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-start gap-2">
                                                            <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-[#1A7D5A] border-[#1A7D5A]" : darkMode ? "border-slate-500" : "border-slate-300"}`}>
                                                                {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-sm">{bike.name}</div>
                                                                <div className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{bike.category} • {bike.size}</div>
                                                                {hasConflict && <div className="text-xs text-rose-500 mt-0.5">Nicht verfügbar</div>}
                                                            </div>
                                                        </div>
                                                        <div className="font-semibold text-sm text-[#1A7D5A]">{fmtCurrency(bike.price_per_day)}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {form.selectedBikes.length > 0 && (
                                        <div className={`mt-3 p-2 rounded-lg text-sm font-medium text-right ${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
                                            Gesamtpreis: <span className="text-[#1A7D5A]">{fmtCurrency(calcGroupTotal(form.selectedBikes, form.start_date, form.end_date))}</span>
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
                                                    ? "bg-[#1A7D5A]/10"
                                                    : darkMode ? "hover:bg-slate-800" : "hover:bg-slate-50"
                                                    } ${darkMode ? "border-slate-700" : "border-slate-200"}`}
                                            >
                                                <div>
                                                    <div className="font-medium text-sm">{c.first_name} {c.last_name}</div>
                                                    <div className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{c.email}</div>
                                                </div>
                                                {form.customer_id === c.id && <CheckCircle className="w-4 h-4 text-[#1A7D5A]" />}
                                            </div>
                                        )) : (
                                            <div className="p-4 text-center text-sm text-slate-500">Keine Kunden gefunden</div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => { setIsNewCustomer(true); setForm(f => ({ ...f, customer_id: "", customer_name: "", customer_email: "", customer_phone: "" })); }}
                                        className="w-full py-2 border border-dashed rounded-lg text-sm font-medium text-slate-500 hover:text-[#1A7D5A] hover:border-[#1A7D5A] transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Neuen Kunden anlegen
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="flex justify-between items-center bg-[#D4EDE2] p-3 rounded-lg border border-[#D4EDE2]">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-[#1A7D5A] rounded text-white"><User className="w-4 h-4" /></div>
                                            <h4 className="font-semibold text-[#1A7D5A]">Schnell-Check-in</h4>
                                        </div>
                                        <button onClick={() => setIsNewCustomer(false)} className="text-sm font-medium text-[#1A7D5A] hover:text-[#1A7D5A] hover:underline">
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
                                                ? `${color} ring-2 ring-[#1A7D5A] ring-offset-2 ${darkMode ? "ring-offset-slate-900" : "ring-offset-white"}`
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
                                                        ? "border-[#1A7D5A] bg-[#1A7D5A]/10 ring-1 ring-[#1A7D5A]"
                                                        : darkMode ? "border-slate-700 bg-slate-800 hover:border-slate-600" : "border-slate-200 bg-white hover:border-slate-300"
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <div className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${isSelected ? "bg-[#1A7D5A] border-[#1A7D5A]" : darkMode ? "border-slate-500" : "border-slate-300"}`}>
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
                                            Zubehör: <span className="font-medium text-[#1A7D5A]">{fmtCurrency(addonTotal)}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Gutscheincode */}
                            <div>
                                <label className={labelStyle}>Gutscheincode</label>
                                {appliedCoupon ? (
                                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700/50">
                                        <span className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                                            <Tag className="w-4 h-4" />
                                            <code className="font-bold">{appliedCoupon.coupon.code}</code>
                                            {' — '}{appliedCoupon.coupon.type === 'percentage' ? `${appliedCoupon.coupon.value}%` : fmtCurrency(appliedCoupon.coupon.value)} Rabatt
                                            {' '}({fmtCurrency(appliedCoupon.discountAmount)} gespart)
                                        </span>
                                        <button onClick={removeCoupon} className="text-xs text-slate-500 hover:text-red-500 transition-colors underline">Entfernen</button>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex gap-2">
                                            <input
                                                className={`${inputStyle} font-mono uppercase tracking-wider`}
                                                value={couponCode}
                                                onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                                                placeholder="GUTSCHEINCODE"
                                                onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                                            />
                                            <button
                                                onClick={applyCoupon}
                                                disabled={!couponCode.trim() || couponLoading}
                                                className="px-3 py-2 bg-[#1A7D5A] hover:bg-[#156649] text-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
                                            >
                                                {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Einlösen'}
                                            </button>
                                        </div>
                                        {couponError && (
                                            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                                                <X className="w-3 h-3" /> {couponError}
                                            </p>
                                        )}
                                    </div>
                                )}
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
                                                    const bikeTotal = calculatePriceSync(bike, form.start_date, form.end_date, form.selectedBikes.length, pricingRules || []).totalPrice;
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
                                                <span className="font-medium text-[#1A7D5A]">{fmtCurrency(addonTotal)}</span>
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

                                    {/* Coupon discount row */}
                                    {appliedCoupon && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                <Tag className="w-3.5 h-3.5" />
                                                Gutschein ({appliedCoupon.coupon.code})
                                            </span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                                -{fmtCurrency(appliedCoupon.discountAmount)}
                                            </span>
                                        </div>
                                    )}

                                    <div className="border-t my-2 pt-2 flex justify-between text-base">
                                        <span className="font-medium">Gesamtbetrag</span>
                                        <div className="text-right">
                                            <span className="font-bold text-[#1A7D5A]">{fmtCurrency(appliedCoupon ? Math.max(0, form.total_price - (appliedCoupon.discountAmount || 0)) : form.total_price)}</span>
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
                                    {form.deposit_amount > 0 && (
                                        <div className="flex justify-between items-center pt-1">
                                            <span className="text-slate-500">Kaution</span>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300`}>
                                                {fmtCurrency(form.deposit_amount)} · Ausstehend
                                            </span>
                                        </div>
                                    )}
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
                    {confirmDelete && !isMarketplaceBooking && (
                        <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm flex items-center justify-between gap-3">
                            <span className="text-rose-600 font-medium">Buchung wirklich stornieren?</span>
                            <div className="flex gap-2">
                                <button onClick={() => setConfirmDelete(false)} className="px-3 py-1 rounded-lg text-slate-500 hover:bg-slate-100 text-sm">Abbrechen</button>
                                <button onClick={() => { setConfirmDelete(false); onDelete(booking.id); }} className="px-3 py-1 rounded-lg bg-rose-500 text-white text-sm hover:bg-rose-600">Ja, stornieren</button>
                            </div>
                        </div>
                    )}
                    {showCancelBreakdown && isMarketplaceBooking && (() => {
                        const scenarioKey = getCancellationScenario(booking.start_date);
                        const meta = CANCEL_SCENARIO_META[scenarioKey];
                        const total = booking.total_price || 0;
                        return (
                            <div className={`rounded-xl border p-4 ${meta.color}`}>
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                                            <span className="font-semibold text-sm">{meta.label}</span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-mono ${meta.badgeColor}`}>{meta.stripeAction}</span>
                                        </div>
                                        <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{meta.sublabel}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                                    <div className={`rounded-lg py-2 px-1 ${darkMode ? "bg-slate-700/50" : "bg-white/60"}`}>
                                        <div className={`font-bold text-base ${darkMode ? "text-white" : "text-slate-800"}`}>{fmtEur(meta.guestBack(total))}</div>
                                        <div className={darkMode ? "text-slate-400" : "text-slate-500"}>Gast zurück</div>
                                    </div>
                                    <div className={`rounded-lg py-2 px-1 ${darkMode ? "bg-slate-700/50" : "bg-white/60"}`}>
                                        <div className="font-bold text-base text-green-400">{fmtEur(meta.providerGets(total))}</div>
                                        <div className={darkMode ? "text-slate-400" : "text-slate-500"}>Anbieter</div>
                                    </div>
                                    <div className={`rounded-lg py-2 px-1 ${darkMode ? "bg-slate-700/50" : "bg-white/60"}`}>
                                        <div className="font-bold text-base text-blue-400">{fmtEur(meta.platformGets(total))}</div>
                                        <div className={darkMode ? "text-slate-400" : "text-slate-500"}>Plattform</div>
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setShowCancelBreakdown(false)} className={`px-3 py-1.5 rounded-lg text-sm ${darkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}>Abbrechen</button>
                                    <button
                                        onClick={() => { setShowCancelBreakdown(false); onDelete(booking.id, meta.dbStatus); }}
                                        className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium"
                                    >
                                        Stornierung bestätigen
                                    </button>
                                </div>
                            </div>
                        );
                    })()}
                    <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                            {booking && (
                                <button
                                    onClick={() => {
                                        if (booking.status === "cancelled") return;
                                        if (isMarketplaceBooking) setShowCancelBreakdown(true);
                                        else setConfirmDelete(true);
                                    }}
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
                            className="px-6 py-2 bg-gradient-to-r from-[#1A7D5A] to-[#3BAA82] text-white rounded-lg font-medium shadow-lg shadow-[#1A7D5A]/25 flex items-center gap-2 disabled:opacity-50"
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
