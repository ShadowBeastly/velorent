"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

// ---------------------------------------------------------------------------
// Standalone validation logic. Usable without the hook (e.g. in BookingModal).
// ---------------------------------------------------------------------------

/**
 * Validate a coupon against a set of booking details.
 *
 * @param {object} coupon        - Coupon row from the database
 * @param {object} bookingDetails
 * @param {number} bookingDetails.totalPrice     - Base booking price (pre-discount)
 * @param {number} bookingDetails.durationDays   - Number of rental days
 * @param {number} bookingDetails.quantity       - Number of bikes
 * @param {string} [bookingDetails.categoryId]   - Bike category UUID
 * @param {string} [bookingDetails.bikeId]       - Specific bike UUID
 *
 * @returns {{ valid: boolean, discount: number, discountAmount: number, reason?: string }}
 */
export function validateCouponData(coupon, bookingDetails) {
    const { totalPrice = 0, durationDays = 1, quantity = 1, categoryId, bikeId } = bookingDetails;
    const now = new Date();

    if (!coupon.is_active) {
        return { valid: false, discount: 0, discountAmount: 0, reason: "Dieser Gutschein ist nicht aktiv." };
    }

    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
        return { valid: false, discount: 0, discountAmount: 0, reason: "Dieser Gutschein ist noch nicht gültig." };
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        return { valid: false, discount: 0, discountAmount: 0, reason: "Dieser Gutschein ist abgelaufen." };
    }

    if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) {
        return { valid: false, discount: 0, discountAmount: 0, reason: "Dieser Gutschein wurde bereits vollständig eingelöst." };
    }

    if (coupon.min_order_value && totalPrice < coupon.min_order_value) {
        return {
            valid: false, discount: 0, discountAmount: 0,
            reason: `Mindestbestellwert von ${coupon.min_order_value.toFixed(2)} € nicht erreicht.`
        };
    }

    if (coupon.min_duration_days && durationDays < coupon.min_duration_days) {
        return {
            valid: false, discount: 0, discountAmount: 0,
            reason: `Mindestmietdauer von ${coupon.min_duration_days} ${coupon.min_duration_days === 1 ? "Tag" : "Tagen"} nicht erreicht.`
        };
    }

    if (coupon.min_quantity && quantity < coupon.min_quantity) {
        return {
            valid: false, discount: 0, discountAmount: 0,
            reason: `Mindestmenge von ${coupon.min_quantity} ${coupon.min_quantity === 1 ? "Fahrrad" : "Fahrrädern"} nicht erreicht.`
        };
    }

    // applies_to check
    if (coupon.applies_to === "category" && coupon.bike_category_id) {
        if (categoryId !== coupon.bike_category_id) {
            return { valid: false, discount: 0, discountAmount: 0, reason: "Dieser Gutschein gilt nicht für diese Kategorie." };
        }
    }
    if (coupon.applies_to === "specific_bike" && coupon.bike_id) {
        if (bikeId !== coupon.bike_id) {
            return { valid: false, discount: 0, discountAmount: 0, reason: "Dieser Gutschein gilt nicht für dieses Fahrrad." };
        }
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === "percentage") {
        discountAmount = Math.round(totalPrice * (coupon.value / 100) * 100) / 100;
    } else if (coupon.type === "fixed") {
        discountAmount = Math.min(coupon.value, totalPrice);
    }

    return {
        valid: true,
        discount: coupon.type === "percentage" ? coupon.value : 0,
        discountAmount,
        coupon,
    };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCoupons(orgId) {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!orgId) { setLoading(false); return; }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("coupons")
                .select("*")
                .eq("organization_id", orgId)
                .order("created_at", { ascending: false });
            if (error) throw error;
            setCoupons(data || []);
        } catch (err) {
            console.error("Failed to load coupons:", err);
            setCoupons([]);
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => { load(); }, [load]);

    const create = async (data) => {
        const { data: row, error } = await supabase
            .from("coupons")
            .insert({ ...data, organization_id: orgId })
            .select()
            .single();
        if (!error) setCoupons(prev => [row, ...prev]);
        return { data: row, error };
    };

    const update = async (id, updates) => {
        const { data: row, error } = await supabase
            .from("coupons")
            .update(updates)
            .eq("id", id)
            .eq("organization_id", orgId)
            .select()
            .single();
        if (!error) setCoupons(prev => prev.map(c => c.id === id ? row : c));
        return { data: row, error };
    };

    const remove = async (id) => {
        const { error } = await supabase
            .from("coupons")
            .delete()
            .eq("id", id)
            .eq("organization_id", orgId);
        if (!error) setCoupons(prev => prev.filter(c => c.id !== id));
        return { error };
    };

    /**
     * Validate a coupon code against booking details.
     * Fetches fresh data from DB to avoid stale used_count.
     */
    const validateCoupon = async (code, bookingDetails) => {
        if (!code || !orgId) return { valid: false, discount: 0, discountAmount: 0, reason: "Ungültiger Code." };

        const { data, error } = await supabase
            .from("coupons")
            .select("*")
            .eq("organization_id", orgId)
            .eq("code", code.trim().toUpperCase())
            .single();

        if (error || !data) {
            return { valid: false, discount: 0, discountAmount: 0, reason: "Gutscheincode nicht gefunden." };
        }

        return validateCouponData(data, bookingDetails);
    };

    /**
     * Record coupon usage after a booking is successfully created.
     * Inserts coupon_usages row and increments used_count on the coupon.
     */
    const recordUsage = async (couponId, bookingId, discountAmount) => {
        const { error: usageError } = await supabase
            .from("coupon_usages")
            .insert({ coupon_id: couponId, booking_id: bookingId, discount_amount: discountAmount });

        if (usageError) {
            console.error("Failed to record coupon usage:", usageError);
            return { error: usageError };
        }

        // Increment used_count
        const coupon = coupons.find(c => c.id === couponId);
        const newCount = (coupon?.used_count || 0) + 1;
        const { error: updateError } = await supabase
            .from("coupons")
            .update({ used_count: newCount })
            .eq("id", couponId);

        if (!updateError) {
            setCoupons(prev => prev.map(c => c.id === couponId ? { ...c, used_count: newCount } : c));
        }

        return { error: updateError };
    };

    return { coupons, loading, reload: load, create, update, remove, validateCoupon, recordUsage };
}
