"use client";
import { useState, useMemo } from "react";
import { Plus, Loader2, Edit, Trash2, Wrench, CheckCircle, Clock, AlertTriangle, ChevronUp, ChevronDown, Activity } from "lucide-react";
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

// 0 = overdue, 1 = due soon, 2 = ok
function urgencyScore(bikeId, dueMap) {
    const entries = dueMap.get(bikeId) || [];
    if (entries.some(m => m.is_overdue)) return 0;
    if (entries.length > 0) return 1;
    return 2;
}

export default function MaintenancePage() {
    const { darkMode } = useApp();
    const { maintenanceBlocks, bikes, maintenanceDue } = useData();
    const { addToast } = useToast();
    const [statusFilter, setStatusFilter] = useState("all");
    const [showForm, setShowForm] = useState(false);
    const [editBlock, setEditBlock] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [sortDir, setSortDir] = useState("asc");
    const [form, setForm] = useState({
        bike_id: "", type: "service", description: "",
        cost: "", start_date: "", end_date: "", status: "scheduled", performed_by: ""
    });

    const cardStyle = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
    const inputStyle = `w-full px-3 py-2 rounded-lg border outline-none text-sm transition-all ${darkMode
        ? "bg-slate-800 border-slate-700 text-white focus:border-[#1A7D5A]"
        : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#1A7D5A] focus:bg-white"}`;

    const dueMap = useMemo(() => {
        const m = new Map();
        (maintenanceDue?.dueMaintenances || []).forEach(entry => {
            if (!m.has(entry.bike_id)) m.set(entry.bike_id, []);
            m.get(entry.bike_id).push(entry);
        });
        return m;
    }, [maintenanceDue?.dueMaintenances]);

    const overviewRows = useMemo(() => {
        const rows = bikes.bikes.map(bike => ({
            bike,
            score: urgencyScore(bike.id, dueMap),
            entries: dueMap.get(bike.id) || [],
        }));
        rows.sort((a, b) => sortDir === "asc" ? a.score - b.score : b.score - a.score);
        return rows;
    }, [bikes.bikes, dueMap, sortDir]);

    const overdueCount = maintenanceDue?.overdueCount || 0;
    const soonCount = maintenanceDue?.soonDueCount || 0;
    const dueBikeIds = new Set((maintenanceDue?.dueMaintenances || []).map(m => m.bike_id));
    const okCount = bikes.bikes.filter(b => !dueBikeIds.has(b.id)).length;

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
            const wasCompleted = editBlock.status !== "completed" && payload.status === "completed";
            const { error } = await maintenanceBlocks.update(editBlock.id, payload);
            if (error) { addToast("Fehler: " + error.message, "error"); return; }
            if (wasCompleted && payload.bike_id) {
                const { error: bikeError } = await bikes.update(payload.bike_id, { status: "available" });
                if (bikeError) addToast("Warnung: Fahrrad-Status konnte nicht zurückgesetzt werden.", "error");
            }
            addToast("Wartungsblock gespeichert.", "success");
        } else {
            const { error } = await maintenanceBlocks.create(payload);
            if (error) { addToast("Fehler: " + error.message, "error"); return; }
            addToast("Wartungsblock erstellt.", "success");
        }
        setShowForm(false);
    };

    const handleDelete = async (id) => {
        const { error } = await maintenanceBlocks.remove(id);
        if (error) { addToast("Fehler: " + error.message, "error"); return; }
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
                            Wartungsintervalle, Status und Service-Termine verwalten
                        </p>
                    </div>
                    <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1A7D5A] to-[#1A7D5A] text-white rounded-xl font-medium shadow-lg shadow-[#1A7D5A]/25 hover:shadow-[#1A7D5A]/40 transition-all">
                        <Plus className="w-4 h-4" /> Neuer Wartungsblock
                    </button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                    <div className={`rounded-xl p-4 border ${darkMode ? "border-slate-700 bg-slate-800/50" : "border-slate-100 bg-slate-50"}`}>
                        <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Gesamt</div>
                        <div className="text-2xl font-bold">{bikes.bikes.length}</div>
                    </div>
                    <div className={`rounded-xl p-4 border ${darkMode ? "border-rose-900/50 bg-rose-900/10" : "border-rose-100 bg-rose-50"}`}>
                        <div className="text-xs font-bold uppercase tracking-wider mb-1 text-rose-500">Überfällig</div>
                        <div className="text-2xl font-bold text-rose-500">{overdueCount}</div>
                    </div>
                    <div className={`rounded-xl p-4 border ${darkMode ? "border-amber-900/50 bg-amber-900/10" : "border-amber-100 bg-amber-50"}`}>
                        <div className="text-xs font-bold uppercase tracking-wider mb-1 text-amber-500">Bald fällig</div>
                        <div className="text-2xl font-bold text-amber-500">{soonCount}</div>
                    </div>
                    <div className={`rounded-xl p-4 border ${darkMode ? "border-emerald-900/50 bg-emerald-900/10" : "border-emerald-100 bg-emerald-50"}`}>
                        <div className="text-xs font-bold uppercase tracking-wider mb-1 text-emerald-500">OK</div>
                        <div className="text-2xl font-bold text-emerald-500">{okCount}</div>
                    </div>
                </div>
            </div>

            {/* Fleet Status Overview */}
            <div className={`rounded-2xl border overflow-hidden ${cardStyle}`}>
                <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                    <h2 className="font-semibold flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#1A7D5A]" />
                        Flotten-Wartungsstatus
                    </h2>
                    <button
                        onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
                        className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${darkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}
                    >
                        Dringlichkeit
                        {sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className={darkMode ? "bg-slate-800/50" : "bg-slate-50"}>
                            <tr className={`text-left text-xs font-bold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                <th className="px-4 py-3">Fahrrad</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Nächste Wartung</th>
                                <th className="px-4 py-3">Typ</th>
                                <th className="px-4 py-3 hidden md:table-cell">Letzte Wartung</th>
                                <th className="px-4 py-3 hidden lg:table-cell">Einsätze</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${darkMode ? "divide-slate-800" : "divide-slate-100"}`}>
                            {overviewRows.map(({ bike, score, entries }) => {
                                const nextEntry = entries[0];
                                return (
                                    <tr key={bike.id} className={`${score === 0 ? (darkMode ? "bg-rose-500/5" : "bg-rose-50/60") : score === 1 ? (darkMode ? "bg-amber-500/5" : "bg-amber-50/40") : ""} ${darkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50"}`}>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-sm">{bike.name}</div>
                                            <div className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{bike.category}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {score === 0 ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                                                    <AlertTriangle className="w-3 h-3" /> Überfällig
                                                </span>
                                            ) : score === 1 ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                    <Clock className="w-3 h-3" /> Bald fällig
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                    <CheckCircle className="w-3 h-3" /> OK
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {nextEntry ? fmtDate(nextEntry.next_due_at) : <span className={`text-xs ${darkMode ? "text-slate-600" : "text-slate-400"}`}>Kein Intervall</span>}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {nextEntry?.type ? (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium capitalize">
                                                    {nextEntry.type}
                                                </span>
                                            ) : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-sm hidden md:table-cell">
                                            {nextEntry?.last_performed_at ? fmtDate(nextEntry.last_performed_at) : <span className={`text-xs ${darkMode ? "text-slate-600" : "text-slate-400"}`}>—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-sm hidden lg:table-cell">
                                            {nextEntry?.total_rentals ?? "—"}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {bikes.bikes.length === 0 && (
                        <div className={`text-center py-12 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p>Keine Fahrräder in der Flotte.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Maintenance Blocks */}
            <div className={`rounded-2xl border overflow-hidden ${cardStyle}`}>
                <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                    <h2 className="font-semibold">Wartungsblöcke</h2>
                    <div className="flex items-center gap-2">
                        {["all", "scheduled", "in_progress", "completed"].map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s
                                    ? "bg-[#1A7D5A] text-white"
                                    : darkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"
                                    }`}>
                                {s === "all" ? "Alle" : STATUS_LABELS[s]?.label}
                            </button>
                        ))}
                    </div>
                </div>
                {maintenanceBlocks.loading ? (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="w-8 h-8 animate-spin text-[#1A7D5A]" />
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

            {/* Wartungsblock Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className={`w-full max-w-lg rounded-2xl border p-6 ${cardStyle} shadow-2xl max-h-[90dvh] overflow-y-auto`}>
                        <h2 className="text-xl font-bold mb-6">{editBlock ? "Wartungsblock bearbeiten" : "Neuer Wartungsblock"}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Fahrrad *</label>
                                <select className={inputStyle} value={form.bike_id} onChange={e => setForm({ ...form, bike_id: e.target.value })}>
                                    <option value="">Bitte wählen...</option>
                                    {bikes.bikes.map(b => <option key={b.id} value={b.id}>{b.name} ({b.category})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                            <button onClick={handleSave} disabled={!form.bike_id} className="px-5 py-2 bg-[#3BAA82] hover:bg-[#1A7D5A] text-white rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-[#1A7D5A]/20">
                                {editBlock ? "Speichern" : "Erstellen"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
