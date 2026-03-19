"use client";
import { useState } from "react";
import { CheckCircle, AlertTriangle, XCircle, Battery, Package } from "lucide-react";

const CHECKLIST_ITEMS = [
    { key: "rahmen", label: "Rahmen" },
    { key: "vorderrad", label: "Vorderrad" },
    { key: "hinterrad", label: "Hinterrad" },
    { key: "bremsen_vorne", label: "Bremsen vorne" },
    { key: "bremsen_hinten", label: "Bremsen hinten" },
    { key: "kette", label: "Kette" },
    { key: "schaltung", label: "Schaltung" },
    { key: "licht_vorne", label: "Licht vorne" },
    { key: "licht_hinten", label: "Licht hinten" },
    { key: "klingel", label: "Klingel" },
    { key: "sattel", label: "Sattel" },
];

const ACCESSORIES = [
    { key: "lock", label: "Schloss" },
    { key: "helm", label: "Helm" },
    { key: "korb", label: "Korb" },
];

const STATUS_BUTTONS = [
    { value: "ok", icon: CheckCircle, label: "OK", activeClass: "bg-emerald-500 text-white ring-2 ring-emerald-300", inactiveClass: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40" },
    { value: "check", icon: AlertTriangle, label: "Prüfen", activeClass: "bg-yellow-500 text-white ring-2 ring-yellow-300", inactiveClass: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/40" },
    { value: "defect", icon: XCircle, label: "Defekt", activeClass: "bg-red-500 text-white ring-2 ring-red-300", inactiveClass: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40" },
];

const defaultState = () => {
    const s = {};
    CHECKLIST_ITEMS.forEach(i => { s[i.key] = "ok"; });
    ACCESSORIES.forEach(a => { s[`zubehoer_${a.key}`] = false; });
    s.akku_prozent = 100;
    s.bemerkungen = "";
    return s;
};

export default function ConditionChecklist({ initialState, isEBike = false, darkMode, onChange }) {
    const [state, setState] = useState(() => ({ ...defaultState(), ...(initialState || {}) }));

    const update = (key, value) => {
        const next = { ...state, [key]: value };
        setState(next);
        onChange?.(next);
    };

    const card = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
    const sectionTitle = `text-xs font-bold uppercase tracking-wider mb-3 ${darkMode ? "text-slate-500" : "text-slate-400"}`;

    return (
        <div className="space-y-5">
            {/* Condition items */}
            <div className={`rounded-2xl border ${card} overflow-hidden`}>
                <div className="px-4 pt-4 pb-2">
                    <p className={sectionTitle}>Fahrzeugzustand</p>
                </div>
                <div className={`divide-y ${darkMode ? "divide-slate-800" : "divide-slate-100"}`}>
                    {CHECKLIST_ITEMS.map(item => {
                        const currentVal = state[item.key] || "ok";
                        return (
                            <div key={item.key} className="flex items-center justify-between px-4 py-3 gap-3">
                                <span className={`text-sm font-medium flex-1 min-w-0 ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                                    {item.label}
                                </span>
                                <div className="flex gap-1.5 shrink-0">
                                    {STATUS_BUTTONS.map(btn => {
                                        const Icon = btn.icon;
                                        const isActive = currentVal === btn.value;
                                        return (
                                            <button
                                                key={btn.value}
                                                onClick={() => update(item.key, btn.value)}
                                                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all min-w-[52px] justify-center ${isActive ? btn.activeClass : btn.inactiveClass}`}
                                                title={btn.label}
                                            >
                                                <Icon className="w-3.5 h-3.5" />
                                                <span className="hidden sm:inline">{btn.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Battery (E-Bike only) */}
            {isEBike && (
                <div className={`rounded-2xl border p-4 ${card}`}>
                    <div className={`flex items-center gap-2 mb-3 ${sectionTitle}`}>
                        <Battery className="w-4 h-4" />
                        Akkustand
                    </div>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={state.akku_prozent}
                            onChange={e => update("akku_prozent", parseInt(e.target.value))}
                            className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-[#1A7D5A]"
                            style={{ background: `linear-gradient(to right, #1A7D5A ${state.akku_prozent}%, #e2e8f0 ${state.akku_prozent}%)` }}
                        />
                        <span className={`font-mono font-bold text-lg w-14 text-right ${
                            state.akku_prozent > 60 ? "text-emerald-500"
                            : state.akku_prozent > 30 ? "text-yellow-500"
                            : "text-red-500"
                        }`}>
                            {state.akku_prozent}%
                        </span>
                    </div>
                </div>
            )}

            {/* Accessories */}
            <div className={`rounded-2xl border p-4 ${card}`}>
                <div className={`flex items-center gap-2 mb-3 ${sectionTitle}`}>
                    <Package className="w-4 h-4" />
                    Zubehör vorhanden
                </div>
                <div className="flex gap-3 flex-wrap">
                    {ACCESSORIES.map(acc => {
                        const key = `zubehoer_${acc.key}`;
                        const checked = !!state[key];
                        return (
                            <button
                                key={acc.key}
                                onClick={() => update(key, !checked)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                                    checked
                                        ? "bg-[#1A7D5A] text-white border-[#1A7D5A] shadow-sm"
                                        : darkMode
                                            ? "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                                }`}
                            >
                                <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${checked ? "border-white" : darkMode ? "border-slate-600" : "border-slate-300"}`}>
                                    {checked && <CheckCircle className="w-3 h-3 text-white" />}
                                </span>
                                {acc.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Notes */}
            <div className={`rounded-2xl border p-4 ${card}`}>
                <label className={`block ${sectionTitle} mb-2`}>Bemerkungen</label>
                <textarea
                    value={state.bemerkungen}
                    onChange={e => update("bemerkungen", e.target.value)}
                    placeholder="Sonstige Anmerkungen zum Zustand des Fahrzeugs…"
                    rows={3}
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none text-sm resize-none transition-colors ${
                        darkMode
                            ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 focus:border-[#1A7D5A]"
                            : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#1A7D5A]"
                    }`}
                />
            </div>
        </div>
    );
}
