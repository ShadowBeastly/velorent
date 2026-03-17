-- ============================================================
-- 002_cancellation_token.sql
-- Adds cancellation_token to bookings for guest self-service cancellation
-- Guests receive a token link in their confirmation email
-- ============================================================

BEGIN;

-- Add cancellation_token column
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancellation_token UUID DEFAULT gen_random_uuid();

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_bookings_cancel_token
  ON bookings(cancellation_token) WHERE cancellation_token IS NOT NULL;

-- ============================================================
-- RPC: get_booking_by_token(token)
-- Public: allows guest to look up their booking via cancellation link
-- ============================================================

CREATE OR REPLACE FUNCTION get_booking_by_token(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_booking RECORD;
  v_bike_name TEXT;
  v_provider_name TEXT;
  v_provider_address TEXT;
  v_hotel_name TEXT;
BEGIN
  SELECT b.id, b.booking_number, b.start_date, b.end_date,
         b.total_days, b.total_price, b.deposit_amount,
         b.status, b.cancellation_status, b.guest_name, b.guest_email,
         b.bike_id, b.organization_id, b.hotel_id, b.created_at
  INTO v_booking
  FROM bookings b
  WHERE b.cancellation_token = p_token;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT name INTO v_bike_name FROM bikes WHERE id = v_booking.bike_id;
  SELECT name, provider_address INTO v_provider_name, v_provider_address
    FROM organizations WHERE id = v_booking.organization_id;
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
    'can_cancel_free',     (v_booking.start_date - CURRENT_DATE) > 1
                           AND v_booking.status NOT IN ('cancelled')
                           AND v_booking.cancellation_status = 'none'
  );
END;
$$;

-- ============================================================
-- RPC: cancel_booking_by_token(token)
-- Public: guest cancels their booking via email link
-- Determines tier automatically: >24h = free, <24h = partial
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_booking_by_token(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_booking RECORD;
  v_hours_until_start DECIMAL;
  v_cancel_type TEXT;
BEGIN
  SELECT id, booking_number, start_date, status, cancellation_status,
         stripe_payment_intent_id, total_price, platform_commission
  INTO v_booking
  FROM bookings
  WHERE cancellation_token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'booking_not_found');
  END IF;

  IF v_booking.status = 'cancelled' THEN
    RETURN jsonb_build_object('error', 'already_cancelled');
  END IF;

  IF v_booking.cancellation_status != 'none' THEN
    RETURN jsonb_build_object('error', 'already_cancelled');
  END IF;

  -- Calculate hours until start
  v_hours_until_start := EXTRACT(EPOCH FROM
    (v_booking.start_date::TIMESTAMP - now()::TIMESTAMP)
  ) / 3600;

  -- Determine cancellation type
  IF v_hours_until_start > 24 THEN
    v_cancel_type := 'free';
  ELSE
    v_cancel_type := 'partial';
  END IF;

  -- Update booking status (Stripe refund handled by API route calling stripe-cancel)
  UPDATE bookings SET
    cancellation_status = v_cancel_type,
    status = 'cancelled'
  WHERE id = v_booking.id;

  RETURN jsonb_build_object(
    'success',             true,
    'booking_id',          v_booking.id,
    'booking_number',      v_booking.booking_number,
    'cancellation_type',   v_cancel_type,
    'stripe_pi',           v_booking.stripe_payment_intent_id,
    'total_price',         v_booking.total_price,
    'platform_commission', v_booking.platform_commission
  );
END;
$$;

-- Update create_guest_booking to return cancellation_token
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
  v_cancel_token     UUID;
  v_conflict_count   INTEGER;
BEGIN
  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION 'Start date must be before end date';
  END IF;
  IF p_start_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Start date cannot be in the past';
  END IF;

  SELECT id, name, price_per_day, deposit, status, category, organization_id
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

  v_total_days  := (p_end_date - p_start_date) + 1;
  v_total_price := v_total_days * v_bike.price_per_day;

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
    v_bike.price_per_day, v_total_days, v_total_price, v_total_price, v_bike.deposit,
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

-- Grants for new RPCs
GRANT EXECUTE ON FUNCTION get_booking_by_token(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cancel_booking_by_token(UUID) TO anon, authenticated;

COMMIT;
