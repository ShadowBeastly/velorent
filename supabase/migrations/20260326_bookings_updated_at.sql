-- ============================================================
-- 20260326_bookings_updated_at.sql
--
-- Adds updated_at column to bookings table.
-- Required by the existing BEFORE UPDATE trigger that sets
-- NEW.updated_at = NOW(). Without this column the trigger
-- raises "record new has no field updated_at", causing all
-- booking UPDATE operations (e.g. webhook confirming a guest
-- booking) to fail with a 500.
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
