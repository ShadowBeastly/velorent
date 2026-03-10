import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateInvoice = (invoice, organization) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // --- Fonts & Colors ---
    const primaryColorHex = organization?.settings?.primary_color || '#f97316'; // Orange default
    const primaryColor = primaryColorHex;
    // Convert hex to RGB array for jspdf-autotable
    const hexToRgb = (hex) => {
        const h = hex.replace('#', '');
        return [parseInt(h.substring(0,2),16), parseInt(h.substring(2,4),16), parseInt(h.substring(4,6),16)];
    };
    const primaryColorRgb = hexToRgb(primaryColorHex);
    const grayColor = '#64748b';
    const blackColor = '#0f172a';

    // --- Helper Functions ---
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount || 0);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('de-DE');
    };

    // --- HEADER ---
    // Organization Details (Left)
    doc.setFontSize(20);
    doc.setTextColor(primaryColor);
    doc.text(organization?.name || 'RentCore Service', 20, 20);

    doc.setFontSize(10);
    doc.setTextColor(grayColor);
    doc.text(organization?.address || '', 20, 30);
    doc.text(`${organization?.postal_code || ''} ${organization?.city || ''}`, 20, 35);
    doc.text(organization?.country || 'Deutschland', 20, 40);
    doc.text(`E-Mail: ${organization?.email || ''}`, 20, 50);
    doc.text(`Tel: ${organization?.phone || ''}`, 20, 55);

    // Invoice Details (Right)
    doc.setFontSize(24);
    doc.setTextColor(blackColor);
    doc.text('RECHNUNG', pageWidth - 20, 25, { align: 'right' });

    doc.setFontSize(10);
    doc.setTextColor(grayColor);
    doc.text(`Rechnungsnr.: ${invoice.invoice_number}`, pageWidth - 20, 40, { align: 'right' });
    doc.text(`Datum: ${formatDate(invoice.created_at)}`, pageWidth - 20, 45, { align: 'right' });
    if (invoice.due_date) {
        doc.text(`Fällig am: ${formatDate(invoice.due_date)}`, pageWidth - 20, 50, { align: 'right' });
    }

    // Divider
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(20, 65, pageWidth - 20, 65);

    // --- RECIPIENT ---
    doc.setFontSize(11);
    doc.setTextColor(blackColor);
    doc.text('Rechnungsempfänger:', 20, 80);

    doc.setFontSize(10);
    doc.setTextColor(grayColor);
    doc.text(`${invoice.customer?.first_name} ${invoice.customer?.last_name}`, 20, 90);
    doc.text(invoice.customer?.email || '', 20, 95);
    // Address if available
    if (invoice.customer?.address) {
        doc.text(invoice.customer.address, 20, 100);
        doc.text(`${invoice.customer.postal_code || ''} ${invoice.customer.city || ''}`, 20, 105);
    }

    // Booking Reference
    if (invoice.booking?.booking_number) {
        doc.text(`Buchungsreferenz: ${invoice.booking.booking_number}`, pageWidth - 20, 90, { align: 'right' });
    }

    // --- ITEMS TABLE ---
    const items = [...(invoice.items || [])];
    // Fallback if items are empty but we have booking totals
    if (items.length === 0 && invoice.booking) {
        // Create detailed items from booking
        items.push({
            description: `Fahrradmiete: ${invoice.booking.bike?.name || 'Bike'} (${formatDate(invoice.booking.start_date)} - ${formatDate(invoice.booking.end_date)})`,
            quantity: `${invoice.booking.total_days} Tage`,
            unit_price: invoice.booking.price_per_day,
            total: invoice.booking.subtotal || (invoice.booking.price_per_day * invoice.booking.total_days)
        });
        if (invoice.booking.deposit_amount > 0) {
            // Deposits usually handled separately or noted, depending on accounting. 
            // For simple invoices we might just list the rental fee.
            // Let's assume this invoice is for the rental fee.
        }
    }

    const tableBody = items.map(item => [
        item.description,
        item.quantity,
        formatCurrency(item.unit_price),
        formatCurrency(item.total)
    ]);

    autoTable(doc, {
        startY: 120,
        head: [['Beschreibung', 'Menge / Zeitraum', 'Einzelpreis', 'Gesamt']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: primaryColorRgb, textColor: 255 },
        styles: { fontSize: 9, cellPadding: 5 },
        columnStyles: {
            0: { cellWidth: 'auto' }, // Description
            1: { cellWidth: 30, halign: 'center' }, // Qty
            2: { cellWidth: 30, halign: 'right' }, // Unit Price
            3: { cellWidth: 30, halign: 'right' }  // Total
        }
    });

    // --- TOTALS ---
    const finalY = doc.lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.setTextColor(grayColor);

    // Right aligned totals
    const rightColX = pageWidth - 60;
    const valueColX = pageWidth - 20;

    doc.text('Zwischensumme:', rightColX, finalY, { align: 'left' });
    doc.text(formatCurrency(invoice.subtotal), valueColX, finalY, { align: 'right' });

    doc.text(`MwSt. (${invoice.tax_rate}%):`, rightColX, finalY + 7, { align: 'left' });
    doc.text(formatCurrency(invoice.tax_amount), valueColX, finalY + 7, { align: 'right' });

    // Bold Total
    doc.setFontSize(14);
    doc.setTextColor(blackColor);
    doc.setFont(undefined, 'bold');
    doc.text('GESAMTBETRAG:', rightColX, finalY + 18, { align: 'left' });
    doc.text(formatCurrency(invoice.total), valueColX, finalY + 18, { align: 'right' });
    doc.setFont(undefined, 'normal');

    // --- FOOTER ---
    const footerY = 270;
    doc.setFontSize(8);
    doc.setTextColor('#94a3b8');
    doc.setDrawColor(226, 232, 240);
    doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);

    const footerText = [
        `${organization?.name || 'RentCore'} • ${organization?.address || ''}, ${organization?.city || ''}`,
        organization?.iban
            ? `Bankverbindung: ${organization.iban}${organization.bic ? ` • BIC ${organization.bic}` : ''}`
            : '',
        `USt-IdNr.: ${organization?.tax_id || ''} • ${organization?.registration_court || ''}`
    ];

    doc.text(footerText, pageWidth / 2, footerY, { align: 'center', lineHeightFactor: 1.5 });

    return doc;
};

export const generateInvoicePDF = (invoice, organization) => {
    const doc = generateInvoice(invoice, organization);
    doc.save(`Rechnung_${invoice.invoice_number || 'Entwurf'}.pdf`);
};
