"use client";
import { useState, useMemo } from "react";
import { Plus, Loader2, Check, RefreshCw, LayoutGrid, List, MoreHorizontal, Battery, Gauge, Download, Edit, Bike } from "lucide-react";
import { BIKE_COLORS } from "../utils/constants";
import { fmtCurrency } from "../utils/formatters";
import BikeModal from "../components/fleet/BikeModal";
import { useApp } from "../context/AppContext";
import { useData } from "../context/DataContext";
import { useToast } from "../components/ui/Toast";
import { exportToCSV } from "../utils/exportCSV";
import { useOrganization } from "../context/OrgContext";
import ItemsPage from "./ItemsPage";

const FRAME_SIZES = ["XS", "S", "M", "L", "XL"];

export default function FleetPage() {
    const org = useOrganization();
    const { darkMode, searchQuery } = useApp();
    const { bikes, bookings, bikeCategories } = useData();
    const { addToast } = useToast();
    const [showModal, setShowModal] = useState(false);
    const [editBike, setEditBike] = useState(null);
    const [viewMode, setViewMode] = useState("grid");
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [sizeFilter, setSizeFilter] = useState("all");

    const genericItemsUiEnabled = !!org.currentOrg?.feature_flags?.generic_items_ui;

    // Build category list
    const categories = useMemo(() => {
        if (bikeCategories?.categories?.length > 0) {
            return bikeCategories.categories.map(c => c.name);
        }
        return [...new Set(bikes.bikes.map(b => b.category).filter(Boolean))];
    }, [bikeCategories?.categories, bikes.bikes]);

    const filtered = useMemo(() => {
        return bikes.bikes.filter(b => {
            const matchesSearch =
                searchQuery === "" ||
                b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.frame_number?.toLowerCase().includes(searchQuery.toLowerCase());

            const isOut = bookings.bookings.some(bk => bk.item_id === b.id && bk.status === "picked_up");

            const matchesStatus = statusFilter === "all" ||
                (statusFilter === "out" && isOut) ||
                (statusFilter === "maintenance" && b.status === "maintenance") ||
                (statusFilter === "available" && !isOut && b.status === "available");

            const matchesCategory = categoryFilter === "all" || b.category === categoryFilter;
            const matchesSize = sizeFilter === "all" || b.size === sizeFilter;

            return matchesSearch && matchesStatus && matchesCategory && matchesSize;
        });
    }, [bikes.bikes, searchQuery, bookings.bookings, statusFilter, categoryFilter, sizeFilter]);

    if (genericItemsUiEnabled) {
        return <ItemsPage />;
    }

    const handleSave = async (data) => {
        try {
            let result;
            if (editBike) result = await bikes.update(editBike.id, data);
            else result = await bikes.create(data);
            if (result?.error) throw result.error;
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

    const getBikeStatus = (bike) => {
        const isOut = bookings.bookings.some(b => b.item_id === bike.id && b.status === "picked_up");
        if (isOut) return { label: "Vermietet", bg: "bg-[#1A7D5A]", text: "text-white" };
        if (bike.status === "maintenance") return { label: "Wartung", bg: "bg-slate-500", text: "text-white" };
        return { label: "Verfügbar", bg: "bg-emerald-500", text: "text-white" };
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Angebote</h2>
                <div className="flex items-center gap-3">
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
                    <button
                        onClick={() => exportToCSV(filtered, [
                            { key: 'name', label: 'Name' },
                            { key: 'category', label: 'Kategorie' },
                            { key: 'size', label: 'Größe' },
                            { key: 'price_per_day', label: 'Preis/Tag' },
                            { key: 'status', label: 'Status' },
                        ], 'angebote')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium border transition-colors ${darkMode ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-300 text-slate-600 hover:bg-slate-100"}`}
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Exportieren</span>
                    </button>
                    <button
                        onClick={() => { setEditBike(null); setShowModal(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1A7D5A] to-[#3BAA82] text-white rounded-lg font-bold text-sm shadow-lg shadow-[#1A7D5A]/25 transition-all hover:shadow-xl"
                    >
                        <Plus className="w-4 h-4" />
                        Angebot hinzufügen
                    </button>
                </div>
            </div>

            {/* Filter Section */}
            <div className={`rounded-xl border shadow-sm p-5 space-y-5 ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                {/* Kategorie */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <span className={`text-xs font-bold uppercase tracking-wider w-32 shrink-0 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                        Kategorie
                    </span>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setCategoryFilter("all")}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${categoryFilter === "all"
                                ? "bg-[#1A7D5A] text-white shadow-sm"
                                : darkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                        >
                            Alle
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategoryFilter(cat)}
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${categoryFilter === cat
                                    ? "bg-[#1A7D5A] text-white shadow-sm"
                                    : darkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={`h-px ${darkMode ? "bg-slate-800" : "bg-slate-100"}`} />

                {/* Rahmengröße */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <span className={`text-xs font-bold uppercase tracking-wider w-32 shrink-0 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                        Rahmengröße
                    </span>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSizeFilter("all")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${sizeFilter === "all"
                                ? "border-2 border-[#1A7D5A] text-[#1A7D5A] bg-[#1A7D5A]/5"
                                : darkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                        >
                            Alle
                        </button>
                        {FRAME_SIZES.map(size => (
                            <button
                                key={size}
                                onClick={() => setSizeFilter(size)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${sizeFilter === size
                                    ? "border-2 border-[#1A7D5A] text-[#1A7D5A] bg-[#1A7D5A]/5"
                                    : darkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={`h-px ${darkMode ? "bg-slate-800" : "bg-slate-100"}`} />

                {/* Status */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <span className={`text-xs font-bold uppercase tracking-wider w-32 shrink-0 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                        Status
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { value: "all", label: "Alle" },
                            { value: "available", label: "Verfügbar" },
                            { value: "out", label: "Vermietet" },
                            { value: "maintenance", label: "Wartung" },
                        ].map(s => (
                            <button
                                key={s.value}
                                onClick={() => setStatusFilter(s.value)}
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${statusFilter === s.value
                                    ? "bg-[#1A7D5A] text-white shadow-sm"
                                    : darkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                            >
                                {s.label}
                            </button>
                        ))}
                        <span className={`text-xs font-medium self-center ml-2 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            {filtered.length} Angebote
                        </span>
                    </div>
                </div>
            </div>

            {/* Content */}
            {bikes.loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-[#1A7D5A]" />
                </div>
            ) : viewMode === "grid" ? (
                /* GRID VIEW. Design Mockup Style */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((bike) => {
                        const globalIdx = bikes.bikes.findIndex(b => b.id === bike.id);
                        const status = getBikeStatus(bike);

                        return (
                            <div key={bike.id} className={`rounded-xl border overflow-hidden shadow-sm group transition-all hover:shadow-md ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                                {/* Image / Color Placeholder */}
                                <div className="aspect-video relative overflow-hidden">
                                    <div className={`w-full h-full ${BIKE_COLORS[globalIdx % BIKE_COLORS.length]} opacity-20`} />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className={`w-16 h-16 rounded-2xl ${BIKE_COLORS[globalIdx % BIKE_COLORS.length]} flex items-center justify-center text-white text-2xl font-bold shadow-lg`}>
                                            {globalIdx + 1}
                                        </div>
                                    </div>
                                    {/* Status Badge */}
                                    <div className="absolute top-3 left-3">
                                        <span className={`${status.bg} ${status.text} text-[10px] font-bold px-2.5 py-1 rounded shadow-sm uppercase tracking-wider`}>
                                            {status.label}
                                        </span>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="text-[#1A7D5A] text-[10px] font-bold uppercase tracking-widest block mb-1">
                                                {bike.category || ""}
                                            </span>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{bike.name}</h3>
                                            {bike.frame_number && (
                                                <p className={`text-[10px] mt-0.5 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{bike.frame_number}</p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{fmtCurrency(bike.price_per_day)}</p>
                                            <p className={`text-[10px] uppercase font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`}>pro Tag</p>
                                        </div>
                                    </div>

                                    {/* Tech specs row */}
                                    {(bike.size || bike.battery || bike.motor) && (
                                        <div className={`flex items-center gap-3 text-xs mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                            {bike.size && <span className="font-medium">{bike.size}</span>}
                                            {bike.battery && (
                                                <span className="flex items-center gap-1">
                                                    <Battery className="w-3 h-3" /> {bike.battery}
                                                </span>
                                            )}
                                            {bike.motor && (
                                                <span className="flex items-center gap-1 truncate">
                                                    <Gauge className="w-3 h-3" /> {bike.motor}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => { setEditBike(bike); setShowModal(true); }}
                                            className={`flex-1 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${darkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                                        >
                                            <Edit className="w-4 h-4" />
                                            Bearbeiten
                                        </button>
                                        <button
                                            onClick={() => toggleStatus(bike)}
                                            className={`p-2.5 rounded-lg transition-colors ${darkMode ? "border border-slate-700 hover:bg-slate-800 text-slate-400" : "border border-slate-200 hover:bg-slate-50 text-slate-400"}`}
                                            title={bike.status === "maintenance" ? "Wartung beenden" : "In Wartung setzen"}
                                        >
                                            {bike.status === "maintenance" ? <Check className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filtered.length === 0 && (
                        <div className={`col-span-full text-center py-12 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            Keine Angebote gefunden.
                        </div>
                    )}
                </div>
            ) : (
                /* TABLE VIEW */
                <div className={`rounded-xl border overflow-hidden shadow-sm ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`border-b ${darkMode ? "bg-slate-800/50 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                                    <th className={`px-6 py-4 text-[11px] font-bold uppercase tracking-wider ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Name / Modell</th>
                                    <th className={`px-6 py-4 text-[11px] font-bold uppercase tracking-wider ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Kategorie</th>
                                    <th className={`px-6 py-4 text-[11px] font-bold uppercase tracking-wider ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Status</th>
                                    <th className={`px-6 py-4 text-[11px] font-bold uppercase tracking-wider hidden md:table-cell ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Technische Daten</th>
                                    <th className={`px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-right ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Preis/Tag</th>
                                    <th className={`px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-right ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Aktionen</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${darkMode ? "divide-slate-800" : "divide-slate-100"}`}>
                                {filtered.map((bike) => {
                                    const globalIdx = bikes.bikes.findIndex(b => b.id === bike.id);
                                    const status = getBikeStatus(bike);

                                    return (
                                        <tr key={bike.id} className={`transition-colors ${darkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50"}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg ${BIKE_COLORS[globalIdx % BIKE_COLORS.length]} flex items-center justify-center text-white font-bold text-xs`}>
                                                        {globalIdx + 1}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold">{bike.name}</div>
                                                        <div className={`text-[10px] ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{bike.frame_number}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[#1A7D5A] text-[10px] font-bold uppercase tracking-widest">{bike.category}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                                    status.label === "Vermietet" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                    : status.label === "Wartung" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                                        status.label === "Vermietet" ? "bg-blue-500"
                                                        : status.label === "Wartung" ? "bg-amber-500"
                                                        : "bg-emerald-500"
                                                    }`} />
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 hidden md:table-cell">
                                                <div className={`flex items-center gap-4 text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                                    {bike.size && <span className="font-medium">{bike.size}</span>}
                                                    {bike.battery && (
                                                        <span className="flex items-center gap-1"><Battery className="w-3 h-3" /> {bike.battery}</span>
                                                    )}
                                                    {bike.motor && (
                                                        <span className="flex items-center gap-1 truncate max-w-[80px]"><Gauge className="w-3 h-3" /> {bike.motor}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-bold">{fmtCurrency(bike.price_per_day)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => toggleStatus(bike)}
                                                        className={`p-1.5 rounded transition-colors ${darkMode ? "text-slate-400 hover:text-[#3BAA82] hover:bg-slate-800" : "text-slate-400 hover:text-[#1A7D5A] hover:bg-slate-100"}`}
                                                        title={bike.status === "maintenance" ? "Wartung beenden" : "In Wartung setzen"}
                                                    >
                                                        <RefreshCw className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditBike(bike); setShowModal(true); }}
                                                        className={`p-1.5 rounded transition-colors ${darkMode ? "text-slate-400 hover:text-[#3BAA82] hover:bg-slate-800" : "text-slate-400 hover:text-[#1A7D5A] hover:bg-slate-100"}`}
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
                            <div className={`p-12 text-center ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                <Bike className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                <p className="text-lg font-medium">Keine Angebote gefunden</p>
                                {statusFilter === "all" && categoryFilter === "all" && sizeFilter === "all" && (
                                    <button
                                        onClick={() => { setEditBike(null); setShowModal(true); }}
                                        className="mt-4 px-4 py-2 bg-gradient-to-r from-[#1A7D5A] to-[#3BAA82] text-white rounded-lg text-sm font-medium shadow-lg shadow-[#1A7D5A]/25"
                                    >
                                        Erstes Angebot hinzufügen
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
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
