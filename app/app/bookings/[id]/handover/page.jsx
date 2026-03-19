"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useData } from "../../../../../src/context/DataContext";
import { useApp } from "../../../../../src/context/AppContext";
import { useToast } from "../../../../../src/components/ui/Toast";
import HandoverFlow from "../../../../../src/components/HandoverFlow";

export default function HandoverPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const { darkMode } = useApp();
    const { addToast } = useToast();
    const { bikes, bookings, deposits, handoverProtocols } = useData();

    const booking = bookings.bookings.find(b => b.id === id);
    const bike = booking ? bikes.bikes.find(bk => bk.id === booking.bike_id) : null;

    if (!booking) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-slate-400">Buchung nicht gefunden.</p>
            </div>
        );
    }

    const handleComplete = async ({ checklist, bikeConditionNotes, photos, annotations }) => {
        try {
            const { data: protocol, error: protoError } = await handoverProtocols.saveProtocol({
                orgId: booking.organization_id,
                bookingId: id,
                type: "pickup",
                checklist,
                bikeConditionNotes,
                photos,
                annotations,
            });
            if (protoError) throw protoError;

            const { error: bookingError } = await bookings.update(id, {
                status: "picked_up",
                pickup_protocol_id: protocol?.id || null,
                deposit_status: booking.deposit_amount > 0 ? "held" : "none",
            });
            if (bookingError) throw bookingError;

            // Auto-create deposit record if bike has deposit configured
            if (booking.deposit_amount > 0 && deposits) {
                const existing = deposits.deposits?.find(d => d.booking_id === id);
                if (!existing) {
                    await deposits.createDeposit({
                        booking_id: id,
                        organization_id: booking.organization_id,
                        amount: booking.deposit_amount,
                        status: "held",
                    });
                }
            }

            addToast("Übergabe erfolgreich dokumentiert", "success");
            router.push("/app/bookings");
        } catch (err) {
            addToast("Fehler: " + err.message, "error");
        }
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
