"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

export function useDeposits(orgId) {
    const [deposits, setDeposits] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!orgId) { setLoading(false); return; }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("deposits")
                .select("*")
                .eq("organization_id", orgId)
                .order("created_at", { ascending: false });
            if (error) throw error;
            setDeposits(data || []);
        } catch (err) {
            console.error("Failed to load deposits:", err);
            setDeposits([]);
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => { load(); }, [load]);

    const createDeposit = async (bookingId, amount) => {
        const { data, error } = await supabase
            .from("deposits")
            .insert({ booking_id: bookingId, amount, status: "pending", organization_id: orgId })
            .select()
            .single();
        if (!error) setDeposits(prev => [data, ...prev]);
        else console.error("Deposit creation failed:", error);
        return { data, error };
    };

    const releaseDeposit = async (depositId) => {
        const { data, error } = await supabase
            .from("deposits")
            .update({ status: "released", released_at: new Date().toISOString() })
            .eq("id", depositId)
            .eq("organization_id", orgId)
            .select()
            .single();
        if (!error) setDeposits(prev => prev.map(d => d.id === depositId ? data : d));
        else console.error("Deposit release failed:", error);
        return { data, error };
    };

    const chargeDeposit = async (depositId, chargedAmount, reason) => {
        const deposit = deposits.find(d => d.id === depositId);
        const newStatus = deposit && chargedAmount >= deposit.amount
            ? "fully_charged"
            : "partially_charged";

        const { data, error } = await supabase
            .from("deposits")
            .update({ status: newStatus, charged_amount: chargedAmount, charge_reason: reason })
            .eq("id", depositId)
            .eq("organization_id", orgId)
            .select()
            .single();
        if (!error) setDeposits(prev => prev.map(d => d.id === depositId ? data : d));
        else console.error("Deposit charge failed:", error);
        return { data, error };
    };

    const getDepositByBooking = async (bookingId) => {
        const { data, error } = await supabase
            .from("deposits")
            .select("*")
            .eq("booking_id", bookingId)
            .eq("organization_id", orgId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) console.error("getDepositByBooking failed:", error);
        return { data, error };
    };

    return { deposits, loading, createDeposit, releaseDeposit, chargeDeposit, getDepositByBooking, reload: load };
}
