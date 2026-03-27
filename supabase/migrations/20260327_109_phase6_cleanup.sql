-- Migration: Phase 6 Cleanup — drop backward-compat views, remove deprecated columns
-- Rollback: This migration is NOT easily reversible. Restore from backup if needed.
-- Dependencies: All code must be updated to use new table names BEFORE running this.

BEGIN;

-- ============================================================
-- 1. DROP backward-compat views (code no longer uses them)
-- ============================================================

DROP VIEW IF EXISTS bikes CASCADE;
DROP VIEW IF EXISTS bike_categories CASCADE;
DROP VIEW IF EXISTS bike_health CASCADE;
DROP VIEW IF EXISTS hotels CASCADE;
DROP VIEW IF EXISTS hotel_providers CASCADE;
DROP VIEW IF EXISTS hotel_users CASCADE;
DROP VIEW IF EXISTS hotel_activities CASCADE;
DROP VIEW IF EXISTS hotel_rooms CASCADE;

-- ============================================================
-- 2. Remove bike_id column from bookings (item_id is canonical)
--    Keep hotel_id for now (still used in some RPC signatures)
-- ============================================================

-- Remove sync trigger first
DROP TRIGGER IF EXISTS trg_sync_booking_item_id ON bookings;
DROP FUNCTION IF EXISTS sync_booking_item_id();

-- Drop the deprecated column
ALTER TABLE bookings DROP COLUMN IF EXISTS bike_id;

-- ============================================================
-- 3. Remove bike_id from analytics_events (item_id is canonical)
-- ============================================================

DROP TRIGGER IF EXISTS trg_sync_analytics_item_id ON analytics_events;
DROP FUNCTION IF EXISTS sync_analytics_item_id();

ALTER TABLE analytics_events DROP COLUMN IF EXISTS bike_id;

-- ============================================================
-- 4. Remove hotel_id sync triggers from bookings/analytics/activities
--    (venue_id is canonical, but hotel_id stays for RPC backward-compat)
-- ============================================================

DROP TRIGGER IF EXISTS trg_sync_booking_venue_id ON bookings;
DROP FUNCTION IF EXISTS sync_booking_venue_id();

DROP TRIGGER IF EXISTS trg_sync_analytics_venue_id ON analytics_events;
DROP FUNCTION IF EXISTS sync_analytics_venue_id();

DROP TRIGGER IF EXISTS trg_sync_activities_venue_id ON activities;
DROP FUNCTION IF EXISTS sync_activities_venue_id();

-- ============================================================
-- 5. Remove maintenance_logs item_id sync triggers
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maintenance_logs') THEN
    DROP TRIGGER IF EXISTS trg_sync_mlog_item_id ON maintenance_logs;
    DROP TRIGGER IF EXISTS trg_sync_mlog_bike_id ON maintenance_logs;
    DROP FUNCTION IF EXISTS sync_maintenance_log_item_id();
    DROP FUNCTION IF EXISTS sync_maintenance_log_bike_id();
  END IF;
END $$;

-- ============================================================
-- 6. Remove deprecated V1 RPCs (V2 replacements exist)
-- ============================================================

-- Old track_analytics_event (replaced by track_analytics_event_v2)
-- Keep it — still called from HotelLandingPage

-- ============================================================
-- 7. Clean up Stripe metadata: remove bike_id from checkout
--    (handled in code — stripe-checkout/index.ts no longer writes bike_id)
-- ============================================================

-- Nothing to do in SQL — this is a code change (already done)

-- ============================================================
-- 8. Schema reload
-- ============================================================

NOTIFY pgrst, 'reload schema';

COMMIT;
