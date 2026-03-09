"use client";
import { useState, useMemo } from "react";
import { Plus, Loader2, Edit, Mail, Phone, List, LayoutGrid, MoreHorizontal, MapPin, Download } from "lucide-react";
import { fmtCurrency } from "../utils/formatters";
import CustomerModal from "../components/customers/CustomerModal";
import { useApp } from "../context/AppContext";
import { useData } from "../context/DataContext";
import { useToast } from "../components/ui/Toast";
import { exportToCSV } from "../utils/exportCSV";

export default function CustomersPage() {
    const { darkMode, searchQuery } = useApp();
    const { customers } = useData();
    const { addToast } = useToast();
    const [showModal, setShowModal] = useState(false);
    const [editCustomer, setEditCustomer] = useState(null);
    const [viewMode, setViewMode] = useState("table");

    const filtered = useMemo(() => {
        return customers.customers
            .filter(c =>
                searchQuery === "" ||
                `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.email?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0));
    }, [customers.customers, searchQuery]);

    const cardStyle = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
    const tableHeaderStyle = darkMode ? "bg-slate-900 text-slate-400" : "bg-slate-50 text-slate-500";
    const tableRowStyle = darkMode ? "border-slate-800 hover:bg-slate-800/50" : "border-slate-100 hover:bg-slate-50";

    const handleSave = async (data) => {
        try {
            if (editCustomer) await customers.update(editCustomer.id, data);
            else await customers.create(data);
            setShowModal(false);
        } catch (error) {
            console.error("Error saving customer:", error);
            addToast("Fehler beim Speichern des Kunden.", "error");
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
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
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <span className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {filtered.length} Kunden
                    </span>
                    <button
                        onClick={() => exportToCSV(filtered, [
                            { key: 'first_name', label: 'Vorname' },
                            { key: 'last_name', label: 'Nachname' },
                            { key: 'email', label: 'E-Mail' },
                            { key: 'phone', label: 'Telefon' },
                            { key: 'created_at', label: 'Erstellt am' },
                        ], 'kunden')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium border transition-colors whitespace-nowrap ${darkMode ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-300 text-slate-600 hover:bg-slate-100"}`}
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Exportieren</span>
                    </button>
                    <button
                        onClick={() => { setEditCustomer(null); setShowModal(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium shadow-lg shadow-orange-500/25 whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Neuer Kunde</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            {customers.loading ? (
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
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Kontakt</th>
                                    <th className="px-6 py-4">Adresse</th>
                                    <th className="px-6 py-4 text-center">Buchungen</th>
                                    <th className="px-6 py-4 text-right">Umsatz</th>
                                    <th className="px-6 py-4 text-right">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${darkMode ? "divide-slate-800" : "divide-slate-100"}`}>
                                {filtered.map(c => (
                                    <tr key={c.id} className={`transition-colors ${tableRowStyle}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-xs font-bold">
                                                    {(c.first_name || c.last_name || "?").charAt(0)}
                                                </div>
                                                <div className="font-medium">{c.first_name} {c.last_name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`space-y-1 text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                                {c.email && (
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="w-3 h-3" />
                                                        <span className="truncate max-w-[150px]">{c.email}</span>
                                                    </div>
                                                )}
                                                {c.phone && (
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="w-3 h-3" />
                                                        <span>{c.phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {c.city && (
                                                <div className={`flex items-center gap-2 text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                                    <MapPin className="w-3 h-3" />
                                                    <span>{c.postal_code} {c.city}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>
                                                {c.total_bookings || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-orange-500">
                                            {fmtCurrency(c.total_revenue || 0)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => { setEditCustomer(c); setShowModal(true); }}
                                                className={`p-1.5 rounded-md transition-colors ${darkMode ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"}`}
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filtered.length === 0 && (
                            <div className="p-12 text-center text-slate-500">
                                Keine Kunden gefunden.
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                // GRID VIEW (Legacy)
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(c => (
                        <div key={c.id} className={`rounded-2xl border p-5 ${cardStyle}`}>
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-lg font-bold">
                                        {(c.first_name || c.last_name || "?").charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{c.first_name} {c.last_name}</h3>
                                        <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                            {c.total_bookings || 0} Buchungen
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => { setEditCustomer(c); setShowModal(true); }} className={`p-2 rounded-lg ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}>
                                    <Edit className="w-4 h-4" />
                                </button>
                            </div>

                            <div className={`space-y-2 text-sm ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                                {c.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4" />
                                        <span className="truncate">{c.email}</span>
                                    </div>
                                )}
                                {c.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4" />
                                        <span>{c.phone}</span>
                                    </div>
                                )}
                            </div>

                            <div className={`flex items-center justify-between mt-4 pt-4 border-t ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
                                <span className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Gesamtumsatz</span>
                                <span className="font-semibold text-orange-500">{fmtCurrency(c.total_revenue || 0)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Customer Modal */}
            {showModal && (
                <CustomerModal
                    customer={editCustomer}
                    onSave={handleSave}
                    onDelete={async (id) => { await customers.remove(id); setShowModal(false); }}
                    onClose={() => setShowModal(false)}
                    darkMode={darkMode}
                />
            )}
        </div>
    );
}

