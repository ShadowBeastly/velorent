"use client";
import { useState } from 'react';
import { Plus, Search, Download } from 'lucide-react';
import InvoiceList from '../components/invoices/InvoiceList';
import InvoiceModal from '../components/invoices/InvoiceModal';
import { useApp } from '../context/AppContext';
import { useData } from '../context/DataContext';
import { useOrganization } from '../context/OrgContext';
import { useToast } from '../components/ui/Toast';
import { exportToCSV } from '../utils/exportCSV';
import { supabase } from '../utils/supabase';

export default function InvoicesPage() {
    const { darkMode } = useApp();
    const { invoices: invoicesData, customers: customersData, bookings: bookingsData } = useData();
    const org = useOrganization();
    const { addToast } = useToast();
    const { invoices, loading } = invoicesData || { invoices: [], loading: false };
    const { customers } = customersData || { customers: [] };
    const { bookings } = bookingsData || { bookings: [] };

    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editInvoice, setEditInvoice] = useState(null);

    const today = new Date().toISOString().split('T')[0];

    const filteredInvoices = (invoices || []).filter(invoice => {
        const isOverdue =
            invoice.status !== 'paid' &&
            invoice.status !== 'cancelled' &&
            invoice.due_date &&
            invoice.due_date < today;
        const effectiveStatus = isOverdue ? 'overdue' : invoice.status;
        const matchesFilter = filter === 'all' || effectiveStatus === filter;
        const searchLower = searchTerm.trim().toLowerCase();
        const matchesSearch =
            invoice.invoice_number?.toLowerCase().includes(searchLower) ||
            invoice.customer?.first_name?.toLowerCase().includes(searchLower) ||
            invoice.customer?.last_name?.toLowerCase().includes(searchLower) ||
            invoice.customer?.email?.toLowerCase().includes(searchLower);

        return matchesFilter && matchesSearch;
    });

    const handleSaveInvoice = async (invoiceData) => {
        if (!invoicesData) return;
        if (editInvoice) {
            const { error } = await invoicesData.update(editInvoice.id, invoiceData);
            if (error) {
                addToast("Fehler beim Speichern der Rechnung: " + error.message, "error");
            } else {
                addToast("Rechnung gespeichert.", "success");
                setShowModal(false);
                setEditInvoice(null);
            }
        } else {
            const { error } = await invoicesData.create(invoiceData);
            if (error) {
                addToast("Fehler beim Erstellen der Rechnung: " + error.message, "error");
            } else {
                addToast("Rechnung erstellt.", "success");
                setShowModal(false);
            }
        }
    };

    const handleStatusChange = async (invoice, newStatus) => {
        if (!invoicesData?.update) return;
        const updates = { status: newStatus };
        if (newStatus === 'paid') {
            updates.paid_at = new Date().toISOString();
        }
        const { error } = await invoicesData.update(invoice.id, updates);
        if (error) {
            addToast("Fehler beim Aktualisieren des Status: " + error.message, "error");
        } else {
            const labels = {
                paid: 'Als bezahlt markiert.',
                sent: 'Als gesendet markiert.',
                cancelled: 'Rechnung storniert.',
                draft: 'Als Entwurf reaktiviert.',
            };
            addToast(labels[newStatus] || 'Status aktualisiert.', 'success');
        }
    };

    const handleSendEmail = async (invoice) => {
        const customerEmail = invoice.customer?.email;
        const customerName = `${invoice.customer?.first_name || ''} ${invoice.customer?.last_name || ''}`.trim();
        if (!customerEmail) {
            addToast("Kein Kunde oder keine E-Mail-Adresse hinterlegt.", "error");
            return;
        }

        try {
            const { error: fnError } = await supabase.functions.invoke('send-email', {
                body: {
                    type: 'invoice',
                    to: customerEmail,
                    data: {
                        invoice_number: invoice.invoice_number,
                        total: invoice.total,
                        due_date: invoice.due_date,
                        customer_name: customerName,
                        org_name: org.currentOrg?.name || 'RentCore',
                    },
                },
            });

            if (fnError) throw fnError;

            // Mark as sent after successful email dispatch (only if still draft)
            if (invoice.status === 'draft') {
                await handleStatusChange(invoice, 'sent');
            } else {
                addToast(`Rechnung ${invoice.invoice_number} erfolgreich an ${customerEmail} gesendet.`, "success");
            }
        } catch (err) {
            addToast("Fehler beim Senden der E-Mail: " + (err.message || 'Unbekannter Fehler'), "error");
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Rechnungen</h1>
                    <p className="text-slate-500 dark:text-slate-400">Verwalte deine Rechnungen und Zahlungseingänge.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => exportToCSV(filteredInvoices, [
                            { key: 'invoice_number', label: 'Rechnungsnr' },
                            { key: row => row.customer ? `${row.customer.first_name || ''} ${row.customer.last_name || ''}`.trim() : '', label: 'Kunde' },
                            { key: 'total', label: 'Betrag' },
                            { key: 'status', label: 'Status' },
                            { key: 'created_at', label: 'Datum' },
                            { key: 'due_date', label: 'Fällig am' },
                        ], 'rechnungen')}
                        className="border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Exportieren
                    </button>
                    <button
                        onClick={() => { setEditInvoice(null); setShowModal(true); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Rechnung erstellen
                    </button>
                </div>
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
                    {[
                        { key: 'all', label: 'Alle' },
                        { key: 'draft', label: 'Entwurf' },
                        { key: 'sent', label: 'Versendet' },
                        { key: 'paid', label: 'Bezahlt' },
                        { key: 'overdue', label: 'Überfällig' },
                        { key: 'cancelled', label: 'Storniert' },
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === key
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                        >
                            {label}
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
                        onStatusChange={handleStatusChange}
                        onSendEmail={handleSendEmail}
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
