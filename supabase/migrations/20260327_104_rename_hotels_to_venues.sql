-- Migration: Rename hotels → venues and all hotel_* tables
-- Rollback:
--   DROP VIEW IF EXISTS hotels CASCADE;
--   DROP VIEW IF EXISTS hotel_providers CASCADE;
--   DROP VIEW IF EXISTS hotel_users CASCADE;
--   DROP VIEW IF EXISTS hotel_activities CASCADE;
--   DROP VIEW IF EXISTS hotel_rooms CASCADE;
--   ALTER TABLE venues RENAME TO hotels;
--   ALTER TABLE venue_providers RENAME TO hotel_providers;
--   ALTER TABLE venue_users RENAME TO hotel_users;
--   ALTER TABLE venue_activities RENAME TO hotel_activities;
--   ALTER TABLE venue_areas RENAME TO hotel_rooms;
--   ALTER TABLE bookings DROP COLUMN IF EXISTS venue_id;
--   ALTER TABLE analytics_events DROP COLUMN IF EXISTS venue_id;
--   ALTER TABLE activities DROP COLUMN IF EXISTS venue_id;
--   DROP FUNCTION IF EXISTS sync_booking_venue_id();
--   DROP FUNCTION IF EXISTS sync_analytics_venue_id();
--   DROP FUNCTION IF EXISTS sync_activities_venue_id();
-- Dependencies: 20260327_103_rename_bikes_to_items.sql

BEGIN;

-- ============================================================
-- 1. RENAME hotels → venues
-- ============================================================

ALTER TABLE hotels RENAME TO venues;

-- Rename indexes
ALTER INDEX IF EXISTS idx_hotels_slug RENAME TO idx_venues_slug;
ALTER INDEX IF EXISTS idx_hotels_active RENAME TO idx_venues_active;
ALTER INDEX IF EXISTS idx_hotels_region_id RENAME TO idx_venues_region_id;
ALTER INDEX IF EXISTS hotels_pkey RENAME TO venues_pkey;

-- Backward-compatible updatable view
CREATE OR REPLACE VIEW hotels AS SELECT * FROM venues;

GRANT SELECT, INSERT, UPDATE, DELETE ON hotels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON hotels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON hotels TO service_role;

-- ============================================================
-- 2. RENAME hotel_providers → venue_providers
-- ============================================================

ALTER TABLE hotel_providers RENAME TO venue_providers;

ALTER INDEX IF EXISTS idx_hotel_providers_hotel RENAME TO idx_venue_providers_venue;
ALTER INDEX IF EXISTS idx_hotel_providers_org RENAME TO idx_venue_providers_org;
ALTER INDEX IF EXISTS hotel_providers_pkey RENAME TO venue_providers_pkey;

CREATE OR REPLACE VIEW hotel_providers AS SELECT * FROM venue_providers;

GRANT SELECT, INSERT, UPDATE, DELETE ON hotel_providers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON hotel_providers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON hotel_providers TO service_role;

-- ============================================================
-- 3. RENAME hotel_users → venue_users
-- ============================================================

ALTER TABLE hotel_users RENAME TO venue_users;

ALTER INDEX IF EXISTS hotel_users_pkey RENAME TO venue_users_pkey;

CREATE OR REPLACE VIEW hotel_users AS SELECT * FROM venue_users;

GRANT SELECT, INSERT, UPDATE, DELETE ON hotel_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON hotel_users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON hotel_users TO service_role;

-- ============================================================
-- 4. RENAME hotel_activities → venue_activities
-- ============================================================

ALTER TABLE hotel_activities RENAME TO venue_activities;

ALTER INDEX IF EXISTS idx_hotel_activities_hotel_id RENAME TO idx_venue_activities_venue_id;
ALTER INDEX IF EXISTS hotel_activities_pkey RENAME TO venue_activities_pkey;

CREATE OR REPLACE VIEW hotel_activities AS SELECT * FROM venue_activities;

GRANT SELECT, INSERT, UPDATE, DELETE ON hotel_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON hotel_activities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON hotel_activities TO service_role;

-- ============================================================
-- 5. RENAME hotel_rooms → venue_areas
-- ============================================================

ALTER TABLE hotel_rooms RENAME TO venue_areas;

ALTER INDEX IF EXISTS idx_hotel_rooms_hotel_id RENAME TO idx_venue_areas_venue_id;
ALTER INDEX IF EXISTS hotel_rooms_pkey RENAME TO venue_areas_pkey;

CREATE OR REPLACE VIEW hotel_rooms AS SELECT * FROM venue_areas;

GRANT SELECT, INSERT, UPDATE, DELETE ON hotel_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON hotel_rooms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON hotel_rooms TO service_role;

-- ============================================================
-- 6. Add venue_id alias to bookings
-- ============================================================

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS venue_id UUID;

UPDATE bookings SET venue_id = hotel_id WHERE venue_id IS NULL AND hotel_id IS NOT NULL;

CREATE OR REPLACE FUNCTION sync_booking_venue_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.hotel_id IS DISTINCT FROM OLD.hotel_id THEN
    NEW.venue_id := NEW.hotel_id;
  END IF;
  IF NEW.venue_id IS DISTINCT FROM OLD.venue_id THEN
    NEW.hotel_id := NEW.venue_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_booking_venue_id ON bookings;
CREATE TRIGGER trg_sync_booking_venue_id
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION sync_booking_venue_id();

-- ============================================================
-- 7. Add venue_id alias to analytics_events
-- ============================================================

ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS venue_id UUID;

UPDATE analytics_events SET venue_id = hotel_id WHERE venue_id IS NULL AND hotel_id IS NOT NULL;

CREATE OR REPLACE FUNCTION sync_analytics_venue_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.hotel_id IS DISTINCT FROM OLD.hotel_id THEN
    NEW.venue_id := NEW.hotel_id;
  END IF;
  IF NEW.venue_id IS DISTINCT FROM OLD.venue_id THEN
    NEW.hotel_id := NEW.venue_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_analytics_venue_id ON analytics_events;
CREATE TRIGGER trg_sync_analytics_venue_id
  BEFORE INSERT OR UPDATE ON analytics_events
  FOR EACH ROW EXECUTE FUNCTION sync_analytics_venue_id();

-- ============================================================
-- 8. Add venue_id alias to activities
-- ============================================================

ALTER TABLE activities ADD COLUMN IF NOT EXISTS venue_id UUID;

UPDATE activities SET venue_id = hotel_id WHERE venue_id IS NULL AND hotel_id IS NOT NULL;

CREATE OR REPLACE FUNCTION sync_activities_venue_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.hotel_id IS DISTINCT FROM OLD.hotel_id THEN
    NEW.venue_id := NEW.hotel_id;
  END IF;
  IF NEW.venue_id IS DISTINCT FROM OLD.venue_id THEN
    NEW.hotel_id := NEW.venue_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_activities_venue_id ON activities;
CREATE TRIGGER trg_sync_activities_venue_id
  BEFORE INSERT OR UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION sync_activities_venue_id();

-- ============================================================
-- 9. Schema reload
-- ============================================================

NOTIFY pgrst, 'reload schema';

COMMIT;
