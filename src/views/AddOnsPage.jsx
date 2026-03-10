"use client";
import { useState } from "react";
import { Plus, Loader2, Edit, Trash2, Package, ToggleLeft, ToggleRight } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useData } from "../context/DataContext";
import { useToast } from "../components/ui/Toast";
import { fmtCurrency } from "../utils/formatters";

export default function AddOnsPage() {
    const { darkMode } = useApp();
    const { addOns } = useData();
    const { addToast } = useToast();
    const [showForm, setShowForm] = useState(false);
    const [editAddOn, setEditAddOn] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [form, setForm] = useState({
        name: "", price_per_day: "", price_flat: "", stock: "", is_active: true
    });

    const cardStyle = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
    const inputStyle = `w-full px-3 py-2 rounded-lg border outline-none text-sm transition-all ${darkMode
        ? "bg-slate-800 border-slate-700 text-white focus:border-brand-500"
        : "bg-slate-50 border-slate-200 text-slate-900 focus:border-brand-500 focus:bg-white"}`;

    const openNew = () => {
        setEditAddOn(null);
        setForm({ name: "", price_per_day: "", price_flat: "", stock: "", is_active: true });
        setShowForm(true);
    };

    const openEdit = (addon) => {
        setEditAddOn(addon);
        setForm({
            name: addon.name || "",
            price_per_day: addon.price_per_day || "",
            price_flat: addon.price_flat || "",
            stock: addon.stock ?? "",
            is_active: addon.is_active ?? true
        });
        setShowForm(true);
    };

    const handleSave = async () => {
        const payload = {
            name: form.name,
            price_per_day: form.price_per_day ? Number(form.price_per_day) : null,
            price_flat: form.price_flat ? Number(form.price_flat) : null,
            stock: form.stock !== "" ? Number(form.stock) : null,
            is_active: form.is_active
        };
        if (editAddOn) {
            const { error } = await addOns.update(editAddOn.id, payload);
            if (error) { addToast("Fehler: " + error.message, "error"); return; }
            addToast("Zubehör gespeichert.", "success");
        } else {
            const { error } = await addOns.create(payload);
            if (error) { addToast("Fehler: " + error.message, "error"); return; }
            addToast("Zubehör erstellt.", "success");
        }
        setShowForm(false);
    };

    const handleDelete = async (id) => {
        const { error } = await addOns.remove(id);
        if (error) { addToast("Fehler: " + error.message, "error"); return; }
        setConfirmDeleteId(null);
    };

    const toggleActive = async (addon) => {
        const { error } = await addOns.update(addon.id, { is_active: !addon.is_active });
        if (error) addToast("Fehler beim Aktualisieren: " + error.message, "error");
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className={`rounded-2xl border p-6 ${cardStyle}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Zubehör</h1>
                        <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                            Extras wie Helm, Schloss oder Kindersitz verwalten
                        </p>
                    </div>
                    <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl font-medium shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all">
                        <Plus className="w-4 h-4" /> Neues Zubehör
                    </button>
                </div>
            </div>

            {/* Grid */}
            {addOns.loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {addOns.addOns.map(addon => (
                        <div key={addon.id} className={`rounded-2xl border p-5 ${cardStyle} ${!addon.is_active ? "opacity-50" : ""} hover:shadow-lg transition-all group`}>
                            <div className="flex items-start justify-between mb-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? "bg-violet-900/30 text-violet-400" : "bg-violet-100 text-violet-600"}`}>
                                    <Package className="w-5 h-5" />
                                </div>
                                <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(addon)} className={`p-1.5 rounded-lg ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}>
                                        <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => setConfirmDeleteId(addon.id)} className={`p-1.5 rounded-lg text-red-500 ${darkMode ? "hover:bg-red-900/20" : "hover:bg-red-50"}`}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="font-bold text-lg mb-2">{addon.name}</h3>

                            <div className={`space-y-1.5 text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                {addon.price_per_day && (
                                    <div className="flex justify-between">
                                        <span>Pro Tag</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">{fmtCurrency(addon.price_per_day)}</span>
                                    </div>
                                )}
                                {addon.price_flat && (
                                    <div className="flex justify-between">
                                        <span>Einmalpreis</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">{fmtCurrency(addon.price_flat)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span>Bestand</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">{addon.stock != null ? addon.stock : "∞"}</span>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                                <button onClick={() => toggleActive(addon)} className={`flex items-center gap-2 text-sm font-medium transition-colors ${addon.is_active ? "text-emerald-600" : "text-slate-400"}`}>
                                    {addon.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                                    {addon.is_active ? "Aktiv" : "Inaktiv"}
                                </button>
                            </div>
                        </div>
                    ))}

                    {addOns.addOns.length === 0 && (
                        <div className={`col-span-full text-center py-16 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">Noch kein Zubehör angelegt</p>
                            <p className="text-sm mt-1">Erstelle Extras wie Helm, Schloss oder Kindersitz.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Confirm Delete Dialog */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className={`w-full max-w-sm rounded-2xl border p-6 ${cardStyle} shadow-2xl`}>
                        <p className="font-semibold text-lg mb-2">Zubehör löschen?</p>
                        <p className={`text-sm mb-6 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Diese Aktion kann nicht rückgängig gemacht werden.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setConfirmDeleteId(null)} className={`px-4 py-2 rounded-xl text-sm font-medium ${darkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Abbrechen</button>
                            <button onClick={() => handleDelete(confirmDeleteId)} className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-medium">Ja, löschen</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className={`w-full max-w-md rounded-2xl border ${cardStyle} shadow-2xl max-h-[90dvh] flex flex-col`}>
                        <h2 className="text-xl font-bold p-6 pb-0 mb-0">{editAddOn ? "Zubehör bearbeiten" : "Neues Zubehör"}</h2>
                        <div className="space-y-4 p-6 overflow-y-auto">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Name *</label>
                                <input className={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="z.B. Helm, Schloss, Kindersitz..." />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Preis/Tag (€)</label>
                                    <input type="number" className={inputStyle} value={form.price_per_day} onChange={e => setForm({ ...form, price_per_day: e.target.value })} placeholder="5.00" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Einmalpreis (€)</label>
                                    <input type="number" className={inputStyle} value={form.price_flat} onChange={e => setForm({ ...form, price_flat: e.target.value })} placeholder="Alternativ" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Bestand</label>
                                <input type="number" className={inputStyle} value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="Leer = unbegrenzt" />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded text-brand-500" />
                                <span className="text-sm font-medium">Sofort aktiv</span>
                            </label>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
                            <button onClick={() => setShowForm(false)} className={`px-4 py-2 rounded-xl text-sm font-medium ${darkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Abbrechen</button>
                            <button onClick={handleSave} disabled={!form.name} className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-brand-500/20">
                                {editAddOn ? "Speichern" : "Erstellen"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
