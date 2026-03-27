"use client";
// Backward-compat shim — delegates to useItemCategories
import { useItemCategories } from "./useItemCategories";

export function useBikeCategories(orgId) {
    return useItemCategories(orgId);
}
