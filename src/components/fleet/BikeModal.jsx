"use client";
import { useState, useEffect, useCallback } from "react";
import { Loader2, X, Plus, Trash2, Wrench, CheckCircle, AlertTriangle, Clock, ChevronDown } from "lucide-react";
import { supabase } from "../../utils/supabase";
import { SCHEDULE_TYPES } from "../../hooks/useMaintenance";

const SCHEDULE_TYPE_LABELS = { routine: "Routine", brake: "Bremsen", tire: "Reifen", chain: "Kette", battery: "Akku", full_service: "Vollservice" };
const STATUS_COLOR = { good: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400", check: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400", defect: "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400" };
function fmtDt(iso) { if (!iso) return "\u2014"; return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }); }

export default function BikeModal({ bike, onSave, onDelete, onClose, darkMode }) {
    const [tab, setTab] = useState("details");
    const [form, setForm] = useState(() => bike || {
        name: "", category: "E-Bike", size: "M", price_per_day: 35, deposit: 50,
        deposit_type: "fixed", deposit_amount: 50, deposit_percentage: 0,
        battery: "500Wh", motor: "Mittelmotor", color: "Schwarz",
        frame_number: `FR${Date.now().toString().slice(-6)}`, status: "available"
    });
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [schedules, setSchedules] = useState([]);
    const [health, setHealth] = useState(null);
    const [schedulesLoading, setSchedulesLoading] = useState(false);
    const [showScheduleForm, setShowScheduleForm] = useState(false);
    const [newSched, setNewSched] = useState({ type: "routine", interval_days: "", interval_rentals: "" });
    const [savingSchedule, setSavingSchedule] = useState(false);
    const [showServiceForm, setShowServiceForm] = useState(false);
    const [svcForm, setSvcForm] = useState({ type: "service", description: "", cost: "", performed_by: "", parts_str: "" });
    const [savingService, setSavingService] = useState(false);
    const [recentLogs, setRecentLogs] = useState([]);

    const dm = darkMode;
    const inp = `w-full px-3 py-2 rounded-lg border outline-none text-sm transition-all ${dm ? "bg-slate-800 border-slate-700 text-white focus:border-[#1A7D5A]" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#1A7D5A] focus:bg-white"}`;
    const lbl = `block text-sm font-medium mb-1.5 ${dm ? "text-slate-300" : "text-slate-700"}`;

    const loadWartung = useCallback(async () => {
        if (!bike?.id) return;
        setSchedulesLoading(true);
        const [{ data: s }, { data: h }, { data: l }] = await Promise.all([
            supabase.from("maintenance_schedules").select("*").eq("bike_id", bike.id).order("created_at"),
            supabase.from("bike_health").select("*").eq("bike_id", bike.id).maybeSingle(),
            supabase.from("maintenance_logs").select("*").eq("bike_id", bike.id).order("performed_at", { ascending: false }).limit(5),
        ]);
        setSchedules(s || []); setHealth(h || null); setRecentLogs(l || []);
        setSchedulesLoading(false);
    }, [bike?.id]);

    useEffect(() => { if (tab === "wartung" && bike?.id) loadWartung(); }, [tab, bike?.id, loadWartung]);
    useEffect(() => {
        const handler = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);

    const handleSave = async () => {
        setSaving(true);
        try { await onSave(form); } catch { /* handled in parent */ } finally { setSaving(false); }
    };

    const handleAddSchedule = async () => {
        if (!newSched.type || (!newSched.interval_days && !newSched.interval_rentals)) return;
        setSavingSchedule(true);
        let next_due_at = null;
        if (newSched.interval_days) next_due_at = new Date(Date.now() + Number(newSched.interval_days) * 86400000).toISOString();
        await supabase.from("maintenance_schedules").insert({
            organization_id: bike.organization_id, bike_id: bike.id, type: newSched.type,
            interval_days: newSched.interval_days ? Number(newSched.interval_days) : null,
            interval_rentals: newSched.interval_rentals ? Number(newSched.interval_rentals) : null,
            next_due_at,
        });
        setNewSched({ type: "routine", interval_days: "", interval_rentals: "" });
        setShowScheduleForm(false); setSavingSchedule(false); await loadWartung();
    };

    const handleLogService = async () => {
        if (!svcForm.type) return;
        setSavingService(true);
        const parts = svcForm.parts_str.split(",").map(p => p.trim()).filter(Boolean);
        await supabase.from("maintenance_logs").insert({
            organization_id: bike.organization_id, bike_id: bike.id, type: svcForm.type,
            description: svcForm.description, cost: svcForm.cost ? Number(svcForm.cost) : null,
            performed_by: svcForm.performed_by, performed_at: new Date().toISOString().slice(0, 10),
            status: "completed", parts_used: parts,
        });
        setSvcForm({ type: "service", description: "", cost: "", performed_by: "", parts_str: "" });
        setShowServiceForm(false); setSavingService(false); await loadWartung();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div role="dialog" aria-modal="true" aria-labelledby="bike-modal-title"
                className={`w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90dvh] ${dm ? "bg-slate-900 text-white" : "bg-white text-slate-900"}`}>

                <div className={`flex items-center justify-between p-4 border-b ${dm ? "border-slate-800" : "border-slate-200"}`}>
                    <h3 id="bike-modal-title" className="text-lg font-semibold">{bike ? "Rad bearbeiten" : "Neues Rad"}</h3>
                    <button onClick={onClose} aria-label="Schlie\u00dfen" className={`p-2 rounded-lg ${dm ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}><X className="w-5 h-5" /></button>
                </div>

                {bike && (
                    <div className={`flex px-4 pt-3 border-b ${dm ? "border-slate-800" : "border-slate-200"}`}>
                        {[{ id: "details", label: "Details" }, { id: "wartung", label: "Wartung" }].map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.id ? "border-[#1A7D5A] text-[#1A7D5A]" : `border-transparent ${dm ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700"}`}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto">
                    {tab === "details" && (
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2"><label className={lbl}>Name</label><input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} placeholder="City E-Bike Premium" /></div>
                                <div><label className={lbl}>Kategorie</label><select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inp}>{["E-Bike","E-MTB","Lastenrad","Kinder","Bio","E-Scooter"].map(c => <option key={c}>{c}</option>)}</select></div>
                                <div><label className={lbl}>Gr\u00f6\u00dfe</label><input type="text" value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} className={inp} /></div>
                                <div><label className={lbl}>Preis/Tag (\u20ac)</label><input type="number" value={form.price_per_day} onChange={e => setForm(f => ({ ...f, price_per_day: Number(e.target.value) }))} className={inp} /></div>
                                <div className="sm:col-span-2">
                                    <label className={lbl}>Kaution</label>
                                    <div className="flex flex-wrap gap-3 mb-3">{[{ value: "none", label: "Kein Deposit" }, { value: "fixed", label: "Fixbetrag (\u20ac)" }, { value: "percentage", label: "Prozent" }].map(opt => (
                                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="deposit_type" value={opt.value} checked={form.deposit_type === opt.value} onChange={() => setForm(f => ({ ...f, deposit_type: opt.value }))} className="accent-[#1A7D5A]" /><span className={`text-sm ${dm ? "text-slate-300" : "text-slate-700"}`}>{opt.label}</span></label>
                                    ))}</div>
                                    {form.deposit_type === "fixed" && <input type="number" min="0" step="0.01" value={form.deposit_amount} onChange={e => setForm(f => ({ ...f, deposit_amount: Number(e.target.value) }))} className={inp} placeholder="50.00" />}
                                    {form.deposit_type === "percentage" && <div className="flex items-center gap-2"><input type="number" min="0" max="100" value={form.deposit_percentage} onChange={e => setForm(f => ({ ...f, deposit_percentage: Number(e.target.value) }))} className={`${inp} flex-1`} /><span className={`text-sm ${dm ? "text-slate-400" : "text-slate-500"}`}>%</span></div>}
                                </div>
                                <div><label className={lbl}>Farbe</label><input type="text" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className={inp} /></div>
                                <div><label className={lbl}>Akku</label><input type="text" value={form.battery} onChange={e => setForm(f => ({ ...f, battery: e.target.value }))} className={inp} placeholder="625Wh" /></div>
                                <div><label className={lbl}>Motor</label><input type="text" value={form.motor} onChange={e => setForm(f => ({ ...f, motor: e.target.value }))} className={inp} /></div>
                                <div className="sm:col-span-2"><label className={lbl}>Rahmennummer</label><input type="text" value={form.frame_number} onChange={e => setForm(f => ({ ...f, frame_number: e.target.value }))} className={inp} /></div>
                            </div>
                        </div>
                    )}

                    {tab === "wartung" && (
                        <div className="p-6 space-y-6">
                            {schedulesLoading
                                ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#1A7D5A]" /></div>
                                : <>
                                    {health && (
                                        <div>
                                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Wrench className="w-4 h-4 text-[#1A7D5A]" /> Fahrradzustand</h4>
                                            <div className={`rounded-xl border p-4 ${dm ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                                                <div className="grid grid-cols-3 gap-3 text-sm">
                                                    <div><div className={`text-xs mb-1 ${dm ? "text-slate-400" : "text-slate-500"}`}>Vermietungen</div><div className="font-semibold">{health.total_rentals || 0}</div></div>
                                                    {[["Bremsen", health.brake_status], ["Reifen v.", health.tire_front_status], ["Reifen h.", health.tire_rear_status], ["Kette", health.chain_status]].map(([label, val]) => (
                                                        <div key={label}><div className={`text-xs mb-1 ${dm ? "text-slate-400" : "text-slate-500"}`}>{label}</div><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[val] || STATUS_COLOR.good}`}>{val === "good" ? "OK" : val === "check" ? "Pr\u00fcfen" : "Defekt"}</span></div>
                                                    ))}
                                                    {health.battery_health_percent != null && <div><div className={`text-xs mb-1 ${dm ? "text-slate-400" : "text-slate-500"}`}>Akku</div><div className="font-semibold">{health.battery_health_percent}%</div></div>}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-semibold">Wartungsintervalle</h4>
                                            <button onClick={() => setShowScheduleForm(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1A7D5A] text-white rounded-lg hover:bg-[#155f44]"><Plus className="w-3.5 h-3.5" /> Intervall hinzuf\u00fcgen</button>
                                        </div>
                                        {showScheduleForm && (
                                            <div className={`mb-4 p-4 rounded-xl border ${dm ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                                                <div className="grid grid-cols-3 gap-3 mb-3">
                                                    <div><label className={`text-xs font-medium mb-1 block ${dm ? "text-slate-400" : "text-slate-500"}`}>Typ</label><select value={newSched.type} onChange={e => setNewSched(s => ({ ...s, type: e.target.value }))} className={inp}>{SCHEDULE_TYPES.map(t => <option key={t} value={t}>{SCHEDULE_TYPE_LABELS[t]}</option>)}</select></div>
                                                    <div><label className={`text-xs font-medium mb-1 block ${dm ? "text-slate-400" : "text-slate-500"}`}>Alle X Tage</label><input type="number" min="1" placeholder="90" className={inp} value={newSched.interval_days} onChange={e => setNewSched(s => ({ ...s, interval_days: e.target.value, interval_rentals: "" }))} /></div>
                                                    <div><label className={`text-xs font-medium mb-1 block ${dm ? "text-slate-400" : "text-slate-500"}`}>Nach X Mieten</label><input type="number" min="1" placeholder="10" className={inp} value={newSched.interval_rentals} onChange={e => setNewSched(s => ({ ...s, interval_rentals: e.target.value, interval_days: "" }))} /></div>
                                                </div>
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setShowScheduleForm(false)} className={`px-3 py-1.5 text-sm rounded-lg ${dm ? "text-slate-400 hover:bg-slate-700" : "text-slate-600 hover:bg-slate-200"}`}>Abbrechen</button>
                                                    <button onClick={handleAddSchedule} disabled={savingSchedule || (!newSched.interval_days && !newSched.interval_rentals)} className="px-4 py-1.5 text-sm bg-[#1A7D5A] text-white rounded-lg disabled:opacity-40 flex items-center gap-2">{savingSchedule && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Speichern</button>
                                                </div>
                                            </div>
                                        )}
                                        {schedules.length === 0
                                            ? <p className={`text-sm py-4 text-center ${dm ? "text-slate-500" : "text-slate-400"}`}>Keine Wartungsintervalle definiert.</p>
                                            : <div className="space-y-2">{schedules.map(s => {
                                                const ov = s.next_due_at && new Date(s.next_due_at) < new Date();
                                                return (
                                                    <div key={s.id} className={`flex items-center justify-between p-3 rounded-lg border ${dm ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-white"}`}>
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            {ov ? <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" /> : s.next_due_at ? <Clock className="w-4 h-4 text-amber-500 shrink-0" /> : <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                                                            <div className="min-w-0">
                                                                <div className="text-sm font-medium">{SCHEDULE_TYPE_LABELS[s.type] || s.type}{s.interval_days && <span className={`ml-2 text-xs ${dm ? "text-slate-400" : "text-slate-500"}`}>alle {s.interval_days}d</span>}{s.interval_rentals && <span className={`ml-2 text-xs ${dm ? "text-slate-400" : "text-slate-500"}`}>alle {s.interval_rentals} Mieten</span>}</div>
                                                                <div className={`text-xs ${ov ? "text-red-500 font-medium" : dm ? "text-slate-400" : "text-slate-500"}`}>{ov ? "\u00dcBERF\u00c4LLIG \u00b7 " : ""}Letzter Service: {fmtDt(s.last_performed_at)} \u00b7 N\u00e4chster: {fmtDt(s.next_due_at)}</div>
                                                            </div>
                                                        </div>
                                                        <button onClick={async () => { await supabase.from("maintenance_schedules").delete().eq("id", s.id); await loadWartung(); }} className={`p-1.5 rounded-lg shrink-0 ${dm ? "text-slate-500 hover:text-red-400 hover:bg-red-900/20" : "text-slate-400 hover:text-red-500 hover:bg-red-50"}`}><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                );
                                            })}</div>
                                        }
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-semibold">Service dokumentieren</h4>
                                            <button onClick={() => setShowServiceForm(v => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border ${dm ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}><Plus className="w-3.5 h-3.5" /> Service eintragen <ChevronDown className={`w-3 h-3 transition-transform ${showServiceForm ? "rotate-180" : ""}`} /></button>
                                        </div>
                                        {showServiceForm && (
                                            <div className={`mb-4 p-4 rounded-xl border space-y-3 ${dm ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div><label className={`text-xs font-medium mb-1 block ${dm ? "text-slate-400" : "text-slate-500"}`}>Typ</label><select value={svcForm.type} onChange={e => setSvcForm(f => ({ ...f, type: e.target.value }))} className={inp}><option value="service">Service</option><option value="repair">Reparatur</option><option value="inspection">Inspektion</option></select></div>
                                                    <div><label className={`text-xs font-medium mb-1 block ${dm ? "text-slate-400" : "text-slate-500"}`}>Kosten (\u20ac)</label><input type="number" min="0" step="0.01" placeholder="0.00" className={inp} value={svcForm.cost} onChange={e => setSvcForm(f => ({ ...f, cost: e.target.value }))} /></div>
                                                </div>
                                                <div><label className={`text-xs font-medium mb-1 block ${dm ? "text-slate-400" : "text-slate-500"}`}>Beschreibung</label><textarea rows={2} className={inp} placeholder="Was wurde gemacht..." value={svcForm.description} onChange={e => setSvcForm(f => ({ ...f, description: e.target.value }))} /></div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div><label className={`text-xs font-medium mb-1 block ${dm ? "text-slate-400" : "text-slate-500"}`}>Durchgef\u00fchrt von</label><input className={inp} placeholder="Name / Werkstatt" value={svcForm.performed_by} onChange={e => setSvcForm(f => ({ ...f, performed_by: e.target.value }))} /></div>
                                                    <div><label className={`text-xs font-medium mb-1 block ${dm ? "text-slate-400" : "text-slate-500"}`}>Verwendete Teile</label><input className={inp} placeholder="Bremsbelge, Kette, ..." value={svcForm.parts_str} onChange={e => setSvcForm(f => ({ ...f, parts_str: e.target.value }))} /></div>
                                                </div>
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setShowServiceForm(false)} className={`px-3 py-1.5 text-sm rounded-lg ${dm ? "text-slate-400 hover:bg-slate-700" : "text-slate-600 hover:bg-slate-200"}`}>Abbrechen</button>
                                                    <button onClick={handleLogService} disabled={savingService} className="px-4 py-1.5 text-sm bg-[#1A7D5A] text-white rounded-lg disabled:opacity-40 flex items-center gap-2">{savingService && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Eintragen</button>
                                                </div>
                                            </div>
                                        )}
                                        {recentLogs.length > 0 && <div className="space-y-2">{recentLogs.map(log => (
                                            <div key={log.id} className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${dm ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-white"}`}>
                                                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                                <div className="min-w-0">
                                                    <div className="font-medium">{log.type === "service" ? "Service" : log.type === "repair" ? "Reparatur" : "Inspektion"}</div>
                                                    <div className={`text-xs ${dm ? "text-slate-400" : "text-slate-500"}`}>{log.performed_at} \u00b7 {log.performed_by || "\u2014"}{log.cost ? ` \u00b7 ${Number(log.cost).toFixed(2)} \u20ac` : ""}</div>
                                                    {log.description && <div className={`text-xs mt-0.5 ${dm ? "text-slate-500" : "text-slate-400"}`}>{log.description}</div>}
                                                </div>
                                            </div>
                                        ))}</div>}
                                    </div>
                                </>
                            }
                        </div>
                    )}
                </div>

                {confirmDelete && (
                    <div className="mx-4 mb-2 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm flex items-center justify-between gap-3">
                        <span className="text-rose-600 font-medium">Rad wirklich l\u00f6schen?</span>
                        <div className="flex gap-2"><button onClick={() => setConfirmDelete(false)} className="px-3 py-1 rounded-lg text-slate-500 hover:bg-slate-100 text-sm">Abbrechen</button><button onClick={() => { setConfirmDelete(false); onDelete(bike.id); }} className="px-3 py-1 rounded-lg bg-rose-500 text-white text-sm hover:bg-rose-600">Ja, l\u00f6schen</button></div>
                    </div>
                )}

                <div className={`flex items-center justify-between p-4 border-t ${dm ? "border-slate-800" : "border-slate-200"}`}>
                    <div>{bike && tab === "details" && <button onClick={() => setConfirmDelete(true)} className="text-rose-500 hover:text-rose-400 text-sm">L\u00f6schen</button>}</div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className={`px-4 py-2 rounded-lg text-sm ${dm ? "bg-slate-800" : "bg-slate-100"}`}>Abbrechen</button>
                        {tab === "details" && <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-gradient-to-r from-[#1A7D5A] to-[#3BAA82] text-white rounded-lg font-medium flex items-center gap-2 text-sm">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Speichern</button>}
                    </div>
                </div>
            </div>
        </div>
    );
}
