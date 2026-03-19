"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useData } from "../../../../../src/context/DataContext";
import { useApp } from "../../../../../src/context/AppContext";
import { useOrganization } from "../../../../../src/context/OrgContext";
import { useToast } from "../../../../../src/components/ui/Toast";
import HandoverFlow from "../../../../../src/components/HandoverFlow";

export default function HandoverPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const { darkMode } = useApp();
    const { bookings, bikes, deposits, handoverProtocols } = useData();
    const org = useOrganization();
    const { addToast } = useToast();

    const booking = bookings.bookings.find(b => b.id === id);
    const bike = bikes.bikes.find(b => b.id === booking?.bike_id);

    if (bookings.loading) {
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

    const handleComplete = async ({ checklist, bikeConditionNotes, photos, annotations }) => {
        const orgId = booking.organization_id || org.currentOrg?.id;

        // 1. Save pickup protocol + upload photos
        const { protocol, error } = await handoverProtocols.saveProtocol({
            orgId,
            bookingId: id,
            type: "pickup",
            checklist,
            bikeConditionNotes,
            photos,
            annotations,
        });

        if (error) {
            addToast("Fehler beim Speichern der Übergabe: " + error.message, "error");
            return;
        }

        // 2. Update booking status to picked_up
        const { error: updateError } = await bookings.update(id, {
            status: "picked_up",
            pickup_notes: [
                bikeConditionNotes,
                checklist && Object.entries(checklist)
                    .filter(([, v]) => v === "defect")
                    .map(([k]) => `Defekt: ${k.replace(/_/g, " ")}`)
                    .join(", "),
            ].filter(Boolean).join("\n") || null,
            pickup_protocol: { protocolId: protocol?.id },
            deposit_status: "held",
        });

        if (updateError) {
            addToast("Fehler beim Aktualisieren des Status: " + updateError.message, "error");
            return;
        }

        // 3. Auto-create deposit if not already exists
        const { data: existingDeposit } = await deposits.getDepositByBooking(id);
        if (!existingDeposit) {
            const selectedBike = bike;
            let depositAmount = 0;
            if (selectedBike?.deposit_type === "fixed") {
                depositAmount = selectedBike.deposit_amount || 0;
            } else if (selectedBike?.deposit_type === "percentage") {
                depositAmount = (booking.total_price || 0) * (selectedBike.deposit_percentage || 0) / 100;
            } else if (booking.deposit_amount > 0) {
                depositAmount = booking.deposit_amount;
            }
            if (depositAmount > 0) {
                await deposits.createDeposit(id, depositAmount);
            }
        }

        addToast("Übergabe erfolgreich dokumentiert", "success");
        router.push("/app/bookings");
    };

    return (
        <HandoverFlow
            booking={booking}
            bike={bike}
            type="pickup"
            pickupProtocol={null}
            onComplete={handleComplete}
            onCancel={() => router.push("/app/bookings")}
            darkMode={darkMode}
        />
    );
}
