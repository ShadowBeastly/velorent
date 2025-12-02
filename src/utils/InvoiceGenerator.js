import jsPDF from "jspdf";
import "jspdf-autotable";

const fmtCurrency = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);
const fmtDate = (s) => s ? new Date(s).toLocaleDateString("de-DE") : "—";

export const generateInvoicePDF = (invoice, org) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // --- Header ---
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("RECHNUNG", pageWidth - 20, 20, { align: "right" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Rechnungs-Nr: ${invoice.invoice_number}`, pageWidth - 20, 30, { align: "right" });
    doc.text(`Datum: ${fmtDate(invoice.created_at)}`, pageWidth - 20, 35, { align: "right" });

    // --- Sender (Org) ---
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(org?.name || "VeloRent Pro", 20, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Musterstraße 123", 20, 26);
    doc.text("12345 Musterstadt", 20, 31);
    doc.text("Deutschland", 20, 36);
    doc.text(`E-Mail: kontakt@${org?.slug || "velorent"}.de`, 20, 41);

    // --- Recipient (Customer) ---
    doc.setFontSize(10);
    doc.text("Rechnungsempfänger:", 20, 60);
    doc.setFont("helvetica", "bold");
    doc.text(`${invoice.customer?.first_name} ${invoice.customer?.last_name}`, 20, 65);
    doc.setFont("helvetica", "normal");
    if (invoice.customer?.email) doc.text(invoice.customer.email, 20, 70);
    if (invoice.customer?.phone) doc.text(invoice.customer.phone, 20, 75);

    // --- Items Table ---
    const tableColumn = ["Beschreibung", "Menge", "Einzelpreis", "Gesamt"];
    const tableRows = [];

    // If invoice has explicit items, use them. Otherwise, try to infer from bookings if linked (not implemented in this data model yet, assuming manual items or flat total)
    // For this MVP, we often just have a total. Let's assume we might have items in the future, but for now we'll create a dummy item "Fahrradvermietung" if no items exist.

    const items = invoice.items || [
        { description: "Fahrradvermietung / Service", quantity: 1, unit_price: invoice.total }
    ];

    items.forEach(item => {
        const itemData = [
            item.description,
            item.quantity,
            fmtCurrency(item.unit_price),
            fmtCurrency(item.quantity * item.unit_price)
        ];
        tableRows.push(itemData);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 85,
        theme: 'grid',
        headStyles: { fillColor: [249, 115, 22], textColor: 255 }, // Orange header
        styles: { fontSize: 10, cellPadding: 3 },
    });

    // --- Totals ---
    const finalY = doc.lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.text("Netto:", pageWidth - 60, finalY);
    doc.text(fmtCurrency(invoice.total / 1.19), pageWidth - 20, finalY, { align: "right" });

    doc.text("MwSt (19%):", pageWidth - 60, finalY + 5);
    doc.text(fmtCurrency(invoice.total - (invoice.total / 1.19)), pageWidth - 20, finalY + 5, { align: "right" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Gesamtbetrag:", pageWidth - 60, finalY + 12);
    doc.text(fmtCurrency(invoice.total), pageWidth - 20, finalY + 12, { align: "right" });

    // --- Footer ---
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150);
    const footerText = "Vielen Dank für Ihren Auftrag! Bitte überweisen Sie den Betrag innerhalb von 14 Tagen.";
    doc.text(footerText, pageWidth / 2, doc.internal.pageSize.height - 20, { align: "center" });

    // Save
    doc.save(`Rechnung_${invoice.invoice_number}.pdf`);
};
