-- Migration: Rename bikes → items (+ bike_categories/bike_health if they exist)
-- Rollback:
--   DROP VIEW IF EXISTS bikes CASCADE;
--   DROP VIEW IF EXISTS bike_categories CASCADE;
--   DROP VIEW IF EXISTS bike_health CASCADE;
--   ALTER TABLE items RENAME TO bikes;
--   ALTER TABLE IF EXISTS item_categories RENAME TO bike_categories;
--   ALTER TABLE IF EXISTS item_health RENAME TO bike_health;
-- Dependencies: 20260327_102_discriminators.sql

BEGIN;

-- ============================================================
-- 1. RENAME bikes → items
-- ============================================================

ALTER TABLE bikes RENAME TO items;

ALTER INDEX IF EXISTS idx_bikes_org RENAME TO idx_items_org;
ALTER INDEX IF EXISTS bikes_pkey RENAME TO items_pkey;

CREATE OR REPLACE VIEW bikes AS SELECT * FROM items;

GRANT SELECT, INSERT, UPDATE, DELETE ON bikes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON bikes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON bikes TO service_role;

-- ============================================================
-- 2. RENAME bike_categories → item_categories (IF EXISTS)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bike_categories') THEN
    ALTER TABLE bike_categories RENAME TO item_categories;
    EXECUTE 'ALTER INDEX IF EXISTS idx_bike_categories_org RENAME TO idx_item_categories_org';
    EXECUTE 'ALTER INDEX IF EXISTS bike_categories_pkey RENAME TO item_categories_pkey';
    EXECUTE 'CREATE OR REPLACE VIEW bike_categories AS SELECT * FROM item_categories';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON bike_categories TO authenticated';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON bike_categories TO anon';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON bike_categories TO service_role';
  END IF;
END $$;

-- ============================================================
-- 3. RENAME bike_health → item_health (IF EXISTS)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bike_health') THEN
    ALTER TABLE bike_health RENAME TO item_health;
    EXECUTE 'ALTER INDEX IF EXISTS idx_bike_health_bike RENAME TO idx_item_health_item';
    EXECUTE 'ALTER INDEX IF EXISTS bike_health_pkey RENAME TO item_health_pkey';
    EXECUTE 'CREATE OR REPLACE VIEW bike_health AS SELECT * FROM item_health';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON bike_health TO authenticated';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON bike_health TO anon';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON bike_health TO service_role';
  END IF;
END $$;

-- ============================================================
-- 4. Add item_id alias to maintenance_logs (IF EXISTS)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maintenance_logs') THEN
    ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS item_id UUID;
    UPDATE maintenance_logs SET item_id = bike_id WHERE item_id IS NULL AND bike_id IS NOT NULL;

    CREATE OR REPLACE FUNCTION sync_maintenance_log_item_id()
    RETURNS TRIGGER AS $t$
    BEGIN
      IF NEW.bike_id IS DISTINCT FROM OLD.bike_id THEN
        NEW.item_id := NEW.bike_id;
      END IF;
      RETURN NEW;
    END;
    $t$ LANGUAGE plpgsql;

    CREATE OR REPLACE FUNCTION sync_maintenance_log_bike_id()
    RETURNS TRIGGER AS $t$
    BEGIN
      IF NEW.item_id IS DISTINCT FROM OLD.item_id THEN
        NEW.bike_id := NEW.item_id;
      END IF;
      RETURN NEW;
    END;
    $t$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_sync_mlog_item_id ON maintenance_logs;
    CREATE TRIGGER trg_sync_mlog_item_id
      BEFORE INSERT OR UPDATE ON maintenance_logs
      FOR EACH ROW EXECUTE FUNCTION sync_maintenance_log_item_id();

    DROP TRIGGER IF EXISTS trg_sync_mlog_bike_id ON maintenance_logs;
    CREATE TRIGGER trg_sync_mlog_bike_id
      BEFORE INSERT OR UPDATE ON maintenance_logs
      FOR EACH ROW EXECUTE FUNCTION sync_maintenance_log_bike_id();
  END IF;
END $$;

-- ============================================================
-- 5. Fix missing column referenced by update_customer_stats trigger
--    (must happen before any UPDATE on bookings)
-- ============================================================

ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_booking_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- 6. Add item_id alias to bookings with sync triggers
-- ============================================================

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS item_id UUID;

UPDATE bookings SET item_id = bike_id WHERE item_id IS NULL AND bike_id IS NOT NULL;

CREATE OR REPLACE FUNCTION sync_booking_item_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.bike_id IS DISTINCT FROM OLD.bike_id THEN
    NEW.item_id := NEW.bike_id;
  END IF;
  IF NEW.item_id IS DISTINCT FROM OLD.item_id THEN
    NEW.bike_id := NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_booking_item_id ON bookings;
CREATE TRIGGER trg_sync_booking_item_id
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION sync_booking_item_id();

-- ============================================================
-- 7. Add item_id alias to analytics_events with sync trigger
-- ============================================================

ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS item_id UUID;

UPDATE analytics_events SET item_id = bike_id WHERE item_id IS NULL AND bike_id IS NOT NULL;

CREATE OR REPLACE FUNCTION sync_analytics_item_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.bike_id IS DISTINCT FROM OLD.bike_id THEN
    NEW.item_id := NEW.bike_id;
  END IF;
  IF NEW.item_id IS DISTINCT FROM OLD.item_id THEN
    NEW.bike_id := NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_analytics_item_id ON analytics_events;
CREATE TRIGGER trg_sync_analytics_item_id
  BEFORE INSERT OR UPDATE ON analytics_events
  FOR EACH ROW EXECUTE FUNCTION sync_analytics_item_id();

-- ============================================================
-- 8. Schema reload
-- ============================================================

NOTIFY pgrst, 'reload schema';

COMMIT;
