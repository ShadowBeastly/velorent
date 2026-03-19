"use client";
import { useState } from "react";
import { Plus, Loader2, Edit, Trash2, Tag, Copy, Check, Zap, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useData } from "../context/DataContext";
import { useToast } from "../components/ui/Toast";
import { fmtCurrency } from "../utils/formatters";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(len = 6) {
    let s = "";
    for (let i = 0; i < len; i++) s += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    return s;
}

function fmtDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const EMPTY_FORM = {
    code: "", type: "percentage", value: "", min_order_value: "", min_duration_days: "",
    min_quantity: "", max_uses: "", valid_from: "", valid_until: "",
    applies_to: "all", is_active: true,
};

export default function VouchersPage() {
    const { darkMode } = useApp();
    const { coupons } = useData();
    const { addToast } = useToast();

    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    // Batch generation
    const [showBatch, setShowBatch] = useState(false);
    const [batchCount, setBatchCount] = useState(5);
    const [batchForm, setBatchForm] = useState({ type: "percentage", value: "", valid_from: "", valid_until: "", max_uses: "" });
    const [batchGenerating, setBatchGenerating] = useState(false);

    const card = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
    const inp = `w-full px-3 py-2 rounded-lg border outline-none text-sm transition-all ${darkMode
        ? "bg-slate-800 border-slate-700 text-white focus:border-[#1A7D5A]"
        : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#1A7D5A] focus:bg-white"}`;
    const lbl = `text-sm font-medium mb-1 block ${darkMode ? "text-slate-300" : "text-slate-700"}`;

    const openNew = () => { setEditId(null); setForm({ ...EMPTY_FORM, code: randomCode() }); setShowForm(true); };
    const openEdit = (c) => {
        setEditId(c.id);
        setForm({
            code: c.code || "", type: c.type || "percentage", value: c.value || "",
            min_order_value: c.min_order_value || "", min_duration_days: c.min_duration_days || "",
            min_quantity: c.min_quantity || "", max_uses: c.max_uses || "",
            valid_from: c.valid_from ? c.valid_from.slice(0, 10) : "",
            valid_until: c.valid_until ? c.valid_until.slice(0, 10) : "",
            applies_to: c.applies_to || "all", is_active: c.is_active ?? true,
        });
        setShowForm(true);
    };

    const copyCode = (code, id) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const toPayload = (f) => ({
        code: f.code.trim().toUpperCase(),
        type: f.type,
        value: Number(f.value) || 0,
        min_order_value: f.min_order_value ? Number(f.min_order_value) : null,
        min_duration_days: f.min_duration_days ? Number(f.min_duration_days) : null,
        min_quantity: f.min_quantity ? Number(f.min_quantity) : null,
        max_uses: f.max_uses ? Number(f.max_uses) : null,
        valid_from: f.valid_from || null,
        valid_until: f.valid_until || null,
        applies_to: f.applies_to || "all",
        is_active: f.is_active,
    });

    const handleSave = async () => {
        if (!form.code || !form.value) { addToast("Code und Wert sind erforderlich.", "error"); return; }
        const payload = toPayload(form);
        if (editId) {
            const { error } = await coupons.updateCoupon(editId, payload);
            if (error) { addToast("Fehler: " + error.message, "error"); return; }
            addToast("Gutschein gespeichert.", "success");
        } else {
            const { error } = await coupons.createCoupon(payload);
            if (error) { addToast("Fehler: " + error.message, "error"); return; }
            addToast("Gutschein erstellt.", "success");
        }
        setShowForm(false);
    };

    const handleDelete = async (id) => {
        const { error } = await coupons.deleteCoupon(id);
        if (error) { addToast("Fehler: " + error.message, "error"); return; }
        setConfirmDeleteId(null);
    };

    const toggleActive = async (c) => {
        const { error } = await coupons.updateCoupon(c.id, { is_active: !c.is_active });
        if (error) addToast("Fehler: " + error.message, "error");
    };

    const handleBatchGenerate = async () => {
        if (!batchForm.value) { addToast("Bitte einen Rabattwert angeben.", "error"); return; }
        setBatchGenerating(true);
        const count = Math.min(50, Math.max(1, Number(batchCount)));
        const results = [];
        for (let i = 0; i < count; i++) {
            const payload = {
                code: randomCode(),
                type: batchForm.type,
                value: Number(batchForm.value),
                valid_from: batchForm.valid_from || null,
                valid_until: batchForm.valid_until || null,
                max_uses: batchForm.max_uses ? Number(batchForm.max_uses) : null,
                applies_to: "all",
                is_active: true,
            };
            const { error } = await coupons.createCoupon(payload);
            if (!error) results.push(payload.code);
        }
        setBatchGenerating(false);
        setShowBatch(false);
        addToast(`${results.length} Gutschein${results.length !== 1 ? "e" : ""} erstellt.`, "success");
    };

    const list = coupons.coupons || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className={`rounded-2xl border p-6 ${card}`}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">Gutscheine</h1>
                        <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                            Rabattcodes erstellen und verwalten — werden im Buchungsformular eingelöst
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowBatch(true)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm border transition-colors ${darkMode ? "border-slate-700 hover:bg-slate-800 text-slate-300" : "border-slate-200 hover:bg-slate-50 text-slate-700"}`}>
                            <Zap className="w-4 h-4" /> Batch generieren
                        </button>
                        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-[#1A7D5A] hover:bg-[#156649] text-white rounded-xl font-medium text-sm shadow-lg shadow-[#1A7D5A]/25 transition-all">
                            <Plus className="w-4 h-4" /> Neuer Gutschein
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className={`rounded-2xl border overflow-hidden ${card}`}>
                {coupons.loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-[#1A7D5A]" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className={darkMode ? "bg-slate-800/50" : "bg-slate-50"}>
                                <tr className={`text-left text-xs font-bold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
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
                                    const now = new Date();
                                    const expired = c.valid_until && new Date(c.valid_until) < now;
                                    const exhausted = c.max_uses != null && c.used_count >= c.max_uses;
                                    const conditions = [];
                                    if (c.min_order_value) conditions.push(`Min. ${fmtCurrency(c.min_order_value)}`);
                                    if (c.min_duration_days) conditions.push(`Min. ${c.min_duration_days}d`);
                                    if (c.min_quantity) conditions.push(`Min. ${c.min_quantity} Räder`);
                                    return (
                                        <tr key={c.id} className={`${darkMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50"} ${!c.is_active ? "opacity-50" : ""}`}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <code className={`px-2 py-1 rounded text-sm font-bold tracking-widest ${darkMode ? "bg-slate-800 text-[#3BAA82]" : "bg-[#D4EDE2] text-[#1A7D5A]"}`}>{c.code}</code>
                                                    <button onClick={() => copyCode(c.code, c.id)} className={`p-1 rounded transition-colors ${darkMode ? "hover:bg-slate-700" : "hover:bg-slate-200"}`}>
                                                        {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-sm">
                                                {c.type === "percentage" ? `${c.value}%` : fmtCurrency(c.value)}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-400">
                                                {conditions.length ? conditions.join(" · ") : "—"}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={exhausted ? "text-red-500 font-semibold" : ""}>{c.used_count || 0}</span>
                                                {c.max_uses != null ? ` / ${c.max_uses}` : " / ∞"}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {(c.valid_from || c.valid_until) ? (
                                                    <span className={expired ? "text-red-500 line-through" : ""}>
                                                        {fmtDate(c.valid_from)} – {fmtDate(c.valid_until)}
                                                    </span>
                                                ) : <span className={darkMode ? "text-slate-500" : "text-slate-400"}>Unbegrenzt</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button onClick={() => toggleActive(c)}
                                                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${c.is_active
                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500"}`}>
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
                        <p className="text-sm mt-1">Erstelle den ersten Gutschein oder generiere mehrere auf einmal.</p>
                    </div>
                )}
            </div>

            {/* ── CONFIRM DELETE ── */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl ${card}`}>
                        <p className="font-semibold text-lg mb-2">Gutschein löschen?</p>
                        <p className={`text-sm mb-6 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Diese Aktion kann nicht rückgängig gemacht werden.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setConfirmDeleteId(null)} className={`px-4 py-2 rounded-xl text-sm font-medium ${darkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Abbrechen</button>
                            <button onClick={() => handleDelete(confirmDeleteId)} className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-medium">Ja, löschen</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── CREATE / EDIT MODAL ── */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className={`w-full max-w-lg rounded-2xl border shadow-2xl max-h-[90dvh] flex flex-col ${card}`}>
                        <div className="flex items-center justify-between p-6 pb-0">
                            <h2 className="text-xl font-bold">{editId ? "Gutschein bearbeiten" : "Neuer Gutschein"}</h2>
                            <button onClick={() => setShowForm(false)} className={`p-2 rounded-lg ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}><X className="w-4 h-4" /></button>
                        </div>
                        <div className="space-y-4 p-6 overflow-y-auto">
                            {/* Code */}
                            <div>
                                <label className={lbl}>Code *</label>
                                <div className="flex gap-2">
                                    <input className={`${inp} font-mono uppercase tracking-widest`} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SOMMER2026" />
                                    <button onClick={() => setForm(f => ({ ...f, code: randomCode() }))} className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${darkMode ? "bg-slate-700 hover:bg-slate-600 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-700"}`}>Neu</button>
                                </div>
                            </div>
                            {/* Typ + Wert */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={lbl}>Typ</label>
                                    <select className={inp} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                                        <option value="percentage">Prozent (%)</option>
                                        <option value="fixed">Fixbetrag (€)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={lbl}>Wert *</label>
                                    <input type="number" min="0" className={inp} value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder={form.type === "percentage" ? "20" : "10.00"} />
                                </div>
                            </div>
                            {/* Gültigkeitszeitraum */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={lbl}>Gültig von</label>
                                    <input type="date" className={inp} value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} />
                                </div>
                                <div>
                                    <label className={lbl}>Gültig bis</label>
                                    <input type="date" className={inp} value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
                                </div>
                            </div>
                            {/* Mindestbedingungen */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className={lbl}>Min. Bestellwert (€)</label>
                                    <input type="number" min="0" className={inp} value={form.min_order_value} onChange={e => setForm(f => ({ ...f, min_order_value: e.target.value }))} placeholder="Optional" />
                                </div>
                                <div>
                                    <label className={lbl}>Min. Tage</label>
                                    <input type="number" min="0" className={inp} value={form.min_duration_days} onChange={e => setForm(f => ({ ...f, min_duration_days: e.target.value }))} placeholder="Optional" />
                                </div>
                                <div>
                                    <label className={lbl}>Min. Räder</label>
                                    <input type="number" min="0" className={inp} value={form.min_quantity} onChange={e => setForm(f => ({ ...f, min_quantity: e.target.value }))} placeholder="Optional" />
                                </div>
                            </div>
                            {/* Max. Nutzungen + Geltungsbereich */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={lbl}>Max. Nutzungen</label>
                                    <input type="number" min="0" className={inp} value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="Unbegrenzt" />
                                </div>
                                <div>
                                    <label className={lbl}>Gilt für</label>
                                    <select className={inp} value={form.applies_to} onChange={e => setForm(f => ({ ...f, applies_to: e.target.value }))}>
                                        <option value="all">Alle Buchungen</option>
                                        <option value="category">Kategorie</option>
                                        <option value="specific_bike">Einzelnes Fahrrad</option>
                                    </select>
                                </div>
                            </div>
                            {/* Aktiv */}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 rounded" />
                                <span className="text-sm font-medium">Sofort aktiv</span>
                            </label>
                        </div>
                        <div className={`flex items-center justify-end gap-3 p-6 pt-4 border-t ${darkMode ? "border-slate-700" : "border-slate-200"} flex-shrink-0`}>
                            <button onClick={() => setShowForm(false)} className={`px-4 py-2 rounded-xl text-sm font-medium ${darkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Abbrechen</button>
                            <button onClick={handleSave} disabled={!form.code || !form.value} className="px-5 py-2 bg-[#1A7D5A] hover:bg-[#156649] text-white rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-[#1A7D5A]/20">
                                {editId ? "Speichern" : "Erstellen"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── BATCH GENERATE MODAL ── */}
            {showBatch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className={`w-full max-w-md rounded-2xl border shadow-2xl ${card}`}>
                        <div className="flex items-center justify-between p-6 pb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2"><Zap className="w-5 h-5 text-[#1A7D5A]" /> Codes batch-generieren</h2>
                            <button onClick={() => setShowBatch(false)} className={`p-2 rounded-lg ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}><X className="w-4 h-4" /></button>
                        </div>
                        <div className="space-y-4 px-6 pb-4">
                            <div>
                                <label className={lbl}>Anzahl (1–50)</label>
                                <input type="number" min="1" max="50" className={inp} value={batchCount} onChange={e => setBatchCount(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={lbl}>Typ</label>
                                    <select className={inp} value={batchForm.type} onChange={e => setBatchForm(f => ({ ...f, type: e.target.value }))}>
                                        <option value="percentage">Prozent (%)</option>
                                        <option value="fixed">Fixbetrag (€)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={lbl}>Wert *</label>
                                    <input type="number" min="0" className={inp} value={batchForm.value} onChange={e => setBatchForm(f => ({ ...f, value: e.target.value }))} placeholder={batchForm.type === "percentage" ? "15" : "5.00"} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={lbl}>Gültig von</label>
                                    <input type="date" className={inp} value={batchForm.valid_from} onChange={e => setBatchForm(f => ({ ...f, valid_from: e.target.value }))} />
                                </div>
                                <div>
                                    <label className={lbl}>Gültig bis</label>
                                    <input type="date" className={inp} value={batchForm.valid_until} onChange={e => setBatchForm(f => ({ ...f, valid_until: e.target.value }))} />
                                </div>
                            </div>
                            <div>
                                <label className={lbl}>Max. Nutzungen pro Code</label>
                                <input type="number" min="1" className={inp} value={batchForm.max_uses} onChange={e => setBatchForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="Unbegrenzt" />
                            </div>
                        </div>
                        <div className={`flex items-center justify-end gap-3 p-6 pt-4 border-t ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                            <button onClick={() => setShowBatch(false)} className={`px-4 py-2 rounded-xl text-sm font-medium ${darkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Abbrechen</button>
                            <button onClick={handleBatchGenerate} disabled={batchGenerating || !batchForm.value} className="flex items-center gap-2 px-5 py-2 bg-[#1A7D5A] hover:bg-[#156649] text-white rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#1A7D5A]/20">
                                {batchGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generiere…</> : <><Zap className="w-4 h-4" /> {batchCount} Codes erstellen</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
