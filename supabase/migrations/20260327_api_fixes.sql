-- ============================================================
-- 20260327_api_fixes.sql
--
-- Fixes 2 database-side API bugs identified in the 2026-03-26 audit.
--
--   Bug #3  -- get_booking_by_token returns can_cancel_free using a
--              day-level diff (start_date - CURRENT_DATE > 1) instead
--              of a 24-hour window; guests who cancel on the same
--              calendar day as start_date but more than 24h ahead get
--              incorrectly charged 50%.
--
--   Bug #27 -- create_guest_booking recomputes total_price from the
--              bike's list rate, ignoring any coupon discount applied
--              during Stripe Checkout. The DB ends up storing the full
--              undiscounted amount while Stripe charged the guest less.
--              Fix: accept an optional p_total_price override and use
--              it when provided (webhook passes Stripe metadata price).
--
-- Safe to re-run: both functions use CREATE OR REPLACE.
-- ============================================================

BEGIN;

-- ============================================================
-- Bug #3: Fix can_cancel_free in get_booking_by_token
--
-- Old: (v_booking.start_date - CURRENT_DATE) > 1
--   Compares DATE - DATE (integer days). Returns true only when
--   start_date is 2+ days away, failing for same-calendar-day
--   cancellations that are actually >24h in the future.
--
-- New: (v_booking.start_date::TIMESTAMP - NOW()) > INTERVAL '24 hours'
--   Computes the exact timestamp difference and compares it to 24h,
--   matching the logic in cancel_booking_by_token and stripe-cancel.
-- ============================================================

CREATE OR REPLACE FUNCTION get_booking_by_token(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_booking       RECORD;
  v_bike_name     TEXT;
  v_provider_name TEXT;
  v_provider_address TEXT;
  v_hotel_name    TEXT;
BEGIN
  SELECT b.*
  INTO v_booking
  FROM bookings b
  WHERE b.cancellation_token = p_token;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT name INTO v_bike_name FROM bikes WHERE id = v_booking.bike_id;

  SELECT o.name, o.provider_address
  INTO v_provider_name, v_provider_address
  FROM organizations o
  WHERE o.id = v_booking.organization_id;

  IF v_booking.hotel_id IS NOT NULL THEN
    SELECT name INTO v_hotel_name FROM hotels WHERE id = v_booking.hotel_id;
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
    'bike_name',           v_bike_name,
    'provider_name',       v_provider_name,
    'provider_address',    v_provider_address,
    'hotel_name',          v_hotel_name,
    'created_at',          v_booking.created_at,
    -- BUG-003: use exact 24h window, not day-level integer diff
    'can_cancel_free',     (v_booking.start_date::TIMESTAMP - NOW()) > INTERVAL '24 hours'
                           AND v_booking.status NOT IN ('cancelled')
                           AND v_booking.cancellation_status = 'none'
  );
END;
$$;

-- ============================================================
-- Bug #27: Add p_total_price override to create_guest_booking
--
-- The Stripe webhook has already verified the exact amount charged
-- (including any coupon discount) and passes it as meta.total_price.
-- By accepting p_total_price as an optional 14th parameter and using
-- COALESCE(p_total_price, computed_price), the DB stores the
-- Stripe-verified amount rather than recomputing from list rates.
--
-- Commission is still computed on the actual charged price so the
-- platform_commission figure is also correct post-discount.
--
-- Callers that do not pass p_total_price (e.g. RentCore internal
-- bookings) are unaffected because it defaults to NULL.
-- ============================================================

CREATE OR REPLACE FUNCTION create_guest_booking(
  p_organization_id UUID,
  p_bike_id         UUID,
  p_hotel_id        UUID,
  p_start_date      DATE,
  p_end_date        DATE,
  p_guest_name      TEXT,
  p_guest_email     TEXT,
  p_guest_phone     TEXT         DEFAULT NULL,
  p_language        TEXT         DEFAULT 'de',
  p_rental_type     TEXT         DEFAULT 'daily',
  p_total_hours     INTEGER      DEFAULT NULL,
  p_start_time      TEXT         DEFAULT NULL,
  p_end_time        TEXT         DEFAULT NULL,
  p_total_price     DECIMAL(10,2) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_bike             RECORD;
  v_total_days       INTEGER;
  v_computed_price   DECIMAL(10,2);
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
    v_computed_price := p_total_hours * v_bike.price_per_hour;
  ELSE
    -- Inclusive day count: matches daysDiff() codebase convention
    v_total_days     := (p_end_date - p_start_date) + 1;
    v_price_per_unit := v_bike.price_per_day;
    v_computed_price := v_total_days * v_bike.price_per_day;
  END IF;

  -- BUG-027: use Stripe-verified price when provided (post-discount),
  -- otherwise fall back to the computed list-rate price.
  v_total_price := COALESCE(p_total_price, v_computed_price);

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

-- Revoke anon access on the new 14-param signature
REVOKE EXECUTE ON FUNCTION create_guest_booking(
  UUID, UUID, UUID, DATE, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, DECIMAL
) FROM anon;

COMMIT;
