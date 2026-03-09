"use client";
import { createContext, useContext, useMemo } from "react";
import { useOrganization } from "./OrgContext";
import { useBikes } from "../hooks/useBikes";
import { useBookings } from "../hooks/useBookings";
import { useCustomers } from "../hooks/useCustomers";
import { useInvoices } from "../hooks/useInvoices";
import { useBikeCategories } from "../hooks/useBikeCategories";
import { useAddOns } from "../hooks/useAddOns";
import { useMaintenanceBlocks } from "../hooks/useMaintenanceBlocks";
import { useVouchers } from "../hooks/useVouchers";
import { fmtISO } from "../utils/formatters";

const DataContext = createContext(null);

export function DataProvider({ children }) {
    const org = useOrganization();
    const orgId = org.currentOrg?.id;

    const bikes = useBikes(orgId);
    const bookings = useBookings(orgId);
    const customers = useCustomers(orgId);
    const invoices = useInvoices(orgId);
    const bikeCategories = useBikeCategories(orgId);
    const addOns = useAddOns(orgId);
    const maintenanceBlocks = useMaintenanceBlocks(orgId);
    const vouchers = useVouchers(orgId);

    const todayStr = fmtISO(new Date());
    const notifications = useMemo(() => {
        const n = [];
        bookings.bookings.forEach(b => {
            if (b.status === "picked_up" && b.end_date < todayStr) {
                n.push({ type: "warning", msg: `Überfällig: ${b.customer_name}`, id: b.id });
            }
            if (b.start_date === todayStr && ["reserved", "confirmed"].includes(b.status)) {
                n.push({ type: "info", msg: `Heute Abholung: ${b.customer_name}`, id: b.id });
            }
        });
        return n;
    }, [bookings.bookings, todayStr]);

    return (
        <DataContext.Provider value={{
            bikes,
            bookings,
            customers,
            invoices,
            bikeCategories,
            addOns,
            maintenanceBlocks,
            vouchers,
            notifications
        }}>
            {children}
        </DataContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
    const context = useContext(DataContext);
    if (!context) throw new Error("useData must be used within DataProvider");
    return context;
}
