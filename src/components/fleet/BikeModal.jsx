"use client";
import { useState, useEffect } from "react";
import { Loader2, X, Wrench, Plus, Trash2 } from "lucide-react";
import { SCHEDULE_TYPES, useMaintenance } from "../../hooks/useMaintenance";
import { useOrganization } from "../../context/OrgContext";
import { fmtDate, fmtCurrency } from "../../utils/formatters";

const SCHEDULE_TYPE_LABELS = {
    routine: "Routine",
    brake: "Bremsen",
    tire: "Reifen",
    chain: "Kette",
    battery: "Akku",
    full_service: "Vollservice",
};

export default function BikeModal({ bike, onSave, onDelete, onClose, darkMode }) {
    const [activeTab, setActiveTab] = useState("details");
    const [form, setForm] = useState(() => bike || {
        name: "",
        category: "E-Bike",
        size: "M",
        price_per_day: 35,
        deposit: 50,
        battery: "500Wh",
        motor: "Mittelmotor",
        color: "Schwarz",
        frame_number: `FR${Date.now().toString().slice(-6)}`,
        status: "available"
    });
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Maintenance tab state
    const org = useOrganization();
    const orgId = org.currentOrg?.id;
    const maintenance = useMaintenance(orgId);
    const [schedules, setSchedules] = useState([]);
    const [logs, setLogs] = useState([]);
    const [health, setHealth] = useState(null);
    const [loadingMaint, setLoadingMaint] = useState(false);
    const [showScheduleForm, setShowScheduleForm] = useState(false);
    const [scheduleForm, setScheduleForm] = useState({ type: "routine", interval_days: "", interval_rentals: "" });
    const [showLogForm, setShowLogForm] = useState(false);
    const [logForm, setLogForm] = useState({ type: "service", description: "", cost: "", performed_by: "", parts_str: "" });

    const modalBg = darkMode ? "bg-slate-900" : "bg-white";
    const inputStyle = `w-full px-3 py-2 rounded-lg border outline-none text-sm ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"}`;
    const tabBase = `px-4 py-2 text-sm font-medium rounded-lg transition-colors`;
    const tabActive = darkMode ? "bg-slate-700 text-white" : "bg-[#1A7D5A] text-white";
    const tabInactive = darkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100";

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        if (activeTab === "maintenance" && bike?.id) {
            setLoadingMaint(true);
            Promise.all([
                maintenance.getSchedules(bike.id),
                maintenance.getMaintenanceLogs(bike.id),
                maintenance.getBikeHealth(bike.id),
            ]).then(([s, l, h]) => {
                setSchedules(s.data || []);
                setLogs(l.data || []);
                setHealth(h.data || null);
            }).finally(() => setLoadingMaint(false));
        }
    }, [activeTab, bike?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

    const handleAddSchedule = async () => {
        if (!bike?.id) return;
        const data = {
            bike_id: bike.id,
            type: scheduleForm.type,
            interval_days: scheduleForm.interval_days ? Number(scheduleForm.interval_days) : null,
            interval_rentals: scheduleForm.interval_rentals ? Number(scheduleForm.interval_rentals) : null,
        };
        const { error } = await maintenance.createSchedule(data);
        if (!error) {
            const { data: updated } = await maintenance.getSchedules(bike.id);
            setSchedules(updated || []);
            setShowScheduleForm(false);
            setScheduleForm({ type: "routine", interval_days: "", interval_rentals: "" });
        }
    };

    const handleDeleteSchedule = async (id) => {
        await maintenance.deleteSchedule(id);
        setSchedules(s => s.filter(x => x.id !== id));
    };

    const handleLogService = async () => {
        if (!bike?.id) return;
        const { error } = await maintenance.logMaintenance({
            bikeId: bike.id,
            type: logForm.type,
            description: logForm.description,
            cost: logForm.cost,
            performedBy: logForm.performed_by,
            partsUsed: logForm.parts_str ? logForm.parts_str.split(",").map(p => p.trim()).filter(Boolean) : [],
        });
        if (!error) {
            const { data: updated } = await maintenance.getMaintenanceLogs(bike.id);
            setLogs(updated || []);
            setShowLogForm(false);
            setLogForm({ type: "service", description: "", cost: "", performed_by: "", parts_str: "" });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="bike-modal-title"
                className={`w-full max-w-2xl rounded-2xl ${modalBg} shadow-2xl flex flex-col max-h-[90dvh]`}
            >
                {/* Header */}
                <div className={`flex items-center justify-between p-4 border-b ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
                    <h3 id="bike-modal-title" className="text-lg font-semibold">{bike ? "Rad bearbeiten" : "Neues Rad"}</h3>
                    <button onClick={onClose} aria-label="Schließen" className={`p-2 rounded-lg ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs — only show Wartung tab for existing bikes */}
                {bike && (
                    <div className={`flex gap-1 px-4 pt-3 pb-0 border-b ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
                        <button className={`${tabBase} ${activeTab === "details" ? tabActive : tabInactive}`} onClick={() => setActiveTab("details")}>Details</button>
                        <button className={`${tabBase} ${activeTab === "maintenance" ? tabActive : tabInactive} flex items-center gap-1.5`} onClick={() => setActiveTab("maintenance")}>
                            <Wrench className="w-3.5 h-3.5" /> Wartung
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === "details" && (
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
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Kaution (€)</label>
                                <input type="number" value={form.deposit} onChange={(e) => setForm(f => ({ ...f, deposit: Number(e.target.value) }))} className={inputStyle} />
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
                        </div>
                    )}

                    {activeTab === "maintenance" && (
                        <div className="space-y-6">
                            {loadingMaint ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="w-6 h-6 animate-spin text-[#1A7D5A]" />
                                </div>
                            ) : (
                                <>
                                    {/* Health Summary */}
                                    {health && (
                                        <div className={`p-4 rounded-xl border ${darkMode ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50"}`}>
                                            <h4 className="text-sm font-semibold mb-3">Bike-Gesundheit</h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                                <div><span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Einsätze</span><div className="font-bold">{health.total_rentals || 0}</div></div>
                                                <div><span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Tage vermietet</span><div className="font-bold">{health.total_rental_days || 0}</div></div>
                                                <div><span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Bremsen</span><div className="font-bold capitalize">{health.brake_status || "—"}</div></div>
                                                <div><span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Akku</span><div className="font-bold">{health.battery_health_percent != null ? `${health.battery_health_percent}%` : "—"}</div></div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Schedules */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-semibold">Wartungsintervalle</h4>
                                            <button
                                                onClick={() => setShowScheduleForm(!showScheduleForm)}
                                                className="flex items-center gap-1 text-xs font-medium text-[#1A7D5A] hover:text-[#3BAA82]"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Intervall hinzufügen
                                            </button>
                                        </div>

                                        {showScheduleForm && (
                                            <div className={`mb-3 p-4 rounded-xl border ${darkMode ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50"}`}>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                                                    <div>
                                                        <label className="text-xs font-medium mb-1 block">Typ</label>
                                                        <select className={inputStyle} value={scheduleForm.type} onChange={e => setScheduleForm(f => ({ ...f, type: e.target.value }))}>
                                                            {SCHEDULE_TYPES.map(t => <option key={t} value={t}>{SCHEDULE_TYPE_LABELS[t] || t}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium mb-1 block">Alle X Tage</label>
                                                        <input type="number" className={inputStyle} value={scheduleForm.interval_days} onChange={e => setScheduleForm(f => ({ ...f, interval_days: e.target.value }))} placeholder="z.B. 90" />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium mb-1 block">Alle X Einsätze</label>
                                                        <input type="number" className={inputStyle} value={scheduleForm.interval_rentals} onChange={e => setScheduleForm(f => ({ ...f, interval_rentals: e.target.value }))} placeholder="z.B. 30" />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 justify-end">
                                                    <button onClick={() => setShowScheduleForm(false)} className={`px-3 py-1.5 rounded-lg text-sm ${darkMode ? "text-slate-400 hover:bg-slate-700" : "text-slate-500 hover:bg-slate-200"}`}>Abbrechen</button>
                                                    <button onClick={handleAddSchedule} disabled={!scheduleForm.interval_days && !scheduleForm.interval_rentals} className="px-3 py-1.5 rounded-lg text-sm bg-[#1A7D5A] text-white font-medium disabled:opacity-40">Speichern</button>
                                                </div>
                                            </div>
                                        )}

                                        {schedules.length === 0 ? (
                                            <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Keine Wartungsintervalle definiert.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {schedules.map(s => (
                                                    <div key={s.id} className={`flex items-center justify-between p-3 rounded-lg border ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                                                        <div>
                                                            <span className="text-sm font-medium capitalize">{SCHEDULE_TYPE_LABELS[s.type] || s.type}</span>
                                                            <div className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                                                {s.interval_days ? `alle ${s.interval_days} Tage` : ""}
                                                                {s.interval_days && s.interval_rentals ? " · " : ""}
                                                                {s.interval_rentals ? `alle ${s.interval_rentals} Einsätze` : ""}
                                                                {s.next_due_at ? ` · Fällig: ${fmtDate(s.next_due_at)}` : ""}
                                                            </div>
                                                        </div>
                                                        <button onClick={() => handleDeleteSchedule(s.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Service Log */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-semibold">Service-Dokumentation</h4>
                                            <button
                                                onClick={() => setShowLogForm(!showLogForm)}
                                                className="flex items-center gap-1 text-xs font-medium text-[#1A7D5A] hover:text-[#3BAA82]"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Service erfassen
                                            </button>
                                        </div>

                                        {showLogForm && (
                                            <div className={`mb-3 p-4 rounded-xl border ${darkMode ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50"}`}>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                                    <div>
                                                        <label className="text-xs font-medium mb-1 block">Typ</label>
                                                        <select className={inputStyle} value={logForm.type} onChange={e => setLogForm(f => ({ ...f, type: e.target.value }))}>
                                                            {SCHEDULE_TYPES.map(t => <option key={t} value={t}>{SCHEDULE_TYPE_LABELS[t] || t}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium mb-1 block">Durchgeführt von</label>
                                                        <input className={inputStyle} value={logForm.performed_by} onChange={e => setLogForm(f => ({ ...f, performed_by: e.target.value }))} placeholder="Name / Werkstatt" />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium mb-1 block">Kosten (€)</label>
                                                        <input type="number" className={inputStyle} value={logForm.cost} onChange={e => setLogForm(f => ({ ...f, cost: e.target.value }))} placeholder="0.00" />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium mb-1 block">Teile (kommagetrennt)</label>
                                                        <input className={inputStyle} value={logForm.parts_str} onChange={e => setLogForm(f => ({ ...f, parts_str: e.target.value }))} placeholder="Bremsbeläge, Kette, ..." />
                                                    </div>
                                                    <div className="sm:col-span-2">
                                                        <label className="text-xs font-medium mb-1 block">Beschreibung</label>
                                                        <textarea className={inputStyle} rows={2} value={logForm.description} onChange={e => setLogForm(f => ({ ...f, description: e.target.value }))} placeholder="Was wurde gemacht?" />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 justify-end">
                                                    <button onClick={() => setShowLogForm(false)} className={`px-3 py-1.5 rounded-lg text-sm ${darkMode ? "text-slate-400 hover:bg-slate-700" : "text-slate-500 hover:bg-slate-200"}`}>Abbrechen</button>
                                                    <button onClick={handleLogService} className="px-3 py-1.5 rounded-lg text-sm bg-[#1A7D5A] text-white font-medium">Speichern</button>
                                                </div>
                                            </div>
                                        )}

                                        {logs.length === 0 ? (
                                            <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Noch keine Service-Einträge.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {logs.map(l => (
                                                    <div key={l.id} className={`p-3 rounded-lg border ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-medium capitalize">{SCHEDULE_TYPE_LABELS[l.type] || l.type}</span>
                                                            <div className="flex items-center gap-3">
                                                                {l.cost ? <span className="text-sm font-medium">{fmtCurrency(l.cost)}</span> : null}
                                                                <span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{fmtDate(l.performed_at)}</span>
                                                            </div>
                                                        </div>
                                                        {l.description && <p className={`text-xs mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{l.description}</p>}
                                                        {l.performed_by && <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>von {l.performed_by}</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Confirm Delete */}
                {confirmDelete && (
                    <div className="mx-4 mb-2 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm flex items-center justify-between gap-3">
                        <span className="text-rose-600 font-medium">Rad wirklich löschen?</span>
                        <div className="flex gap-2">
                            <button onClick={() => setConfirmDelete(false)} className="px-3 py-1 rounded-lg text-slate-500 hover:bg-slate-100 text-sm">Abbrechen</button>
                            <button onClick={() => { setConfirmDelete(false); onDelete(bike.id); }} className="px-3 py-1 rounded-lg bg-rose-500 text-white text-sm hover:bg-rose-600">Ja, löschen</button>
                        </div>
                    </div>
                )}

                {/* Footer */}
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
                        {activeTab === "details" && (
                            <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-gradient-to-r from-[#1A7D5A] to-[#3BAA82] text-white rounded-lg font-medium flex items-center gap-2">
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                Speichern
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
