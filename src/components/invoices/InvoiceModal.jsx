"use client";
import { useState, useRef, useEffect } from "react";
import { X, Printer, Plus, Trash2, Download } from "lucide-react";
import { fmtDate, fmtCurrency } from "../../utils/formatters";
import { generateInvoicePDF } from "../../utils/InvoiceGenerator";
import { supabase } from "../../utils/supabase";

export default function InvoiceModal({ invoice, customers, bookings, org, onSave, onClose, darkMode }) {
    const [formData, setFormData] = useState(() => {
        if (invoice) {
            return {
                ...invoice,
                items: invoice.items || [],
                due_date: invoice.due_date || new Date().toISOString().split("T")[0]
            };
        } else {
            const year = new Date().getFullYear();
            const ts = Date.now().toString().slice(-6);
            return {
                invoice_number: `RE-${year}-${ts}`,
                customer_id: "",
                booking_id: "",
                items: [{ description: "Fahrradmiete", quantity: 1, unit_price: 0, total: 0 }],
                notes: "",
                status: "draft",
                due_date: new Date().toISOString().split("T")[0],
                tax_rate: 19
            };
        }
    });

    // Escape key closes the modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        if (invoice) return; // editing existing invoice, keep its number
        const fetchNextNumber = async () => {
            const { data } = await supabase
                .from("invoices")
                .select("invoice_number")
                .order("created_at", { ascending: false })
                .limit(1)
                .single();
            const year = new Date().getFullYear();
            if (data?.invoice_number) {
                const match = data.invoice_number.match(/(\d+)$/);
                const next = match ? (parseInt(match[1]) + 1).toString().padStart(4, "0") : "0001";
                setFormData(f => ({ ...f, invoice_number: `RE-${year}-${next}` }));
            } else {
                setFormData(f => ({ ...f, invoice_number: `RE-${year}-0001` }));
            }
        };
        fetchNextNumber();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const calculateTotals = () => {
        const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const taxAmount = subtotal * (formData.tax_rate / 100);
        const total = subtotal + taxAmount;
        return { subtotal, taxAmount, total };
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;
        newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
        setFormData({ ...formData, items: newItems });
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { description: "", quantity: 1, unit_price: 0, total: 0 }]
        });
    };

    const removeItem = (index) => {
        if (formData.items.length === 1) return;
        setFormData({
            ...formData,
            items: formData.items.filter((_, i) => i !== index)
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const { subtotal, taxAmount, total } = calculateTotals();
        onSave({
            ...formData,
            subtotal,
            tax_amount: taxAmount,
            total
        });
    };

    const handleDownload = () => {
        const { total } = calculateTotals();
        // Merge calculated totals into formData for the generator
        const invoiceData = {
            ...formData,
            total,
            customer: customers.find(c => c.id === formData.customer_id)
        };
        generateInvoicePDF(invoiceData, org);
    };

    const printRef = useRef();
    const handlePrint = () => {
        if (!printRef.current) return;
        const content = printRef.current.innerHTML;
        const printWindow = window.open("", "", "height=800,width=800");
        printWindow.document.write("<html><head><title>Rechnung " + formData.invoice_number + "</title>");
        printWindow.document.write("<style>body{font-family:sans-serif;padding:40px;color:#333;} .header{display:flex;justify-content:space-between;margin-bottom:40px;border-bottom:2px solid #eee;padding-bottom:20px;} h1{margin:0;font-size:28px;} .meta{text-align:right;} table{width:100%;border-collapse:collapse;margin-bottom:30px;} th{text-align:left;border-bottom:2px solid #eee;padding:10px;} td{padding:10px;border-bottom:1px solid #eee;} .totals{float:right;width:300px;} .row{display:flex;justify-content:space-between;margin-bottom:5px;} .total-row{font-weight:bold;font-size:18px;border-top:2px solid #333;padding-top:10px;margin-top:10px;}</style>");
        printWindow.document.write("</head><body>");
        printWindow.document.write(content);
        printWindow.document.write("</body></html>");
        printWindow.document.close();
        printWindow.print();
    };

    const { subtotal, taxAmount, total } = calculateTotals();
    const customer = customers.find(c => c.id === formData.customer_id);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="invoice-modal-title"
                className={`w-full max-w-5xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}
            >

                <div className={`p-4 border-b flex items-center justify-between ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                    <h2 id="invoice-modal-title" className={`font-semibold text-lg ${darkMode ? "text-white" : "text-slate-900"}`}>
                        {invoice ? "Rechnung bearbeiten" : "Neue Rechnung"}
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={handleDownload} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2">
                            <Download className="w-4 h-4" /> PDF
                        </button>
                        <button onClick={handlePrint} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 flex items-center gap-2">
                            <Printer className="w-4 h-4" /> Vorschau
                        </button>
                        <button onClick={onClose} aria-label="Schließen" className={`p-2 rounded-full ${darkMode ? "hover:bg-slate-800 text-white" : "hover:bg-slate-100 text-slate-900"}`}>
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Form Side */}
                    <div className={`w-1/2 p-6 overflow-y-auto border-r ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Rechnungs-Nr.</label>
                                    <input
                                        type="text"
                                        value={formData.invoice_number}
                                        onChange={e => setFormData({ ...formData, invoice_number: e.target.value })}
                                        className={`w-full p-2 rounded border ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200"}`}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Fällig am</label>
                                    <input
                                        type="date"
                                        value={formData.due_date}
                                        onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                        className={`w-full p-2 rounded border ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200"}`}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    className={`w-full p-2 rounded border ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200"}`}
                                >
                                    <option value="draft">Entwurf</option>
                                    <option value="sent">Versendet</option>
                                    <option value="paid">Bezahlt</option>
                                    <option value="cancelled">Storniert</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Kunde</label>
                                <select
                                    value={formData.customer_id}
                                    onChange={e => setFormData({ ...formData, customer_id: e.target.value })}
                                    className={`w-full p-2 rounded border ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200"}`}
                                    required
                                >
                                    <option value="">Bitte wählen...</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Buchung (Optional)</label>
                                <select
                                    value={formData.booking_id || ""}
                                    onChange={e => setFormData({ ...formData, booking_id: e.target.value || null })}
                                    className={`w-full p-2 rounded border ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200"}`}
                                >
                                    <option value="">Keine Buchung verknüpft</option>
                                    {bookings.map(b => (
                                        <option key={b.id} value={b.id}>{b.booking_number} - {b.customer_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium">Positionen</label>
                                {formData.items.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 items-start">
                                        <input
                                            type="text"
                                            placeholder="Beschreibung"
                                            value={item.description}
                                            onChange={e => handleItemChange(idx, "description", e.target.value)}
                                            className={`flex-1 p-2 rounded border ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200"}`}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Menge"
                                            value={item.quantity}
                                            onChange={e => handleItemChange(idx, "quantity", Number(e.target.value))}
                                            className={`w-20 p-2 rounded border ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200"}`}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Preis"
                                            value={item.unit_price}
                                            onChange={e => handleItemChange(idx, "unit_price", Number(e.target.value))}
                                            className={`w-24 p-2 rounded border ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200"}`}
                                        />
                                        <button type="button" onClick={() => removeItem(idx)} aria-label="Position löschen" className="p-2 text-red-500 hover:bg-red-50 rounded">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={addItem} className="text-sm text-orange-500 hover:underline flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Position hinzufügen
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Notizen</label>
                                <textarea
                                    value={formData.notes || ""}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    className={`w-full p-2 rounded border ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200"}`}
                                    rows={3}
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                                <button type="submit" className="w-full py-2 bg-orange-500 text-white rounded font-medium hover:bg-orange-600">
                                    Speichern
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Preview Side */}
                    <div className="w-1/2 bg-white text-slate-900 p-8 overflow-y-auto">
                        <div ref={printRef} className="max-w-md mx-auto text-sm">
                            <div className="header">
                                <div>
                                    <h1>Rechnung</h1>
                                    <p className="text-slate-500">Nr. {formData.invoice_number}</p>
                                </div>
                                <div className="meta">
                                    <strong>{org?.name || "VeloRent Pro"}</strong><br />
                                    Musterstraße 1<br />
                                    12345 Musterstadt
                                </div>
                            </div>

                            <div className="mb-8">
                                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Empfänger</div>
                                {customer ? (
                                    <div>
                                        <strong>{customer.first_name} {customer.last_name}</strong><br />
                                        {customer.address}<br />
                                        {customer.postal_code} {customer.city}
                                    </div>
                                ) : (
                                    <div className="text-slate-400 italic">Kein Kunde ausgewählt</div>
                                )}
                            </div>

                            <div className="mb-8">
                                <div className="flex justify-between mb-2">
                                    <span>Rechnungsdatum:</span>
                                    <strong>{fmtDate(new Date())}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span>Fällig am:</span>
                                    <strong>{fmtDate(formData.due_date)}</strong>
                                </div>
                            </div>

                            <table>
                                <thead>
                                    <tr>
                                        <th>Pos.</th>
                                        <th>Beschreibung</th>
                                        <th className="text-right">Menge</th>
                                        <th className="text-right">Einzel</th>
                                        <th className="text-right">Gesamt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.items.map((item, i) => (
                                        <tr key={i}>
                                            <td>{i + 1}</td>
                                            <td>{item.description}</td>
                                            <td className="text-right">{item.quantity}</td>
                                            <td className="text-right">{fmtCurrency(item.unit_price)}</td>
                                            <td className="text-right">{fmtCurrency(item.quantity * item.unit_price)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="totals">
                                <div className="row">
                                    <span>Netto:</span>
                                    <span>{fmtCurrency(subtotal)}</span>
                                </div>
                                <div className="row">
                                    <span>MwSt ({formData.tax_rate}%):</span>
                                    <span>{fmtCurrency(taxAmount)}</span>
                                </div>
                                <div className="row total-row">
                                    <span>Gesamtbetrag:</span>
                                    <span>{fmtCurrency(total)}</span>
                                </div>
                            </div>

                            {formData.notes && (
                                <div className="mt-12 pt-4 border-t text-slate-500 text-xs">
                                    {formData.notes}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
