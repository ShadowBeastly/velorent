"use client";
import { useState, useEffect } from "react";
import { X, ShieldCheck, ShieldOff, Loader2 } from "lucide-react";

const fmtEur = (n) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);

export default function DepositActionModal({ isOpen, deposit, onRelease, onCharge, onClose, darkMode }) {
    const [chargeAmount, setChargeAmount] = useState("");
    const [chargeReason, setChargeReason] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && deposit) {
            setChargeAmount(String(deposit.amount ?? ""));
            setChargeReason("");
            setError(null);
        }
    }, [isOpen, deposit]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !deposit) return null;

    const maxAmount = Number(deposit.amount) || 0;
    const parsed = parseFloat(chargeAmount);
    const chargeAmountValid = !isNaN(parsed) && parsed > 0 && parsed <= maxAmount;

    const handleRelease = async () => {
        setSaving(true);
        setError(null);
        try {
            await onRelease();
        } catch (err) {
            setError(err.message || "Fehler beim Freigeben");
        } finally {
            setSaving(false);
        }
    };

    const handleCharge = async () => {
        if (!chargeAmountValid) {
            setError(`Betrag muss zwischen 0,01 € und ${fmtEur(maxAmount)} liegen.`);
            return;
        }
        if (!chargeReason.trim()) {
            setError("Bitte einen Grund für die Einbehaltung angeben.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await onCharge(parsed, chargeReason.trim());
        } catch (err) {
            setError(err.message || "Fehler beim Einbehalten");
        } finally {
            setSaving(false);
        }
    };

    const cardStyle = darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900";
    const inputStyle = `w-full px-3 py-2 rounded-lg border outline-none text-sm transition-colors ${darkMode ? "bg-slate-800 border-slate-700 focus:border-[#1A7D5A] text-white" : "bg-white border-slate-300 focus:border-[#1A7D5A]"}`;
    const labelStyle = `block text-sm font-medium mb-1.5 ${darkMode ? "text-slate-300" : "text-slate-700"}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="deposit-modal-title"
                className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${cardStyle}`}
            >
                {/* Header */}
                <div className={`p-4 border-b flex items-center justify-between ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                    <div>
                        <h2 id="deposit-modal-title" className="font-semibold text-lg">Kaution verwalten</h2>
                        <p className={`text-sm mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                            Hinterlegte Kaution: <span className="font-semibold">{fmtEur(deposit.amount)}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Schließen"
                        className={`p-2 rounded-full transition-colors ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Release section */}
                    <div className={`p-4 rounded-xl border ${darkMode ? "bg-emerald-900/10 border-emerald-800/40" : "bg-emerald-50 border-emerald-100"}`}>
                        <h3 className={`font-semibold mb-2 flex items-center gap-2 ${darkMode ? "text-emerald-300" : "text-emerald-700"}`}>
                            <ShieldCheck className="w-4 h-4" />
                            Kaution freigeben
                        </h3>
                        <p className={`text-sm mb-3 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                            Gibt die volle Kautionssumme ({fmtEur(deposit.amount)}) an den Kunden zurück.
                        </p>
                        <button
                            onClick={handleRelease}
                            disabled={saving}
                            className="w-full py-2.5 rounded-lg font-semibold text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            Kaution freigeben
                        </button>
                    </div>

                    {/* Divider */}
                    <div className={`flex items-center gap-3 ${darkMode ? "text-slate-600" : "text-slate-300"}`}>
                        <div className="flex-1 h-px bg-current" />
                        <span className={`text-xs font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`}>oder</span>
                        <div className="flex-1 h-px bg-current" />
                    </div>

                    {/* Charge section */}
                    <div className={`p-4 rounded-xl border ${darkMode ? "bg-rose-900/10 border-rose-800/40" : "bg-rose-50 border-rose-100"}`}>
                        <h3 className={`font-semibold mb-3 flex items-center gap-2 ${darkMode ? "text-rose-300" : "text-rose-700"}`}>
                            <ShieldOff className="w-4 h-4" />
                            Kaution einbehalten
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className={labelStyle}>
                                    Betrag (max. {fmtEur(maxAmount)})
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0.01"
                                        max={maxAmount}
                                        step="0.01"
                                        value={chargeAmount}
                                        onChange={(e) => setChargeAmount(e.target.value)}
                                        className={inputStyle}
                                        placeholder="0.00"
                                    />
                                    <span className={`text-sm font-medium shrink-0 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>€</span>
                                </div>
                            </div>
                            <div>
                                <label className={labelStyle}>Grund (Pflichtfeld)</label>
                                <textarea
                                    value={chargeReason}
                                    onChange={(e) => setChargeReason(e.target.value)}
                                    rows={2}
                                    placeholder="z.B. Kratzer am Rahmen, fehlende Klingel..."
                                    className={`${inputStyle} resize-none`}
                                />
                            </div>
                            {error && (
                                <p className="text-sm text-rose-500 font-medium">{error}</p>
                            )}
                            <button
                                onClick={handleCharge}
                                disabled={saving}
                                className="w-full py-2.5 rounded-lg font-semibold text-sm bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                Einbehalten
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={`px-6 pb-5`}>
                    <button
                        onClick={onClose}
                        className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${darkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-600"}`}
                    >
                        Abbrechen
                    </button>
                </div>
            </div>
        </div>
    );
}
