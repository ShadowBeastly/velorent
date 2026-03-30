-- ============================================================
-- Migration: 20260330_110_fix_stale_rpc_references.sql
--
-- What was broken and why:
--   Migration 20260327_109_phase6_cleanup.sql dropped the `bikes`
--   backward-compat view (DROP VIEW IF EXISTS bikes CASCADE) and
--   removed the `bike_id` column from `bookings`
--   (ALTER TABLE bookings DROP COLUMN IF EXISTS bike_id).
--
--   Three RPCs defined in earlier migrations still referenced
--   these dropped objects:
--
--   1. get_public_bikes (009_m13_widget.sql)
--      - FROM bikes                          → FROM items
--      - LEFT JOIN categories c ON c.id = b.category_id
--        → removed (items.category is a plain TEXT column, no
--          separate categories table; category_name is now
--          populated directly from items.category)
--
--   2. check_public_availability (009_m13_widget.sql)
--      - FROM bikes WHERE id = p_bike_id     → FROM items WHERE id = p_item_id
--      - JOIN bikes b ON b.id = bk.bike_id   → JOIN items i ON i.id = bk.item_id
--      - bk.bike_id                          → bk.item_id
--      - Parameter p_bike_id renamed to p_item_id for clarity;
--        old callers that hard-code the parameter name must use
--        positional args or be updated separately.
--
--   3. get_booking_by_token (20260327_api_fixes.sql)
--      - FROM bikes WHERE id = v_booking.bike_id
--        → FROM items WHERE id = v_booking.item_id
--      - Output key 'bike_name' kept for backward-compat
--        (client code in BookingWidget and cancellation pages
--        still reads result.bike_name).
--
-- Safe to re-run: all functions use CREATE OR REPLACE.
-- Does NOT drop anything.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. get_public_bikes — replace bikes view ref with items table
--
-- Schema note: items.category is TEXT (no FK to a categories
-- table). The returned column is still called category_name
-- for API backward-compat; its value is now items.category.
-- ============================================================

CREATE OR REPLACE FUNCTION get_public_bikes(p_tenant UUID)
RETURNS TABLE (
  id              UUID,
  name            TEXT,
  description     TEXT,
  category_name   TEXT,
  price_per_day   NUMERIC,
  price_per_hour  NUMERIC,
  image_url       TEXT,
  deposit_amount  NUMERIC,
  status          TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id,
    i.name,
    i.description,
    i.category          AS category_name,
    i.price_per_day,
    i.price_per_hour,
    i.image_url,
    i.deposit           AS deposit_amount,
    i.status
  FROM items i
  WHERE i.organization_id = p_tenant
    AND i.status = 'available'
  ORDER BY i.category, i.name;
$$;

GRANT EXECUTE ON FUNCTION get_public_bikes(UUID) TO anon, authenticated;

-- ============================================================
-- 2. check_public_availability — replace bikes/bike_id refs
--
-- Parameter renamed: p_bike_id → p_item_id
-- All internal references updated to items table and item_id
-- column in bookings.
-- ============================================================

CREATE OR REPLACE FUNCTION check_public_availability(
  p_tenant  UUID,
  p_item_id UUID,
  p_start   DATE,
  p_end     DATE
)
RETURNS TABLE (
  available       BOOLEAN,
  conflict_count  INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify item belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM items WHERE id = p_item_id AND organization_id = p_tenant
  ) THEN
    RAISE EXCEPTION 'Item not found for tenant';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*) = 0          AS available,
    COUNT(*)::INT         AS conflict_count
  FROM bookings bk
  JOIN items i ON i.id = bk.item_id
  WHERE i.organization_id = p_tenant
    AND bk.item_id = p_item_id
    AND bk.status NOT IN ('cancelled', 'completed')
    AND NOT (
      bk.end_date < p_start
      OR bk.start_date > p_end
    );
END;
$$;

GRANT EXECUTE ON FUNCTION check_public_availability(UUID, UUID, DATE, DATE) TO anon, authenticated;

-- ============================================================
-- 3. get_booking_by_token — replace bikes/bike_id with items/item_id
--
-- Output key 'bike_name' is intentionally kept unchanged:
-- client code (BookingWidget, cancellation confirmation pages)
-- reads result.bike_name. The value is now fetched from items.
-- ============================================================

CREATE OR REPLACE FUNCTION get_booking_by_token(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_booking          RECORD;
  v_item_name        TEXT;
  v_provider_name    TEXT;
  v_provider_address TEXT;
  v_hotel_name       TEXT;
BEGIN
  SELECT b.*
  INTO v_booking
  FROM bookings b
  WHERE b.cancellation_token = p_token;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT name INTO v_item_name FROM items WHERE id = v_booking.item_id;

  SELECT o.name, o.provider_address
  INTO v_provider_name, v_provider_address
  FROM organizations o
  WHERE o.id = v_booking.organization_id;

  IF v_booking.hotel_id IS NOT NULL THEN
    SELECT name INTO v_hotel_name FROM venues WHERE id = v_booking.hotel_id;
  END IF;

  RETURN jsonb_build_object(
    'booking_id',          v_booking.id,
    'booking_number',      v_booking.booking_number,
    'start_date',          v_booking.start_date,
    'end_date',            v_booking.end_date,
    'total_days',          v_booking.total_days,
    'total_price',         v_booking.total_price,
    'deposit_amount',      v_booking.deposit_amount,
    'status',              v_booking.status,
    'cancellation_status', v_booking.cancellation_status,
    'guest_name',          v_booking.guest_name,
    'bike_name',           v_item_name,   -- key kept for client backward-compat
    'provider_name',       v_provider_name,
    'provider_address',    v_provider_address,
    'hotel_name',          v_hotel_name,
    'created_at',          v_booking.created_at,
    -- BUG-003 fix preserved: exact 24h window (not day-level diff)
    'can_cancel_free',     (v_booking.start_date::TIMESTAMP - NOW()) > INTERVAL '24 hours'
                           AND v_booking.status NOT IN ('cancelled')
                           AND v_booking.cancellation_status = 'none'
  );
END;
$$;

-- ============================================================
-- Schema reload
-- ============================================================

NOTIFY pgrst, 'reload schema';

COMMIT;
