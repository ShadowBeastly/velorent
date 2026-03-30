-- ============================================================
-- Migration: 20260330_112_fix_widget_rpc_items.sql
--
-- The API-key-based widget functions still reference the
-- dropped `bikes` view and `bike_id` column on bookings.
-- This migration replaces them with the correct `items` table
-- and `item_id` column references.
--
-- Affected functions:
--   - get_public_bikes(p_api_key TEXT)     → FROM bikes → FROM items
--   - check_availability(p_api_key, ...)  → bike_id → item_id
--   - get_blocked_dates(p_api_key, ...)   → bike_id → item_id
--
-- Return types preserved (JSONB) to avoid Supabase schema reload.
-- Safe to re-run.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. get_public_bikes(p_api_key TEXT)
-- ============================================================

CREATE OR REPLACE FUNCTION get_public_bikes(p_api_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_result JSONB;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM public_booking_settings
  WHERE public_api_key = p_api_key AND is_enabled = true;

  IF v_org_id IS NULL THEN
    RETURN '[]'::JSONB;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',            i.id,
    'name',          i.name,
    'category',      i.category,
    'size',          i.size,
    'color',         i.color,
    'description',   i.description,
    'image_url',     i.image_url,
    'price_per_day', i.price_per_day,
    'deposit',       i.deposit
  ) ORDER BY i.name), '[]'::JSONB)
  INTO v_result
  FROM items i
  WHERE i.organization_id = v_org_id
    AND i.status = 'available';

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_bikes(TEXT) TO anon, authenticated;

-- ============================================================
-- 2. check_availability(p_api_key TEXT, p_bike_id UUID, ...)
--    Parameter name kept as p_bike_id for widget backward-compat.
-- ============================================================

CREATE OR REPLACE FUNCTION check_availability(
  p_api_key    TEXT,
  p_bike_id    UUID,
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id        UUID;
  v_price_per_day DECIMAL(10,2);
  v_deposit       DECIMAL(10,2);
  v_conflict      INTEGER;
  v_mb_conflict   INTEGER;
  v_days          INTEGER;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM public_booking_settings
  WHERE public_api_key = p_api_key AND is_enabled = true;

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('available', false, 'error', 'Ungültiger API-Key');
  END IF;

  SELECT i.price_per_day, COALESCE(i.deposit, 0)
  INTO v_price_per_day, v_deposit
  FROM items i
  WHERE i.id = p_bike_id
    AND i.organization_id = v_org_id
    AND i.status = 'available';

  IF v_price_per_day IS NULL THEN
    RETURN jsonb_build_object('available', false, 'error', 'Angebot nicht gefunden');
  END IF;

  -- Check booking conflicts
  SELECT COUNT(*) INTO v_conflict
  FROM bookings
  WHERE item_id = p_bike_id
    AND organization_id = v_org_id
    AND status NOT IN ('cancelled', 'returned', 'completed')
    AND start_date <= p_end_date
    AND end_date   >= p_start_date;

  -- Check maintenance block conflicts (if table exists)
  BEGIN
    SELECT COUNT(*) INTO v_mb_conflict
    FROM maintenance_blocks
    WHERE item_id = p_bike_id
      AND organization_id = v_org_id
      AND status != 'completed'
      AND start_date <= p_end_date
      AND COALESCE(end_date, p_end_date) >= p_start_date;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_mb_conflict := 0;
  END;

  IF v_conflict > 0 OR v_mb_conflict > 0 THEN
    RETURN jsonb_build_object(
      'available', false,
      'error',     'In diesem Zeitraum nicht verfügbar'
    );
  END IF;

  -- Inclusive day count (matches daysDiff convention: +1 built in)
  v_days := (p_end_date - p_start_date) + 1;

  RETURN jsonb_build_object(
    'available',   true,
    'total_days',  v_days,
    'total_price', v_days * v_price_per_day,
    'deposit',     v_deposit
  );
END;
$$;

GRANT EXECUTE ON FUNCTION check_availability(TEXT, UUID, DATE, DATE) TO anon, authenticated;

-- ============================================================
-- 3. get_blocked_dates(p_api_key TEXT, p_bike_id UUID)
-- ============================================================

CREATE OR REPLACE FUNCTION get_blocked_dates(
  p_api_key TEXT,
  p_bike_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_dates  TEXT[];
  v_start  DATE;
  v_end    DATE;
  v_day    DATE;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM public_booking_settings
  WHERE public_api_key = p_api_key AND is_enabled = true;

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('blocked_dates', '[]'::JSONB);
  END IF;

  v_dates := ARRAY[]::TEXT[];

  FOR v_start, v_end IN
    SELECT b.start_date, b.end_date
    FROM bookings b
    WHERE b.item_id = p_bike_id
      AND b.organization_id = v_org_id
      AND b.status NOT IN ('cancelled', 'returned', 'completed')
      AND b.end_date >= CURRENT_DATE
  LOOP
    v_day := v_start;
    WHILE v_day <= v_end LOOP
      v_dates := v_dates || to_char(v_day, 'YYYY-MM-DD');
      v_day := v_day + INTERVAL '1 day';
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('blocked_dates', to_jsonb(v_dates));
END;
$$;

GRANT EXECUTE ON FUNCTION get_blocked_dates(TEXT, UUID) TO anon, authenticated;

COMMIT;
