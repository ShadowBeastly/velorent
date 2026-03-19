import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const SEVERITY_DE = {
    minor: "Gering",
    moderate: "Mittel",
    severe: "Schwer",
};

/**
 * Generate a damage report PDF.
 * @param {Object} params
 * @param {Object} params.booking - booking record
 * @param {Object} params.bike - bike record
 * @param {Object} params.damageReport - damage_reports record with damages[]
 * @param {Object} params.photos - { front: base64, rear: base64, ... } (optional, for embedding)
 * @param {Object} params.org - organization record
 * @returns {jsPDF} - jsPDF document instance (call .save() or .output())
 */
export function generateDamageReportPDF({ booking, bike, damageReport, photos = {}, org }) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentW = pageW - margin * 2;
    let y = margin;

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
    const fmtEur = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);

    // ─── Header ────────────────────────────────────────────────────────────────
    doc.setFillColor(26, 125, 90);
    doc.rect(0, 0, pageW, 32, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("SCHADENSBERICHT", margin, 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Erstellt: ${fmtDate(new Date().toISOString())}`, margin, 22);
    doc.text(`Buchung: ${booking.booking_number || "—"}`, margin, 28);

    if (org?.name) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(org.name, pageW - margin, 18, { align: "right" });
    }

    y = 42;
    doc.setTextColor(15, 23, 42);

    // ─── Booking + Bike info ────────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Buchungsdetails", margin, y);
    y += 7;

    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: "bold" },
        body: [
            ["Buchungsnummer", booking.booking_number || "—", "Fahrzeug", bike?.name || "—"],
            ["Kunde", booking.customer_name || "—", "Kategorie", bike?.category || "—"],
            ["Zeitraum", `${fmtDate(booking.start_date)} – ${fmtDate(booking.end_date)}`, "Status", "Schaden erkannt"],
        ],
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 45 }, 2: { fontStyle: "bold", cellWidth: 45 } },
    });

    y = doc.lastAutoTable.finalY + 10;

    // ─── Damage overview ───────────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Erkannte Schäden", margin, y);
    y += 7;

    const damages = damageReport?.damages || [];
    if (damages.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text("Keine Schäden erfasst.", margin, y);
        y += 8;
        doc.setTextColor(15, 23, 42);
    } else {
        autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            head: [["#", "Beschreibung", "Schwere", "Geschätzte Kosten"]],
            body: damages.map((d, i) => [
                i + 1,
                d.description || "—",
                SEVERITY_DE[d.severity] || d.severity || "—",
                fmtEur(d.estimated_cost || 0),
            ]),
            headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 10, halign: "center" },
                3: { halign: "right", cellWidth: 35 },
            },
            footStyles: { fillColor: [254, 242, 242], textColor: [220, 38, 38], fontStyle: "bold" },
            foot: [[
                "", "Gesamtkosten", "",
                fmtEur(damageReport?.total_estimated_cost || damages.reduce((s, d) => s + (d.estimated_cost || 0), 0)),
            ]],
        });

        y = doc.lastAutoTable.finalY + 10;
    }

    // ─── Photos ────────────────────────────────────────────────────────────────
    const photoEntries = Object.entries(photos).filter(([, url]) => url && url.startsWith("data:"));
    if (photoEntries.length > 0) {
        // Check if we need a new page
        if (y > 200) { doc.addPage(); y = margin; }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text("Fotodokumentation", margin, y);
        y += 8;

        const imgW = (contentW - 5) / 2;
        const imgH = imgW * 0.75;
        let col = 0;

        const POS_DE = { front: "Front", rear: "Heck", left_side: "Links", right_side: "Rechts", top: "Oben", detail: "Detail" };

        for (const [pos, base64] of photoEntries) {
            if (y + imgH + 12 > 280) { doc.addPage(); y = margin; col = 0; }
            const x = margin + col * (imgW + 5);
            try {
                doc.addImage(base64, "JPEG", x, y, imgW, imgH);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(71, 85, 105);
                doc.text(POS_DE[pos] || pos, x + imgW / 2, y + imgH + 5, { align: "center" });
            } catch {
                // Image embedding failed — skip gracefully
            }
            col++;
            if (col === 2) { col = 0; y += imgH + 12; }
        }
        if (col === 1) y += imgH + 12;
    }

    // ─── Deposit section ───────────────────────────────────────────────────────
    if (y > 240) { doc.addPage(); y = margin; }
    y += 5;

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Kautionsentscheidung", margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const depositStatus = damageReport?.deposit_charged ? "Kaution einbehalten" : "Kaution freigegeben / noch offen";
    doc.text(`Status: ${depositStatus}`, margin, y);
    y += 12;

    // Signature placeholder
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("Unterschrift Mitarbeiter", margin, y);
    doc.text("Unterschrift Kunde", pageW / 2 + 5, y);
    y += 15;
    doc.setDrawColor(148, 163, 184);
    doc.line(margin, y, margin + 70, y);
    doc.line(pageW / 2 + 5, y, pageW / 2 + 75, y);

    // ─── Footer ────────────────────────────────────────────────────────────────
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(
            `Schadensbericht · ${booking.booking_number || ""} · Seite ${i}/${pageCount}`,
            pageW / 2,
            doc.internal.pageSize.getHeight() - 8,
            { align: "center" }
        );
    }

    return doc;
}
