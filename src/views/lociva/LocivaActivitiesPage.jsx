"use client";
import { useState } from "react";
import {
    Plus, Pencil, Trash2, X, Check, Zap, Loader2, AlertCircle,
    ToggleLeft, ToggleRight,
} from "lucide-react";
import { useLocivaHotel } from "@/src/context/LocivaHotelContext";
import { useApp } from "@/src/context/AppContext";
import { useHotelActivities } from "@/src/hooks/useHotelActivities";

// ─── Brand palette ───────────────────────────────────────────────────────────
const C = {
    primary: "#1A7D5A",
    light:   "#3BAA82",
    tint:    "#D4EDE2",
};

// ─── Category config ─────────────────────────────────────────────────────────
const CATEGORIES = [
    { value: "wellness",  label: "Wellness" },
    { value: "gastro",    label: "Gastronomie" },
    { value: "transport", label: "Transport" },
    { value: "adventure", label: "Abenteuer" },
    { value: "culture",   label: "Kultur" },
    { value: "sport",     label: "Sport" },
    { value: "family",    label: "Familie" },
    { value: "other",     label: "Sonstiges" },
];

const CAT_COLOR = {
    wellness:  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
    gastro:    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    transport: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    adventure: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    culture:   "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    sport:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    family:    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    other:     "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

function catLabel(v) {
    return CATEGORIES.find(c => c.value === v)?.label ?? v;
}

const EMPTY_FORM = {
    name: "",
    description: "",
    category: "wellness",
    price: "",
    duration_minutes: "",
    image_url: "",
    is_active: true,
};

// ─── Activity form ────────────────────────────────────────────────────────────
function ActivityForm({ initial, onSave, onCancel, darkMode, saving }) {
    const [form, setForm] = useState(initial ?? EMPTY_FORM);

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...form,
            price: form.price !== "" ? parseFloat(form.price) : null,
            duration_minutes: form.duration_minutes !== "" ? parseInt(form.duration_minutes) : null,
        });
    };

    const inputCls = `w-full rounded-xl border px-3 py-2 text-sm transition-colors outline-none focus:ring-2 focus:ring-[#1A7D5A]/30 focus:border-[#1A7D5A] ${
        darkMode
            ? "bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
    }`;
    const labelCls = `block text-xs font-semibold uppercase tracking-wider mb-1.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                    <label className={labelCls}>Name *</label>
                    <input required className={inputCls} value={form.name}
                        onChange={e => set("name", e.target.value)}
                        placeholder="z. B. Yoga am Morgen" />
                </div>

                <div className="sm:col-span-2">
                    <label className={labelCls}>Beschreibung</label>
                    <textarea rows={3} className={inputCls} value={form.description}
                        onChange={e => set("description", e.target.value)}
                        placeholder="Kurze Beschreibung für Ihre Gäste…" />
                </div>

                <div>
                    <label className={labelCls}>Kategorie</label>
                    <select className={inputCls} value={form.category}
                        onChange={e => set("category", e.target.value)}>
                        {CATEGORIES.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className={labelCls}>Preis (€)</label>
                    <input type="number" min="0" step="0.01" className={inputCls}
                        value={form.price}
                        onChange={e => set("price", e.target.value)}
                        placeholder="0.00" />
                </div>

                <div>
                    <label className={labelCls}>Dauer (Minuten)</label>
                    <input type="number" min="1" className={inputCls}
                        value={form.duration_minutes}
                        onChange={e => set("duration_minutes", e.target.value)}
                        placeholder="60" />
                </div>

                <div>
                    <label className={labelCls}>Bild-URL</label>
                    <input type="url" className={inputCls}
                        value={form.image_url}
                        onChange={e => set("image_url", e.target.value)}
                        placeholder="https://…" />
                </div>

                <div className="sm:col-span-2 flex items-center gap-3">
                    <button type="button" onClick={() => set("is_active", !form.is_active)}
                        className="flex items-center gap-2 text-sm font-medium">
                        {form.is_active
                            ? <ToggleRight className="w-6 h-6" style={{ color: C.primary }} />
                            : <ToggleLeft className={`w-6 h-6 ${darkMode ? "text-slate-500" : "text-slate-400"}`} />}
                        <span style={form.is_active ? { color: C.primary } : undefined}
                            className={form.is_active ? "" : (darkMode ? "text-slate-400" : "text-slate-500")}>
                            {form.is_active ? "Aktiv (sichtbar für Gäste)" : "Inaktiv (ausgeblendet)"}
                        </span>
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-semibold transition-opacity disabled:opacity-60"
                    style={{ background: C.primary }}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Speichern
                </button>
                <button type="button" onClick={onCancel}
                    className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors ${
                        darkMode ? "bg-slate-700 hover:bg-slate-600 text-slate-200" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}>
                    Abbrechen
                </button>
            </div>
        </form>
    );
}

// ─── Activity card ────────────────────────────────────────────────────────────
function ActivityCard({ activity, onEdit, onDelete, onToggle, darkMode, deleting }) {
    return (
        <div className={`rounded-2xl border overflow-hidden transition-shadow hover:shadow-md ${
            darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
        }`}>
            {activity.image_url && (
                <div className="h-32 overflow-hidden bg-slate-100 dark:bg-slate-700">
                    {/* img is fine here — external URLs, no Next.js Image optimisation needed */}
                    <img src={activity.image_url} alt={activity.name}
                        className="w-full h-full object-cover" />
                </div>
            )}
            <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">{activity.name}</h3>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${CAT_COLOR[activity.category] ?? CAT_COLOR.other}`}>
                            {catLabel(activity.category)}
                        </span>
                    </div>
                    <button onClick={() => onToggle(activity)}
                        title={activity.is_active ? "Deaktivieren" : "Aktivieren"}
                        className="shrink-0 mt-0.5">
                        {activity.is_active
                            ? <ToggleRight className="w-6 h-6" style={{ color: C.primary }} />
                            : <ToggleLeft className={`w-6 h-6 ${darkMode ? "text-slate-600" : "text-slate-300"}`} />}
                    </button>
                </div>

                {activity.description && (
                    <p className={`text-sm line-clamp-2 mb-3 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {activity.description}
                    </p>
                )}

                <div className={`flex items-center gap-3 text-xs mb-4 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                    {activity.price != null && (
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(activity.price)}
                        </span>
                    )}
                    {activity.duration_minutes && <span>{activity.duration_minutes} Min.</span>}
                    <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${
                        activity.is_active
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                    }`}>
                        {activity.is_active ? "Aktiv" : "Inaktiv"}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => onEdit(activity)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            darkMode ? "bg-slate-700 hover:bg-slate-600 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                        }`}>
                        <Pencil className="w-3.5 h-3.5" /> Bearbeiten
                    </button>
                    <button onClick={() => onDelete(activity.id)} disabled={deleting === activity.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 disabled:opacity-50">
                        {deleting === activity.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                        Löschen
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LocivaActivitiesPage() {
    const { hotelId } = useLocivaHotel();
    const { darkMode } = useApp();
    const { activities, loading, create, update, remove } = useHotelActivities(hotelId);

    const [showForm, setShowForm]   = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [saving, setSaving]       = useState(false);
    const [deleting, setDeleting]   = useState(null);
    const [formError, setFormError] = useState(null);

    const card = darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";

    const handleCreate = async (payload) => {
        setSaving(true);
        setFormError(null);
        const { error } = await create(payload);
        setSaving(false);
        if (error) { setFormError(error.message); return; }
        setShowForm(false);
    };

    const handleUpdate = async (payload) => {
        if (!editTarget) return;
        setSaving(true);
        setFormError(null);
        const { error } = await update(editTarget.id, payload);
        setSaving(false);
        if (error) { setFormError(error.message); return; }
        setEditTarget(null);
    };

    const handleDelete = async (id) => {
        if (!confirm("Aktivität wirklich löschen?")) return;
        setDeleting(id);
        await remove(id);
        setDeleting(null);
    };

    const handleToggle = (activity) => update(activity.id, { is_active: !activity.is_active });

    const openCreate = () => { setEditTarget(null); setShowForm(true); setFormError(null); };
    const openEdit   = (a) => { setShowForm(false); setEditTarget(a); setFormError(null); };
    const closeForm  = () => { setShowForm(false); setEditTarget(null); setFormError(null); };

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Aktivitäten</h1>
                    <p className={`text-sm mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Verwalten Sie das Angebot, das Gäste über Ihren QR-Code buchen können.
                    </p>
                </div>
                {!showForm && !editTarget && (
                    <button onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-md"
                        style={{ background: C.primary }}>
                        <Plus className="w-4 h-4" /> Neue Aktivität
                    </button>
                )}
            </div>

            {/* Form: create */}
            {showForm && (
                <div className={`rounded-2xl border p-6 ${card}`}>
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Neue Aktivität</h2>
                        <button onClick={closeForm}
                            className={`p-1.5 rounded-lg transition-colors ${darkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"}`}>
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    {formError && (
                        <div className="flex items-center gap-2 mb-4 text-sm text-red-600 dark:text-red-400">
                            <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                        </div>
                    )}
                    <ActivityForm onSave={handleCreate} onCancel={closeForm} darkMode={darkMode} saving={saving} />
                </div>
            )}

            {/* Form: edit */}
            {editTarget && (
                <div className={`rounded-2xl border p-6 ${card}`}>
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Aktivität bearbeiten</h2>
                        <button onClick={closeForm}
                            className={`p-1.5 rounded-lg transition-colors ${darkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"}`}>
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    {formError && (
                        <div className="flex items-center gap-2 mb-4 text-sm text-red-600 dark:text-red-400">
                            <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                        </div>
                    )}
                    <ActivityForm
                        initial={{
                            ...editTarget,
                            price: editTarget.price ?? "",
                            duration_minutes: editTarget.duration_minutes ?? "",
                            image_url: editTarget.image_url ?? "",
                        }}
                        onSave={handleUpdate}
                        onCancel={closeForm}
                        darkMode={darkMode}
                        saving={saving}
                    />
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center h-40">
                    <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: C.light, borderTopColor: "transparent" }} />
                </div>
            )}

            {/* Empty state */}
            {!loading && activities.length === 0 && !showForm && (
                <div className={`rounded-2xl border p-12 text-center ${card}`}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                        style={{ background: C.tint }}>
                        <Zap className="w-7 h-7" style={{ color: C.primary }} />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Noch keine Aktivitäten</h3>
                    <p className={`text-sm mb-5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Erstelle dein erstes Angebot und zeige Gästen, was sie bei dir erleben können.
                    </p>
                    <button onClick={openCreate}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-semibold"
                        style={{ background: C.primary }}>
                        <Plus className="w-4 h-4" /> Erste Aktivität anlegen
                    </button>
                </div>
            )}

            {/* Activity grid */}
            {!loading && activities.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {activities.map(act => (
                        <ActivityCard
                            key={act.id}
                            activity={act}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                            onToggle={handleToggle}
                            darkMode={darkMode}
                            deleting={deleting}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
