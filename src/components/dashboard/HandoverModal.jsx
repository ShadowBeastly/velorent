"use client";
import { useState, useEffect } from "react";
import { X, Battery, AlertTriangle, CheckCircle, ClipboardList } from "lucide-react";

const RETURN_CHECKLIST = [
    { key: "brakes",      label: "Bremsen" },
    { key: "tire_front",  label: "Reifen vorne" },
    { key: "tire_rear",   label: "Reifen hinten" },
    { key: "chain",       label: "Kette" },
    { key: "light_front", label: "Licht vorne" },
    { key: "light_rear",  label: "Licht hinten" },
    { key: "frame",       label: "Rahmen" },
    { key: "bell",        label: "Klingel" },
    { key: "saddle",      label: "Sattel" },
];

const CONDITION_OPTIONS = [
    { value: "ok",      label: "OK",     classes: "bg-emerald-500 text-white" },
    { value: "check",   label: "Prüfen", classes: "bg-amber-500 text-white" },
    { value: "defect",  label: "Defekt", classes: "bg-rose-500 text-white" },
];

export default function HandoverModal({ booking, type, onConfirm, onClose, darkMode }) {
    const isPickup = type === "pickup";
    const [batteryLevel, setBatteryLevel] = useState(100);
    const [notes, setNotes] = useState("");
    const [damages, setDamages] = useState([]);
    const [newDamage, setNewDamage] = useState("");
    const [checklist, setChecklist] = useState({});

    const isEBike = booking?.bike?.category?.toLowerCase().includes("e-bike") ||
        booking?.bike?.category?.toLowerCase().includes("e-mtb");

    const checklistItems = isPickup ? [] : RETURN_CHECKLIST.filter(item =>
        isEBike || !["light_front", "light_rear"].includes(item.key)
    );

    const checklistComplete = isPickup || checklistItems.every(item => checklist[item.key]);

    const handleConfirm = () => {
        const protocol = {
            type,
            date: new Date().toISOString(),
            batteryLevel,
            notes,
            damages,
            checklist: !isPickup ? checklist : undefined,
        };
        onConfirm(protocol);
    };

    const addDamage = () => {
        if (newDamage.trim()) {
            setDamages([...damages, newDamage.trim()]);
            setNewDamage("");
        }
    };

    const cardStyle = darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900";
    const inputStyle = darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900";

    // Escape key closes the modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="handover-modal-title"
                className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${cardStyle}`}
            >

                {/* Header */}
                <div className={`p-4 border-b flex items-center justify-between ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                    <h2 id="handover-modal-title" className="font-semibold text-lg flex items-center gap-2">
                        {isPickup ? "Übergabe (Check-out)" : "Rücknahme (Check-in)"}
                    </h2>
                    <button onClick={onClose} aria-label="Schließen" className={`p-2 rounded-full transition-colors ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Bike Info */}
                    <div className={`p-4 rounded-xl border ${darkMode ? "bg-slate-950/50 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                        <div className="text-sm font-medium text-slate-500 mb-1">Fahrrad</div>
                        <div className="font-semibold text-lg">{booking.bike?.name}</div>
                        <div className="text-sm text-slate-500">{booking.bike?.category} • {booking.bike?.size}</div>
                    </div>

                    {/* Battery Level */}
                    <div>
                        <label className="text-sm font-medium mb-2 flex items-center gap-2">
                            <Battery className="w-4 h-4 text-emerald-500" />
                            Akkustand (%)
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={batteryLevel}
                                onChange={(e) => setBatteryLevel(parseInt(e.target.value))}
                                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1A7D5A]"
                            />
                            <span className="font-mono font-bold w-12 text-right">{batteryLevel}%</span>
                        </div>
                    </div>

                    {/* Return Checklist */}
                    {!isPickup && checklistItems.length > 0 && (
                        <div>
                            <label className="text-sm font-medium mb-3 flex items-center gap-2">
                                <ClipboardList className="w-4 h-4 text-blue-500" />
                                Rückgabe-Checkliste <span className="text-rose-500">*</span>
                            </label>
                            <div className="space-y-2">
                                {checklistItems.map(item => (
                                    <div key={item.key} className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${darkMode ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50"}`}>
                                        <span className="text-sm font-medium">{item.label}</span>
                                        <div className="flex gap-1">
                                            {CONDITION_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setChecklist(c => ({ ...c, [item.key]: opt.value }))}
                                                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                                                        checklist[item.key] === opt.value
                                                            ? opt.classes
                                                            : darkMode ? "bg-slate-700 text-slate-400 hover:bg-slate-600" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-100"
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {!checklistComplete && (
                                <p className="text-xs text-rose-500 mt-2">Bitte alle Punkte bewerten, um die Rücknahme abzuschließen.</p>
                            )}
                        </div>
                    )}

                    {/* Damages */}
                    <div>
                        <label className="text-sm font-medium mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            Schäden / Mängel
                        </label>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={newDamage}
                                onChange={(e) => setNewDamage(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addDamage()}
                                placeholder="z.B. Kratzer am Rahmen..."
                                className={`flex-1 px-3 py-2 rounded-lg border outline-none text-sm ${inputStyle}`}
                            />
                            <button
                                onClick={addDamage}
                                aria-label="Schaden hinzufügen"
                                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                +
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {damages.map((d, i) => (
                                <span key={i} className={`text-xs px-2 py-1 rounded-md border flex items-center gap-2 ${darkMode ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-rose-50 border-rose-100 text-rose-600"}`}>
                                    {d}
                                    <button onClick={() => setDamages(damages.filter((_, idx) => idx !== i))} aria-label={`Schaden entfernen: ${d}`} className="hover:text-rose-800">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                            {damages.length === 0 && (
                                <span className="text-xs text-slate-500 italic">Keine neuen Schäden erfasst.</span>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Notizen</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg border outline-none text-sm min-h-[80px] ${inputStyle}`}
                            placeholder="Sonstige Anmerkungen..."
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className={`p-4 border-t flex justify-end gap-3 ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                    <button
                        onClick={onClose}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${darkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-600"}`}
                    >
                        Abbrechen
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!checklistComplete}
                        className="px-6 py-2 bg-gradient-to-r from-[#1A7D5A] to-[#3BAA82] text-white rounded-lg font-medium shadow-lg shadow-[#1A7D5A]/25 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <CheckCircle className="w-4 h-4" />
                        {isPickup ? "Übergabe bestätigen" : "Rücknahme bestätigen"}
                    </button>
                </div>
            </div>
        </div>
    );
}
