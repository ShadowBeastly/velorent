"use client";
import { useState, useEffect } from "react";
import { Building, Loader2, Check, Key, Copy, CreditCard, Palette, Zap, Star, Rocket, ExternalLink, Clock, Languages, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "../utils/supabase";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { useOrganization } from "../context/OrgContext";
import { useToast } from "../components/ui/Toast";
import { useI18n } from "../utils/i18n";
import WidgetSettings from "./WidgetSettings";
import { STRIPE_TRUSTED_PREFIXES } from "../utils/constants";
import TeamManagement from "../components/settings/TeamManagement";

const PLANS = [
    {
        key: "basic",
        label: "Basic",
        icon: Zap,
        gradient: "from-blue-500 to-cyan-500",
        monthlyPrice: "29",
        yearlyPrice: "24",
        featureKeys: [
            "settings.planFeatureUpTo20Bikes",
            "settings.planFeatureCalendar",
            "settings.planFeatureInvoicesContracts",
            "settings.planFeatureEmailSupport",
        ],
    },
    {
        key: "pro",
        label: "Pro",
        icon: Star,
        gradient: "from-violet-500 to-purple-500",
        monthlyPrice: "59",
        yearlyPrice: "49",
        featureKeys: [
            "settings.planFeatureUpTo100Bikes",
            "settings.planFeatureAllBasic",
            "settings.planFeatureWidget",
            "settings.planFeatureVouchers",
            "settings.planFeatureBranding",
            "settings.planFeaturePrioritySupport",
        ],
        popular: true,
    },
    {
        key: "unlimited",
        label: "Unlimited",
        icon: Rocket,
        gradient: "from-[#1A7D5A] to-[#3BAA82]",
        monthlyPrice: "99",
        yearlyPrice: "82",
        featureKeys: [
            "settings.planFeatureUnlimitedBikes",
            "settings.planFeatureAllPro",
            "settings.planFeatureMultiLocation",
            "settings.planFeatureApiAccess",
            "settings.planFeatureDedicatedManager",
        ],
    },
];

const STATUS_LABEL_KEYS = {
    active: "settings.statusActive",
    trialing: "settings.statusTrialing",
    past_due: "settings.statusPastDue",
    canceled: "settings.statusCanceled",
    unpaid: "settings.statusUnpaid",
    inactive: "settings.statusInactive",
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
    const auth = useAuth();
    const { addToast } = useToast();
    const { t, locale, changeLocale } = useI18n();
    const [form, setForm] = useState(org.currentOrg || {});
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Account deletion state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteInput, setDeleteInput] = useState("");
    const [deleting, setDeleting] = useState(false);

    const handleDeleteAccount = async () => {
        if (deleteInput !== auth.user?.email) return;
        setDeleting(true);
        try {
            const { error } = await supabase.functions.invoke("delete-account");
            if (error) throw new Error(error.message);
            await auth.signOut();
        } catch (err) {
            addToast(t("settings.deleteError", { message: err.message }), "error");
            setDeleting(false);
        }
    };

    // Subscription state
    const [billingInterval, setBillingInterval] = useState("monthly");
    const [checkoutLoading, setCheckoutLoading] = useState(null); // priceKey being loaded
    const [showPlans, setShowPlans] = useState(false);

    // Read ?success=true or ?canceled=true on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            if (params.get("success") === "true") {
                addToast(t("settings.subscriptionActivated"), "success");
                // Clean up URL without reload
                window.history.replaceState({}, "", "/app/settings");
            } else if (params.get("canceled") === "true") {
                addToast(t("settings.checkoutCanceled"), "info");
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
        if (!form.name?.trim()) { addToast(t("settings.errorNameRequired") || "Firmenname ist ein Pflichtfeld.", "error"); return; }
        if (!form.postal_code?.trim()) { addToast(t("settings.errorPostalCodeRequired") || "PLZ ist ein Pflichtfeld.", "error"); return; }
        if (!form.city?.trim()) { addToast(t("settings.errorCityRequired") || "Stadt ist ein Pflichtfeld.", "error"); return; }
        setSaving(true);
        const { error } = await supabase.from("organizations").update({
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
            late_fee_amount: Math.max(0, parseFloat(form.late_fee_amount) || 10),
            late_fee_grace_hours: parseInt(form.late_fee_grace_hours, 10) || 2,
        }).eq("id", org.currentOrg.id);
        setSaving(false);
        if (error) {
            addToast(error.message || "Speichern fehlgeschlagen.", "error");
            return;
        }
        org.reload();
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

            if (error) throw new Error(error.message || t("settings.unknownError"));
            if (!data?.url) throw new Error(t("settings.noCheckoutUrl"));

            if (!STRIPE_TRUSTED_PREFIXES.some(prefix => data.url.startsWith(prefix))) {
                throw new Error(t("settings.invalidCheckoutUrl"));
            }
            window.location.href = data.url;
        } catch (err) {
            console.error("Checkout error:", err);
            addToast(t("settings.checkoutError", { message: err.message }), "error");
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
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1A7D5A] to-[#3BAA82] flex items-center justify-center">
                        <Building className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">{t("settings.companyTitle")}</h3>
                        <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{t("settings.companySubtitle")}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{t("settings.companyName")}</label>
                        <input type="text" value={form.name || ""} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className={inputStyle} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{t("settings.address")}</label>
                            <input type="text" value={form.address || ""} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} className={inputStyle} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{t("settings.postalCode")}</label>
                                <input type="text" value={form.postal_code || ""} onChange={(e) => setForm(f => ({ ...f, postal_code: e.target.value }))} className={inputStyle} />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{t("settings.city")}</label>
                                <input type="text" value={form.city || ""} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} className={inputStyle} />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{t("settings.phone")}</label>
                            <input type="tel" value={form.phone || ""} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className={inputStyle} />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{t("settings.email")}</label>
                            <input type="email" value={form.email || ""} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className={inputStyle} />
                        </div>
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{t("settings.taxId")}</label>
                        <input type="text" value={form.tax_id || ""} onChange={(e) => setForm(f => ({ ...f, tax_id: e.target.value }))} className={inputStyle} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-gradient-to-r from-[#1A7D5A] to-[#3BAA82] text-white rounded-lg font-medium shadow-lg shadow-[#1A7D5A]/25 flex items-center gap-2">
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {t("settings.save")}
                    </button>
                    {saved && <span className="text-emerald-500 flex items-center gap-1"><Check className="w-4 h-4" /> {t("settings.saved")}</span>}
                </div>
            </div>

            {/* Branding Settings */}
            <div className={`rounded-2xl border p-6 ${cardStyle}`}>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                        <Palette className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">{t("settings.brandingTitle")}</h3>
                        <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{t("settings.brandingSubtitle")}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{t("settings.logoUrl")}</label>
                        <div className="flex gap-4">
                            <input
                                type="text"
                                placeholder="https://example.com/logo.png"
                                value={form.logo_url || ""}
                                onChange={(e) => setForm(f => ({ ...f, logo_url: e.target.value }))}
                                className={inputStyle}
                            />
                            {form.logo_url && /^https?:\/\/.+/.test(form.logo_url) && (
                                <div className="w-12 h-12 rounded-lg border border-slate-200 bg-white flex items-center justify-center p-1 shrink-0">
                                    <img src={form.logo_url} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                                </div>
                            )}
                        </div>
                        <p className={`text-xs mt-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            {t("settings.logoFormatHint")}
                        </p>
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{t("settings.primaryColor")}</label>
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
                        <h3 className="font-semibold text-lg">{t("settings.apiTitle")}</h3>
                        <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{t("settings.apiSubtitle")}</p>
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
                    {t("settings.apiDescription")}
                </p>
            </div>

            {/* Subscription */}
            <div className={`rounded-2xl border p-6 ${cardStyle}`}>
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">{t("settings.subscriptionTitle")}</h3>
                        <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{t("settings.subscriptionSubtitle")}</p>
                    </div>
                </div>

                {/* Current plan summary */}
                <div className={`flex items-center justify-between p-4 rounded-xl mb-4 ${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
                    <div>
                        <p className="font-semibold capitalize text-base">
                            {currentTier === "free" ? "Free" : currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} Plan
                        </p>
                        <p className={`text-sm mt-0.5 ${STATUS_COLORS[currentStatus] || "text-slate-400"}`}>
                            {STATUS_LABEL_KEYS[currentStatus] ? t(STATUS_LABEL_KEYS[currentStatus]) : currentStatus}
                            {isTrialing && org.currentOrg?.trial_ends_at && (
                                <span className={`ml-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    ({new Date(org.currentOrg.trial_ends_at).toLocaleDateString()})
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {isSubscribed && (
                            <button
                                onClick={() => { window.location.href = "mailto:support@rentcore.de?subject=Abo%20verwalten&body=Organisations-ID%3A%20" + (org.currentOrg?.id || ""); }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 border ${darkMode ? "border-slate-700 hover:bg-slate-700" : "border-slate-300 hover:bg-slate-100"}`}
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                {t("settings.managePlan")}
                            </button>
                        )}
                        <button
                            onClick={() => setShowPlans(v => !v)}
                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-medium"
                        >
                            {showPlans ? t("settings.close") : isSubscribed ? t("settings.changePlan") : t("settings.upgrade")}
                        </button>
                    </div>
                </div>

                {/* Plan selection */}
                {showPlans && (
                    <div>
                        {/* Billing interval toggle */}
                        <div className="flex items-center justify-center gap-3 mb-5">
                            <span className={`text-sm font-medium ${billingInterval === "monthly" ? "" : darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                {t("settings.billingMonthly")}
                            </span>
                            <button
                                onClick={() => setBillingInterval(v => v === "monthly" ? "yearly" : "monthly")}
                                className={`relative w-12 h-6 rounded-full transition-colors ${billingInterval === "yearly" ? "bg-violet-500" : darkMode ? "bg-slate-700" : "bg-slate-300"}`}
                            >
                                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${billingInterval === "yearly" ? "left-7" : "left-1"}`} />
                            </button>
                            <span className={`text-sm font-medium ${billingInterval === "yearly" ? "" : darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                {t("settings.billingYearly")}
                                <span className="ml-1.5 text-xs text-emerald-500 font-semibold">-17%</span>
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
                                                    {t("settings.popular")}
                                                </span>
                                            </div>
                                        )}
                                        {isCurrentPlan && (
                                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                                                    {t("settings.currentPlan")}
                                                </span>
                                            </div>
                                        )}

                                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-3`}>
                                            <Icon className="w-4 h-4 text-white" />
                                        </div>

                                        <p className="font-semibold text-base mb-1">{plan.label}</p>
                                        <div className="flex items-baseline gap-1 mb-3">
                                            <span className="text-2xl font-bold">€{price}</span>
                                            <span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{t("settings.perMonth")}</span>
                                        </div>

                                        <ul className="space-y-1.5 mb-4 flex-1">
                                            {plan.featureKeys.map((fKey) => (
                                                <li key={fKey} className={`flex items-start gap-1.5 text-xs ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                                                    <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                                    {t(fKey)}
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
                                            {isCurrentPlan ? t("settings.currentPlanLabel") : isLoading ? t("settings.redirecting") : t("settings.selectPlan")}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        <p className={`text-xs mt-4 text-center ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            {t("settings.trialNote")}
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
                        <h3 className="font-semibold text-lg">{t("settings.lateFeesTitle")}</h3>
                        <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{t("settings.lateFeesSubtitle")}</p>
                    </div>
                </div>

                <div className="space-y-5">
                    {/* Enable toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className={`text-sm font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{t("settings.lateFeesEnable")}</p>
                            <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{t("settings.lateFeesEnableHint")}</p>
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
                                <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{t("settings.lateFeeType")}</label>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setForm(f => ({ ...f, late_fee_type: "fixed" }))}
                                        className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                                            (form.late_fee_type || "fixed") === "fixed"
                                                ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400"
                                                : darkMode ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                                        }`}
                                    >
                                        {t("settings.lateFeeTypeFixed")}
                                    </button>
                                    <button
                                        onClick={() => setForm(f => ({ ...f, late_fee_type: "percentage" }))}
                                        className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                                            form.late_fee_type === "percentage"
                                                ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400"
                                                : darkMode ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                                        }`}
                                    >
                                        {t("settings.lateFeeTypePercentage")}
                                    </button>
                                </div>
                            </div>

                            {/* Fee amount */}
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                                    {form.late_fee_type === "percentage" ? t("settings.lateFeeAmountPercentage") : t("settings.lateFeeAmountFixed")}
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
                                        {" "}{t("settings.lateFeePerDay")}
                                    </span>
                                </div>
                            </div>

                            {/* Grace period */}
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{t("settings.lateFeesGracePeriod")}</label>
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
                                    <span className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{t("settings.lateFeesGracePeriodHint")}</span>
                                </div>
                            </div>

                            <div className={`rounded-lg p-3 text-sm ${darkMode ? "bg-slate-800 text-slate-400" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                                {t("settings.lateFeesNote")}
                            </div>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-3 mt-6">
                    <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-gradient-to-r from-[#1A7D5A] to-[#3BAA82] text-white rounded-lg font-medium shadow-lg shadow-[#1A7D5A]/25 flex items-center gap-2">
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {t("settings.save")}
                    </button>
                    {saved && <span className="text-emerald-500 flex items-center gap-1"><Check className="w-4 h-4" /> {t("settings.saved")}</span>}
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

            {/* Danger Zone */}
            <div className={`rounded-2xl border p-6 ${darkMode ? "bg-slate-900 border-red-900/40" : "bg-white border-red-200"}`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-600 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg text-red-600 dark:text-red-400">Danger Zone</h3>
                        <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{t("settings.dangerZoneSubtitle")}</p>
                    </div>
                </div>

                {!showDeleteConfirm ? (
                    <div className="flex items-center justify-between">
                        <div>
                            <p className={`text-sm font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{t("settings.deleteAccountTitle")}</p>
                            <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                {t("settings.deleteAccountDescription")}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="px-4 py-2 text-sm rounded-lg border border-red-500 text-red-500 hover:bg-red-500/10 transition-colors shrink-0 ml-4"
                        >
                            {t("settings.deleteAccount")}
                        </button>
                    </div>
                ) : (
                    <div className={`rounded-xl p-4 border ${darkMode ? "bg-red-900/20 border-red-800" : "bg-red-50 border-red-200"}`}>
                        <p className={`text-sm font-medium mb-1 ${darkMode ? "text-red-300" : "text-red-700"}`}>
                            {t("settings.deleteIrreversible")}
                        </p>
                        <p className={`text-xs mb-3 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                            {t("settings.deleteConfirmPrompt")} <strong>{auth.user?.email}</strong>
                        </p>
                        <input
                            type="email"
                            value={deleteInput}
                            onChange={(e) => setDeleteInput(e.target.value)}
                            placeholder={auth.user?.email}
                            className={`w-full px-3 py-2 rounded-lg border text-sm outline-none mb-3 ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"}`}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }}
                                className={`px-4 py-2 text-sm rounded-lg border transition-colors ${darkMode ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteInput !== auth.user?.email || deleting}
                                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                {t("settings.deleteConfirmButton")}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
