"use client";
import { useState, useMemo } from "react";
import { Plus, Loader2, Check, RefreshCw, LayoutGrid, List, MoreHorizontal, Download, Edit, Package } from "lucide-react";
import { BIKE_COLORS } from "../utils/constants";
import { fmtCurrency } from "../utils/formatters";
import ItemModal from "../components/fleet/ItemModal";
import { useApp } from "../context/AppContext";
import { useData } from "../context/DataContext";
import { useToast } from "../components/ui/Toast";
import { exportToCSV } from "../utils/exportCSV";

const ITEM_TYPE_LABELS = {
    rental: "Verleih",
    experience: "Erlebnis",
    food_beverage: "Gastronomie",
    service: "Service",
};

const ITEM_TYPE_COLORS = {
    rental: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    experience: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    food_beverage: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    service: "bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300",
};

export default function ItemsPage() {
    const { darkMode, searchQuery } = useApp();
    const { items, bookings, itemCategories } = useData();
    const { addToast } = useToast();
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [viewMode, setViewMode] = useState("grid");
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");

    // Build category list
    const categories = useMemo(() => {
        if (itemCategories?.categories?.length > 0) {
            return itemCategories.categories.map(c => c.name);
        }
        return [...new Set(items.items.map(i => i.category).filter(Boolean))];
    }, [itemCategories?.categories, items.items]);

    const filtered = useMemo(() => {
        return items.items.filter(item => {
            const matchesSearch =
                searchQuery === "" ||
                item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.category?.toLowerCase().includes(searchQuery.toLowerCase());

            const isOut = bookings.bookings.some(bk => bk.item_id === item.id && bk.status === "picked_up");

            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "out" && isOut) ||
                (statusFilter === "maintenance" && item.status === "maintenance") ||
                (statusFilter === "available" && !isOut && item.status === "available");

            const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
            const matchesType = typeFilter === "all" || item.item_type === typeFilter;

            return matchesSearch && matchesStatus && matchesCategory && matchesType;
        });
    }, [items.items, searchQuery, bookings.bookings, statusFilter, categoryFilter, typeFilter]);

    const handleSave = async (data) => {
        try {
            let result;
            if (editItem) result = await items.update(editItem.id, data);
            else result = await items.create(data);
            if (result?.error) throw result.error;
            setShowModal(false);
        } catch (error) {
            console.error("Error saving item:", error);
            addToast("Fehler beim Speichern des Angebots.", "error");
        }
    };

    const toggleStatus = async (item) => {
        try {
            const newStatus = item.status === "maintenance" ? "available" : "maintenance";
            await items.update(item.id, { status: newStatus });
        } catch (error) {
            console.error("Error updating status:", error);
            addToast("Fehler beim Ändern des Status.", "error");
        }
    };

    const getItemStatus = (item) => {
        const isOut = bookings.bookings.some(b => b.item_id === item.id && b.status === "picked_up");
        if (isOut) return { label: "Vermietet", bg: "bg-[#1A7D5A]", text: "text-white" };
        if (item.status === "maintenance") return { label: "Wartung", bg: "bg-slate-500", text: "text-white" };
        return { label: "Verfügbar", bg: "bg-emerald-500", text: "text-white" };
    };

    const isRental = (item) => !item.item_type || item.item_type === "rental";

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
                            { key: 'item_type', label: 'Typ' },
                            { key: 'category', label: 'Kategorie' },
                            { key: 'price_per_day', label: 'Preis/Tag' },
                            { key: 'status', label: 'Status' },
                        ], 'angebote')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium border transition-colors ${darkMode ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-300 text-slate-600 hover:bg-slate-100"}`}
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Exportieren</span>
                    </button>
                    <button
                        onClick={() => { setEditItem(null); setShowModal(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1A7D5A] to-[#3BAA82] text-white rounded-lg font-bold text-sm shadow-lg shadow-[#1A7D5A]/25 transition-all hover:shadow-xl"
                    >
                        <Plus className="w-4 h-4" />
                        Angebot hinzufügen
                    </button>
                </div>
            </div>

            {/* Filter Section */}
            <div className={`rounded-xl border shadow-sm p-5 space-y-5 ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                {/* Typ-Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <span className={`text-xs font-bold uppercase tracking-wider w-32 shrink-0 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                        Typ
                    </span>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setTypeFilter("all")}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${typeFilter === "all"
                                ? "bg-[#1A7D5A] text-white shadow-sm"
                                : darkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                        >
                            Alle
                        </button>
                        {Object.entries(ITEM_TYPE_LABELS).map(([value, label]) => (
                            <button
                                key={value}
                                onClick={() => setTypeFilter(value)}
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${typeFilter === value
                                    ? "bg-[#1A7D5A] text-white shadow-sm"
                                    : darkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={`h-px ${darkMode ? "bg-slate-800" : "bg-slate-100"}`} />

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
            {items.loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-[#1A7D5A]" />
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((item) => {
                        const globalIdx = items.items.findIndex(i => i.id === item.id);
                        const status = getItemStatus(item);
                        const typeLabel = ITEM_TYPE_LABELS[item.item_type] || "Verleih";
                        const typeColor = ITEM_TYPE_COLORS[item.item_type] || ITEM_TYPE_COLORS.rental;

                        return (
                            <div key={item.id} className={`rounded-xl border overflow-hidden shadow-sm group transition-all hover:shadow-md ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                                {/* Image / Color Placeholder */}
                                <div className="aspect-video relative overflow-hidden">
                                    {item.image_url ? (
                                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <div className={`w-full h-full ${BIKE_COLORS[globalIdx % BIKE_COLORS.length]} opacity-20`} />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className={`w-16 h-16 rounded-2xl ${BIKE_COLORS[globalIdx % BIKE_COLORS.length]} flex items-center justify-center text-white shadow-lg`}>
                                                    <Package className="w-7 h-7" />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    {/* Status Badge */}
                                    <div className="absolute top-3 left-3">
                                        <span className={`${status.bg} ${status.text} text-[10px] font-bold px-2.5 py-1 rounded shadow-sm uppercase tracking-wider`}>
                                            {status.label}
                                        </span>
                                    </div>
                                    {/* Type Badge */}
                                    <div className="absolute top-3 right-3">
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded shadow-sm ${typeColor}`}>
                                            {typeLabel}
                                        </span>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="text-[#1A7D5A] text-[10px] font-bold uppercase tracking-widest block mb-1">
                                                {item.category || ""}
                                            </span>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{item.name}</h3>
                                            {isRental(item) && item.frame_number && (
                                                <p className={`text-[10px] mt-0.5 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{item.frame_number}</p>
                                            )}
                                            {!isRental(item) && item.capacity && (
                                                <p className={`text-[10px] mt-0.5 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                                    bis {item.capacity} Personen
                                                    {item.duration_minutes ? ` · ${item.duration_minutes} Min.` : ""}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{fmtCurrency(item.price_per_day)}</p>
                                            <p className={`text-[10px] uppercase font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`}>pro Tag</p>
                                        </div>
                                    </div>

                                    {/* Rental-specific specs */}
                                    {isRental(item) && (item.size || item.battery || item.motor) && (
                                        <div className={`flex items-center gap-3 text-xs mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                            {item.size && <span className="font-medium">{item.size}</span>}
                                            {item.battery && <span>{item.battery}</span>}
                                            {item.motor && <span className="truncate">{item.motor}</span>}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => { setEditItem(item); setShowModal(true); }}
                                            className={`flex-1 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${darkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                                        >
                                            <Edit className="w-4 h-4" />
                                            Bearbeiten
                                        </button>
                                        <button
                                            onClick={() => toggleStatus(item)}
                                            className={`p-2.5 rounded-lg transition-colors ${darkMode ? "border border-slate-700 hover:bg-slate-800 text-slate-400" : "border border-slate-200 hover:bg-slate-50 text-slate-400"}`}
                                            title={item.status === "maintenance" ? "Wartung beenden" : "In Wartung setzen"}
                                        >
                                            {item.status === "maintenance" ? <Check className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
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
                                    <th className={`px-6 py-4 text-[11px] font-bold uppercase tracking-wider ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Name</th>
                                    <th className={`px-6 py-4 text-[11px] font-bold uppercase tracking-wider ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Typ / Kategorie</th>
                                    <th className={`px-6 py-4 text-[11px] font-bold uppercase tracking-wider ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Status</th>
                                    <th className={`px-6 py-4 text-[11px] font-bold uppercase tracking-wider hidden md:table-cell ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Details</th>
                                    <th className={`px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-right ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Preis/Tag</th>
                                    <th className={`px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-right ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Aktionen</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${darkMode ? "divide-slate-800" : "divide-slate-100"}`}>
                                {filtered.map((item) => {
                                    const globalIdx = items.items.findIndex(i => i.id === item.id);
                                    const status = getItemStatus(item);
                                    const typeLabel = ITEM_TYPE_LABELS[item.item_type] || "Verleih";
                                    const typeColor = ITEM_TYPE_COLORS[item.item_type] || ITEM_TYPE_COLORS.rental;

                                    return (
                                        <tr key={item.id} className={`transition-colors ${darkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50"}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg ${BIKE_COLORS[globalIdx % BIKE_COLORS.length]} flex items-center justify-center text-white`}>
                                                        <Package className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold">{item.name}</div>
                                                        {isRental(item) && item.frame_number && (
                                                            <div className={`text-[10px] ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{item.frame_number}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded mb-1 ${typeColor}`}>{typeLabel}</span>
                                                {item.category && (
                                                    <div className="text-[#1A7D5A] text-[10px] font-bold uppercase tracking-widest">{item.category}</div>
                                                )}
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
                                                <div className={`flex items-center gap-3 text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                                    {isRental(item) ? (
                                                        <>
                                                            {item.size && <span className="font-medium">{item.size}</span>}
                                                            {item.battery && <span>{item.battery}</span>}
                                                            {item.motor && <span className="truncate max-w-[80px]">{item.motor}</span>}
                                                        </>
                                                    ) : (
                                                        <>
                                                            {item.capacity && <span>{item.capacity} Pers.</span>}
                                                            {item.duration_minutes && <span>{item.duration_minutes} Min.</span>}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-bold">{fmtCurrency(item.price_per_day)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => toggleStatus(item)}
                                                        className={`p-1.5 rounded transition-colors ${darkMode ? "text-slate-400 hover:text-[#3BAA82] hover:bg-slate-800" : "text-slate-400 hover:text-[#1A7D5A] hover:bg-slate-100"}`}
                                                        title={item.status === "maintenance" ? "Wartung beenden" : "In Wartung setzen"}
                                                    >
                                                        <RefreshCw className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditItem(item); setShowModal(true); }}
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
                                <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                <p className="text-lg font-medium">Keine Angebote gefunden</p>
                                {statusFilter === "all" && categoryFilter === "all" && typeFilter === "all" && (
                                    <button
                                        onClick={() => { setEditItem(null); setShowModal(true); }}
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

            {/* Item Modal */}
            {showModal && (
                <ItemModal
                    item={editItem}
                    onSave={handleSave}
                    onDelete={async (id) => { await items.remove(id); setShowModal(false); }}
                    onClose={() => setShowModal(false)}
                    darkMode={darkMode}
                />
            )}
        </div>
    );
}
