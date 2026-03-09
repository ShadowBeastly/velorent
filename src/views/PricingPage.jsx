"use client";
import { useState, useMemo } from "react";
import {
    Plus, Loader2, Pencil, Trash2, X, Check, Tag,
    Calendar, Clock, Percent, TrendingUp, TrendingDown,
    AlertCircle, ToggleLeft, ToggleRight
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useData } from "../context/DataContext";
import { useToast } from "../components/ui/Toast";
import { fmtCurrency } from "../utils/formatters";
import { calculateDynamicPrice } from "../utils/calculatePrice";

// ─── Constants ────────────────────────────────────────────────────────────────

const RULE_TYPES = [
    { value: "seasonal", label: "Saison", description: "Auf-/Abschlag in einem Datumsbereich" },
    { value: "weekend", label: "Wochenende", description: "Auf-/Abschlag an bestimmten Wochentagen" },
    { value: "duration", label: "Aufenthaltsdauer", description: "Rabatt ab Mindestanzahl von Tagen" }
];

const MODIFIER_TYPES = [
    { value: "multiplier", label: "Multiplikator", example: "z.B. 1.2 = +20 %" },
    { value: "discount_percent", label: "Rabatt in %", example: "z.B. 15 = 15 % Rabatt" },
    { value: "fixed_override", label: "Fixer Preis/Tag", example: "z.B. 45 = 45 €/Tag" }
];

const WEEKDAYS = [
    { day: 1, label: "Mo" },
    { day: 2, label: "Di" },
    { day: 3, label: "Mi" },
    { day: 4, label: "Do" },
    { day: 5, label: "Fr" },
    { day: 6, label: "Sa" },
    { day: 0, label: "So" }
];

const EMPTY_RULE = {
    name: "",
    type: "seasonal",
    modifier_type: "multiplier",
    modifier_value: 1.2,
    start_date: "",
    end_date: "",
    min_days: 7,
    days_of_week: [5, 6],
    bike_category: "",
    is_active: true,
    priority: 0
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function modifierLabel(rule) {
    switch (rule.modifier_type) {
        case "multiplier": {
            const v = Number(rule.modifier_value);
            const pct = Math.round((v - 1) * 100);
            return pct >= 0 ? `+${pct} %` : `${pct} %`;
        }
        case "discount_percent":
            return `−${rule.modifier_value} %`;
        case "fixed_override":
            return fmtCurrency(rule.modifier_value) + "/Tag";
        default:
            return String(rule.modifier_value);
    }
}

function typeIcon(type) {
    if (type === "seasonal") return <Calendar className="w-4 h-4" />;
    if (type === "weekend") return <Clock className="w-4 h-4" />;
    return <Percent className="w-4 h-4" />;
}

function typeColor(type) {
    if (type === "seasonal") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    if (type === "weekend") return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
}

function modifierIsPositive(rule) {
    if (rule.modifier_type === "multiplier") return Number(rule.modifier_value) >= 1;
    if (rule.modifier_type === "discount_percent") return false;
    return null; // fixed_override – neutral
}

// ─── Rule Modal ───────────────────────────────────────────────────────────────

function RuleModal({ rule, bikeCategories, onSave, onClose, darkMode }) {
    const [form, setForm] = useState(rule ? { ...rule } : { ...EMPTY_RULE });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const set = (updates) => setForm(f => ({ ...f, ...updates }));

    const toggleWeekday = (day) => {
        set({ days_of_week: form.days_of_week?.includes(day)
            ? form.days_of_week.filter(d => d !== day)
            : [...(form.days_of_week || []), day]
        });
    };

    const validate = () => {
        if (!form.name.trim()) return "Bitte einen Namen eingeben.";
        if (form.type === "seasonal" && (!form.start_date || !form.end_date))
            return "Bitte Start- und Enddatum angeben.";
        if (form.type === "seasonal" && form.start_date > form.end_date)
            return "Startdatum muss vor dem Enddatum liegen.";
        if (form.type === "duration" && (!form.min_days || form.min_days < 1))
            return "Mindestanzahl Tage muss ≥ 1 sein.";
        if (form.type === "weekend" && (!form.days_of_week || form.days_of_week.length === 0))
            return "Bitte mindestens einen Wochentag auswählen.";
        if (!form.modifier_value && form.modifier_value !== 0)
            return "Bitte einen Wert für den Modifier eingeben.";
        return null;
    };

    const handleSave = async () => {
        const err = validate();
        if (err) { setError(err); return; }
        setError(null);
        setSaving(true);
        await onSave(form);
        setSaving(false);
    };

    const modalBg = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
    const inputStyle = `w-full px-3 py-2 rounded-lg border outline-none transition-colors text-sm ${darkMode ? "bg-slate-800 border-slate-700 focus:border-brand-500 text-white" : "bg-white border-slate-300 focus:border-brand-500"}`;
    const labelStyle = `block text-xs font-semibold uppercase tracking-wide mb-1.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${modalBg}`}>
                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-500/10 rounded-lg">
                            <Tag className="w-5 h-5 text-brand-500" />
                        </div>
                        <h3 className="font-semibold text-base">
                            {rule ? "Preisregel bearbeiten" : "Neue Preisregel"}
                        </h3>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-lg ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                    {/* Name */}
                    <div>
                        <label className={labelStyle}>Name der Regel</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => set({ name: e.target.value })}
                            className={inputStyle}
                            placeholder="z.B. Hochsaison Juli–August"
                            autoFocus
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className={labelStyle}>Regeltyp</label>
                        <div className="grid grid-cols-3 gap-2">
                            {RULE_TYPES.map(t => (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => set({ type: t.value })}
                                    className={`p-3 rounded-xl border text-left transition-all ${form.type === t.value
                                        ? "border-brand-500 bg-brand-500/10 ring-1 ring-brand-500"
                                        : darkMode ? "border-slate-700 hover:border-slate-600 bg-slate-800" : "border-slate-200 hover:border-slate-300"
                                    }`}
                                >
                                    <div className="text-xs font-semibold mb-1">{t.label}</div>
                                    <div className={`text-xs leading-tight ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{t.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Type-specific fields */}
                    {form.type === "seasonal" && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelStyle}>Von</label>
                                <input type="date" value={form.start_date || ""} onChange={e => set({ start_date: e.target.value })} className={inputStyle} />
                            </div>
                            <div>
                                <label className={labelStyle}>Bis</label>
                                <input type="date" value={form.end_date || ""} onChange={e => set({ end_date: e.target.value })} className={inputStyle} />
                            </div>
                        </div>
                    )}

                    {form.type === "duration" && (
                        <div>
                            <label className={labelStyle}>Mindestanzahl Tage</label>
                            <input
                                type="number"
                                min={1}
                                value={form.min_days || ""}
                                onChange={e => set({ min_days: parseInt(e.target.value, 10) || "" })}
                                className={inputStyle}
                                placeholder="z.B. 7"
                            />
                            <p className={`mt-1 text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                Rabatt greift ab dieser Anzahl an gebuchten Tagen.
                            </p>
                        </div>
                    )}

                    {form.type === "weekend" && (
                        <div>
                            <label className={labelStyle}>Wochentage</label>
                            <div className="flex gap-2 flex-wrap">
                                {WEEKDAYS.map(({ day, label }) => (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => toggleWeekday(day)}
                                        className={`w-10 h-10 rounded-lg text-xs font-semibold border transition-all ${(form.days_of_week || []).includes(day)
                                            ? "bg-brand-500 text-white border-brand-500"
                                            : darkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-500"
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Modifier */}
                    <div>
                        <label className={labelStyle}>Preismodifikator</label>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            {MODIFIER_TYPES.map(m => (
                                <button
                                    key={m.value}
                                    type="button"
                                    onClick={() => set({ modifier_type: m.value })}
                                    className={`p-2.5 rounded-lg border text-left transition-all ${form.modifier_type === m.value
                                        ? "border-brand-500 bg-brand-500/10 ring-1 ring-brand-500"
                                        : darkMode ? "border-slate-700 hover:border-slate-600 bg-slate-800" : "border-slate-200 hover:border-slate-300"
                                    }`}
                                >
                                    <div className="text-xs font-semibold">{m.label}</div>
                                    <div className={`text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{m.example}</div>
                                </button>
                            ))}
                        </div>
                        <input
                            type="number"
                            step="0.01"
                            value={form.modifier_value ?? ""}
                            onChange={e => set({ modifier_value: parseFloat(e.target.value) || 0 })}
                            className={inputStyle}
                            placeholder={
                                form.modifier_type === "multiplier" ? "z.B. 1.2"
                                : form.modifier_type === "discount_percent" ? "z.B. 15"
                                : "z.B. 45"
                            }
                        />
                    </div>

                    {/* Category scope */}
                    <div>
                        <label className={labelStyle}>Kategorie <span className="font-normal normal-case text-slate-400">(leer = alle)</span></label>
                        <select
                            value={form.bike_category || ""}
                            onChange={e => set({ bike_category: e.target.value || null })}
                            className={inputStyle}
                        >
                            <option value="">Alle Kategorien</option>
                            {bikeCategories.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Priority & Active */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelStyle}>Priorität</label>
                            <input
                                type="number"
                                min={0}
                                value={form.priority ?? 0}
                                onChange={e => set({ priority: parseInt(e.target.value, 10) || 0 })}
                                className={inputStyle}
                            />
                            <p className={`mt-1 text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                Höhere Zahl = gewinnt bei Überschneidung
                            </p>
                        </div>
                        <div className="flex flex-col">
                            <label className={labelStyle}>Status</label>
                            <button
                                type="button"
                                onClick={() => set({ is_active: !form.is_active })}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${form.is_active
                                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                                    : darkMode ? "border-slate-700 bg-slate-800 text-slate-400" : "border-slate-200 text-slate-500"
                                }`}
                            >
                                {form.is_active
                                    ? <ToggleRight className="w-5 h-5" />
                                    : <ToggleLeft className="w-5 h-5" />
                                }
                                <span className="text-sm font-medium">{form.is_active ? "Aktiv" : "Inaktiv"}</span>
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`flex justify-end gap-3 px-6 py-4 border-t ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
                    <button onClick={onClose} className={`px-4 py-2 rounded-lg text-sm ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}>
                        Abbrechen
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-lg text-sm font-medium shadow-lg shadow-brand-500/25 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Speichern
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Preview Block ─────────────────────────────────────────────────────────────

function PricingPreview({ pricingRules, bikes, darkMode }) {
    // Pick a sample bike and show a few example scenarios
    const sampleBike = bikes[0];
    if (!sampleBike || pricingRules.filter(r => r.is_active).length === 0) return null;

    const today = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const scenarios = [
        { label: "3 Tage ab heute", start: fmt(today), end: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2)) },
        { label: "7 Tage im Juli", start: `${today.getFullYear()}-07-01`, end: `${today.getFullYear()}-07-07` },
        { label: "2 Tage, Sa–So", start: fmt((() => { const d = new Date(today); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); return d; })()), end: fmt((() => { const d = new Date(today); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7) + 1); return d; })()) }
    ];

    const cardStyle = darkMode ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200";

    return (
        <div className={`rounded-2xl border p-5 ${cardStyle}`}>
            <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                <TrendingUp className="w-4 h-4 text-brand-500" />
                Vorschau — {sampleBike.name} ({fmtCurrency(sampleBike.price_per_day)}/Tag Basispreis)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {scenarios.map((sc, i) => {
                    const result = calculateDynamicPrice(sampleBike, sc.start, sc.end, pricingRules);
                    const base = result.baseTotal;
                    const final = result.totalPrice;
                    const diff = final - base;
                    const days = result.dailyBreakdown.length;
                    return (
                        <div key={i} className={`p-4 rounded-xl border ${darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
                            <div className={`text-xs font-medium mb-2 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{sc.label}</div>
                            <div className="flex items-baseline gap-1 mb-1">
                                <span className="text-lg font-bold text-brand-500">{fmtCurrency(final)}</span>
                                {Math.abs(diff) > 0.01 && (
                                    <span className={`text-xs font-medium ${diff > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                                        ({diff > 0 ? "+" : ""}{fmtCurrency(diff)})
                                    </span>
                                )}
                            </div>
                            <div className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                {days} Tage · Basis: {fmtCurrency(base)}
                            </div>
                            {diff !== 0 && (
                                <div className={`mt-2 flex items-center gap-1 text-xs ${diff > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                                    {diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {Math.abs(Math.round((diff / base) * 100))} % {diff > 0 ? "Aufschlag" : "Ersparnis"}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function PricingPage() {
    const { darkMode } = useApp();
    const { pricingRules: rulesCtx, bikeCategories, bikes } = useData();
    const { addToast } = useToast();

    const [showModal, setShowModal] = useState(false);
    const [editRule, setEditRule] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const rules = rulesCtx?.rules || [];
    const loading = rulesCtx?.loading;

    const categories = useMemo(() => bikeCategories?.categories || [], [bikeCategories]);
    const allBikes = useMemo(() => bikes?.bikes || [], [bikes]);

    const cardStyle = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
    const tableHeaderStyle = darkMode ? "bg-slate-900 text-slate-400" : "bg-slate-50 text-slate-500";
    const tableRowStyle = darkMode ? "border-slate-800 hover:bg-slate-800/50" : "border-slate-100 hover:bg-slate-50";

    const handleSave = async (data) => {
        try {
            if (editRule) {
                await rulesCtx.update(editRule.id, data);
                addToast("Preisregel aktualisiert.", "success");
            } else {
                await rulesCtx.create(data);
                addToast("Preisregel erstellt.", "success");
            }
            setShowModal(false);
            setEditRule(null);
        } catch (err) {
            console.error("Error saving pricing rule:", err);
            addToast("Fehler beim Speichern.", "error");
        }
    };

    const handleDelete = async (id) => {
        try {
            await rulesCtx.remove(id);
            addToast("Preisregel gelöscht.", "success");
        } catch (err) {
            console.error("Error deleting pricing rule:", err);
            addToast("Fehler beim Löschen.", "error");
        }
        setConfirmDelete(null);
    };

    const handleToggle = async (rule) => {
        try {
            await rulesCtx.update(rule.id, { is_active: !rule.is_active });
        } catch (err) {
            console.error("Error toggling rule:", err);
            addToast("Fehler beim Aktualisieren.", "error");
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className={`rounded-2xl border p-4 ${cardStyle} flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-500/10 rounded-xl">
                        <Tag className="w-5 h-5 text-brand-500" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-base">Dynamische Preisgestaltung</h2>
                        <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                            {rules.length} Regel{rules.length !== 1 ? "n" : ""} definiert · {rules.filter(r => r.is_active).length} aktiv
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => { setEditRule(null); setShowModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-lg text-sm font-medium shadow-lg shadow-brand-500/25 whitespace-nowrap"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Neue Regel</span>
                </button>
            </div>

            {/* Preview */}
            {allBikes.length > 0 && (
                <PricingPreview pricingRules={rules} bikes={allBikes} darkMode={darkMode} />
            )}

            {/* Rules Table */}
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                </div>
            ) : (
                <div className={`rounded-2xl border overflow-hidden ${cardStyle}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className={`text-xs uppercase font-semibold ${tableHeaderStyle}`}>
                                <tr>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Typ</th>
                                    <th className="px-6 py-4">Bedingung</th>
                                    <th className="px-6 py-4">Modifier</th>
                                    <th className="px-6 py-4">Kategorie</th>
                                    <th className="px-6 py-4 text-center">Priorität</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${darkMode ? "divide-slate-800" : "divide-slate-100"}`}>
                                {rules.map(rule => {
                                    const positive = modifierIsPositive(rule);
                                    return (
                                        <tr key={rule.id} className={`transition-colors ${tableRowStyle} ${!rule.is_active ? "opacity-50" : ""}`}>
                                            <td className="px-6 py-4 font-medium">{rule.name}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${typeColor(rule.type)}`}>
                                                    {typeIcon(rule.type)}
                                                    {RULE_TYPES.find(t => t.value === rule.type)?.label || rule.type}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                                {rule.type === "seasonal" && rule.start_date && rule.end_date && (
                                                    <>{new Date(rule.start_date + "T00:00:00").toLocaleDateString("de-DE")} – {new Date(rule.end_date + "T00:00:00").toLocaleDateString("de-DE")}</>
                                                )}
                                                {rule.type === "duration" && rule.min_days && (
                                                    <>ab {rule.min_days} Tage</>
                                                )}
                                                {rule.type === "weekend" && rule.days_of_week && (
                                                    <>{(rule.days_of_week || []).map(d => WEEKDAYS.find(w => w.day === d)?.label || d).join(", ")}</>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${positive === true ? "text-amber-500" : positive === false ? "text-emerald-500" : darkMode ? "text-slate-300" : "text-slate-700"}`}>
                                                    {positive === true && <TrendingUp className="w-3.5 h-3.5" />}
                                                    {positive === false && <TrendingDown className="w-3.5 h-3.5" />}
                                                    {modifierLabel(rule)}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                                {rule.bike_category || <span className="italic text-slate-400">Alle</span>}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                                                    {rule.priority ?? 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleToggle(rule)}
                                                    className={`transition-colors ${rule.is_active ? "text-emerald-500 hover:text-emerald-600" : "text-slate-400 hover:text-slate-600"}`}
                                                    title={rule.is_active ? "Deaktivieren" : "Aktivieren"}
                                                >
                                                    {rule.is_active
                                                        ? <ToggleRight className="w-5 h-5" />
                                                        : <ToggleLeft className="w-5 h-5" />
                                                    }
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => { setEditRule(rule); setShowModal(true); }}
                                                        className={`p-1.5 rounded-md transition-colors ${darkMode ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"}`}
                                                        title="Bearbeiten"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmDelete(rule.id)}
                                                        className={`p-1.5 rounded-md transition-colors ${darkMode ? "hover:bg-rose-900/30 text-slate-400 hover:text-rose-400" : "hover:bg-rose-50 text-slate-500 hover:text-rose-500"}`}
                                                        title="Löschen"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {rules.length === 0 && (
                            <div className="p-12 text-center">
                                <Tag className={`w-10 h-10 mx-auto mb-3 ${darkMode ? "text-slate-600" : "text-slate-300"}`} />
                                <p className={`font-medium mb-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Noch keine Preisregeln</p>
                                <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                    Erstelle Saisonpreise, Wochenend-Aufschläge oder Langzeit-Rabatte.
                                </p>
                                <button
                                    onClick={() => { setEditRule(null); setShowModal(true); }}
                                    className="mt-4 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-lg text-sm font-medium shadow-lg shadow-brand-500/25"
                                >
                                    Erste Regel erstellen
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Delete confirmation */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl ${cardStyle}`}>
                        <h4 className="font-semibold mb-2">Preisregel löschen?</h4>
                        <p className={`text-sm mb-5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                            Diese Aktion kann nicht rückgängig gemacht werden.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setConfirmDelete(null)} className={`px-4 py-2 rounded-lg text-sm ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}>Abbrechen</button>
                            <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium">Löschen</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rule Modal */}
            {showModal && (
                <RuleModal
                    rule={editRule}
                    bikeCategories={categories}
                    onSave={handleSave}
                    onClose={() => { setShowModal(false); setEditRule(null); }}
                    darkMode={darkMode}
                />
            )}
        </div>
    );
}
