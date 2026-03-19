"use client";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useData } from "../../../../../src/context/DataContext";
import { useApp } from "../../../../../src/context/AppContext";
import { useOrganization } from "../../../../../src/context/OrgContext";
import { useToast } from "../../../../../src/components/ui/Toast";
import HandoverFlow from "../../../../../src/components/HandoverFlow";
import { generateDamageReportPDF } from "../../../../../src/utils/generateDamageReportPDF";

export default function ReturnPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const { darkMode } = useApp();
    const { addToast } = useToast();
    const org = useOrganization();
    const { bikes, bookings, deposits, handoverProtocols } = useData();
    const [pickupProtocol, setPickupProtocol] = useState(null);

    const booking = bookings.bookings.find(b => b.id === id);
    const bike = booking ? bikes.bikes.find(bk => bk.id === booking.bike_id) : null;

    useEffect(() => {
        if (id && handoverProtocols?.getProtocolForBooking) {
            handoverProtocols.getProtocolForBooking(id, "pickup").then(p => {
                if (p) setPickupProtocol(p);
            });
        }
    }, [id, handoverProtocols]);

    if (!booking) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-slate-400">Buchung nicht gefunden.</p>
            </div>
        );
    }

    const handleComplete = async ({ checklist, bikeConditionNotes, photos, annotations, damageItems }) => {
        try {
            const hasDamages = damageItems && damageItems.length > 0;

            // Save return protocol
            const { data: protocol, error: protoError } = await handoverProtocols.saveProtocol({
                orgId: booking.organization_id,
                bookingId: id,
                type: "return",
                checklist,
                bikeConditionNotes,
                photos,
                annotations,
            });
            if (protoError) throw protoError;

            // Update booking status
            const { error: bookingError } = await bookings.update(id, {
                status: "returned",
                return_protocol_id: protocol?.id || null,
                deposit_status: hasDamages ? "held" : "pending_release",
            });
            if (bookingError) throw bookingError;

            // Create damage report if damages were found
            let damageReport = null;
            if (hasDamages) {
                const totalCost = damageItems.reduce((s, d) => s + (d.estimated_cost || 0), 0);
                const { data: dr } = await handoverProtocols.saveDamageReport({
                    booking_id: id,
                    organization_id: booking.organization_id,
                    pickup_protocol_id: pickupProtocol?.id || null,
                    return_protocol_id: protocol?.id || null,
                    damages: damageItems,
                    total_estimated_cost: totalCost,
                    deposit_charged: false,
                    status: "detected",
                });
                damageReport = dr;

                // Generate and download damage report PDF
                try {
                    const pdfPhotos = {};
                    Object.entries(photos || {}).forEach(([pos, url]) => {
                        if (url && url.startsWith("data:")) pdfPhotos[pos] = url;
                    });
                    const doc = generateDamageReportPDF({
                        booking: { ...booking, customer_name: booking.customer_name },
                        bike,
                        damageReport: { ...damageReport, damages: damageItems },
                        photos: pdfPhotos,
                        org: org.currentOrg,
                    });
                    doc.save(`Schadensbericht-${booking.booking_number || id}.pdf`);
                } catch {
                    // PDF generation failed — non-critical
                }
            }

            // Show deposit action modal if deposit exists
            const deposit = deposits?.deposits?.find(d => d.booking_id === id);
            if (deposit && hasDamages) {
                addToast("Rückgabe dokumentiert — Kaution muss noch bearbeitet werden", "warning");
            } else {
                addToast("Rückgabe erfolgreich dokumentiert", "success");
            }

            router.push("/app/bookings");
        } catch (err) {
            addToast("Fehler: " + err.message, "error");
        }
    };

    return (
        <HandoverFlow
            booking={booking}
            bike={bike}
            type="return"
            pickupProtocol={pickupProtocol}
            onComplete={handleComplete}
            onCancel={() => router.push("/app/bookings")}
            darkMode={darkMode}
        />
    );
}
