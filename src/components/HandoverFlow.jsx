"use client";
// M10: HandoverFlow stub — full implementation in feat/m10-damage-docs
// This stub satisfies the build on the M7 branch
import { useState } from "react";
import { Check, Camera, ChevronRight } from "lucide-react";
import SignaturePad from "./SignaturePad";

const CHECKLIST_ITEMS = [
    { id: "frame", label: "Rahmen" },
    { id: "wheels", label: "Räder / Reifen" },
    { id: "brakes", label: "Bremsen" },
    { id: "chain", label: "Kette / Schaltung" },
    { id: "lights", label: "Beleuchtung" },
    { id: "bell", label: "Klingel" },
    { id: "saddle", label: "Sattel" },
    { id: "accessories", label: "Zubehör" },
    { id: "battery", label: "Akku (E-Bike)" },
];

export default function HandoverFlow({
    booking,
    bike,
    type = "pickup",
    onComplete,
    onCancel,
    darkMode,
}) {
    const [step, setStep] = useState(0);
    const [checklist, setChecklist] = useState({});
    const [notes, setNotes] = useState("");
    const [signature, setSignature] = useState(null);
    const [saving, setSaving] = useState(false);

    const toggleCheck = (id, value) => {
        setChecklist(prev => ({ ...prev, [id]: value }));
    };

    const handleComplete = async () => {
        setSaving(true);
        try {
            await onComplete?.({
                checklist,
                bikeConditionNotes: notes,
                photos: [],
                annotations: [],
                signature,
            });
        } finally {
            setSaving(false);
        }
    };

    const STEPS = ["Checkliste", "Notizen & Unterschrift", "Abschluss"];

    const card = `rounded-2xl border p-6 ${darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`;
    const inputCls = `w-full px-3 py-2 rounded-xl border text-sm outline-none ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`;

    return (
        <div className="max-w-2xl mx-auto space-y-6 py-6">
            {/* Header */}
            <div className={card}>
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[#1A7D5A]/10 flex items-center justify-center">
                        <Camera className="w-6 h-6 text-[#1A7D5A]" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white">
                            {type === "pickup" ? "Ausgabe-Protokoll" : "Rücknahme-Protokoll"}
                        </h1>
                        <p className="text-sm text-slate-500">{bike?.name || "Fahrrad"} — {booking?.customer_name || "Kunde"}</p>
                    </div>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-2">
                    {STEPS.map((s, i) => (
                        <div key={s} className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i === step ? "bg-[#1A7D5A] text-white" : i < step ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"}`}>
                                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                            </div>
                            <span className={`text-xs font-semibold hidden sm:inline ${i === step ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>{s}</span>
                            {i < STEPS.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Step 0: Checklist */}
            {step === 0 && (
                <div className={card}>
                    <h2 className="font-bold text-slate-900 dark:text-white mb-4">Fahrzeugzustand prüfen</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {CHECKLIST_ITEMS.map(item => (
                            <div key={item.id} className={`rounded-xl p-3 border ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-2">{item.label}</p>
                                <div className="flex gap-2">
                                    {["ok", "defect", "missing"].map(v => (
                                        <button
                                            key={v}
                                            onClick={() => toggleCheck(item.id, v)}
                                            className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all border ${checklist[item.id] === v
                                                ? v === "ok" ? "bg-emerald-500 text-white border-emerald-600" : v === "defect" ? "bg-red-500 text-white border-red-600" : "bg-amber-400 text-amber-900 border-amber-500"
                                                : (darkMode ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-50")
                                            }`}
                                        >
                                            {v === "ok" ? "OK" : v === "defect" ? "Defekt" : "Fehlt"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 1: Notes + Signature */}
            {step === 1 && (
                <div className={card}>
                    <h2 className="font-bold text-slate-900 dark:text-white mb-4">Notizen & Unterschrift</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1 block">Zustandsnotizen</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={3}
                                placeholder="Besondere Hinweise zum Fahrzeugzustand..."
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1 block">Kundenunterschrift</label>
                            <SignaturePad
                                onSave={setSignature}
                                width={500}
                                height={150}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: Summary */}
            {step === 2 && (
                <div className={card}>
                    <h2 className="font-bold text-slate-900 dark:text-white mb-4">Zusammenfassung</h2>
                    <div className="space-y-2">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Checkliste: <strong>{Object.keys(checklist).length}/{CHECKLIST_ITEMS.length}</strong> Positionen geprüft
                        </p>
                        {Object.values(checklist).some(v => v === "defect") && (
                            <p className="text-sm text-red-500 font-semibold">⚠ Defekte festgestellt — Kaution wird einbehalten.</p>
                        )}
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Unterschrift: {signature ? "✓ Vorhanden" : "Nicht erfasst"}
                        </p>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3">
                <button
                    onClick={step === 0 ? onCancel : () => setStep(s => s - 1)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${darkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                >
                    {step === 0 ? "Abbrechen" : "Zurück"}
                </button>
                {step < STEPS.length - 1 ? (
                    <button
                        onClick={() => setStep(s => s + 1)}
                        className="flex-1 py-2.5 rounded-xl bg-[#1A7D5A] hover:bg-[#155f44] text-white text-sm font-semibold transition-colors"
                    >
                        Weiter
                    </button>
                ) : (
                    <button
                        onClick={handleComplete}
                        disabled={saving}
                        className="flex-1 py-2.5 rounded-xl bg-[#1A7D5A] hover:bg-[#155f44] disabled:opacity-60 text-white text-sm font-bold transition-colors"
                    >
                        {saving ? "Speichern..." : "Protokoll abschließen"}
                    </button>
                )}
            </div>
        </div>
    );
}
