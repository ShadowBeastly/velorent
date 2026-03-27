"use client";
import { useState, useEffect } from "react";
import { Loader2, X, Package } from "lucide-react";

const ITEM_TYPES = [
    { value: "rental", label: "Verleih" },
    { value: "experience", label: "Erlebnis" },
    { value: "food_beverage", label: "Gastronomie" },
    { value: "service", label: "Service" },
];

const LOCATION_TYPES = [
    { value: "pickup", label: "Abholung" },
    { value: "onsite", label: "Vor Ort" },
    { value: "mobile", label: "Mobil" },
    { value: "virtual", label: "Online" },
];

export default function ItemModal({ item, onSave, onDelete, onClose, darkMode }) {
    const [form, setForm] = useState(() => item || {
        item_type: "rental",
        name: "",
        category: "",
        price_per_day: 35,
        price_per_hour: null,
        deposit: 50,
        description: "",
        image_url: "",
        status: "available",
        // rental-specific
        frame_number: `FR${Date.now().toString().slice(-6)}`,
        battery: "",
        motor: "",
        size: "M",
        color: "",
        // experience/food_beverage/service
        capacity: null,
        duration_minutes: null,
        location_type: "onsite",
    });
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const modalBg = darkMode ? "bg-slate-900" : "bg-white";
    const inputStyle = `w-full px-3 py-2 rounded-lg border outline-none ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"}`;
    const labelStyle = `block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`;

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(form);
        } catch {
            // Error handled in parent
        } finally {
            setSaving(false);
        }
    };

    const isRental = form.item_type === "rental";
    const isExperience = form.item_type === "experience";
    const isFoodBeverage = form.item_type === "food_beverage";
    const isService = form.item_type === "service";
    const hasCapacity = isExperience || isFoodBeverage || isService;
    const hasDuration = isExperience || isFoodBeverage;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="item-modal-title"
                className={`w-full max-w-lg rounded-2xl ${modalBg} shadow-2xl`}
            >
                <div className={`flex items-center justify-between p-4 border-b ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
                    <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-[#1A7D5A]" />
                        <h3 id="item-modal-title" className="text-lg font-semibold">
                            {item ? "Angebot bearbeiten" : "Neues Angebot"}
                        </h3>
                    </div>
                    <button onClick={onClose} aria-label="Schließen" className={`p-2 rounded-lg ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto max-h-[60dvh]">
                    {/* Item Type Selector */}
                    <div>
                        <label className={labelStyle}>Typ</label>
                        <div className="flex flex-wrap gap-2">
                            {ITEM_TYPES.map(t => (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => set("item_type", t.value)}
                                    className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                                        form.item_type === t.value
                                            ? "bg-[#1A7D5A] text-white border-[#1A7D5A] shadow-sm"
                                            : darkMode
                                                ? "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                                                : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={`h-px ${darkMode ? "bg-slate-800" : "bg-slate-100"}`} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Common: Name */}
                        <div className="sm:col-span-2">
                            <label className={labelStyle}>Name</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => set("name", e.target.value)}
                                className={inputStyle}
                                placeholder={isRental ? "City E-Bike Premium" : isExperience ? "Weinverkostung Premium" : "Angebot"}
                            />
                        </div>

                        {/* Common: Category */}
                        <div className="sm:col-span-2">
                            <label className={labelStyle}>Kategorie</label>
                            <input
                                type="text"
                                value={form.category}
                                onChange={(e) => set("category", e.target.value)}
                                className={inputStyle}
                                placeholder={isRental ? "E-Bike" : isExperience ? "Kulinarik" : "Kategorie"}
                            />
                        </div>

                        {/* Common: Prices */}
                        <div>
                            <label className={labelStyle}>Preis/Tag (€)</label>
                            <input
                                type="number"
                                value={form.price_per_day ?? ""}
                                onChange={(e) => set("price_per_day", e.target.value === "" ? null : Number(e.target.value))}
                                className={inputStyle}
                            />
                        </div>
                        <div>
                            <label className={labelStyle}>Preis/Stunde (€)</label>
                            <input
                                type="number"
                                value={form.price_per_hour ?? ""}
                                onChange={(e) => set("price_per_hour", e.target.value === "" ? null : Number(e.target.value))}
                                className={inputStyle}
                                placeholder="Optional"
                            />
                        </div>

                        {/* Common: Deposit */}
                        <div>
                            <label className={labelStyle}>Kaution (€)</label>
                            <input
                                type="number"
                                value={form.deposit ?? ""}
                                onChange={(e) => set("deposit", e.target.value === "" ? null : Number(e.target.value))}
                                className={inputStyle}
                            />
                        </div>

                        {/* Common: Status */}
                        <div>
                            <label className={labelStyle}>Status</label>
                            <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputStyle}>
                                <option value="available">Verfügbar</option>
                                <option value="maintenance">Wartung</option>
                                <option value="inactive">Inaktiv</option>
                            </select>
                        </div>

                        {/* Rental-specific fields */}
                        {isRental && (
                            <>
                                <div>
                                    <label className={labelStyle}>Größe</label>
                                    <input
                                        type="text"
                                        value={form.size ?? ""}
                                        onChange={(e) => set("size", e.target.value)}
                                        className={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label className={labelStyle}>Farbe</label>
                                    <input
                                        type="text"
                                        value={form.color ?? ""}
                                        onChange={(e) => set("color", e.target.value)}
                                        className={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label className={labelStyle}>Akku</label>
                                    <input
                                        type="text"
                                        value={form.battery ?? ""}
                                        onChange={(e) => set("battery", e.target.value)}
                                        className={inputStyle}
                                        placeholder="625Wh"
                                    />
                                </div>
                                <div>
                                    <label className={labelStyle}>Motor</label>
                                    <input
                                        type="text"
                                        value={form.motor ?? ""}
                                        onChange={(e) => set("motor", e.target.value)}
                                        className={inputStyle}
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className={labelStyle}>Rahmennummer</label>
                                    <input
                                        type="text"
                                        value={form.frame_number ?? ""}
                                        onChange={(e) => set("frame_number", e.target.value)}
                                        className={inputStyle}
                                    />
                                </div>
                            </>
                        )}

                        {/* Capacity: experience, food_beverage, service */}
                        {hasCapacity && (
                            <div>
                                <label className={labelStyle}>Kapazität (Personen)</label>
                                <input
                                    type="number"
                                    value={form.capacity ?? ""}
                                    onChange={(e) => set("capacity", e.target.value === "" ? null : Number(e.target.value))}
                                    className={inputStyle}
                                    placeholder="10"
                                />
                            </div>
                        )}

                        {/* Duration: experience, food_beverage */}
                        {hasDuration && (
                            <div>
                                <label className={labelStyle}>Dauer (Minuten)</label>
                                <input
                                    type="number"
                                    value={form.duration_minutes ?? ""}
                                    onChange={(e) => set("duration_minutes", e.target.value === "" ? null : Number(e.target.value))}
                                    className={inputStyle}
                                    placeholder="90"
                                />
                            </div>
                        )}

                        {/* Location type: experience only */}
                        {isExperience && (
                            <div>
                                <label className={labelStyle}>Ort</label>
                                <select value={form.location_type ?? "onsite"} onChange={(e) => set("location_type", e.target.value)} className={inputStyle}>
                                    {LOCATION_TYPES.map(l => (
                                        <option key={l.value} value={l.value}>{l.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Common: Description */}
                        <div className="sm:col-span-2">
                            <label className={labelStyle}>Beschreibung</label>
                            <textarea
                                value={form.description ?? ""}
                                onChange={(e) => set("description", e.target.value)}
                                rows={3}
                                className={`${inputStyle} resize-none`}
                                placeholder="Kurze Beschreibung des Angebots..."
                            />
                        </div>

                        {/* Common: Image URL */}
                        <div className="sm:col-span-2">
                            <label className={labelStyle}>Bild-URL</label>
                            <input
                                type="url"
                                value={form.image_url ?? ""}
                                onChange={(e) => set("image_url", e.target.value)}
                                className={inputStyle}
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                </div>

                {confirmDelete && (
                    <div className="mx-4 mb-2 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm flex items-center justify-between gap-3">
                        <span className="text-rose-600 font-medium">Angebot wirklich löschen?</span>
                        <div className="flex gap-2">
                            <button onClick={() => setConfirmDelete(false)} className="px-3 py-1 rounded-lg text-slate-500 hover:bg-slate-100 text-sm">Abbrechen</button>
                            <button onClick={() => { setConfirmDelete(false); onDelete(item.id); }} className="px-3 py-1 rounded-lg bg-rose-500 text-white text-sm hover:bg-rose-600">Ja, löschen</button>
                        </div>
                    </div>
                )}

                <div className={`flex items-center justify-between p-4 border-t ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
                    <div>
                        {item && (
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
