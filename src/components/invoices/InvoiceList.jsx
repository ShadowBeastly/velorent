"use client";
import { Eye, Download, FileText } from 'lucide-react';

export default function InvoiceList({ invoices }) {
    if (invoices.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-full mb-4">
                    <FileText className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">Keine Rechnungen gefunden</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                    Es wurden noch keine Rechnungen erstellt oder es gibt keine Ergebnisse für deine Suche.
                </p>
            </div>
        );
    }

    const getStatusStyle = (status) => {
        switch (status) {
            case 'paid': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
            case 'sent': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
            case 'overdue': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
            case 'cancelled': return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
            default: return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'; // draft
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'paid': return 'Bezahlt';
            case 'sent': return 'Versendet';
            case 'overdue': return 'Überfällig';
            case 'cancelled': return 'Storniert';
            default: return 'Entwurf';
        }
    };

    const fmtDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('de-DE');
    };

    const fmtCurrency = (amount) => {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount || 0);
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="px-6 py-4">Nummer</th>
                        <th className="px-6 py-4">Kunde</th>
                        <th className="px-6 py-4">Datum</th>
                        <th className="px-6 py-4">Betrag</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Aktionen</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                                {invoice.invoice_number}
                                {invoice.booking?.booking_number && (
                                    <div className="text-xs text-slate-500 font-normal">
                                        Ref: {invoice.booking.booking_number}
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-slate-900 dark:text-white font-medium">
                                    {invoice.customer?.first_name} {invoice.customer?.last_name}
                                </div>
                                <div className="text-xs text-slate-500">{invoice.customer?.email}</div>
                            </td>
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                {fmtDate(invoice.created_at)}
                            </td>
                            <td className="px-6 py-4 text-slate-900 dark:text-white font-bold whitespace-nowrap">
                                {fmtCurrency(invoice.total)}
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusStyle(invoice.status)}`}>
                                    {getStatusLabel(invoice.status)}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-600 transition-colors" title="Anschauen">
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-green-600 transition-colors" title="PDF Herunterladen">
                                        <Download className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
