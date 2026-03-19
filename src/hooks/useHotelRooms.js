"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

export function useHotelRooms(hotelId) {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!hotelId) { setLoading(false); return; }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("hotel_rooms")
                .select("*")
                .eq("hotel_id", hotelId)
                .order("floor", { ascending: true })
                .order("room_number", { ascending: true });
            if (error) throw error;
            setRooms(data || []);
        } catch (err) {
            console.error("Failed to load hotel rooms:", err);
            setRooms([]);
        } finally {
            setLoading(false);
        }
    }, [hotelId]);

    useEffect(() => { load(); }, [load]);

    const create = async (room) => {
        const { data, error } = await supabase
            .from("hotel_rooms")
            .insert({ ...room, hotel_id: hotelId })
            .select()
            .single();
        if (!error) setRooms(prev => [...prev, data]);
        return { data, error };
    };

    const update = async (id, updates) => {
        const { data, error } = await supabase
            .from("hotel_rooms")
            .update(updates)
            .eq("id", id)
            .eq("hotel_id", hotelId)
            .select()
            .single();
        if (!error) setRooms(prev => prev.map(r => r.id === id ? data : r));
        return { data, error };
    };

    const remove = async (id) => {
        const { error } = await supabase.from("hotel_rooms").delete().eq("id", id).eq("hotel_id", hotelId);
        if (!error) setRooms(prev => prev.filter(r => r.id !== id));
        return { error };
    };

    return { rooms, loading, reload: load, create, update, remove };
}
