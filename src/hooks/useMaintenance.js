"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

const SCHEDULE_TYPES = ["routine", "brake", "tire", "chain", "battery", "full_service"];

export { SCHEDULE_TYPES };

export function useMaintenance(orgId) {
    const [dueMaintenances, setDueMaintenances] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadDue = useCallback(async () => {
        if (!orgId) { setLoading(false); return; }
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc("get_due_maintenances", { p_org_id: orgId });
            if (error) throw error;
            setDueMaintenances(data || []);
        } catch (err) {
            console.error("useMaintenance: failed to load due maintenances:", err);
            setDueMaintenances([]);
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => { loadDue(); }, [loadDue]);

    // ── Schedules ──────────────────────────────────────────────────────────
    const getSchedules = async (bikeId) => {
        const { data, error } = await supabase
            .from("maintenance_schedules")
            .select("*")
            .eq("item_id", bikeId)
            .order("created_at", { ascending: true });
        return { data: data || [], error };
    };

    const createSchedule = async (scheduleData) => {
        // Compute initial next_due_at if interval_days is set
        const now = new Date();
        let next_due_at = null;
        if (scheduleData.interval_days) {
            next_due_at = new Date(now.getTime() + scheduleData.interval_days * 86400000).toISOString();
        }

        const { data, error } = await supabase
            .from("maintenance_schedules")
            .insert({
                ...scheduleData,
                organization_id: orgId,
                next_due_at,
            })
            .select()
            .single();
        if (!error) await loadDue();
        return { data, error };
    };

    const updateSchedule = async (id, updates) => {
        const { data, error } = await supabase
            .from("maintenance_schedules")
            .update(updates)
            .eq("id", id)
            .select()
            .single();
        if (!error) await loadDue();
        return { data, error };
    };

    const deleteSchedule = async (id) => {
        const { error } = await supabase
            .from("maintenance_schedules")
            .delete()
            .eq("id", id);
        if (!error) await loadDue();
        return { error };
    };

    // ── Logs ───────────────────────────────────────────────────────────────
    const getMaintenanceLogs = async (bikeId) => {
        const { data, error } = await supabase
            .from("maintenance_logs")
            .select("*")
            .eq("item_id", bikeId)
            .order("performed_at", { ascending: false })
            .limit(20);
        return { data: data || [], error };
    };

    /**
     * Log a service event.
     * After saving, updates the linked schedule's last_performed_at + next_due_at.
     */
    const logMaintenance = async ({ bikeId, scheduleId, type, description, cost, performedBy, partsUsed, photos }) => {
        const today = new Date().toISOString().slice(0, 10);
        const { data: logEntry, error: logError } = await supabase
            .from("maintenance_logs")
            .insert({
                organization_id: orgId,
                item_id: bikeId,
                schedule_id: scheduleId || null,
                type: type || "service",
                description,
                cost: cost ? Number(cost) : null,
                performed_by: performedBy,
                performed_at: today,
                status: "completed",
                parts_used: partsUsed || [],
                photos: photos || [],
            })
            .select()
            .single();

        if (logError) return { data: null, error: logError };

        // Update schedule: last_performed_at + next_due_at
        if (scheduleId) {
            const { data: schedule } = await supabase
                .from("maintenance_schedules")
                .select("interval_days, interval_rentals")
                .eq("id", scheduleId)
                .single();

            if (schedule) {
                const now = new Date();
                let next_due_at = null;
                if (schedule.interval_days) {
                    next_due_at = new Date(now.getTime() + schedule.interval_days * 86400000).toISOString();
                }
                // For interval_rentals, next_due_at is computed on return, not here
                await supabase
                    .from("maintenance_schedules")
                    .update({ last_performed_at: now.toISOString(), next_due_at })
                    .eq("id", scheduleId);
            }
        }

        await loadDue();
        return { data: logEntry, error: null };
    };

    // ── Bike Health ────────────────────────────────────────────────────────
    const getBikeHealth = async (bikeId) => {
        const { data, error } = await supabase
            .from("item_health")
            .select("*")
            .eq("item_id", bikeId)
            .maybeSingle();
        return { data, error };
    };

    const updateBikeHealth = async (bikeId, updates) => {
        // Upsert. bike_health may not exist yet for older bikes.
        const { data, error } = await supabase
            .from("item_health")
            .upsert(
                { item_id: bikeId, ...updates, updated_at: new Date().toISOString() },
                { onConflict: "bike_id" }
            )
            .select()
            .single();
        return { data, error };
    };

    /**
     * Called after a rental return.
     * 1. Increments total_rentals + total_rental_days
     * 2. Updates component statuses from checklist
     * 3. Checks interval_rentals schedules → sets next_due_at if threshold hit
     */
    const logReturn = async (bikeId, checklist, daysRented = 1) => {
        // 1. Get or init bike_health
        const { data: health } = await getBikeHealth(bikeId);
        const currentRentals = (health?.total_rentals || 0) + 1;
        const currentDays = (health?.total_rental_days || 0) + daysRented;

        const healthUpdate = {
            total_rentals: currentRentals,
            total_rental_days: currentDays,
        };

        // Map checklist fields to bike_health columns
        if (checklist.brakes !== undefined)      healthUpdate.brake_status       = checklist.brakes;
        if (checklist.tire_front !== undefined)  healthUpdate.tire_front_status  = checklist.tire_front;
        if (checklist.tire_rear !== undefined)   healthUpdate.tire_rear_status   = checklist.tire_rear;
        if (checklist.chain !== undefined)       healthUpdate.chain_status       = checklist.chain;
        if (checklist.battery_pct !== undefined) healthUpdate.battery_health_percent = checklist.battery_pct;

        await updateBikeHealth(bikeId, healthUpdate);

        // 2. Check interval_rentals schedules
        const { data: schedules } = await getSchedules(bikeId);
        const now = new Date();

        for (const schedule of (schedules || [])) {
            if (schedule.interval_rentals && schedule.interval_rentals > 0) {
                if (currentRentals % schedule.interval_rentals === 0) {
                    // Threshold hit → mark as due now
                    await supabase
                        .from("maintenance_schedules")
                        .update({ next_due_at: now.toISOString() })
                        .eq("id", schedule.id);
                }
            }
        }

        await loadDue();
    };

    // Derived: set of bike IDs that have overdue maintenance
    const overdueBikeIds = new Set(
        dueMaintenances
            .filter(m => m.is_overdue)
            .map(m => m.bike_id)
    );

    const overdueCount = dueMaintenances.filter(m => m.is_overdue).length;
    const soonDueCount = dueMaintenances.filter(m => !m.is_overdue).length;

    return {
        dueMaintenances,
        loading,
        overdueBikeIds,
        overdueCount,
        soonDueCount,
        reload: loadDue,
        // Schedules
        getSchedules,
        createSchedule,
        updateSchedule,
        deleteSchedule,
        // Logs
        getMaintenanceLogs,
        logMaintenance,
        // Health
        getBikeHealth,
        updateBikeHealth,
        logReturn,
    };
}
