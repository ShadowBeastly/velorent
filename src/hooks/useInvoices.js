"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

export function useInvoices(organizationId) {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchInvoices = useCallback(async () => {
        if (!organizationId) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("invoices")
                .select(`
                    *,
                    customer:customers(first_name, last_name, email),
                    booking:bookings(booking_number)
                `)
                .eq("organization_id", organizationId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setInvoices(data || []);
        } catch (err) {
            console.error("Error fetching invoices:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [organizationId]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const create = async (invoiceData) => {
        try {
            const { data, error } = await supabase
                .from("invoices")
                .insert([{ ...invoiceData, organization_id: organizationId }])
                .select()
                .single();

            if (error) throw error;
            setInvoices(prev => [data, ...prev]);
            return { data, error: null };
        } catch (err) {
            return { data: null, error: err };
        }
    };

    const update = async (id, updates) => {
        try {
            const { data, error } = await supabase
                .from("invoices")
                .update(updates)
                .eq("id", id)
                .eq("organization_id", organizationId)
                .select()
                .single();

            if (error) throw error;
            setInvoices(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
            return { data, error: null };
        } catch (err) {
            return { data: null, error: err };
        }
    };

    const remove = async (id) => {
        try {
            const { error } = await supabase
                .from("invoices")
                .delete()
                .eq("id", id)
                .eq("organization_id", organizationId);

            if (error) throw error;
            setInvoices(prev => prev.filter(i => i.id !== id));
            return { error: null };
        } catch (err) {
            return { error: err };
        }
    };

    return {
        invoices,
        loading,
        error,
        create,
        update,
        remove,
        refresh: fetchInvoices
    };
}
