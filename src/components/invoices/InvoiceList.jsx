"use client";
import { useState, useRef, useEffect } from 'react';
import { Eye, Download, FileText, ChevronDown, CheckCircle, Send, XCircle, Mail, AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function InvoiceList({ invoices, onViewInvoice, onDownloadInvoice, onStatusChange, onSendEmail }) {
    const [openMenuId, setOpenMenuId] = useState(null);
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggleMenu = (e, invoiceId) => {
        if (openMenuId === invoiceId) { setOpenMenuId(null); return; }
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuPos({ top: rect.bottom + window.scrollY + 4, right: window.innerWidth - rect.right });
        setOpenMenuId(invoiceId);
    };

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

    const today = new Date().toISOString().split('T')[0];

    const isOverdue = (invoice) =>
        invoice.status !== 'paid' &&
        invoice.status !== 'cancelled' &&
        invoice.due_date &&
        invoice.due_date < today;

    const getEffectiveStatus = (invoice) => {
        if (isOverdue(invoice)) return 'overdue';
        return invoice.status;
    };

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
        <>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="px-6 py-4">Nummer</th>
                        <th className="px-6 py-4">Kunde</th>
                        <th className="px-6 py-4">Fällig am</th>
                        <th className="px-6 py-4">Betrag</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Aktionen</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {invoices.map((invoice) => {
                        const effectiveStatus = getEffectiveStatus(invoice);
                        const overdue = isOverdue(invoice);
                        return (
                            <tr
                                key={invoice.id}
                                className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${overdue ? 'bg-red-50/30 dark:bg-red-900/5' : ''}`}
                            >
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
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={overdue ? 'text-red-600 dark:text-red-400 font-medium flex items-center gap-1' : 'text-slate-600 dark:text-slate-300'}>
                                        {overdue && <AlertTriangle className="w-3 h-3" />}
                                        {fmtDate(invoice.due_date || invoice.created_at)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-900 dark:text-white font-bold whitespace-nowrap">
                                    {fmtCurrency(invoice.total)}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(effectiveStatus)}`}>
                                            {getStatusLabel(effectiveStatus)}
                                        </span>
                                        {overdue && invoice.status !== 'overdue' && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                                                Überfällig
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1" ref={openMenuId === invoice.id ? menuRef : null}>
                                        {/* Send email button */}
                                        {invoice.customer?.email && onSendEmail && (
                                            <button
                                                onClick={() => onSendEmail(invoice)}
                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                                                title="Per E-Mail senden"
                                            >
                                                <Mail className="w-4 h-4" />
                                            </button>
                                        )}
                                        {/* View button */}
                                        <button
                                            onClick={() => onViewInvoice?.(invoice)}
                                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                                            title="Anschauen / Bearbeiten"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        {/* Download button */}
                                        <button
                                            onClick={() => onDownloadInvoice?.(invoice)}
                                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-green-600 transition-colors"
                                            title="PDF Herunterladen"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                        {/* Status quick-action dropdown */}
                                        {onStatusChange && (
                                            <button
                                                onClick={(e) => toggleMenu(e, invoice.id)}
                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                                title="Status ändern"
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>

        {/* Dropdown rendered via portal so it escapes overflow:hidden parents */}
        {openMenuId && onStatusChange && typeof document !== 'undefined' ? createPortal(
            <div
                ref={menuRef}
                style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
                className="w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 overflow-hidden"
            >
                {(() => {
                    const invoice = invoices.find(i => i.id === openMenuId);
                    if (!invoice) return null;
                    return <>
                        {invoice.status !== 'paid' && (
                            <button onClick={() => { onStatusChange(invoice, 'paid'); setOpenMenuId(null); }}
                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />Als bezahlt markieren
                            </button>
                        )}
                        {invoice.status !== 'sent' && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                            <button onClick={() => { onStatusChange(invoice, 'sent'); setOpenMenuId(null); }}
                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                <Send className="w-4 h-4 text-blue-500" />Als gesendet markieren
                            </button>
                        )}
                        {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
                            <button onClick={() => { onStatusChange(invoice, 'cancelled'); setOpenMenuId(null); }}
                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                <XCircle className="w-4 h-4 text-slate-400" />Stornieren
                            </button>
                        )}
                        {invoice.status === 'paid' && (
                            <div className="px-4 py-2.5 text-xs text-slate-400 italic">Keine weiteren Aktionen verfügbar.</div>
                        )}
                        {invoice.status === 'cancelled' && (
                            <button onClick={() => { onStatusChange(invoice, 'draft'); setOpenMenuId(null); }}
                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                <FileText className="w-4 h-4 text-amber-500" />Als Entwurf reaktivieren
                            </button>
                        )}
                    </>;
                })()}
            </div>,
            document.body
        ) : null}
        </>
    );
}
