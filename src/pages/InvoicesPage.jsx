import React, { useState, useMemo } from "react";
import { Plus, Loader2, FileText, Download, Trash2, Edit } from "lucide-react";
import { useInvoices } from "../hooks/useInvoices";
import { useOrganization } from "../context/OrgContext";
import InvoiceModal from "../components/invoices/InvoiceModal";
import { generateInvoicePDF } from "../utils/InvoiceGenerator";
import { fmtCurrency, fmtDate } from "../utils/formatUtils";

export default function InvoicesPage({ customers, bookings, darkMode }) {
    const { currentOrg } = useOrganization();
    const { invoices, loading, create, update, remove } = useInvoices(currentOrg?.id);
    const [showModal, setShowModal] = useState(false);
    const [editInvoice, setEditInvoice] = useState(null);
    const [filter, setFilter] = useState("all");

    const filtered = useMemo(() => {
        return invoices.filter(inv => filter === "all" || inv.status === filter);
    }, [invoices, filter]);

    const handleSave = async (data) => {
        if (editInvoice) {
            await update(editInvoice.id, data);
        } else {
            await create(data);
        }
        setShowModal(false);
        setEditInvoice(null);
    };

    const handleDelete = async (id) => {
        if (confirm("Möchten Sie diese Rechnung wirklich löschen?")) {
            await remove(id);
        }
    };

    const handleDownloadPDF = (invoice) => {
        generateInvoicePDF(invoice, currentOrg);
    };

    const cardStyle = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";

    return (
        <div className="space-y-4">
            <div className={`rounded-2xl border p-4 ${cardStyle}`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                        <h1 className={`text-xl font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>Rechnungen</h1>
                        <div className="h-6 w-px bg-slate-300 mx-2"></div>
                        {["all", "draft", "sent", "paid", "cancelled"].map(s => (
                            <button
                                key={s}
                                onClick={() => setFilter(s)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === s
                                    ? "bg-orange-500 text-white"
                                    : darkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"
                                    }`}
                            >
                                {s === "all" ? "Alle" : s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => { setEditInvoice(null); setShowModal(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium shadow-lg shadow-orange-500/25"
                    >
                        <Plus className="w-4 h-4" />
                        Neue Rechnung
                    </button>
                </div>
            </div>

            <div className={`rounded-2xl border overflow-hidden ${cardStyle}`}>
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className={darkMode ? "bg-slate-800/50" : "bg-slate-50"}>
                                <tr className={`text-left text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    <th className="px-4 py-3">Nr.</th>
                                    <th className="px-4 py-3">Kunde</th>
                                    <th className="px-4 py-3">Datum</th>
                                    <th className="px-4 py-3">Betrag</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${darkMode ? "divide-slate-800" : "divide-slate-100"}`}>
                                {filtered.map(inv => (
                                    <tr key={inv.id} className={darkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50"}>
                                        <td className="px-4 py-3 font-mono text-sm">{inv.invoice_number}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{inv.customer?.first_name} {inv.customer?.last_name}</div>
                                            <div className="text-xs text-slate-500">{inv.customer?.email}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">{fmtDate(inv.created_at)}</td>
                                        <td className="px-4 py-3 font-medium">{fmtCurrency(inv.total)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-1 rounded-full border ${inv.status === "paid" ? "bg-green-100 text-green-700 border-green-200" :
                                                inv.status === "sent" ? "bg-blue-100 text-blue-700 border-blue-200" :
                                                    inv.status === "cancelled" ? "bg-red-100 text-red-700 border-red-200" :
                                                        "bg-slate-100 text-slate-700 border-slate-200"
                                                }`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleDownloadPDF(inv)}
                                                    className={`p-2 rounded-lg text-blue-500 ${darkMode ? "hover:bg-slate-700" : "hover:bg-slate-200"}`}
                                                    title="PDF Herunterladen"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => { setEditInvoice(inv); setShowModal(true); }}
                                                    className={`p-2 rounded-lg ${darkMode ? "hover:bg-slate-700" : "hover:bg-slate-200"}`}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(inv.id)}
                                                    className={`p-2 rounded-lg text-red-500 ${darkMode ? "hover:bg-slate-700" : "hover:bg-slate-200"}`}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filtered.length === 0 && (
                            <div className="p-8 text-center text-slate-500">
                                Keine Rechnungen gefunden.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showModal && (
                <InvoiceModal
                    invoice={editInvoice}
                    customers={customers.customers}
                    bookings={bookings.bookings}
                    org={currentOrg}
                    onSave={handleSave}
                    onClose={() => setShowModal(false)}
                    darkMode={darkMode}
                />
            )}
        </div>
    );
}
