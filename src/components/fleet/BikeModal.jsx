"use client";
import { useState, useEffect } from "react";
import { Loader2, X } from "lucide-react";

export default function BikeModal({ bike, onSave, onDelete, onClose, darkMode }) {
    const [form, setForm] = useState(() => bike || {
        name: "",
        category: "E-Bike",
        size: "M",
        price_per_day: 35,
        deposit: 50,
        deposit_type: "fixed",
        deposit_amount: 50,
        deposit_percentage: 0,
        battery: "500Wh",
        motor: "Mittelmotor",
        color: "Schwarz",
        frame_number: `FR${Date.now().toString().slice(-6)}`,
        status: "available"
    });
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const modalBg = darkMode ? "bg-slate-900" : "bg-white";
    const inputStyle = `w-full px-3 py-2 rounded-lg border outline-none ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"}`;

    // Escape key closes the modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(form);
        } catch {
            // Error is handled in parent
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="bike-modal-title"
                className={`w-full max-w-lg rounded-2xl ${modalBg} shadow-2xl`}
            >
                <div className={`flex items-center justify-between p-4 border-b ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
                    <h3 id="bike-modal-title" className="text-lg font-semibold">{bike ? "Rad bearbeiten" : "Neues Rad"}</h3>
                    <button onClick={onClose} aria-label="Schließen" className={`p-2 rounded-lg ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto max-h-[60dvh]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Name</label>
                            <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className={inputStyle} placeholder="City E-Bike Premium" />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Kategorie</label>
                            <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} className={inputStyle}>
                                <option>E-Bike</option>
                                <option>E-MTB</option>
                                <option>Lastenrad</option>
                                <option>Kinder</option>
                                <option>Bio</option>
                                <option>E-Scooter</option>
                            </select>
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Größe</label>
                            <input type="text" value={form.size} onChange={(e) => setForm(f => ({ ...f, size: e.target.value }))} className={inputStyle} />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Preis/Tag (€)</label>
                            <input type="number" value={form.price_per_day} onChange={(e) => setForm(f => ({ ...f, price_per_day: Number(e.target.value) }))} className={inputStyle} />
                        </div>
                        <div className="sm:col-span-2">
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Kaution</label>
                            <div className="flex flex-wrap gap-3 mb-3">
                                {[
                                    { value: "none", label: "Kein Deposit" },
                                    { value: "fixed", label: "Fixbetrag (€)" },
                                    { value: "percentage", label: "Prozent vom Mietpreis" },
                                ].map(opt => (
                                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="deposit_type"
                                            value={opt.value}
                                            checked={form.deposit_type === opt.value}
                                            onChange={() => setForm(f => ({ ...f, deposit_type: opt.value }))}
                                            className="accent-[#1A7D5A]"
                                        />
                                        <span className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                            {form.deposit_type === "fixed" && (
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.deposit_amount}
                                    onChange={(e) => setForm(f => ({ ...f, deposit_amount: Number(e.target.value) }))}
                                    className={inputStyle}
                                    placeholder="50.00"
                                />
                            )}
                            {form.deposit_type === "percentage" && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        value={form.deposit_percentage}
                                        onChange={(e) => setForm(f => ({ ...f, deposit_percentage: Number(e.target.value) }))}
                                        className={`${inputStyle} flex-1`}
                                        placeholder="20"
                                    />
                                    <span className={`text-sm font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>%</span>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Farbe</label>
                            <input type="text" value={form.color} onChange={(e) => setForm(f => ({ ...f, color: e.target.value }))} className={inputStyle} />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Akku</label>
                            <input type="text" value={form.battery} onChange={(e) => setForm(f => ({ ...f, battery: e.target.value }))} className={inputStyle} placeholder="625Wh" />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Motor</label>
                            <input type="text" value={form.motor} onChange={(e) => setForm(f => ({ ...f, motor: e.target.value }))} className={inputStyle} />
                        </div>
                        <div className="sm:col-span-2">
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Rahmennummer</label>
                            <input type="text" value={form.frame_number} onChange={(e) => setForm(f => ({ ...f, frame_number: e.target.value }))} className={inputStyle} />
                        </div>
                        <div className="sm:col-span-2">
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Individueller Puffer (Minuten)</label>
                            <input
                                type="number"
                                min={0}
                                max={360}
                                step={30}
                                placeholder="Globalen Standard verwenden"
                                value={form.buffer_minutes ?? ""}
                                onChange={(e) => setForm(f => ({
                                    ...f,
                                    buffer_minutes: e.target.value === "" ? null : parseInt(e.target.value, 10)
                                }))}
                                className={inputStyle}
                            />
                            <p className={`text-xs mt-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                Leer = globalen Standard aus den Einstellungen verwenden. E-Bikes empfohlen: 180 Min.
                            </p>
                        </div>
                    </div>
                </div>

                {confirmDelete && (
                    <div className="mx-4 mb-2 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm flex items-center justify-between gap-3">
                        <span className="text-rose-600 font-medium">Rad wirklich löschen?</span>
                        <div className="flex gap-2">
                            <button onClick={() => setConfirmDelete(false)} className="px-3 py-1 rounded-lg text-slate-500 hover:bg-slate-100 text-sm">Abbrechen</button>
                            <button onClick={() => { setConfirmDelete(false); onDelete(bike.id); }} className="px-3 py-1 rounded-lg bg-rose-500 text-white text-sm hover:bg-rose-600">Ja, löschen</button>
                        </div>
                    </div>
                )}
                <div className={`flex items-center justify-between p-4 border-t ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
                    <div>
                        {bike && (
                            <button onClick={() => setConfirmDelete(true)} className="text-rose-500 hover:text-rose-400">
                                Löschen
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className={`px-4 py-2 rounded-lg ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>Abbrechen</button>
                        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-gradient-to-r from-[#1A7D5A] to-[#3BAA82] text-white rounded-lg font-medium flex items-center gap-2">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            Speichern
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
