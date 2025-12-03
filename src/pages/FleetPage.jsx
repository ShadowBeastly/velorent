import { useState, useMemo } from "react";
import { Plus, Loader2, Check, RefreshCw, X, LayoutGrid, List, MoreHorizontal, Battery, Gauge } from "lucide-react";
import { BIKE_COLORS } from "../utils/constants";
import { fmtCurrency } from "../utils/formatUtils";

export default function FleetPage({ bikes, bookings, darkMode, searchQuery }) {
    const [showModal, setShowModal] = useState(false);
    const [editBike, setEditBike] = useState(null);
    const [viewMode, setViewMode] = useState("table"); // "table" or "grid"
    const [statusFilter, setStatusFilter] = useState("all");

    const filtered = useMemo(() => {
        return bikes.bikes.filter(b => {
            const matchesSearch =
                searchQuery === "" ||
                b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.frame_number?.toLowerCase().includes(searchQuery.toLowerCase());

            const isOut = bookings.bookings.some(bk => bk.bike_id === b.id && bk.status === "picked_up");


            const matchesStatus = statusFilter === "all" ||
                (statusFilter === "out" && isOut) ||
                (statusFilter === "maintenance" && b.status === "maintenance") ||
                (statusFilter === "available" && !isOut && b.status === "available");

            return matchesSearch && matchesStatus;
        });
    }, [bikes.bikes, searchQuery, bookings.bookings, statusFilter]);

    const cardStyle = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
    const tableHeaderStyle = darkMode ? "bg-slate-900 text-slate-400" : "bg-slate-50 text-slate-500";
    const tableRowStyle = darkMode ? "border-slate-800 hover:bg-slate-800/50" : "border-slate-100 hover:bg-slate-50";

    const handleSave = async (data) => {
        try {
            if (editBike) await bikes.update(editBike.id, data);
            else await bikes.create(data);
            setShowModal(false);
        } catch (error) {
            console.error("Error saving bike:", error);
            alert("Fehler beim Speichern des Rades.");
        }
    };

    const toggleStatus = async (bike) => {
        try {
            const newStatus = bike.status === "maintenance" ? "available" : "maintenance";
            await bikes.update(bike.id, { status: newStatus });
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Fehler beim Ändern des Status.");
        }
    };

    return (
        <div className="space-y-4">
            {/* Header & Controls */}
            <div className={`rounded-2xl border p-4 ${cardStyle} flex flex-col md:flex-row gap-4 justify-between items-center`}>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className={`flex p-1 rounded-lg border ${darkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-100"}`}>
                        <button
                            onClick={() => setViewMode("table")}
                            className={`p-2 rounded-md transition-all ${viewMode === "table" ? (darkMode ? "bg-slate-700 text-white shadow" : "bg-white text-slate-900 shadow") : "text-slate-500"}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2 rounded-md transition-all ${viewMode === "grid" ? (darkMode ? "bg-slate-700 text-white shadow" : "bg-white text-slate-900 shadow") : "text-slate-500"}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                    <div className="flex gap-2">
                        {["all", "available", "out", "maintenance"].map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${statusFilter === s
                                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent"
                                    : "border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                                    }`}
                            >
                                {s === "all" ? "Alle" : s === "available" ? "Verfügbar" : s === "out" ? "Unterwegs" : "Wartung"}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <span className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {filtered.length} Räder
                    </span>
                    <button
                        onClick={() => { setEditBike(null); setShowModal(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium shadow-lg shadow-orange-500/25 whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Neues Rad</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            {bikes.loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
            ) : viewMode === "table" ? (
                // TABLE VIEW
                <div className={`rounded-2xl border overflow-hidden ${cardStyle}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className={`text-xs uppercase font-semibold ${tableHeaderStyle}`}>
                                <tr>
                                    <th className="px-6 py-4">Name / Modell</th>
                                    <th className="px-6 py-4">Kategorie</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Technische Daten</th>
                                    <th className="px-6 py-4 text-right">Preis/Tag</th>
                                    <th className="px-6 py-4 text-right">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${darkMode ? "divide-slate-800" : "divide-slate-100"}`}>
                                {filtered.map((bike) => {
                                    const globalIdx = bikes.bikes.findIndex(b => b.id === bike.id);
                                    const isOut = bookings.bookings.some(b => b.bike_id === bike.id && b.status === "picked_up");

                                    return (
                                        <tr key={bike.id} className={`transition-colors ${tableRowStyle}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg ${BIKE_COLORS[globalIdx % BIKE_COLORS.length]} flex items-center justify-center text-white font-bold text-xs`}>
                                                        {globalIdx + 1}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">{bike.name}</div>
                                                        <div className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{bike.frame_number}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                                                    {bike.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isOut ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                                    bike.status === "maintenance" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                                        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isOut ? "bg-blue-500" : bike.status === "maintenance" ? "bg-amber-500" : "bg-emerald-500"
                                                        }`} />
                                                    {isOut ? "Unterwegs" : bike.status === "maintenance" ? "Wartung" : "Verfügbar"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`flex items-center gap-4 text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                                    <div className="flex items-center gap-1" title="Größe">
                                                        <span className="font-medium">{bike.size}</span>
                                                    </div>
                                                    {bike.battery && (
                                                        <div className="flex items-center gap-1" title="Akku">
                                                            <Battery className="w-3 h-3" />
                                                            <span>{bike.battery}</span>
                                                        </div>
                                                    )}
                                                    {bike.motor && (
                                                        <div className="flex items-center gap-1" title="Motor">
                                                            <Gauge className="w-3 h-3" />
                                                            <span className="truncate max-w-[80px]">{bike.motor}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium">
                                                {fmtCurrency(bike.price_per_day)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => toggleStatus(bike)}
                                                        className={`p-1.5 rounded-md transition-colors ${darkMode ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"}`}
                                                        title={bike.status === "maintenance" ? "Wartung beenden" : "In Wartung setzen"}
                                                    >
                                                        <RefreshCw className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditBike(bike); setShowModal(true); }}
                                                        className={`p-1.5 rounded-md transition-colors ${darkMode ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"}`}
                                                    >
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filtered.length === 0 && (
                            <div className="p-12 text-center text-slate-500">
                                Keine Räder gefunden.
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                // GRID VIEW (Legacy)
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((bike) => {
                        const globalIdx = bikes.bikes.findIndex(b => b.id === bike.id);
                        const isOut = bookings.bookings.some(b => b.bike_id === bike.id && b.status === "picked_up");

                        return (
                            <div key={bike.id} className={`rounded-2xl border overflow-hidden ${cardStyle}`}>
                                <div className={`h-2 ${BIKE_COLORS[globalIdx % BIKE_COLORS.length]}`} />
                                <div className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl ${BIKE_COLORS[globalIdx % BIKE_COLORS.length]} flex items-center justify-center text-white font-bold`}>
                                                {globalIdx + 1}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">{bike.name}</h3>
                                                <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{bike.category}</p>
                                            </div>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full ${isOut ? "bg-blue-100 text-blue-700" :
                                            bike.status === "maintenance" ? "bg-amber-100 text-amber-700" :
                                                "bg-emerald-100 text-emerald-700"
                                            }`}>
                                            {isOut ? "Unterwegs" : bike.status === "maintenance" ? "Wartung" : "Verfügbar"}
                                        </span>
                                    </div>

                                    <div className={`space-y-2 text-sm ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                                        <div className="flex justify-between">
                                            <span>Größe</span>
                                            <span className="font-medium">{bike.size}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Preis/Tag</span>
                                            <span className="font-medium text-orange-500">{fmtCurrency(bike.price_per_day)}</span>
                                        </div>
                                    </div>

                                    <div className={`flex gap-2 mt-4 pt-4 border-t ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
                                        <button
                                            onClick={() => { setEditBike(bike); setShowModal(true); }}
                                            className={`flex-1 py-2 rounded-lg text-sm ${darkMode ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-100 hover:bg-slate-200"}`}
                                        >
                                            Bearbeiten
                                        </button>
                                        <button
                                            onClick={() => toggleStatus(bike)}
                                            className={`px-3 py-2 rounded-lg text-sm ${bike.status === "maintenance"
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-amber-100 text-amber-700"
                                                }`}
                                        >
                                            {bike.status === "maintenance" ? <Check className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Bike Modal */}
            {showModal && (
                <BikeModal
                    bike={editBike}
                    onSave={handleSave}
                    onDelete={async (id) => { await bikes.remove(id); setShowModal(false); }}
                    onClose={() => setShowModal(false)}
                    darkMode={darkMode}
                />
            )}
        </div>
    );
}

function BikeModal({ bike, onSave, onDelete, onClose, darkMode }) {
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

    const modalBg = darkMode ? "bg-slate-900" : "bg-white";
    const inputStyle = `w-full px-3 py-2 rounded-lg border outline-none ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"}`;

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(form);
        } catch {
            // Error is handled in parent, but we stop loading here
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className={`w-full max-w-lg rounded-2xl ${modalBg} shadow-2xl`}>
                <div className={`flex items-center justify-between p-4 border-b ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
                    <h3 className="text-lg font-semibold">{bike ? "Rad bearbeiten" : "Neues Rad"}</h3>
                    <button onClick={onClose} className={`p-2 rounded-lg ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
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
                        <div className="col-span-2">
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Rahmennummer</label>
                            <input type="text" value={form.frame_number} onChange={(e) => setForm(f => ({ ...f, frame_number: e.target.value }))} className={inputStyle} />
                        </div>
                    </div>
                </div>

                <div className={`flex items-center justify-between p-4 border-t ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
                    <div>
                        {bike && (
                            <button onClick={() => { if (confirm("Rad löschen?")) onDelete(bike.id); }} className="text-rose-500 hover:text-rose-400">
                                Löschen
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className={`px-4 py-2 rounded-lg ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>Abbrechen</button>
                        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium flex items-center gap-2">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            Speichern
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
