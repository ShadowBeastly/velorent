"use client";
import { useState, useMemo } from "react";
import { Plus, Loader2, Check, RefreshCw, LayoutGrid, List, MoreHorizontal, Battery, Gauge, Layers, Download } from "lucide-react";
import { BIKE_COLORS } from "../utils/constants";
import { fmtCurrency } from "../utils/formatters";
import BikeModal from "../components/fleet/BikeModal";
import { useApp } from "../context/AppContext";
import { useData } from "../context/DataContext";
import { useToast } from "../components/ui/Toast";
import { exportToCSV } from "../utils/exportCSV";

export default function FleetPage() {
    const { darkMode, searchQuery } = useApp();
    const { bikes, bookings, bikeCategories } = useData();
    const { addToast } = useToast();
    const [showModal, setShowModal] = useState(false);
    const [editBike, setEditBike] = useState(null);
    const [viewMode, setViewMode] = useState("table");
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");

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

            const matchesCategory = categoryFilter === "all" || b.category === categoryFilter;

            return matchesSearch && matchesStatus && matchesCategory;
        });
    }, [bikes.bikes, searchQuery, bookings.bookings, statusFilter, categoryFilter]);

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
            addToast("Fehler beim Speichern des Rades.", "error");
        }
    };

    const toggleStatus = async (bike) => {
        try {
            const newStatus = bike.status === "maintenance" ? "available" : "maintenance";
            await bikes.update(bike.id, { status: newStatus });
        } catch (error) {
            console.error("Error updating status:", error);
            addToast("Fehler beim Ändern des Status.", "error");
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
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-slate-400" />
                        <select
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value)}
                            className={`text-xs px-2 py-1.5 rounded-lg border outline-none ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-700"}`}
                        >
                            <option value="all">Alle Kategorien</option>
                            {bikeCategories.categories.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                            {/* Fallback: unique categories from bikes if no categories table yet */}
                            {bikeCategories.categories.length === 0 &&
                                [...new Set(bikes.bikes.map(b => b.category).filter(Boolean))].map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))
                            }
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <span className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {filtered.length} Räder
                    </span>
                    <button
                        onClick={() => exportToCSV(filtered, [
                            { key: 'name', label: 'Name' },
                            { key: 'category', label: 'Kategorie' },
                            { key: 'size', label: 'Größe' },
                            { key: 'price_per_day', label: 'Preis/Tag' },
                            { key: 'status', label: 'Status' },
                        ], 'flotte')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium border transition-colors whitespace-nowrap ${darkMode ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-300 text-slate-600 hover:bg-slate-100"}`}
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Exportieren</span>
                    </button>
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

