-- ============================================================
-- 20260326_critical_db_fixes.sql
--
-- Fixes 7 critical database bugs identified in the 2026-03-26 audit.
--
--   Bug #1  -- create_guest_booking lost hourly params in migration 002
--   Bug #15 -- create_public_booking references nonexistent 'name' column
--   Bug #16 -- Missing UNIQUE(organization_id, email) on customers
--   Bug #25 -- Coupon columns named type/value; edge function expects
--              discount_type/discount_value
--   Bug #28 -- REVOKE in migration 003 used wrong param types; anon
--              REVOKE never took effect for the 13-param signature
--   Bug #40 -- get_hotel_dashboard RPC returns nested stats sub-object;
--              LocivaDashboardPage reads flat keys at top level
--   Bug #44 -- hotel_rooms has no has_qr_code column; fallback query
--              always returns 0 rooms with QR codes
--
-- Safe to re-run: all DDL uses IF NOT EXISTS / OR REPLACE / IF EXISTS.
-- Prerequisite: if the customers table contains duplicate
-- (organization_id, email) pairs, deduplicate them before running
-- (the Bug #16 constraint will fail otherwise).
-- ============================================================

BEGIN;

-- ============================================================
-- Bug #1: Restore create_guest_booking with full hourly params
--
-- Migration 001 defined a 13-param version with p_rental_type,
-- p_total_hours, p_start_time, p_end_time and returns the booking
-- without a cancellation_token.
--
-- Migration 002 then issued a CREATE OR REPLACE with only 9 params,
-- creating a SEPARATE overload (different signature = different
-- function in Postgres). That 9-param overload lacks hourly support
-- and does return a cancellation_token. Any caller passing all 13
-- params resolves to the 001 version, which lacks cancellation_token.
--
-- This migration replaces the 13-param version to:
--   1. Keep full hourly pricing logic (from 001)
--   2. Also return cancellation_token (from 002)
-- ============================================================

CREATE OR REPLACE FUNCTION create_guest_booking(
  p_organization_id UUID,
  p_bike_id         UUID,
  p_hotel_id        UUID,
  p_start_date      DATE,
  p_end_date        DATE,
  p_guest_name      TEXT,
  p_guest_email     TEXT,
  p_guest_phone     TEXT    DEFAULT NULL,
  p_language        TEXT    DEFAULT 'de',
  p_rental_type     TEXT    DEFAULT 'daily',
  p_total_hours     INTEGER DEFAULT NULL,
  p_start_time      TEXT    DEFAULT NULL,
  p_end_time        TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_bike             RECORD;
  v_total_days       INTEGER;
  v_total_price      DECIMAL(10,2);
  v_commission_rate  DECIMAL(5,4);
  v_platform_comm    DECIMAL(10,2);
  v_hotel_comm       DECIMAL(10,2);
  v_hotel_comm_pct   DECIMAL(5,2);
  v_booking_id       UUID;
  v_booking_number   TEXT;
  v_cancel_token     UUID;
  v_conflict_count   INTEGER;
  v_price_per_unit   DECIMAL(10,2);
BEGIN
  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION 'Start date must be before end date';
  END IF;
  IF p_start_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Start date cannot be in the past';
  END IF;

  SELECT id, name, price_per_day, price_per_hour, deposit, status, category, organization_id
  INTO v_bike
  FROM bikes
  WHERE id = p_bike_id
    AND organization_id = p_organization_id
    AND status = 'available';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bike not available';
  END IF;

  SELECT COUNT(*) INTO v_conflict_count
  FROM bookings
  WHERE bike_id = p_bike_id
    AND status NOT IN ('cancelled')
    AND daterange(start_date, end_date, '[]') && daterange(p_start_date, p_end_date, '[]');

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Bike not available for selected dates';
  END IF;

  IF p_rental_type = 'hourly' THEN
    IF v_bike.price_per_hour IS NULL OR v_bike.price_per_hour <= 0 THEN
      RAISE EXCEPTION 'Bike does not support hourly rentals';
    END IF;
    IF p_total_hours IS NULL OR p_total_hours < 1 THEN
      RAISE EXCEPTION 'Minimum 1 hour required';
    END IF;
    -- Store hours in total_days column for hourly bookings
    v_total_days     := p_total_hours;
    v_price_per_unit := v_bike.price_per_hour;
    v_total_price    := p_total_hours * v_bike.price_per_hour;
  ELSE
    -- Inclusive day count: matches daysDiff() codebase convention
    v_total_days     := (p_end_date - p_start_date) + 1;
    v_price_per_unit := v_bike.price_per_day;
    v_total_price    := v_total_days * v_bike.price_per_day;
  END IF;

  v_commission_rate := CASE v_bike.category
    WHEN 'E-Bike'          THEN 0.05
    WHEN 'Mountainbike'    THEN 0.05
    WHEN 'City-Bike'       THEN 0.05
    WHEN 'Trekking'        THEN 0.05
    WHEN 'Canoe'           THEN 0.10
    WHEN 'SUP'             THEN 0.10
    WHEN 'Go-Kart'         THEN 0.10
    WHEN 'Climbing'        THEN 0.10
    WHEN 'Escape Room'     THEN 0.10
    WHEN 'Guided Tour'     THEN 0.12
    WHEN 'Wine Tasting'    THEN 0.12
    WHEN 'Wellness'        THEN 0.12
    WHEN 'Spa'             THEN 0.12
    WHEN 'Hot Air Balloon' THEN 0.15
    WHEN 'Sailing'         THEN 0.15
    ELSE 0.05
  END;

  v_platform_comm := ROUND(v_total_price * v_commission_rate, 2);

  v_hotel_comm := 0;
  IF p_hotel_id IS NOT NULL THEN
    SELECT commission_pct INTO v_hotel_comm_pct FROM hotels WHERE id = p_hotel_id;
    IF FOUND AND v_hotel_comm_pct > 0 THEN
      v_hotel_comm := ROUND(v_total_price * v_hotel_comm_pct / 100, 2);
    END IF;
  END IF;

  INSERT INTO bookings (
    organization_id, bike_id, start_date, end_date,
    price_per_day, total_days, subtotal, total_price, deposit_amount,
    status, source, hotel_id, booking_source,
    platform_commission, hotel_commission,
    guest_email, guest_phone, guest_name, guest_language,
    cancellation_status,
    customer_name, customer_email, customer_phone
  ) VALUES (
    p_organization_id, p_bike_id, p_start_date, p_end_date,
    v_price_per_unit, v_total_days, v_total_price, v_total_price, v_bike.deposit,
    'reserved', 'website', p_hotel_id, 'hotel_qr',
    v_platform_comm, v_hotel_comm,
    p_guest_email, p_guest_phone, p_guest_name, p_language,
    'none',
    p_guest_name, p_guest_email, p_guest_phone
  )
  RETURNING id, booking_number, cancellation_token
  INTO v_booking_id, v_booking_number, v_cancel_token;

  RETURN jsonb_build_object(
    'booking_id',          v_booking_id,
    'booking_number',      v_booking_number,
    'total_price',         v_total_price,
    'total_days',          v_total_days,
    'commission_rate',     v_commission_rate,
    'platform_commission', v_platform_comm,
    'hotel_commission',    v_hotel_comm,
    'deposit_amount',      v_bike.deposit,
    'cancellation_token',  v_cancel_token
  );
END;
$$;

-- ============================================================
-- Bug #28: Fix REVOKE on the 13-param create_guest_booking
--
-- Migration 003 attempted to revoke anon access on the 13-param
-- version using wrong types (TEXT/DECIMAL instead of INTEGER/TEXT
-- for positions 11 and 13). That REVOKE silently did nothing.
--
-- Now that the 13-param function is correctly defined above,
-- we issue the REVOKE with the exact matching signature.
-- (The function is SECURITY DEFINER and is called only via the
-- service-role key from the Next.js API route, so anon access
-- is not needed and must not be granted.)
-- ============================================================

REVOKE EXECUTE ON FUNCTION create_guest_booking(
  UUID, UUID, UUID, DATE, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT
) FROM anon;

-- ============================================================
-- Bug #16: Add missing UNIQUE(organization_id, email) on customers
--
-- create_public_booking uses ON CONFLICT(organization_id, email)
-- which requires a unique constraint on those two columns.
-- Without it every widget upsert throws:
--   "there is no unique or exclusion constraint matching the
--    ON CONFLICT specification"
--
-- If duplicate pairs exist they must be deduplicated first.
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'customers'
          AND constraint_name = 'customers_org_email_unique'
    ) THEN
        ALTER TABLE customers
          ADD CONSTRAINT customers_org_email_unique
          UNIQUE (organization_id, email);
    END IF;
END;
$$;

-- ============================================================
-- Bug #15: Fix create_public_booking to use first_name/last_name
--
-- The customers table has first_name TEXT and last_name TEXT,
-- not a single name column. The previous version threw
--   'column "name" does not exist'
-- on every call, making widget bookings completely broken.
--
-- The function signature is unchanged (p_customer_name TEXT)
-- to avoid breaking existing callers. The name is split on the
-- first space: "John Doe" → first="John", last="Doe";
-- "Madonna"  → first="Madonna", last="".
-- ============================================================

CREATE OR REPLACE FUNCTION create_public_booking(
    p_organization_id   UUID,
    p_bike_id           UUID,
    p_start_date        DATE,
    p_end_date          DATE,
    p_customer_name     TEXT,
    p_customer_email    TEXT,
    p_customer_phone    TEXT          DEFAULT NULL,
    p_notes             TEXT          DEFAULT NULL,
    p_total_price       DECIMAL(10,2) DEFAULT 0,
    p_total_days        INTEGER       DEFAULT 1
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_id        UUID;
    v_booking_number    TEXT;
    v_customer_id       UUID;
    v_recent_count      INTEGER;
    v_first_name        TEXT;
    v_last_name         TEXT;
    v_space_pos         INTEGER;
BEGIN
    -- Rate limiting: max 5 bookings per email per org per hour
    SELECT COUNT(*) INTO v_recent_count
    FROM bookings
    WHERE customer_email = p_customer_email
      AND organization_id = p_organization_id
      AND created_at > NOW() - INTERVAL '1 hour';

    IF v_recent_count >= 5 THEN
        RAISE EXCEPTION 'Zu viele Buchungen. Bitte versuchen Sie es später erneut.';
    END IF;

    -- Split full name on first space
    v_space_pos  := POSITION(' ' IN TRIM(p_customer_name));
    IF v_space_pos > 0 THEN
        v_first_name := SUBSTRING(TRIM(p_customer_name) FROM 1 FOR v_space_pos - 1);
        v_last_name  := TRIM(SUBSTRING(TRIM(p_customer_name) FROM v_space_pos + 1));
    ELSE
        v_first_name := TRIM(p_customer_name);
        v_last_name  := '';
    END IF;

    -- Upsert customer using the unique constraint added by Bug #16 fix
    INSERT INTO customers (organization_id, first_name, last_name, email, phone)
    VALUES (p_organization_id, v_first_name, v_last_name, p_customer_email, p_customer_phone)
    ON CONFLICT (organization_id, email) DO UPDATE
        SET first_name = EXCLUDED.first_name,
            last_name  = EXCLUDED.last_name,
            phone      = COALESCE(EXCLUDED.phone, customers.phone)
    RETURNING id INTO v_customer_id;

    -- Generate booking number
    v_booking_number := 'BK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                        LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');

    -- Insert booking
    INSERT INTO bookings (
        organization_id, bike_id, customer_id,
        customer_name, customer_email, customer_phone,
        start_date, end_date,
        total_days, total_price,
        status, notes, booking_number
    ) VALUES (
        p_organization_id, p_bike_id, v_customer_id,
        p_customer_name, p_customer_email, p_customer_phone,
        p_start_date, p_end_date,
        p_total_days, p_total_price,
        'pending', p_notes, v_booking_number
    )
    RETURNING id INTO v_booking_id;

    RETURN json_build_object(
        'booking_id',     v_booking_id,
        'booking_number', v_booking_number
    );
END;
$$;

-- Re-grant to anon (same signature, function replaced in-place)
GRANT EXECUTE ON FUNCTION create_public_booking(
    UUID, UUID, DATE, DATE, TEXT, TEXT, TEXT, TEXT, DECIMAL(10,2), INTEGER
) TO anon;

-- ============================================================
-- Bug #25: Rename coupons.type → discount_type and
--          coupons.value → discount_value
--
-- stripe-checkout/index.ts selects:
--   "id, discount_type, discount_value"
-- The table was created in migration 005 with columns named
-- "type" and "value". The query returned NULL for both fields,
-- silently ignoring all coupons and charging full price.
--
-- Renaming to match the edge function is the correct fix;
-- no app code reads these columns directly (all reads go
-- through the edge function).
-- ============================================================

DO $$
BEGIN
    -- Only rename if the old column names still exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'coupons' AND column_name = 'type'
    ) THEN
        ALTER TABLE coupons RENAME COLUMN type TO discount_type;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'coupons' AND column_name = 'value'
    ) THEN
        ALTER TABLE coupons RENAME COLUMN value TO discount_value;
    END IF;
END;
$$;

-- ============================================================
-- Bug #44: Add has_qr_code generated column to hotel_rooms
--
-- The fallback query in LocivaDashboardPage.jsx filters:
--   (roomRes.data || []).filter(r => r.has_qr_code)
-- hotel_rooms has no has_qr_code column, so every row returns
-- undefined → falsy, and rooms_with_qr is always 0.
--
-- hotel_rooms already has qr_code_url TEXT (set when a QR code
-- is generated for the room). A STORED generated column
-- derived from (qr_code_url IS NOT NULL) is the correct fix:
-- no application code changes required.
-- ============================================================

ALTER TABLE hotel_rooms
  ADD COLUMN IF NOT EXISTS has_qr_code BOOLEAN
  GENERATED ALWAYS AS (qr_code_url IS NOT NULL) STORED;

-- ============================================================
-- Bug #40: Flatten get_hotel_dashboard RPC response
--
-- LocivaDashboardPage.jsx (lines 155-161) constructs its state
-- object with these flat keys when the fallback path runs:
--   qr_scans_30d, bookings_30d, active_activities,
--   rooms_with_qr, recent_bookings
--
-- The RPC returned a nested structure:
--   { hotel, activity_count, room_count, stats: { qr_scans_30d, ... } }
--
-- So when the RPC succeeded, all four stat cards rendered
-- undefined / "—" because none of the expected keys existed
-- at the top level.
--
-- This replacement returns the flat keys the component expects
-- AND keeps the legacy nested fields for any other consumers.
-- rooms_with_qr now uses the has_qr_code column added above.
-- ============================================================

CREATE OR REPLACE FUNCTION get_hotel_dashboard(p_hotel_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_result JSON;
BEGIN
    IF NOT (
        is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM hotel_users
            WHERE user_id = auth.uid() AND hotel_id = p_hotel_id
        )
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT json_build_object(
        -- Flat keys read directly by LocivaDashboardPage
        'qr_scans_30d', (
            SELECT COUNT(*) FROM analytics_events
            WHERE hotel_id = p_hotel_id
              AND event_type = 'qr_scan'
              AND created_at > now() - INTERVAL '30 days'
        ),
        'bookings_30d', (
            SELECT COUNT(*) FROM bookings
            WHERE hotel_id = p_hotel_id
              AND created_at > now() - INTERVAL '30 days'
        ),
        'active_activities', (
            SELECT COUNT(*) FROM hotel_activities
            WHERE hotel_id = p_hotel_id AND is_active = true
        ),
        'rooms_with_qr', (
            SELECT COUNT(*) FROM hotel_rooms
            WHERE hotel_id = p_hotel_id AND has_qr_code = true
        ),
        'recent_bookings', (
            SELECT COALESCE(json_agg(row_to_json(b.*)), '[]'::json)
            FROM (
                SELECT id, booking_number, guest_name, guest_email,
                       start_date, end_date, total_price, status,
                       platform_commission, created_at
                FROM bookings
                WHERE hotel_id = p_hotel_id
                ORDER BY created_at DESC
                LIMIT 20
            ) b
        ),
        -- Legacy fields kept for backward compat
        'hotel', (
            SELECT row_to_json(h.*)
            FROM hotels h WHERE h.id = p_hotel_id
        ),
        'provider_count', (
            SELECT COUNT(*) FROM hotel_providers
            WHERE hotel_id = p_hotel_id AND is_active = true
        ),
        'stats', json_build_object(
            'total_bookings', (
                SELECT COUNT(*) FROM bookings
                WHERE hotel_id = p_hotel_id
            ),
            'total_revenue', (
                SELECT COALESCE(SUM(total_price), 0) FROM bookings
                WHERE hotel_id = p_hotel_id AND status NOT IN ('cancelled')
            ),
            'qr_scans_30d', (
                SELECT COUNT(*) FROM analytics_events
                WHERE hotel_id = p_hotel_id
                  AND event_type = 'qr_scan'
                  AND created_at > now() - INTERVAL '30 days'
            ),
            'bookings_30d', (
                SELECT COUNT(*) FROM bookings
                WHERE hotel_id = p_hotel_id
                  AND created_at > now() - INTERVAL '30 days'
            )
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_hotel_dashboard(UUID) TO authenticated;

COMMIT;
