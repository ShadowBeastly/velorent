-- Migration: V2 RPCs — venue/item-aware functions + update create_guest_booking to use commission_rates
-- Rollback:
--   DROP FUNCTION IF EXISTS get_venue_with_providers(TEXT);
--   DROP FUNCTION IF EXISTS create_item_booking(UUID, UUID, UUID, DATE, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, DECIMAL);
--   DROP FUNCTION IF EXISTS track_analytics_event_v2(UUID, UUID, TEXT, TEXT, JSONB);
--   -- Restore original get_hotel_with_providers from 004_fix_hotel_rpc_price_per_hour.sql
--   -- Restore original create_guest_booking from 20260327_api_fixes.sql
-- Dependencies: 20260327_100_commission_rates.sql, 20260327_103_rename_bikes_to_items.sql, 20260327_104_rename_hotels_to_venues.sql

BEGIN;

-- ============================================================
-- 1. get_venue_with_providers — V2 of get_hotel_with_providers
--    Reads from venues + items directly (not views)
--    Returns providers[].items + providers[].bikes (backward-compat alias)
-- ============================================================

CREATE OR REPLACE FUNCTION get_venue_with_providers(p_venue_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_venue         RECORD;
  v_provider_row  RECORD;
  v_providers     JSONB := '[]'::JSONB;
  v_items         JSONB;
BEGIN
  SELECT id, name, slug, address, city, region_id, logo_url, description,
         venue_type, welcome_message, theme_color
  INTO v_venue
  FROM venues
  WHERE slug = p_venue_slug AND is_active = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  FOR v_provider_row IN
    SELECT
      o.id, o.name, o.provider_description, o.provider_address,
      o.provider_phone, o.provider_website, o.provider_opening_hours,
      o.provider_photos, vp.distance_km
    FROM venue_providers vp
    JOIN organizations o ON o.id = vp.organization_id
    WHERE vp.hotel_id = v_venue.id
      AND vp.is_active = true
      AND o.is_platform_provider = true
    ORDER BY vp.distance_km ASC NULLS LAST
  LOOP
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id',            i.id,
        'name',          i.name,
        'category',      i.category,
        'item_type',     i.item_type,
        'price_per_day', i.price_per_day,
        'price_per_hour', i.price_per_hour,
        'deposit',       i.deposit,
        'image_url',     i.image_url,
        'status',        i.status,
        'description',   i.model,
        'capacity',      i.capacity,
        'location_type', i.location_type
      ) ORDER BY i.name
    ), '[]'::JSONB)
    INTO v_items
    FROM items i
    WHERE i.organization_id = v_provider_row.id
      AND i.status = 'available';

    v_providers := v_providers || jsonb_build_array(
      jsonb_build_object(
        'id',                     v_provider_row.id,
        'name',                   v_provider_row.name,
        'provider_description',   v_provider_row.provider_description,
        'provider_address',       v_provider_row.provider_address,
        'provider_phone',         v_provider_row.provider_phone,
        'provider_website',       v_provider_row.provider_website,
        'provider_opening_hours', v_provider_row.provider_opening_hours,
        'distance_km',            v_provider_row.distance_km,
        'items',                  v_items,
        'bikes',                  v_items  -- backward-compat alias
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'venue', jsonb_build_object(
      'id',              v_venue.id,
      'name',            v_venue.name,
      'slug',            v_venue.slug,
      'address',         v_venue.address,
      'city',            v_venue.city,
      'region_id',       v_venue.region_id,
      'logo_url',        v_venue.logo_url,
      'description',     v_venue.description,
      'venue_type',      v_venue.venue_type,
      'welcome_message', v_venue.welcome_message,
      'theme_color',     v_venue.theme_color
    ),
    -- backward-compat: also expose as 'hotel'
    'hotel', jsonb_build_object(
      'id',              v_venue.id,
      'name',            v_venue.name,
      'slug',            v_venue.slug,
      'address',         v_venue.address,
      'city',            v_venue.city,
      'region_id',       v_venue.region_id,
      'logo_url',        v_venue.logo_url,
      'description',     v_venue.description
    ),
    'providers', v_providers
  );
END;
$$;

-- Grant to anon (guest flow is unauthenticated)
GRANT EXECUTE ON FUNCTION get_venue_with_providers(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_venue_with_providers(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_venue_with_providers(TEXT) TO service_role;

-- ============================================================
-- 2. get_hotel_with_providers — becomes wrapper
-- ============================================================

CREATE OR REPLACE FUNCTION get_hotel_with_providers(p_hotel_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN get_venue_with_providers(p_hotel_slug);
END;
$$;

-- ============================================================
-- 3. Update create_guest_booking (14-param version) to use commission_rates table
--    This replaces the version from 20260327_api_fixes.sql
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

  -- Read from bikes view (resolves to items table)
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
    v_total_days     := p_total_hours;
    v_price_per_unit := v_bike.price_per_hour;
    v_computed_price := p_total_hours * v_bike.price_per_hour;
  ELSE
    v_total_days     := (p_end_date - p_start_date) + 1;
    v_price_per_unit := v_bike.price_per_day;
    v_computed_price := v_total_days * v_bike.price_per_day;
  END IF;

  -- BUG-027: use Stripe-verified price when provided
  v_total_price := COALESCE(p_total_price, v_computed_price);

  -- Commission lookup from commission_rates table (replaces hardcoded CASE)
  SELECT cr.rate INTO v_commission_rate
  FROM commission_rates cr
  WHERE cr.item_type = v_bike.category AND cr.is_active = true;
  IF NOT FOUND THEN
    v_commission_rate := 0.05;
  END IF;

  v_platform_comm := ROUND(v_total_price * v_commission_rate, 2);

  v_hotel_comm := 0;
  IF p_hotel_id IS NOT NULL THEN
    SELECT commission_pct INTO v_hotel_comm_pct FROM hotels WHERE id = p_hotel_id;
    IF FOUND AND v_hotel_comm_pct > 0 THEN
      v_hotel_comm := ROUND(v_total_price * v_hotel_comm_pct / 100, 2);
    END IF;
  END IF;

  INSERT INTO bookings (
    organization_id, bike_id, item_id, start_date, end_date,
    price_per_day, total_days, subtotal, total_price, deposit_amount,
    status, source, hotel_id, booking_source,
    platform_commission, hotel_commission,
    guest_email, guest_phone, guest_name, guest_language,
    cancellation_status,
    customer_name, customer_email, customer_phone
  ) VALUES (
    p_organization_id, p_bike_id, p_bike_id, p_start_date, p_end_date,
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
-- 4. create_item_booking — V2 of create_guest_booking with item_id
-- ============================================================

CREATE OR REPLACE FUNCTION create_item_booking(
  p_organization_id UUID,
  p_item_id         UUID,
  p_venue_id        UUID,
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
  v_item             RECORD;
  v_total_days       INTEGER;
  v_computed_price   DECIMAL(10,2);
  v_total_price      DECIMAL(10,2);
  v_commission_rate  DECIMAL(5,4);
  v_platform_comm    DECIMAL(10,2);
  v_venue_comm       DECIMAL(10,2);
  v_venue_comm_pct   DECIMAL(5,2);
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
  INTO v_item
  FROM items
  WHERE id = p_item_id
    AND organization_id = p_organization_id
    AND status = 'available';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not available';
  END IF;

  SELECT COUNT(*) INTO v_conflict_count
  FROM bookings
  WHERE item_id = p_item_id
    AND status NOT IN ('cancelled')
    AND daterange(start_date, end_date, '[]') && daterange(p_start_date, p_end_date, '[]');

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Item not available for selected dates';
  END IF;

  IF p_rental_type = 'hourly' THEN
    IF v_item.price_per_hour IS NULL OR v_item.price_per_hour <= 0 THEN
      RAISE EXCEPTION 'Item does not support hourly bookings';
    END IF;
    IF p_total_hours IS NULL OR p_total_hours < 1 THEN
      RAISE EXCEPTION 'Minimum 1 hour required';
    END IF;
    v_total_days     := p_total_hours;
    v_price_per_unit := v_item.price_per_hour;
    v_computed_price := p_total_hours * v_item.price_per_hour;
  ELSE
    v_total_days     := (p_end_date - p_start_date) + 1;
    v_price_per_unit := v_item.price_per_day;
    v_computed_price := v_total_days * v_item.price_per_day;
  END IF;

  v_total_price := COALESCE(p_total_price, v_computed_price);

  -- Commission from commission_rates table
  SELECT cr.rate INTO v_commission_rate
  FROM commission_rates cr
  WHERE cr.item_type = v_item.category AND cr.is_active = true;
  IF NOT FOUND THEN
    v_commission_rate := 0.05;
  END IF;

  v_platform_comm := ROUND(v_total_price * v_commission_rate, 2);

  v_venue_comm := 0;
  IF p_venue_id IS NOT NULL THEN
    SELECT commission_pct INTO v_venue_comm_pct FROM venues WHERE id = p_venue_id;
    IF FOUND AND v_venue_comm_pct > 0 THEN
      v_venue_comm := ROUND(v_total_price * v_venue_comm_pct / 100, 2);
    END IF;
  END IF;

  INSERT INTO bookings (
    organization_id, item_id, bike_id, start_date, end_date,
    price_per_day, total_days, subtotal, total_price, deposit_amount,
    status, source, venue_id, hotel_id, booking_source,
    platform_commission, hotel_commission,
    guest_email, guest_phone, guest_name, guest_language,
    cancellation_status,
    customer_name, customer_email, customer_phone
  ) VALUES (
    p_organization_id, p_item_id, p_item_id, p_start_date, p_end_date,
    v_price_per_unit, v_total_days, v_total_price, v_total_price, v_item.deposit,
    'reserved', 'website', p_venue_id, p_venue_id, 'hotel_qr',
    v_platform_comm, v_venue_comm,
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
    'venue_commission',    v_venue_comm,
    'hotel_commission',    v_venue_comm,  -- backward-compat
    'deposit_amount',      v_item.deposit,
    'cancellation_token',  v_cancel_token
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_item_booking(UUID, UUID, UUID, DATE, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, DECIMAL) TO anon;
GRANT EXECUTE ON FUNCTION create_item_booking(UUID, UUID, UUID, DATE, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION create_item_booking(UUID, UUID, UUID, DATE, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, DECIMAL) TO service_role;

-- ============================================================
-- 5. track_analytics_event_v2 — with venue_id + item_id
-- ============================================================

CREATE OR REPLACE FUNCTION track_analytics_event_v2(
  p_venue_id   UUID,
  p_item_id    UUID DEFAULT NULL,
  p_event_type TEXT DEFAULT 'page_view',
  p_session_id TEXT DEFAULT NULL,
  p_metadata   JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO analytics_events (hotel_id, venue_id, bike_id, item_id, event_type, session_id, metadata)
  VALUES (p_venue_id, p_venue_id, p_item_id, p_item_id, p_event_type, p_session_id, COALESCE(p_metadata, '{}'));
END;
$$;

GRANT EXECUTE ON FUNCTION track_analytics_event_v2(UUID, UUID, TEXT, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION track_analytics_event_v2(UUID, UUID, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION track_analytics_event_v2(UUID, UUID, TEXT, TEXT, JSONB) TO service_role;

-- ============================================================
-- 6. Schema reload
-- ============================================================

NOTIFY pgrst, 'reload schema';

COMMIT;
