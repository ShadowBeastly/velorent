"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

export function useHandoverProtocols(orgId) {
    const [protocols, setProtocols] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!orgId) { setLoading(false); return; }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("handover_protocols")
                .select("*, condition_photos(*)")
                .eq("organization_id", orgId)
                .order("created_at", { ascending: false });
            if (error) throw error;
            setProtocols(data || []);
        } catch (err) {
            console.error("Failed to load handover protocols:", err);
            setProtocols([]);
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => { load(); }, [load]);

    /**
     * Upload a base64 photo to Supabase Storage.
     * Returns the signed URL for display (valid 1 year).
     */
    const uploadPhoto = async (orgId, bookingId, type, position, base64DataUrl) => {
        if (!base64DataUrl) return null;
        try {
            // Convert base64 data URL to Blob
            const res = await fetch(base64DataUrl);
            const blob = await res.blob();
            const path = `${orgId}/${bookingId}/${type}/${position}.jpg`;

            const { error: uploadError } = await supabase.storage
                .from("condition-photos")
                .upload(path, blob, { contentType: "image/jpeg", upsert: true });

            if (uploadError) throw uploadError;

            const { data: signedData } = await supabase.storage
                .from("condition-photos")
                .createSignedUrl(path, 31536000); // 1 year

            return signedData?.signedUrl || null;
        } catch (err) {
            console.error("Photo upload failed:", err);
            return null;
        }
    };

    /**
     * Save a complete protocol with photos and condition_photos records.
     * Returns { protocol, photoUrls, error }
     */
    const saveProtocol = async ({
        orgId: overrideOrgId,
        bookingId,
        type,
        checklist,
        bikeConditionNotes,
        photos,      // { front: base64|null, rear: base64|null, ... }
        annotations, // { front: [], rear: [], ... }
        performedBy,
    }) => {
        const org = overrideOrgId || orgId;
        try {
            // 1. Create handover_protocol record
            const { data: protocol, error: protoError } = await supabase
                .from("handover_protocols")
                .insert({
                    organization_id: org,
                    booking_id: bookingId,
                    type,
                    checklist,
                    bike_condition_notes: bikeConditionNotes || "",
                    performed_by: performedBy || null,
                })
                .select()
                .single();
            if (protoError) throw protoError;

            // 2. Upload photos + create condition_photos records
            const photoUrls = {};
            const positions = ["front", "rear", "left_side", "right_side", "top", "detail"];
            for (const pos of positions) {
                const base64 = photos?.[pos];
                if (!base64) continue;
                const url = await uploadPhoto(org, bookingId, type, pos, base64);
                if (!url) continue;
                photoUrls[pos] = url;

                await supabase.from("condition_photos").insert({
                    protocol_id: protocol.id,
                    photo_url: url,
                    position: pos,
                    annotations: annotations?.[pos] || [],
                });
            }

            // Update local state
            setProtocols(prev => [{ ...protocol, condition_photos: [] }, ...prev]);

            return { protocol, photoUrls, error: null };
        } catch (err) {
            console.error("saveProtocol failed:", err);
            return { protocol: null, photoUrls: {}, error: err };
        }
    };

    /**
     * Create a damage report record.
     */
    const saveDamageReport = async (data) => {
        try {
            const { data: report, error } = await supabase
                .from("damage_reports")
                .insert({
                    organization_id: data.organization_id || orgId,
                    booking_id: data.booking_id,
                    pickup_protocol_id: data.pickup_protocol_id,
                    return_protocol_id: data.return_protocol_id,
                    damages: data.damages || [],
                    total_estimated_cost: data.total_estimated_cost || 0,
                    deposit_charged: data.deposit_charged || false,
                    status: data.status || "detected",
                })
                .select()
                .single();
            if (error) throw error;
            return { report, error: null };
        } catch (err) {
            console.error("saveDamageReport failed:", err);
            return { report: null, error: err };
        }
    };

    /**
     * Update a damage report (e.g. after deposit decision).
     */
    const updateDamageReport = async (id, updates) => {
        try {
            const { data, error } = await supabase
                .from("damage_reports")
                .update(updates)
                .eq("id", id)
                .select()
                .single();
            if (error) throw error;
            return { data, error: null };
        } catch (err) {
            return { data: null, error: err };
        }
    };

    /**
     * Load the pickup or return protocol for a specific booking (with photos).
     */
    const getProtocolForBooking = async (bookingId, type) => {
        try {
            const { data, error } = await supabase
                .from("handover_protocols")
                .select("*, condition_photos(*)")
                .eq("booking_id", bookingId)
                .eq("type", type)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            if (error) throw error;
            return { data, error: null };
        } catch (err) {
            return { data: null, error: err };
        }
    };

    /**
     * Get the damage report for a booking (if any).
     */
    const getDamageReport = async (bookingId) => {
        try {
            const { data, error } = await supabase
                .from("damage_reports")
                .select("*")
                .eq("booking_id", bookingId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            if (error) throw error;
            return { data, error: null };
        } catch (err) {
            return { data: null, error: err };
        }
    };

    return {
        protocols,
        loading,
        saveProtocol,
        saveDamageReport,
        updateDamageReport,
        getProtocolForBooking,
        getDamageReport,
        reload: load,
    };
}
