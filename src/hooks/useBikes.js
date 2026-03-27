"use client";
// Backward-compat shim — delegates to useItems
import { useItems } from "./useItems";

export function useBikes(orgId) {
    const { items, ...rest } = useItems(orgId);
    return { bikes: items, ...rest };
}
