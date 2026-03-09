"use client";
import { useState, useEffect } from "react";
import { Building, Loader2, Check, Key, Copy, CreditCard, Palette, Zap, Star, Rocket, ExternalLink, Clock, Languages } from "lucide-react";
import { supabase } from "../utils/supabase";
import { useApp } from "../context/AppContext";
import { useOrganization } from "../context/OrgContext";
import { useToast } from "../components/ui/Toast";
import { useI18n } from "../utils/i18n";
import WidgetSettings from "./WidgetSettings";
import TeamManagement from "../components/settings/TeamManagement";

const PLANS = [
    {
        key: "basic",
        label: "Basic",
        icon: Zap,
        gradient: "from-blue-500 to-cyan-500",
        monthlyPrice: "29",
        yearlyPrice: "24",
        features: [
            "Bis zu 20 Fahrräder",
            "Buchungskalender",
            "Rechnungen & Verträge",
            "E-Mail Support",
        ],
    },
    {
        key: "pro",
        label: "Pro",
        icon: Star,
        gradient: "from-violet-500 to-purple-500",
        monthlyPrice: "59",
        yearlyPrice: "49",
        features: [
            "Bis zu 100 Fahrräder",
            "Alle Basic-Features",
            "Buchungs-Widget (Website)",
            "Voucher & Rabattcodes",
            "Branding & White-Label",
            "Priorität-Support",
        ],
        popular: true,
    },
    {
        key: "unlimited",
        label: "Unlimited",
        icon: Rocket,
        gradient: "from-orange-500 to-amber-500",
        monthlyPrice: "99",
        yearlyPrice: "82",
        features: [
            "Unbegrenzte Fahrräder",
            "Alle Pro-Features",
            "Multi-Standort",
            "API-Zugang",
            "Dedizierter Account Manager",
        ],
    },
];

const STATUS_LABELS = {
    active: "Aktiv",
    trialing: "Testphase",
    past_due: "Zahlung überfällig",
    canceled: "Gekündigt",
    unpaid: "Unbezahlt",
    inactive: "Inaktiv",
};

const STATUS_COLORS = {
    active: "text-emerald-500",
    trialing: "text-blue-500",
    past_due: "text-amber-500",
    canceled: "text-slate-400",
    unpaid: "text-red-500",
    inactive: "text-slate-400",
};

export default function SettingsPage() {
    const { darkMode } = useApp();
    const org = useOrganization();
    const { addToast } = useToast();
    const { t, locale, changeLocale } = useI18n();
    const [form, setForm] = useState(org.currentOrg || {});
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Subscription state
    const [billingInterval, setBillingInterval] = useState("monthly");
    const [checkoutLoading, setCheckoutLoading] = useState(null); // priceKey being loaded
    const [showPlans, setShowPlans] = useState(false);

    // Read ?success=true or ?canceled=true on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            if (params.get("success") === "true") {
                addToast("Dein Abo wurde erfolgreich aktiviert!", "success");
                // Clean up URL without reload
                window.history.replaceState({}, "", "/app/settings");
            } else if (params.get("canceled") === "true") {
                addToast("Checkout wurde abgebrochen.", "info");
                window.history.replaceState({}, "", "/app/settings");
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (org.currentOrg) {
            setForm(org.currentOrg);
        }
    }, [org.currentOrg]);

    const handleSave = async () => {
        setSaving(true);
        await supabase.from("organizations").update({
            name: form.name,
            address: form.address,
            city: form.city,
            postal_code: form.postal_code,
            phone: form.phone,
            email: form.email,
            tax_id: form.tax_id,
            iban: form.iban,
            bic: form.bic,
            logo_url: form.logo_url,
            settings: form.settings,
            late_fee_enabled: form.late_fee_enabled ?? false,
            late_fee_type: form.late_fee_type || "fixed",
            late_fee_amount: parseFloat(form.late_fee_amount) || 10,
            late_fee_grace_hours: parseInt(form.late_fee_grace_hours, 10) || 2,
        }).eq("id", org.currentOrg.id);
        org.reload();
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleCheckout = async (planKey) => {
        if (!org.currentOrg?.id) return;

        const priceKey = `${planKey}_${billingInterval}`;
        setCheckoutLoading(priceKey);

        try {
            const { data, error } = await supabase.functions.invoke("create-checkout", {
                body: {
                    priceKey,
                    organizationId: org.currentOrg.id,
                },
            });

            if (error) throw new Error(error.message || "Unbekannter Fehler");
            if (!data?.url) throw new Error("Keine Checkout-URL erhalten");

            window.location.href = data.url;
        } catch (err) {
            console.error("Checkout error:", err);
            addToast(`Fehler beim Checkout: ${err.message}`, "error");
            setCheckoutLoading(null);
        }
    };

    const currentTier = org.currentOrg?.subscription_tier || "free";
    const currentStatus = org.currentOrg?.subscription_status || "inactive";
    const isSubscribed = currentTier !== "free" && currentStatus === "active";
    const isTrialing = currentStatus === "trialing";

    const cardStyle = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
    const inputStyle = `w-full px-3 py-2 rounded-lg border outline-none ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"}`;

    return (
        <div className="max-w-3xl space-y-6">
            {/* Company Settings */}
            <div className={`rounded-2xl border p-6 ${cardStyle}`}>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                        <Building className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Firmendaten</h3>
                        <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Diese Daten erscheinen auf Verträgen & Rechnungen</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Firmenname</label>
                        <input type="text" value={form.name || ""} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className={inputStyle} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Adresse</label>
                            <input type="text" value={form.address || ""} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} className={inputStyle} />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Stadt</label>
                            <input type="text" value={form.city || ""} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} className={inputStyle} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Telefon</label>
                            <input type="tel" value={form.phone || ""} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className={inputStyle} />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>E-Mail</label>
                            <input type="email" value={form.email || ""} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className={inputStyle} />
                        </div>
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>USt-IdNr.</label>
                        <input type="text" value={form.tax_id || ""} onChange={(e) => setForm(f => ({ ...f, tax_id: e.target.value }))} className={inputStyle} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>IBAN</label>
                            <input type="text" placeholder="DE00 0000 0000 0000 0000 00" value={form.iban || ""} onChange={(e) => setForm(f => ({ ...f, iban: e.target.value }))} className={inputStyle} />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>BIC</label>
                            <input type="text" placeholder="XXXXDEXX" value={form.bic || ""} onChange={(e) => setForm(f => ({ ...f, bic: e.target.value }))} className={inputStyle} />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                    <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium shadow-lg shadow-orange-500/25 flex items-center gap-2">
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Speichern
                    </button>
                    {saved && <span className="text-emerald-500 flex items-center gap-1"><Check className="w-4 h-4" /> Gespeichert!</span>}
                </div>
            </div>

            {/* Branding Settings */}
            <div className={`rounded-2xl border p-6 ${cardStyle}`}>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                        <Palette className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Design & Branding (White-Label)</h3>
                        <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Passe das Aussehen an dein Unternehmen an.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Logo URL</label>
                        <div className="flex gap-4">
                            <input
                                type="text"
                                placeholder="https://example.com/logo.png"
                                value={form.logo_url || ""}
                                onChange={(e) => setForm(f => ({ ...f, logo_url: e.target.value }))}
                                className={inputStyle}
                            />
                            {form.logo_url && (
                                <div className="w-12 h-12 rounded-lg border border-slate-200 bg-white flex items-center justify-center p-1 shrink-0">
                                    <img src={form.logo_url} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                                </div>
                            )}
                        </div>
                        <p className={`text-xs mt-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            Rechteckiges Format (z.B. 200x50px) empfohlen.
                        </p>
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Primärfarbe</label>
                        <div className="flex gap-4 items-center">
                            <input
                                type="color"
                                value={form.settings?.primary_color || "#f97316"}
                                onChange={(e) => setForm(f => ({
                                    ...f,
                                    settings: { ...f.settings, primary_color: e.target.value }
                                }))}
                                className="h-10 w-20 rounded cursor-pointer border-0 p-0"
                            />
                            <div className={`text-sm px-3 py-1 rounded bg-slate-100 dark:bg-slate-800 font-mono`}>
                                {form.settings?.primary_color || "#f97316"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* API Key Info */}
            <div className={`rounded-2xl border p-6 ${cardStyle}`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <Key className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">API & Integrationen</h3>
                        <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Für externe Buchungssysteme</p>
                    </div>
                </div>
                <div className={`p-4 rounded-lg ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">Organisation ID</p>
                            <p className={`text-xs font-mono ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{org.currentOrg?.id}</p>
                        </div>
                        <button
                            onClick={() => navigator.clipboard.writeText(org.currentOrg?.id || "")}
                            className={`p-2 rounded-lg ${darkMode ? "hover:bg-slate-700" : "hover:bg-slate-200"}`}
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <p className={`text-xs mt-3 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                    Nutze diese ID für API-Integrationen mit Booking.com, deiner Website oder anderen Systemen.
                </p>
            </div>

            {/* Subscription */}
            <div className={`rounded-2xl border p-6 ${cardStyle}`}>
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Abo & Abrechnung</h3>
                        <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Verwalte deinen Tarif und deine Zahlungsmethoden</p>
                    </div>
                </div>

                {/* Current plan summary */}
                <div className={`flex items-center justify-between p-4 rounded-xl mb-4 ${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
                    <div>
                        <p className="font-semibold capitalize text-base">
                            {currentTier === "free" ? "Free" : currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} Plan
                        </p>
                        <p className={`text-sm mt-0.5 ${STATUS_COLORS[currentStatus] || "text-slate-400"}`}>
                            {STATUS_LABELS[currentStatus] || currentStatus}
                            {isTrialing && org.currentOrg?.trial_ends_at && (
                                <span className={`ml-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    (bis {new Date(org.currentOrg.trial_ends_at).toLocaleDateString("de-DE")})
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {isSubscribed && (
                            <button
                                onClick={() => addToast("Stripe Customer Portal wird konfiguriert. Bitte wende dich an den Support.", "info")}
                                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 border ${darkMode ? "border-slate-700 hover:bg-slate-700" : "border-slate-300 hover:bg-slate-100"}`}
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Abo verwalten
                            </button>
                        )}
                        <button
                            onClick={() => setShowPlans(v => !v)}
                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-medium"
                        >
                            {showPlans ? "Schließen" : isSubscribed ? "Plan ändern" : "Upgrade"}
                        </button>
                    </div>
                </div>

                {/* Plan selection */}
                {showPlans && (
                    <div>
                        {/* Billing interval toggle */}
                        <div className="flex items-center justify-center gap-3 mb-5">
                            <span className={`text-sm font-medium ${billingInterval === "monthly" ? "" : darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                Monatlich
                            </span>
                            <button
                                onClick={() => setBillingInterval(v => v === "monthly" ? "yearly" : "monthly")}
                                className={`relative w-12 h-6 rounded-full transition-colors ${billingInterval === "yearly" ? "bg-violet-500" : darkMode ? "bg-slate-700" : "bg-slate-300"}`}
                            >
                                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${billingInterval === "yearly" ? "left-7" : "left-1"}`} />
                            </button>
                            <span className={`text-sm font-medium ${billingInterval === "yearly" ? "" : darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                Jährlich
                                <span className="ml-1.5 text-xs text-emerald-500 font-semibold">–17%</span>
                            </span>
                        </div>

                        {/* Plan cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {PLANS.map((plan) => {
                                const Icon = plan.icon;
                                const priceKey = `${plan.key}_${billingInterval}`;
                                const isCurrentPlan = currentTier === plan.key;
                                const isLoading = checkoutLoading === priceKey;
                                const price = billingInterval === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;

                                return (
                                    <div
                                        key={plan.key}
                                        className={`relative rounded-xl border p-4 flex flex-col ${
                                            isCurrentPlan
                                                ? darkMode ? "border-violet-500/50 bg-violet-500/10" : "border-violet-400 bg-violet-50"
                                                : plan.popular
                                                ? darkMode ? "border-violet-500/30 bg-slate-800" : "border-violet-300 bg-white"
                                                : darkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"
                                        }`}
                                    >
                                        {plan.popular && !isCurrentPlan && (
                                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-violet-500 to-purple-500 text-white">
                                                    Beliebt
                                                </span>
                                            </div>
                                        )}
                                        {isCurrentPlan && (
                                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                                                    Aktueller Plan
                                                </span>
                                            </div>
                                        )}

                                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-3`}>
                                            <Icon className="w-4 h-4 text-white" />
                                        </div>

                                        <p className="font-semibold text-base mb-1">{plan.label}</p>
                                        <div className="flex items-baseline gap-1 mb-3">
                                            <span className="text-2xl font-bold">€{price}</span>
                                            <span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>/Monat</span>
                                        </div>

                                        <ul className="space-y-1.5 mb-4 flex-1">
                                            {plan.features.map((f) => (
                                                <li key={f} className={`flex items-start gap-1.5 text-xs ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                                                    <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                                    {f}
                                                </li>
                                            ))}
                                        </ul>

                                        <button
                                            onClick={() => !isCurrentPlan && handleCheckout(plan.key)}
                                            disabled={isCurrentPlan || isLoading}
                                            className={`w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-opacity ${
                                                isCurrentPlan
                                                    ? darkMode ? "bg-slate-700 text-slate-400 cursor-default" : "bg-slate-100 text-slate-400 cursor-default"
                                                    : `bg-gradient-to-r ${plan.gradient} text-white shadow-sm hover:opacity-90`
                                            }`}
                                        >
                                            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                            {isCurrentPlan ? "Aktuell" : isLoading ? "Weiterleitung..." : "Auswählen"}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        <p className={`text-xs mt-4 text-center ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            14 Tage kostenlos testen · Keine Kreditkarte für die Testphase nötig · Jederzeit kündbar
                        </p>
                    </div>
                )}
            </div>

            {/* Late Fee Settings */}
            <div className={`rounded-2xl border p-6 ${cardStyle}`}>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Verspätungsgebühren</h3>
                        <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Automatische Gebühren für überfällige Rückgaben</p>
                    </div>
                </div>

                <div className="space-y-5">
                    {/* Enable toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className={`text-sm font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Verspätungsgebühren aktivieren</p>
                            <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Zeigt angesammelte Gebühren bei überfälligen Buchungen an</p>
                        </div>
                        <button
                            onClick={() => setForm(f => ({ ...f, late_fee_enabled: !f.late_fee_enabled }))}
                            className={`relative w-12 h-6 rounded-full transition-colors ${form.late_fee_enabled ? "bg-red-500" : darkMode ? "bg-slate-700" : "bg-slate-300"}`}
                        >
                            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.late_fee_enabled ? "left-7" : "left-1"}`} />
                        </button>
                    </div>

                    {form.late_fee_enabled && (
                        <>
                            {/* Fee type */}
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Gebührentyp</label>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setForm(f => ({ ...f, late_fee_type: "fixed" }))}
                                        className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                                            (form.late_fee_type || "fixed") === "fixed"
                                                ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400"
                                                : darkMode ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                                        }`}
                                    >
                                        Pro Tag (Festbetrag)
                                    </button>
                                    <button
                                        onClick={() => setForm(f => ({ ...f, late_fee_type: "percentage" }))}
                                        className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                                            form.late_fee_type === "percentage"
                                                ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400"
                                                : darkMode ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                                        }`}
                                    >
                                        Prozent des Tagespreises
                                    </button>
                                </div>
                            </div>

                            {/* Fee amount */}
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                                    {form.late_fee_type === "percentage" ? "Prozentsatz (%)" : "Betrag pro Tag (€)"}
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        step={form.late_fee_type === "percentage" ? "1" : "0.50"}
                                        value={form.late_fee_amount ?? 10}
                                        onChange={(e) => setForm(f => ({ ...f, late_fee_amount: e.target.value }))}
                                        className={`w-36 px-3 py-2 rounded-lg border outline-none ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"}`}
                                    />
                                    <span className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                        {form.late_fee_type === "percentage" ? "%" : "€"}
                                        {" "}pro verspätetem Tag
                                    </span>
                                </div>
                            </div>

                            {/* Grace period */}
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Kulanzzeit (Stunden)</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        max="48"
                                        step="1"
                                        value={form.late_fee_grace_hours ?? 2}
                                        onChange={(e) => setForm(f => ({ ...f, late_fee_grace_hours: e.target.value }))}
                                        className={`w-24 px-3 py-2 rounded-lg border outline-none ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"}`}
                                    />
                                    <span className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Stunden nach Rückgabetermin, bevor Gebühren starten</span>
                                </div>
                            </div>

                            <div className={`rounded-lg p-3 text-sm ${darkMode ? "bg-slate-800 text-slate-400" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                                Verspätungsgebühren werden nur angezeigt, nicht automatisch berechnet.
                                Bei der Rückgabe kann der Operator die Gebühr manuell zur Rechnung hinzufügen.
                            </div>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-3 mt-6">
                    <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium shadow-lg shadow-orange-500/25 flex items-center gap-2">
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Speichern
                    </button>
                    {saved && <span className="text-emerald-500 flex items-center gap-1"><Check className="w-4 h-4" /> Gespeichert!</span>}
                </div>
            </div>

            {/* Language Settings */}
            <div className={`rounded-2xl border p-6 ${cardStyle}`}>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                        <Languages className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">{t("settings.languageTitle")}</h3>
                        <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{t("settings.languageSubtitle")}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => changeLocale("de")}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                            locale === "de"
                                ? "border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400"
                                : darkMode
                                    ? "border-slate-700 text-slate-400 hover:bg-slate-800"
                                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        <span className="text-lg">🇩🇪</span>
                        Deutsch
                        {locale === "de" && <Check className="w-4 h-4 text-teal-500" />}
                    </button>
                    <button
                        onClick={() => changeLocale("en")}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                            locale === "en"
                                ? "border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400"
                                : darkMode
                                    ? "border-slate-700 text-slate-400 hover:bg-slate-800"
                                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        <span className="text-lg">🇬🇧</span>
                        English
                        {locale === "en" && <Check className="w-4 h-4 text-teal-500" />}
                    </button>
                </div>
            </div>

            {/* Team Management */}
            <TeamManagement />

            {/* Widget Settings */}
            <WidgetSettings supabase={supabase} orgId={org.currentOrg?.id} darkMode={darkMode} />
        </div>
    );
}
