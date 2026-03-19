"use client";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useData } from "../../../../../src/context/DataContext";
import { useApp } from "../../../../../src/context/AppContext";
import { useOrganization } from "../../../../../src/context/OrgContext";
import { useToast } from "../../../../../src/components/ui/Toast";
import HandoverFlow from "../../../../../src/components/HandoverFlow";
import DepositActionModal from "../../../../../src/components/DepositActionModal";
import { generateDamageReportPDF } from "../../../../../src/utils/generateDamageReportPDF";

export default function ReturnPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const { darkMode } = useApp();
    const { bookings, bikes, deposits, handoverProtocols } = useData();
    const org = useOrganization();
    const { addToast } = useToast();

    const [pickupProtocol, setPickupProtocol] = useState(null);
    const [loadingProtocol, setLoadingProtocol] = useState(true);
    const [depositModal, setDepositModal] = useState({ open: false, deposit: null });
    const [savedDamageReport, setSavedDamageReport] = useState(null);

    const booking = bookings.bookings.find(b => b.id === id);
    const bike = bikes.bikes.find(b => b.id === booking?.bike_id);

    // Load pickup protocol for comparison
    useEffect(() => {
        if (!id) return;
        setLoadingProtocol(true);
        handoverProtocols.getProtocolForBooking(id, "pickup").then(({ data }) => {
            setPickupProtocol(data || null);
            setLoadingProtocol(false);
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const isLoading = bookings.loading || loadingProtocol;

    if (isLoading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-slate-950 text-white" : "bg-slate-50"}`}>
                <div className="flex items-center gap-3">
                    <svg className="animate-spin w-6 h-6 text-[#1A7D5A]" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeLinecap="round" />
                    </svg>
                    <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Lade Buchung…</span>
                </div>
            </div>
        );
    }

    if (!booking || !bike) {
        return (
            <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${darkMode ? "bg-slate-950 text-white" : "bg-slate-50"}`}>
                <p className="text-lg font-semibold">Buchung nicht gefunden</p>
                <button
                    onClick={() => router.push("/app/bookings")}
                    className="px-4 py-2 bg-[#1A7D5A] text-white rounded-xl text-sm font-semibold"
                >
                    Zurück zu Buchungen
                </button>
            </div>
        );
    }

    const orgId = booking.organization_id || org.currentOrg?.id;

    const handleComplete = async ({ checklist, bikeConditionNotes, photos, annotations, damageItems }) => {
        const hasDamages = damageItems && damageItems.length > 0;

        // 1. Save return protocol + photos
        const { protocol, error } = await handoverProtocols.saveProtocol({
            orgId,
            bookingId: id,
            type: "return",
            checklist,
            bikeConditionNotes,
            photos,
            annotations,
        });

        if (error) {
            addToast("Fehler beim Speichern der Rücknahme: " + error.message, "error");
            return;
        }

        // 2. Update booking status
        const returnNotes = [
            bikeConditionNotes,
            hasDamages ? `Schäden: ${damageItems.map(d => d.description).join(", ")}` : null,
        ].filter(Boolean).join("\n") || null;

        await bookings.update(id, {
            status: "returned",
            return_notes: returnNotes,
            return_protocol: { protocolId: protocol?.id },
            deposit_status: hasDamages ? "held" : "refunded",
        });

        // 3. Save damage report if damages detected
        let dmgReport = null;
        if (hasDamages && pickupProtocol?.id) {
            const totalCost = damageItems.reduce((s, d) => s + (d.estimated_cost || 0), 0);
            const { report } = await handoverProtocols.saveDamageReport({
                organization_id: orgId,
                booking_id: id,
                pickup_protocol_id: pickupProtocol.id,
                return_protocol_id: protocol?.id,
                damages: damageItems,
                total_estimated_cost: totalCost,
                status: "detected",
            });
            dmgReport = report;
            setSavedDamageReport(report);

            // Auto-generate + save PDF to storage
            try {
                const pdfDoc = generateDamageReportPDF({
                    booking,
                    bike,
                    damageReport: { ...report, damages: damageItems, total_estimated_cost: totalCost },
                    photos,
                    org: org.currentOrg,
                });
                const pdfBase64 = pdfDoc.output("datauristring");
                const pdfBlob = await fetch(pdfBase64).then(r => r.blob());
                const pdfPath = `${orgId}/${id}/damage-report.pdf`;
                // Use supabase from utils
                const { supabase } = await import("../../../../../src/utils/supabase");
                await supabase.storage.from("condition-photos").upload(pdfPath, pdfBlob, { contentType: "application/pdf", upsert: true });
                const { data: signedPdf } = await supabase.storage.from("condition-photos").createSignedUrl(pdfPath, 31536000);
                if (dmgReport?.id && signedPdf?.signedUrl) {
                    await handoverProtocols.updateDamageReport(dmgReport.id, { deposit_charged: false });
                }
            } catch (pdfErr) {
                console.warn("PDF generation/upload failed (non-critical):", pdfErr);
            }
        }

        // 4. Check for deposit action
        const { data: dep } = await deposits.getDepositByBooking(id);
        if (dep && (dep.status === "pending" || dep.status === "held")) {
            setDepositModal({ open: true, deposit: dep });
        } else {
            addToast("Rücknahme erfolgreich abgeschlossen", "success");
            router.push("/app/bookings");
        }
    };

    const handleDepositRelease = async () => {
        const { error } = await deposits.releaseDeposit(depositModal.deposit.id);
        if (error) {
            addToast("Fehler beim Freigeben: " + error.message, "error");
        } else {
            if (savedDamageReport?.id) {
                await handoverProtocols.updateDamageReport(savedDamageReport.id, { deposit_charged: false, status: "resolved" });
            }
            addToast("Kaution freigegeben", "success");
            router.push("/app/bookings");
        }
    };

    const handleDepositCharge = async (amount, reason) => {
        const { error } = await deposits.chargeDeposit(depositModal.deposit.id, amount, reason);
        if (error) {
            addToast("Fehler beim Einbehalten: " + error.message, "error");
        } else {
            if (savedDamageReport?.id) {
                await handoverProtocols.updateDamageReport(savedDamageReport.id, { deposit_charged: true, status: "customer_notified" });
            }
            addToast("Kaution einbehalten", "success");
            router.push("/app/bookings");
        }
    };

    return (
        <>
            <HandoverFlow
                booking={booking}
                bike={bike}
                type="return"
                pickupProtocol={pickupProtocol}
                onComplete={handleComplete}
                onCancel={() => router.push("/app/bookings")}
                darkMode={darkMode}
            />
            <DepositActionModal
                isOpen={depositModal.open}
                deposit={depositModal.deposit}
                darkMode={darkMode}
                onRelease={handleDepositRelease}
                onCharge={handleDepositCharge}
                onClose={() => {
                    setDepositModal({ open: false, deposit: null });
                    router.push("/app/bookings");
                }}
            />
        </>
    );
}
