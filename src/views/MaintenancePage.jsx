"use client";
import { useState, useMemo } from "react";
import { Plus, Loader2, Edit, Trash2, Wrench, CheckCircle, Clock } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useData } from "../context/DataContext";
import { useToast } from "../components/ui/Toast";
import { fmtDate, fmtCurrency } from "../utils/formatters";

const TYPE_LABELS = {
    inspection: { label: "Inspektion", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    repair: { label: "Reparatur", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    service: { label: "Service", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    damage: { label: "Schaden", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" }
};

const STATUS_LABELS = {
    scheduled: { label: "Geplant", icon: Clock, color: "text-slate-500" },
    in_progress: { label: "In Arbeit", icon: Wrench, color: "text-orange-500" },
    completed: { label: "Erledigt", icon: CheckCircle, color: "text-emerald-500" }
};

export default function MaintenancePage() {
    const { darkMode } = useApp();
    const { maintenanceBlocks, bikes } = useData();
    const { addToast } = useToast();
    const [statusFilter, setStatusFilter] = useState("all");
    const [showForm, setShowForm] = useState(false);
    const [editBlock, setEditBlock] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [form, setForm] = useState({
        bike_id: "", type: "service", description: "",
        cost: "", start_date: "", end_date: "", status: "scheduled", performed_by: ""
    });

    const cardStyle = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
    const inputStyle = `w-full px-3 py-2 rounded-lg border outline-none text-sm transition-all ${darkMode
        ? "bg-slate-800 border-slate-700 text-white focus:border-brand-500"
        : "bg-slate-50 border-slate-200 text-slate-900 focus:border-brand-500 focus:bg-white"}`;

    const filtered = useMemo(() => {
        return maintenanceBlocks.blocks.filter(b =>
            statusFilter === "all" || b.status === statusFilter
        );
    }, [maintenanceBlocks.blocks, statusFilter]);

    const openNew = () => {
        setEditBlock(null);
        const today = new Date().toISOString().slice(0, 10);
        setForm({ bike_id: bikes.bikes[0]?.id || "", type: "service", description: "", cost: "", start_date: today, end_date: today, status: "scheduled", performed_by: "" });
        setShowForm(true);
    };

    const openEdit = (block) => {
        setEditBlock(block);
        setForm({
            bike_id: block.bike_id || "",
            type: block.type || "service",
            description: block.description || "",
            cost: block.cost || "",
            start_date: block.start_date || "",
            end_date: block.end_date || "",
            status: block.status || "scheduled",
            performed_by: block.performed_by || ""
        });
        setShowForm(true);
    };

    const handleSave = async () => {
        const payload = { ...form, cost: form.cost ? Number(form.cost) : null };
        if (editBlock) {
            const { error } = await maintenanceBlocks.update(editBlock.id, payload);
            if (error) { addToast("Fehler: " + error.message, "error"); return; }
        } else {
            const { error } = await maintenanceBlocks.create(payload);
            if (error) { addToast("Fehler: " + error.message, "error"); return; }
        }
        setShowForm(false);
    };

    const handleDelete = async (id) => {
        const { error } = await maintenanceBlocks.remove(id);
        if (error) addToast("Fehler: " + error.message, "error");
        setConfirmDeleteId(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className={`rounded-2xl border p-6 ${cardStyle}`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Wartung</h1>
                        <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                            Wartungsblöcke, Reparaturen und Service-Termine verwalten
                        </p>
                    </div>
                    <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl font-medium shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all">
                        <Plus className="w-4 h-4" /> Neuer Wartungsblock
                    </button>
                </div>
                {/* Status Filter */}
                <div className="flex items-center gap-2 mt-4">
                    {["all", "scheduled", "in_progress", "completed"].map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s
                                ? "bg-brand-500 text-white"
                                : darkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"
                                }`}>
                            {s === "all" ? "Alle" : STATUS_LABELS[s]?.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className={`rounded-2xl border overflow-hidden ${cardStyle}`}>
                {maintenanceBlocks.loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className={darkMode ? "bg-slate-800/50" : "bg-slate-50"}>
                                <tr className={`text-left text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    <th className="px-4 py-3">Fahrrad</th>
                                    <th className="px-4 py-3">Typ</th>
                                    <th className="px-4 py-3">Beschreibung</th>
                                    <th className="px-4 py-3">Zeitraum</th>
                                    <th className="px-4 py-3">Kosten</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${darkMode ? "divide-slate-800" : "divide-slate-100"}`}>
                                {filtered.map(block => {
                                    const typeInfo = TYPE_LABELS[block.type] || TYPE_LABELS.service;
                                    const statusInfo = STATUS_LABELS[block.status] || STATUS_LABELS.scheduled;
                                    const StatusIcon = statusInfo.icon;
                                    return (
                                        <tr key={block.id} className={darkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50"}>
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{block.bike?.name || "—"}</div>
                                                <div className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{block.bike?.category}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${typeInfo.color}`}>
                                                    {typeInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm max-w-xs truncate">{block.description || "—"}</td>
                                            <td className="px-4 py-3 text-sm">{fmtDate(block.start_date)} → {fmtDate(block.end_date)}</td>
                                            <td className="px-4 py-3 font-medium text-sm">{block.cost ? fmtCurrency(block.cost) : "—"}</td>
                                            <td className="px-4 py-3">
                                                <div className={`flex items-center gap-1.5 text-sm font-medium ${statusInfo.color}`}>
                                                    <StatusIcon className="w-4 h-4" /> {statusInfo.label}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => openEdit(block)} className={`p-2 rounded-lg ${darkMode ? "hover:bg-slate-700" : "hover:bg-slate-200"}`}>
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setConfirmDeleteId(block.id)} className={`p-2 rounded-lg text-red-500 ${darkMode ? "hover:bg-red-900/20" : "hover:bg-red-50"}`}>
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
                {!maintenanceBlocks.loading && filtered.length === 0 && (
                    <div className={`text-center py-16 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                        <Wrench className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">Keine Wartungsblöcke gefunden</p>
                    </div>
                )}
            </div>

            {/* Confirm Delete Dialog */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className={`w-full max-w-sm rounded-2xl border p-6 ${cardStyle} shadow-2xl`}>
                        <p className="font-semibold text-lg mb-2">Wartungsblock löschen?</p>
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
                        <h2 className="text-xl font-bold mb-6">{editBlock ? "Wartungsblock bearbeiten" : "Neuer Wartungsblock"}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Fahrrad *</label>
                                <select className={inputStyle} value={form.bike_id} onChange={e => setForm({ ...form, bike_id: e.target.value })}>
                                    <option value="">Bitte wählen...</option>
                                    {bikes.bikes.map(b => <option key={b.id} value={b.id}>{b.name} ({b.category})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Typ</label>
                                    <select className={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                        {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Status</label>
                                    <select className={inputStyle} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                        {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Beschreibung</label>
                                <textarea className={inputStyle} rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Was wird gemacht..." />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Von</label>
                                    <input type="date" className={inputStyle} value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Bis</label>
                                    <input type="date" className={inputStyle} value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Kosten (€)</label>
                                    <input type="number" className={inputStyle} value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} placeholder="0.00" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Durchgeführt von</label>
                                <input className={inputStyle} value={form.performed_by} onChange={e => setForm({ ...form, performed_by: e.target.value })} placeholder="Name / Werkstatt" />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <button onClick={() => setShowForm(false)} className={`px-4 py-2 rounded-xl text-sm font-medium ${darkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Abbrechen</button>
                            <button onClick={handleSave} disabled={!form.bike_id} className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-brand-500/20">
                                {editBlock ? "Speichern" : "Erstellen"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
