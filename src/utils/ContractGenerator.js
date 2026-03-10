import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('de-DE');
};

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount || 0);
};

export const generateContract = (booking, organization) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const primaryColorHex = organization?.settings?.primary_color || '#f97316';
    const grayColor = '#64748b';
    const darkColor = '#0f172a';

    // ─── HEADER ───────────────────────────────────────────────────────────────

    // Left: organization name + address
    doc.setFontSize(18);
    doc.setTextColor(primaryColorHex);
    doc.setFont(undefined, 'bold');
    doc.text(organization?.name || 'RentCore Service', 20, 22);

    doc.setFontSize(9);
    doc.setTextColor(grayColor);
    doc.setFont(undefined, 'normal');
    const orgLines = [
        organization?.address || '',
        [organization?.postal_code, organization?.city].filter(Boolean).join(' '),
        organization?.country || 'Deutschland',
        organization?.phone ? `Tel: ${organization.phone}` : '',
        organization?.email ? `E-Mail: ${organization.email}` : '',
    ].filter(Boolean);
    doc.text(orgLines, 20, 30);

    // Right: Title + contract number
    doc.setFontSize(22);
    doc.setTextColor(darkColor);
    doc.setFont(undefined, 'bold');
    doc.text('MIETVERTRAG', pageWidth - 20, 22, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(grayColor);
    doc.setFont(undefined, 'normal');
    const contractRef = booking?.booking_number
        ? `MV-${booking.booking_number}`
        : booking?.id
            ? `MV-${booking.id.slice(0, 8).toUpperCase()}`
            : 'MV-ENTWURF';
    doc.text(`Vertrags-Nr.: ${contractRef}`, pageWidth - 20, 32, { align: 'right' });
    doc.text(`Datum: ${formatDate(new Date().toISOString())}`, pageWidth - 20, 38, { align: 'right' });

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 58, pageWidth - 20, 58);

    // ─── SECTION 1: VERTRAGSPARTEIEN ──────────────────────────────────────────

    let y = 68;

    doc.setFontSize(11);
    doc.setTextColor(darkColor);
    doc.setFont(undefined, 'bold');
    doc.text('1. Vertragsparteien', 20, y);
    y += 8;

    // Two-column layout: Vermieter | Mieter
    const colLeft = 20;
    const colRight = pageWidth / 2 + 5;

    doc.setFontSize(9);
    doc.setTextColor(grayColor);
    doc.setFont(undefined, 'bold');
    doc.text('Vermieter:', colLeft, y);
    doc.text('Mieter:', colRight, y);
    y += 6;

    doc.setFont(undefined, 'normal');
    const vermieterLines = [
        organization?.name || '',
        organization?.address || '',
        [organization?.postal_code, organization?.city].filter(Boolean).join(' '),
        organization?.phone || '',
        organization?.email || '',
    ].filter(Boolean);

    const mieterLines = [
        booking?.customer_name || '',
        booking?.customer_address || '',
        booking?.id_number ? `Ausweis-Nr.: ${booking.id_number}` : '',
        booking?.customer_phone || '',
        booking?.customer_email || '',
    ].filter(Boolean);

    doc.text(vermieterLines, colLeft, y);
    doc.text(mieterLines, colRight, y);

    y += Math.max(vermieterLines.length, mieterLines.length) * 5 + 8;

    // ─── SECTION 2: MIETGEGENSTAND ────────────────────────────────────────────

    doc.setFontSize(11);
    doc.setTextColor(darkColor);
    doc.setFont(undefined, 'bold');
    doc.text('2. Mietgegenstand', 20, y);
    y += 3;

    autoTable(doc, {
        startY: y,
        body: [
            ['Fahrrad', booking?.bike?.name || '—'],
            ['Kategorie', booking?.bike?.category || '—'],
            ['Größe', booking?.bike?.size || '—'],
            ['Rahmennummer', booking?.bike?.frame_number || '(siehe Rad)'],
            ['Zustand bei Übergabe', '___________________________'],
        ],
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold', textColor: [100, 116, 139] },
            1: { textColor: [15, 23, 42] }
        },
        margin: { left: 20, right: 20 },
    });

    y = doc.lastAutoTable.finalY + 8;

    // ─── SECTION 3: MIETDAUER ─────────────────────────────────────────────────

    doc.setFontSize(11);
    doc.setTextColor(darkColor);
    doc.setFont(undefined, 'bold');
    doc.text('3. Mietdauer', 20, y);
    y += 3;

    const days = booking?.total_days || (() => {
        if (booking?.start_date && booking?.end_date) {
            const ms = new Date(booking.end_date) - new Date(booking.start_date);
            return Math.max(1, Math.round(ms / 86400000) + 1);
        }
        return 1;
    })();

    autoTable(doc, {
        startY: y,
        body: [
            ['Mietbeginn', formatDate(booking?.start_date)],
            ['Mietende', formatDate(booking?.end_date)],
            ['Mietdauer', `${days} Tag${days !== 1 ? 'e' : ''}`],
            ['Übergabeort', booking?.pickup_location || 'Laden'],
            ['Rückgabeort', booking?.return_location || 'Laden'],
        ],
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold', textColor: [100, 116, 139] },
            1: { textColor: [15, 23, 42] }
        },
        margin: { left: 20, right: 20 },
    });

    y = doc.lastAutoTable.finalY + 8;

    // ─── SECTION 4: MIETPREIS ─────────────────────────────────────────────────

    doc.setFontSize(11);
    doc.setTextColor(darkColor);
    doc.setFont(undefined, 'bold');
    doc.text('4. Mietpreis', 20, y);
    y += 3;

    const pricePerDay = booking?.price_per_day
        || (booking?.total_price && days ? booking.total_price / days : 0);

    autoTable(doc, {
        startY: y,
        body: [
            ['Preis pro Tag', formatCurrency(pricePerDay)],
            ['Gesamtmietpreis', formatCurrency(booking?.total_price)],
            ['Kaution', formatCurrency(booking?.deposit_amount)],
            ['Zahlungsart', booking?.payment_method || 'Bar / EC-Karte'],
        ],
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold', textColor: [100, 116, 139] },
            1: { textColor: [15, 23, 42] }
        },
        margin: { left: 20, right: 20 },
    });

    y = doc.lastAutoTable.finalY + 8;

    // ─── SECTION 5: ALLGEMEINE BEDINGUNGEN ────────────────────────────────────

    // Start a new page if there's not enough space for the terms section
    if (y > pageHeight - 100) {
        doc.addPage();
        y = 20;
    }

    doc.setFontSize(11);
    doc.setTextColor(darkColor);
    doc.setFont(undefined, 'bold');
    doc.text('5. Allgemeine Mietbedingungen', 20, y);
    y += 7;

    const terms = [
        'Das Fahrrad ist in einwandfreiem Zustand zurückzugeben. Schäden am Mietgegenstand, die über normale Abnutzung hinausgehen, sind sofort zu melden und werden dem Mieter in Rechnung gestellt.',
        'Der Mieter haftet für den Verlust oder die Beschädigung des Fahrrads während der Mietdauer. Bei Diebstahl ist unverzüglich Anzeige zu erstatten und der Vermieter zu informieren.',
        'Das Fahrrad darf nur von der im Vertrag genannten Person genutzt werden und ist nicht zur Weitervermietung bestimmt.',
        'Bei verspäteter Rückgabe ohne vorherige Absprache wird eine zusätzliche Miete in Höhe des Tagespreises berechnet.',
        'Die Kaution wird nach vollständiger und unbeschädigter Rückgabe des Fahrrads erstattet. Der Vermieter behält sich das Recht vor, etwaige Schadenskosten von der Kaution abzuziehen.',
        'Reparaturen dürfen ohne ausdrückliche Genehmigung des Vermieters nicht selbst durchgeführt werden. Im Pannenfall ist der Vermieter umgehend zu kontaktieren.',
    ];

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(grayColor);

    terms.forEach((term, idx) => {
        const bullet = `${idx + 1}.`;
        const wrapped = doc.splitTextToSize(term, pageWidth - 50);
        if (y + wrapped.length * 5 > pageHeight - 30) {
            doc.addPage();
            y = 20;
        }
        doc.setFont(undefined, 'bold');
        doc.text(bullet, 20, y);
        doc.setFont(undefined, 'normal');
        doc.text(wrapped, 30, y);
        y += wrapped.length * 5 + 3;
    });

    y += 5;

    // ─── SECTION 6: UNTERSCHRIFTEN ────────────────────────────────────────────

    if (y > pageHeight - 60) {
        doc.addPage();
        y = 20;
    }

    doc.setFontSize(11);
    doc.setTextColor(darkColor);
    doc.setFont(undefined, 'bold');
    doc.text('6. Unterschriften', 20, y);
    y += 8;

    doc.setFontSize(9);
    doc.setTextColor(grayColor);
    doc.setFont(undefined, 'normal');

    const sigBoxLeft = 20;
    const sigBoxRight = pageWidth / 2 + 10;
    const sigBoxWidth = pageWidth / 2 - 30;

    // Ort/Datum line
    const placeDate = `Ort, Datum: _________________________`;
    doc.text(placeDate, sigBoxLeft, y);
    doc.text(placeDate, sigBoxRight, y);
    y += 20;

    // Signature lines
    doc.setDrawColor(15, 23, 42);
    doc.line(sigBoxLeft, y, sigBoxLeft + sigBoxWidth, y);
    doc.line(sigBoxRight, y, sigBoxRight + sigBoxWidth, y);
    y += 5;

    doc.setFontSize(8);
    doc.text(`${organization?.name || 'Vermieter'} (Unterschrift)`, sigBoxLeft, y);
    doc.text(`${booking?.customer_name || 'Mieter'} (Unterschrift)`, sigBoxRight, y);

    // ─── FOOTER ───────────────────────────────────────────────────────────────

    const footerY = pageHeight - 12;
    doc.setFontSize(7.5);
    doc.setTextColor('#94a3b8');
    doc.setDrawColor(226, 232, 240);
    doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);

    const footerParts = [
        organization?.name || 'RentCore',
        organization?.address ? `${organization.address}, ${organization.city || ''}` : '',
        organization?.iban ? `IBAN: ${organization.iban}${organization.bic ? ` | BIC: ${organization.bic}` : ''}` : '',
        organization?.tax_id ? `USt-IdNr.: ${organization.tax_id}` : '',
    ].filter(Boolean).join(' • ');

    doc.text(footerParts, pageWidth / 2, footerY, { align: 'center' });

    return doc;
};

export const generateContractPDF = (booking, organization) => {
    const doc = generateContract(booking, organization);
    const ref = booking?.booking_number || (booking?.id ? booking.id.slice(0, 8) : 'Entwurf');
    doc.save(`Mietvertrag_${ref}.pdf`);
};

export const printContract = (booking, organization) => {
    const doc = generateContract(booking, organization);
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
};
