-- ============================================================
-- lociva-platform.sql
-- Lociva Platform — Delta Migration
-- Run AFTER: supabase-schema.sql, supabase-public-booking.sql, platform-marketplace.sql
-- ============================================================

-- ============================================================
-- EXTEND: hotels — add region_id FK (was missing in platform-marketplace.sql)
-- ============================================================

ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_hotels_region_id ON hotels(region_id);

-- ============================================================
-- EXTEND: organizations — add missing Lociva-specific columns
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS agb_accepted_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_verified        BOOLEAN DEFAULT false;

-- ============================================================
-- UPDATE: create_guest_booking — category-based commission rates
-- Replaces the hardcoded 5% from platform-marketplace.sql
-- ============================================================

CREATE OR REPLACE FUNCTION create_guest_booking(
  p_organization_id UUID,
  p_bike_id         UUID,
  p_hotel_id        UUID,
  p_start_date      DATE,
  p_end_date        DATE,
  p_guest_name      TEXT,
  p_guest_email     TEXT,
  p_guest_phone     TEXT DEFAULT NULL,
  p_language        TEXT DEFAULT 'de'
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
  v_conflict_count   INTEGER;
BEGIN
  -- Validation
  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION 'Start date must be before end date';
  END IF;
  IF p_start_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Start date cannot be in the past';
  END IF;

  -- Fetch bike
  SELECT id, name, price_per_day, deposit, status, category, organization_id
  INTO v_bike
  FROM bikes
  WHERE id = p_bike_id
    AND organization_id = p_organization_id
    AND status = 'available';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bike not available';
  END IF;

  -- Conflict check
  SELECT COUNT(*) INTO v_conflict_count
  FROM bookings
  WHERE bike_id = p_bike_id
    AND status NOT IN ('cancelled')
    AND daterange(start_date, end_date, '[]') && daterange(p_start_date, p_end_date, '[]');

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Bike not available for selected dates';
  END IF;

  -- Inclusive day count (matches codebase convention)
  v_total_days  := (p_end_date - p_start_date) + 1;
  v_total_price := v_total_days * v_bike.price_per_day;

  -- Category-based commission (per CLAUDE.md / Lociva pricing)
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

  -- Hotel commission (0 for MVP)
  v_hotel_comm := 0;
  IF p_hotel_id IS NOT NULL THEN
    SELECT commission_pct INTO v_hotel_comm_pct FROM hotels WHERE id = p_hotel_id;
    IF FOUND AND v_hotel_comm_pct > 0 THEN
      v_hotel_comm := ROUND(v_total_price * v_hotel_comm_pct / 100, 2);
    END IF;
  END IF;

  -- Insert booking
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
    v_bike.price_per_day, v_total_days, v_total_price, v_total_price, v_bike.deposit,
    'reserved', 'website', p_hotel_id, 'hotel_qr',
    v_platform_comm, v_hotel_comm,
    p_guest_email, p_guest_phone, p_guest_name, p_language,
    'none',
    p_guest_name, p_guest_email, p_guest_phone
  )
  RETURNING id, booking_number INTO v_booking_id, v_booking_number;

  RETURN jsonb_build_object(
    'booking_id',          v_booking_id,
    'booking_number',      v_booking_number,
    'total_price',         v_total_price,
    'total_days',          v_total_days,
    'commission_rate',     v_commission_rate,
    'platform_commission', v_platform_comm,
    'hotel_commission',    v_hotel_comm,
    'deposit_amount',      v_bike.deposit
  );
END;
$$;

-- ============================================================
-- NEW: get_hotel_analytics — hotel dashboard KPIs
-- ============================================================

CREATE OR REPLACE FUNCTION get_hotel_analytics(
  p_hotel_id UUID,
  p_since    TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_scans               INTEGER;
  v_completed_sessions  INTEGER;
  v_bookings_count      INTEGER;
  v_total_volume        DECIMAL(10,2);
  v_total_commission    DECIMAL(10,2);
  v_cancellation_count  INTEGER;
  v_conversion_rate     DECIMAL(5,1);
BEGIN
  -- QR scan sessions (distinct session_id)
  SELECT COUNT(DISTINCT session_id) INTO v_scans
  FROM analytics_events
  WHERE hotel_id = p_hotel_id
    AND event_type = 'qr_scan'
    AND (p_since IS NULL OR created_at >= p_since);

  -- Booking complete sessions (distinct session_id)
  SELECT COUNT(DISTINCT session_id) INTO v_completed_sessions
  FROM analytics_events
  WHERE hotel_id = p_hotel_id
    AND event_type = 'booking_complete'
    AND (p_since IS NULL OR created_at >= p_since);

  -- Conversion rate
  v_conversion_rate := CASE
    WHEN v_scans > 0 THEN ROUND((v_completed_sessions::DECIMAL / v_scans * 100), 1)
    ELSE 0
  END;

  -- Booking volume + commission
  SELECT
    COUNT(*),
    COALESCE(SUM(total_price), 0),
    COALESCE(SUM(platform_commission), 0)
  INTO v_bookings_count, v_total_volume, v_total_commission
  FROM bookings
  WHERE hotel_id = p_hotel_id
    AND booking_source = 'hotel_qr'
    AND status NOT IN ('cancelled')
    AND (p_since IS NULL OR created_at >= p_since);

  -- Cancellation count
  SELECT COUNT(*) INTO v_cancellation_count
  FROM bookings
  WHERE hotel_id = p_hotel_id
    AND booking_source = 'hotel_qr'
    AND cancellation_status != 'none'
    AND (p_since IS NULL OR created_at >= p_since);

  RETURN jsonb_build_object(
    'qr_scans',               v_scans,
    'booking_sessions',       v_completed_sessions,
    'conversion_rate',        v_conversion_rate,
    'bookings_count',         v_bookings_count,
    'cancellation_count',     v_cancellation_count,
    'total_volume',           v_total_volume,
    'total_commission',       v_total_commission
  );
END;
$$;

-- ============================================================
-- GRANTS
-- ============================================================

GRANT EXECUTE ON FUNCTION create_guest_booking(UUID, UUID, UUID, DATE, DATE, TEXT, TEXT, TEXT, TEXT)
  TO anon, authenticated;

GRANT EXECUTE ON FUNCTION get_hotel_analytics(UUID, TIMESTAMPTZ)
  TO authenticated;

-- ============================================================
-- DONE
-- Verify with:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'hotels' AND column_name = 'region_id';
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'organizations'
--   AND column_name IN ('agb_accepted_at', 'stripe_verified');
--
--   SELECT proname FROM pg_proc WHERE proname = 'get_hotel_analytics';
-- ============================================================
