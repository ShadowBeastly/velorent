"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

export function useHotelActivities(hotelId) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!hotelId) { setLoading(false); return; }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("hotel_activities")
                .select("*")
                .eq("hotel_id", hotelId)
                .order("sort_order", { ascending: true })
                .order("created_at", { ascending: false });
            if (error) throw error;
            setActivities(data || []);
        } catch (err) {
            console.error("Failed to load hotel activities:", err);
            setActivities([]);
        } finally {
            setLoading(false);
        }
    }, [hotelId]);

    useEffect(() => { load(); }, [load]);

    const create = async (activity) => {
        const { data, error } = await supabase
            .from("hotel_activities")
            .insert({ ...activity, hotel_id: hotelId })
            .select()
            .single();
        if (!error) setActivities(prev => [...prev, data]);
        return { data, error };
    };

    const update = async (id, updates) => {
        const { data, error } = await supabase
            .from("hotel_activities")
            .update(updates)
            .eq("id", id)
            .eq("hotel_id", hotelId)
            .select()
            .single();
        if (!error) setActivities(prev => prev.map(a => a.id === id ? data : a));
        return { data, error };
    };

    const remove = async (id) => {
        const { error } = await supabase.from("hotel_activities").delete().eq("id", id).eq("hotel_id", hotelId);
        if (!error) setActivities(prev => prev.filter(a => a.id !== id));
        return { error };
    };

    return { activities, loading, reload: load, create, update, remove };
}
