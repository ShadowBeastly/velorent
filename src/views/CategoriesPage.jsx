"use client";
import { useState, useMemo } from "react";
import { Plus, Loader2, Edit, Trash2, Image } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useData } from "../context/DataContext";
import { useToast } from "../components/ui/Toast";
import { fmtCurrency } from "../utils/formatters";

export default function CategoriesPage() {
    const { darkMode } = useApp();
    const { bikeCategories, bikes } = useData();
    const { addToast } = useToast();
    const [showForm, setShowForm] = useState(false);
    const [editCategory, setEditCategory] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [form, setForm] = useState({
        name: "", description: "", image_url: "",
        default_price_per_day: "", default_price_per_week: "",
        default_price_per_hour: "", default_deposit: "", sort_order: 0
    });

    const cardStyle = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
    const inputStyle = `w-full px-3 py-2 rounded-lg border outline-none text-sm transition-all ${darkMode
        ? "bg-slate-800 border-slate-700 text-white focus:border-brand-500"
        : "bg-slate-50 border-slate-200 text-slate-900 focus:border-brand-500 focus:bg-white"}`;

    // Count bikes per category
    const bikeCounts = useMemo(() => {
        const counts = {};
        bikes.bikes.forEach(b => {
            const cat = b.category || "Sonstige";
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return counts;
    }, [bikes.bikes]);

    const openNew = () => {
        setEditCategory(null);
        setForm({ name: "", description: "", image_url: "", default_price_per_day: "", default_price_per_week: "", default_price_per_hour: "", default_deposit: "", sort_order: bikeCategories.categories.length });
        setShowForm(true);
    };

    const openEdit = (cat) => {
        setEditCategory(cat);
        setForm({
            name: cat.name || "",
            description: cat.description || "",
            image_url: cat.image_url || "",
            default_price_per_day: cat.default_price_per_day || "",
            default_price_per_week: cat.default_price_per_week || "",
            default_price_per_hour: cat.default_price_per_hour || "",
            default_deposit: cat.default_deposit || "",
            sort_order: cat.sort_order || 0
        });
        setShowForm(true);
    };

    const handleSave = async () => {
        const payload = {
            ...form,
            default_price_per_day: form.default_price_per_day ? Number(form.default_price_per_day) : null,
            default_price_per_week: form.default_price_per_week ? Number(form.default_price_per_week) : null,
            default_price_per_hour: form.default_price_per_hour ? Number(form.default_price_per_hour) : null,
            default_deposit: form.default_deposit ? Number(form.default_deposit) : null,
            sort_order: Number(form.sort_order) || 0
        };
        if (editCategory) {
            const { error } = await bikeCategories.update(editCategory.id, payload);
            if (error) { addToast("Fehler: " + error.message, "error"); return; }
            addToast("Kategorie gespeichert.", "success");
        } else {
            const { error } = await bikeCategories.create(payload);
            if (error) { addToast("Fehler: " + error.message, "error"); return; }
            addToast("Kategorie erstellt.", "success");
        }
        setShowForm(false);
    };

    const handleDelete = async (id) => {
        const { error } = await bikeCategories.remove(id);
        if (error) { addToast("Fehler: " + error.message, "error"); return; }
        setConfirmDeleteId(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className={`rounded-2xl border p-6 ${cardStyle}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Kategorien</h1>
                        <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                            Verwalte Fahrrad-Kategorien mit Standard-Preisen
                        </p>
                    </div>
                    <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl font-medium shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all">
                        <Plus className="w-4 h-4" /> Neue Kategorie
                    </button>
                </div>
            </div>

            {/* Grid */}
            {bikeCategories.loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bikeCategories.categories.map(cat => (
                        <div key={cat.id} className={`rounded-2xl border p-5 ${cardStyle} hover:shadow-lg transition-shadow group`}>
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${darkMode ? "bg-brand-900/30 text-brand-400" : "bg-brand-100 text-brand-600"}`}>
                                        {cat.image_url ? (
                                            <img src={cat.image_url} alt="" className="w-full h-full object-cover rounded-xl" />
                                        ) : (
                                            cat.name?.charAt(0)?.toUpperCase() || "?"
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{cat.name}</h3>
                                        <span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                            {bikeCounts[cat.name] || 0} Fahrräder
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(cat)} className={`p-2 rounded-lg ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}>
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setConfirmDeleteId(cat.id)} className={`p-2 rounded-lg text-red-500 ${darkMode ? "hover:bg-red-900/20" : "hover:bg-red-50"}`}>
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {cat.description && (
                                <p className={`text-sm mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{cat.description}</p>
                            )}

                            <div className={`grid grid-cols-2 gap-3 text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                                {cat.default_price_per_day && (
                                    <div><span className="text-xs opacity-60">Tag</span><div className="font-semibold">{fmtCurrency(cat.default_price_per_day)}</div></div>
                                )}
                                {cat.default_price_per_week && (
                                    <div><span className="text-xs opacity-60">Woche</span><div className="font-semibold">{fmtCurrency(cat.default_price_per_week)}</div></div>
                                )}
                                {cat.default_price_per_hour && (
                                    <div><span className="text-xs opacity-60">Stunde</span><div className="font-semibold">{fmtCurrency(cat.default_price_per_hour)}</div></div>
                                )}
                                {cat.default_deposit && (
                                    <div><span className="text-xs opacity-60">Kaution</span><div className="font-semibold">{fmtCurrency(cat.default_deposit)}</div></div>
                                )}
                            </div>
                        </div>
                    ))}

                    {bikeCategories.categories.length === 0 && (
                        <div className={`col-span-full text-center py-16 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            <Image className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">Noch keine Kategorien angelegt</p>
                            <p className="text-sm mt-1">Erstelle deine erste Kategorie, um Fahrräder zu gruppieren.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Confirm Delete Dialog */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className={`w-full max-w-sm rounded-2xl border p-6 ${cardStyle} shadow-2xl`}>
                        <p className="font-semibold text-lg mb-2">Kategorie löschen?</p>
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
                    <div className={`w-full max-w-lg rounded-2xl border ${cardStyle} shadow-2xl max-h-[90dvh] flex flex-col`}>
                        <h2 className="text-xl font-bold p-6 pb-0 mb-0">{editCategory ? "Kategorie bearbeiten" : "Neue Kategorie"}</h2>
                        <div className="space-y-4 p-6 overflow-y-auto">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Name *</label>
                                <input className={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="z.B. E-Bike, MTB, City..." />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Beschreibung</label>
                                <textarea className={inputStyle} rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optionale Beschreibung..." />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Bild-URL</label>
                                <input className={inputStyle} value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Tagespreis (€)</label>
                                    <input type="number" className={inputStyle} value={form.default_price_per_day} onChange={e => setForm({ ...form, default_price_per_day: e.target.value })} placeholder="35.00" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Wochenpreis (€)</label>
                                    <input type="number" className={inputStyle} value={form.default_price_per_week} onChange={e => setForm({ ...form, default_price_per_week: e.target.value })} placeholder="180.00" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Stundenpreis (€)</label>
                                    <input type="number" className={inputStyle} value={form.default_price_per_hour} onChange={e => setForm({ ...form, default_price_per_hour: e.target.value })} placeholder="8.00" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Kaution (€)</label>
                                    <input type="number" className={inputStyle} value={form.default_deposit} onChange={e => setForm({ ...form, default_deposit: e.target.value })} placeholder="50.00" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Sortierung</label>
                                <input type="number" className={inputStyle} value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
                            <button onClick={() => setShowForm(false)} className={`px-4 py-2 rounded-xl text-sm font-medium ${darkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>
                                Abbrechen
                            </button>
                            <button onClick={handleSave} disabled={!form.name} className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-brand-500/20">
                                {editCategory ? "Speichern" : "Erstellen"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
