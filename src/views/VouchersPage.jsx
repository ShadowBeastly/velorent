"use client";
import { useState } from "react";
import { Plus, Loader2, Edit, Trash2, Tag, Copy, Check, Zap, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useData } from "../context/DataContext";
import { useToast } from "../components/ui/Toast";
import { fmtCurrency, fmtDate } from "../utils/formatters";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(len = 6) {
    let code = "";
    for (let i = 0; i < len; i++) code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    return code;
}

const EMPTY_FORM = {
    code: "", type: "percentage", value: "",
    min_order_value: "", min_duration_days: "", min_quantity: "",
    max_uses: "", valid_from: "", valid_until: "",
    applies_to: "all", is_active: true
};

export default function VouchersPage() {
    const { darkMode } = useApp();
    const { coupons } = useData();
    const { addToast } = useToast();
    const [showForm, setShowForm] = useState(false);
    const [editCoupon, setEditCoupon] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);

    // Batch generation state
    const [showBatch, setShowBatch] = useState(false);
    const [batchCount, setBatchCount] = useState(10);
    const [batchForm, setBatchForm] = useState({ type: "percentage", value: "", max_uses: "1", valid_from: "", valid_until: "" });
    const [batchGenerating, setBatchGenerating] = useState(false);

    const cardStyle = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
    const inputStyle = `w-full px-3 py-2 rounded-lg border outline-none text-sm transition-all ${darkMode
        ? "bg-slate-800 border-slate-700 text-white focus:border-[#1A7D5A]"
        : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#1A7D5A] focus:bg-white"}`;

    const copyCode = (code, id) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const openNew = () => {
        setEditCoupon(null);
        setForm(EMPTY_FORM);
        setShowForm(true);
    };

    const openEdit = (c) => {
        setEditCoupon(c);
        setForm({
            code: c.code || "",
            type: c.type || "percentage",
            value: c.value || "",
            min_order_value: c.min_order_value || "",
            min_duration_days: c.min_duration_days || "",
            min_quantity: c.min_quantity || "",
            max_uses: c.max_uses || "",
            valid_from: c.valid_from || "",
            valid_until: c.valid_until || "",
            applies_to: c.applies_to || "all",
            is_active: c.is_active ?? true
        });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.code || !form.value) return;
        const payload = {
            ...form,
            code: form.code.trim().toUpperCase(),
            value: Number(form.value) || 0,
            min_order_value: form.min_order_value ? Number(form.min_order_value) : null,
            min_duration_days: form.min_duration_days ? Number(form.min_duration_days) : null,
            min_quantity: form.min_quantity ? Number(form.min_quantity) : null,
            max_uses: form.max_uses ? Number(form.max_uses) : null,
            valid_from: form.valid_from || null,
            valid_until: form.valid_until || null
        };
        if (editCoupon) {
            const { error } = await coupons.update(editCoupon.id, payload);
            if (error) { addToast("Fehler: " + error.message, "error"); return; }
            addToast("Gutschein gespeichert.", "success");
        } else {
            const { error } = await coupons.create(payload);
            if (error) { addToast("Fehler: " + error.message, "error"); return; }
            addToast("Gutschein erstellt.", "success");
        }
        setShowForm(false);
    };

    const handleDelete = async (id) => {
        const { error } = await coupons.remove(id);
        if (error) { addToast("Fehler: " + error.message, "error"); return; }
        setConfirmDeleteId(null);
        addToast("Gutschein gelöscht.", "success");
    };

    const toggleActive = async (c) => {
        const { error } = await coupons.update(c.id, { is_active: !c.is_active });
        if (error) addToast("Fehler: " + error.message, "error");
    };

    const handleBatchGenerate = async () => {
        if (!batchForm.value || batchCount < 1) return;
        setBatchGenerating(true);
        const basePayload = {
            type: batchForm.type,
            value: Number(batchForm.value),
            max_uses: batchForm.max_uses ? Number(batchForm.max_uses) : 1,
            valid_from: batchForm.valid_from || null,
            valid_until: batchForm.valid_until || null,
            applies_to: "all",
            is_active: true
        };
        let created = 0;
        for (let i = 0; i < batchCount; i++) {
            const code = randomCode(6);
            const { error } = await coupons.create({ ...basePayload, code });
            if (!error) created++;
        }
        setBatchGenerating(false);
        setShowBatch(false);
        addToast(`${created} Gutscheine erstellt.`, "success");
    };

    const list = coupons.coupons || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className={`rounded-2xl border p-6 ${cardStyle}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Gutscheine</h1>
                        <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                            Rabattcodes erstellen und verwalten
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowBatch(true)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium border transition-all ${darkMode ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                            <Zap className="w-4 h-4" /> Batch generieren
                        </button>
                        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-[#1A7D5A] text-white rounded-xl font-medium shadow-lg shadow-[#1A7D5A]/25 hover:bg-[#156648] transition-all">
                            <Plus className="w-4 h-4" /> Neuer Gutschein
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className={`rounded-2xl border overflow-hidden ${cardStyle}`}>
                {coupons.loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-[#1A7D5A]" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className={darkMode ? "bg-slate-800/50" : "bg-slate-50"}>
                                <tr className={`text-left text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    <th className="px-4 py-3">Code</th>
                                    <th className="px-4 py-3">Rabatt</th>
                                    <th className="px-4 py-3">Bedingungen</th>
                                    <th className="px-4 py-3">Nutzungen</th>
                                    <th className="px-4 py-3">Gültigkeit</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${darkMode ? "divide-slate-800" : "divide-slate-100"}`}>
                                {list.map(c => {
                                    const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
                                    const isExpired = c.valid_until && new Date(c.valid_until) < endOfToday;
                                    const isExhausted = c.max_uses != null && c.used_count >= c.max_uses;
                                    return (
                                        <tr key={c.id} className={`${darkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50"} ${!c.is_active ? "opacity-50" : ""}`}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <code className={`px-2 py-1 rounded text-sm font-bold tracking-wider ${darkMode ? "bg-slate-800 text-emerald-400" : "bg-[#D4EDE2] text-[#1A7D5A]"}`}>
                                                        {c.code}
                                                    </code>
                                                    <button onClick={() => copyCode(c.code, c.id)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                                        {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-semibold">
                                                {c.type === "percentage" ? `${c.value}%` : fmtCurrency(c.value)}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500 space-y-0.5">
                                                {c.min_order_value ? <div>Min. {fmtCurrency(c.min_order_value)}</div> : null}
                                                {c.min_duration_days ? <div>Min. {c.min_duration_days} Tage</div> : null}
                                                {c.min_quantity ? <div>Min. {c.min_quantity} Räder</div> : null}
                                                {!c.min_order_value && !c.min_duration_days && !c.min_quantity ? <span className="text-slate-400"></span> : null}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={isExhausted ? "text-red-500" : ""}>{c.used_count || 0}</span>
                                                {c.max_uses != null ? ` / ${c.max_uses}` : " / ∞"}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {c.valid_from || c.valid_until ? (
                                                    <span className={isExpired ? "text-red-500 line-through" : ""}>
                                                        {c.valid_from ? fmtDate(c.valid_from) : "∞"} - {c.valid_until ? fmtDate(c.valid_until) : "∞"}
                                                    </span>
                                                ) : "Unbegrenzt"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button onClick={() => toggleActive(c)}
                                                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${c.is_active
                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
                                                        }`}>
                                                    {c.is_active ? "Aktiv" : "Inaktiv"}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => openEdit(c)} className={`p-2 rounded-lg ${darkMode ? "hover:bg-slate-700" : "hover:bg-slate-200"}`}>
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setConfirmDeleteId(c.id)} className={`p-2 rounded-lg text-red-500 ${darkMode ? "hover:bg-red-900/20" : "hover:bg-red-50"}`}>
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
                {!coupons.loading && list.length === 0 && (
                    <div className={`text-center py-16 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                        <Tag className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">Noch keine Gutscheine angelegt</p>
                    </div>
                )}
            </div>

            {/* Confirm Delete */}
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

            {/* Batch Generate Modal */}
            {showBatch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className={`w-full max-w-md rounded-2xl border ${cardStyle} shadow-2xl`}>
                        <div className="flex items-center justify-between p-6 pb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2"><Zap className="w-5 h-5 text-[#1A7D5A]" /> Codes generieren</h2>
                            <button onClick={() => setShowBatch(false)} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="space-y-4 px-6 pb-6">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Anzahl Codes (1-50)</label>
                                <input type="number" min={1} max={50} className={inputStyle} value={batchCount} onChange={e => setBatchCount(Math.min(50, Math.max(1, Number(e.target.value))))} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Typ</label>
                                    <select className={inputStyle} value={batchForm.type} onChange={e => setBatchForm({ ...batchForm, type: e.target.value })}>
                                        <option value="percentage">Prozent (%)</option>
                                        <option value="fixed">Fixbetrag (€)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Wert *</label>
                                    <input type="number" className={inputStyle} value={batchForm.value} onChange={e => setBatchForm({ ...batchForm, value: e.target.value })} placeholder={batchForm.type === "percentage" ? "15" : "10.00"} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Max. Nutzungen/Code</label>
                                    <input type="number" className={inputStyle} value={batchForm.max_uses} onChange={e => setBatchForm({ ...batchForm, max_uses: e.target.value })} placeholder="1" />
                                </div>
                                <div />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Gültig von</label>
                                    <input type="date" className={inputStyle} value={batchForm.valid_from} onChange={e => setBatchForm({ ...batchForm, valid_from: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Gültig bis</label>
                                    <input type="date" className={inputStyle} value={batchForm.valid_until} onChange={e => setBatchForm({ ...batchForm, valid_until: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setShowBatch(false)} className={`px-4 py-2 rounded-xl text-sm font-medium ${darkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Abbrechen</button>
                                <button onClick={handleBatchGenerate} disabled={!batchForm.value || batchGenerating} className="flex items-center gap-2 px-5 py-2 bg-[#1A7D5A] hover:bg-[#156648] text-white rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                    {batchGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                    {batchCount} Codes erstellen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className={`w-full max-w-lg rounded-2xl border ${cardStyle} shadow-2xl max-h-[90dvh] flex flex-col`}>
                        <h2 className="text-xl font-bold p-6 pb-0">{editCoupon ? "Gutschein bearbeiten" : "Neuer Gutschein"}</h2>
                        <div className="space-y-4 p-6 overflow-y-auto">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Code *</label>
                                <div className="flex gap-2">
                                    <input className={`${inputStyle} font-mono uppercase tracking-wider`} value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SOMMER2026" />
                                    <button onClick={() => setForm({ ...form, code: randomCode(8) })} className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${darkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-700"}`}>
                                        Generieren
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Typ</label>
                                    <select className={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                        <option value="percentage">Prozent (%)</option>
                                        <option value="fixed">Fixbetrag (€)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Wert *</label>
                                    <input type="number" className={inputStyle} value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder={form.type === "percentage" ? "10" : "5.00"} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Mindestbestellwert (€)</label>
                                    <input type="number" className={inputStyle} value={form.min_order_value} onChange={e => setForm({ ...form, min_order_value: e.target.value })} placeholder="Optional" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Min. Mietdauer (Tage)</label>
                                    <input type="number" className={inputStyle} value={form.min_duration_days} onChange={e => setForm({ ...form, min_duration_days: e.target.value })} placeholder="Optional" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Min. Anzahl Räder</label>
                                    <input type="number" className={inputStyle} value={form.min_quantity} onChange={e => setForm({ ...form, min_quantity: e.target.value })} placeholder="Optional" />
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
                                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded text-[#1A7D5A]" />
                                <span className="text-sm font-medium">Sofort aktiv</span>
                            </label>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
                            <button onClick={() => setShowForm(false)} className={`px-4 py-2 rounded-xl text-sm font-medium ${darkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Abbrechen</button>
                            <button onClick={handleSave} disabled={!form.code || !form.value} className="px-5 py-2 bg-[#1A7D5A] hover:bg-[#156648] text-white rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-[#1A7D5A]/20">
                                {editCoupon ? "Speichern" : "Erstellen"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
