"use client";
import { useState } from "react";
import { Plus, Loader2, Edit, Trash2, Tag, Copy, Check } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useData } from "../context/DataContext";
import { useToast } from "../components/ui/Toast";
import { fmtCurrency, fmtDate } from "../utils/formatters";

export default function VouchersPage() {
    const { darkMode } = useApp();
    const { vouchers } = useData();
    const { addToast } = useToast();
    const [showForm, setShowForm] = useState(false);
    const [editVoucher, setEditVoucher] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [form, setForm] = useState({
        code: "", type: "percent", value: "", min_order: "",
        max_uses: "", valid_from: "", valid_until: "", is_active: true
    });

    const cardStyle = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
    const inputStyle = `w-full px-3 py-2 rounded-lg border outline-none text-sm transition-all ${darkMode
        ? "bg-slate-800 border-slate-700 text-white focus:border-brand-500"
        : "bg-slate-50 border-slate-200 text-slate-900 focus:border-brand-500 focus:bg-white"}`;

    const generateCode = () => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let code = "";
        for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
        setForm({ ...form, code });
    };

    const copyCode = (code, id) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const openNew = () => {
        setEditVoucher(null);
        setForm({ code: "", type: "percent", value: "", min_order: "", max_uses: "", valid_from: "", valid_until: "", is_active: true });
        setShowForm(true);
    };

    const openEdit = (v) => {
        setEditVoucher(v);
        setForm({
            code: v.code || "", type: v.type || "percent", value: v.value || "",
            min_order: v.min_order || "", max_uses: v.max_uses || "",
            valid_from: v.valid_from || "", valid_until: v.valid_until || "", is_active: v.is_active ?? true
        });
        setShowForm(true);
    };

    const handleSave = async () => {
        const payload = {
            ...form,
            value: Number(form.value) || 0,
            min_order: form.min_order ? Number(form.min_order) : null,
            max_uses: form.max_uses ? Number(form.max_uses) : null,
            valid_from: form.valid_from || null,
            valid_until: form.valid_until || null
        };
        if (editVoucher) {
            const { error } = await vouchers.update(editVoucher.id, payload);
            if (error) { addToast("Fehler: " + error.message, "error"); return; }
        } else {
            const { error } = await vouchers.create(payload);
            if (error) { addToast("Fehler: " + error.message, "error"); return; }
        }
        setShowForm(false);
    };

    const handleDelete = async (id) => {
        const { error } = await vouchers.remove(id);
        if (error) addToast("Fehler: " + error.message, "error");
        setConfirmDeleteId(null);
    };

    const toggleActive = async (v) => {
        await vouchers.update(v.id, { is_active: !v.is_active });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className={`rounded-2xl border p-6 ${cardStyle}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Gutscheine</h1>
                        <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                            Rabattcodes für das Buchungswidget erstellen und verwalten
                        </p>
                    </div>
                    <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl font-medium shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all">
                        <Plus className="w-4 h-4" /> Neuer Gutschein
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className={`rounded-2xl border overflow-hidden ${cardStyle}`}>
                {vouchers.loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className={darkMode ? "bg-slate-800/50" : "bg-slate-50"}>
                                <tr className={`text-left text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    <th className="px-4 py-3">Code</th>
                                    <th className="px-4 py-3">Rabatt</th>
                                    <th className="px-4 py-3">Mindestbest.</th>
                                    <th className="px-4 py-3">Nutzungen</th>
                                    <th className="px-4 py-3">Gültigkeit</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${darkMode ? "divide-slate-800" : "divide-slate-100"}`}>
                                {vouchers.vouchers.map(v => {
                                    const isExpired = v.valid_until && new Date(v.valid_until) < new Date();
                                    const isExhausted = v.max_uses && v.used_count >= v.max_uses;
                                    return (
                                        <tr key={v.id} className={`${darkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50"} ${!v.is_active ? "opacity-50" : ""}`}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <code className={`px-2 py-1 rounded text-sm font-bold tracking-wider ${darkMode ? "bg-slate-800 text-brand-400" : "bg-brand-50 text-brand-700"}`}>
                                                        {v.code}
                                                    </code>
                                                    <button onClick={() => copyCode(v.code, v.id)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                                        {copiedId === v.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-semibold">
                                                {v.type === "percent" ? `${v.value}%` : fmtCurrency(v.value)}
                                            </td>
                                            <td className="px-4 py-3 text-sm">{v.min_order ? fmtCurrency(v.min_order) : "—"}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={isExhausted ? "text-red-500" : ""}>{v.used_count || 0}</span>
                                                {v.max_uses ? ` / ${v.max_uses}` : " / ∞"}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {v.valid_from && v.valid_until ? (
                                                    <span className={isExpired ? "text-red-500 line-through" : ""}>
                                                        {fmtDate(v.valid_from)} – {fmtDate(v.valid_until)}
                                                    </span>
                                                ) : "Unbegrenzt"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button onClick={() => toggleActive(v)}
                                                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${v.is_active
                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
                                                        }`}>
                                                    {v.is_active ? "Aktiv" : "Inaktiv"}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => openEdit(v)} className={`p-2 rounded-lg ${darkMode ? "hover:bg-slate-700" : "hover:bg-slate-200"}`}>
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setConfirmDeleteId(v.id)} className={`p-2 rounded-lg text-red-500 ${darkMode ? "hover:bg-red-900/20" : "hover:bg-red-50"}`}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {!vouchers.loading && vouchers.vouchers.length === 0 && (
                    <div className={`text-center py-16 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                        <Tag className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">Noch keine Gutscheine angelegt</p>
                    </div>
                )}
            </div>

            {/* Confirm Delete Dialog */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className={`w-full max-w-sm rounded-2xl border p-6 ${cardStyle} shadow-2xl`}>
                        <p className="font-semibold text-lg mb-2">Gutschein löschen?</p>
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
                    <div className={`w-full max-w-lg rounded-2xl border p-6 ${cardStyle} shadow-2xl`}>
                        <h2 className="text-xl font-bold mb-6">{editVoucher ? "Gutschein bearbeiten" : "Neuer Gutschein"}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Code *</label>
                                <div className="flex gap-2">
                                    <input className={`${inputStyle} font-mono uppercase tracking-wider`} value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SOMMER2026" />
                                    <button onClick={generateCode} className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${darkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-700"}`}>
                                        Generieren
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Typ</label>
                                    <select className={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                        <option value="percent">Prozent (%)</option>
                                        <option value="fixed">Fixbetrag (€)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Wert *</label>
                                    <input type="number" className={inputStyle} value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder={form.type === "percent" ? "10" : "5.00"} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Mindestbestellwert (€)</label>
                                    <input type="number" className={inputStyle} value={form.min_order} onChange={e => setForm({ ...form, min_order: e.target.value })} placeholder="Optional" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Max. Nutzungen</label>
                                    <input type="number" className={inputStyle} value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} placeholder="Unbegrenzt" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Gültig von</label>
                                    <input type="date" className={inputStyle} value={form.valid_from} onChange={e => setForm({ ...form, valid_from: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Gültig bis</label>
                                    <input type="date" className={inputStyle} value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} />
                                </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded text-brand-500" />
                                <span className="text-sm font-medium">Sofort aktiv</span>
                            </label>
                        </div>
                        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <button onClick={() => setShowForm(false)} className={`px-4 py-2 rounded-xl text-sm font-medium ${darkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Abbrechen</button>
                            <button onClick={handleSave} disabled={!form.code || !form.value} className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-brand-500/20">
                                {editVoucher ? "Speichern" : "Erstellen"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
