"use client";
import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import InvoiceList from '../components/invoices/InvoiceList';
import InvoiceModal from '../components/invoices/InvoiceModal';
import { useApp } from '../context/AppContext';
import { useData } from '../context/DataContext';
import { useOrganization } from '../context/OrgContext';

export default function InvoicesPage() {
    const { darkMode } = useApp();
    const { invoices: invoicesData, customers: customersData, bookings: bookingsData } = useData();
    const org = useOrganization();
    const { invoices, loading } = invoicesData || { invoices: [], loading: false };
    const { customers } = customersData || { customers: [] };
    const { bookings } = bookingsData || { bookings: [] };

    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editInvoice, setEditInvoice] = useState(null);

    const filteredInvoices = (invoices || []).filter(invoice => {
        const matchesFilter = filter === 'all' || invoice.status === filter;
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            invoice.invoice_number?.toLowerCase().includes(searchLower) ||
            invoice.customer?.first_name?.toLowerCase().includes(searchLower) ||
            invoice.customer?.last_name?.toLowerCase().includes(searchLower) ||
            invoice.customer?.email?.toLowerCase().includes(searchLower);

        return matchesFilter && matchesSearch;
    });

    const handleSaveInvoice = async (invoiceData) => {
        if (invoicesData && invoicesData.create) {
            const { error } = await invoicesData.create(invoiceData);
            if (error) {
                alert("Fehler beim Erstellen der Rechnung: " + error.message);
            } else {
                setShowModal(false);
            }
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Rechnungen</h1>
                    <p className="text-slate-500 dark:text-slate-400">Verwalte deine Rechnungen und Zahlungseingänge.</p>
                </div>
                <button
                    onClick={() => { setEditInvoice(null); setShowModal(true); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Rechnung erstellen
                </button>
            </div>

            {/* Filters & Search */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Suchen nach Nummer, Kunde..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                    {['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-colors ${filter === status
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                        >
                            {status === 'all' ? 'Alle' : status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Invoices List */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <InvoiceList
                        invoices={filteredInvoices}
                        onViewInvoice={(inv) => { setEditInvoice(inv); setShowModal(true); }}
                        onDownloadInvoice={(inv) => { import('../utils/InvoiceGenerator').then(m => m.generateInvoicePDF(inv, org.currentOrg)); }}
                    />
                )}
            </div>

            {showModal && (
                <InvoiceModal
                    invoice={editInvoice}
                    customers={customers}
                    bookings={bookings}
                    org={org.currentOrg}
                    onSave={handleSaveInvoice}
                    onClose={() => { setShowModal(false); setEditInvoice(null); }}
                    darkMode={darkMode}
                />
            )}
        </div>
    );
}
