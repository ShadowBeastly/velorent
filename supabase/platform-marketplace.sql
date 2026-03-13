-- ============================================================
-- platform-marketplace.sql
-- RentCore Marketplace Layer: Hotels, Providers, Analytics
-- Run AFTER supabase-schema.sql and supabase-public-booking.sql
-- ============================================================

-- ============================================================
-- HELPER FUNCTION: Platform Admin Check
-- ============================================================

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'platform_admin'
  );
$$;

-- ============================================================
-- TABLE: hotels
-- ============================================================

CREATE TABLE IF NOT EXISTS hotels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL, -- URL-friendly, e.g. "steigenberger-ffm"
  address         TEXT,
  latitude        DECIMAL(9,6),
  longitude       DECIMAL(9,6),
  contact_email   TEXT,
  commission_pct  DECIMAL(5,2) DEFAULT 0, -- hotel revenue share in %
  qr_code_url     TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: hotel_providers  (junction: hotel <-> organization)
-- ============================================================

CREATE TABLE IF NOT EXISTS hotel_providers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  distance_km     DECIMAL(6,2),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(hotel_id, organization_id)
);

-- ============================================================
-- TABLE: regions
-- ============================================================

CREATE TABLE IF NOT EXISTS regions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL, -- e.g. "Rhein-Main", "Bodensee"
  scout_user_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: hotel_users  (links auth users to hotels)
-- ============================================================

CREATE TABLE IF NOT EXISTS hotel_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id   UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(hotel_id, user_id)
);

-- ============================================================
-- TABLE: analytics_events
-- ============================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    UUID REFERENCES hotels(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL CHECK (event_type IN ('qr_scan','page_view','booking_start','booking_complete','booking_cancelled')),
  session_id  TEXT,
  provider_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  bike_id     UUID REFERENCES bikes(id) ON DELETE SET NULL,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- EXTEND: bookings table (add marketplace columns)
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS hotel_id                   UUID REFERENCES hotels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id   TEXT,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id         TEXT,
  ADD COLUMN IF NOT EXISTS platform_commission        DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hotel_commission           DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS booking_source             TEXT DEFAULT 'direct' CHECK (booking_source IN ('hotel_qr','direct','widget','admin')),
  ADD COLUMN IF NOT EXISTS guest_email                TEXT,
  ADD COLUMN IF NOT EXISTS guest_phone                TEXT,
  ADD COLUMN IF NOT EXISTS guest_name                 TEXT,
  ADD COLUMN IF NOT EXISTS guest_language             TEXT DEFAULT 'de',
  ADD COLUMN IF NOT EXISTS cancellation_status        TEXT DEFAULT 'none' CHECK (cancellation_status IN ('none','free','partial','no_show')),
  ADD COLUMN IF NOT EXISTS stripe_provider_account_id TEXT;

-- ============================================================
-- EXTEND: organizations table (add marketplace provider columns)
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_account_id          TEXT,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_platform_provider       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS provider_description       TEXT,
  ADD COLUMN IF NOT EXISTS provider_address           TEXT,
  ADD COLUMN IF NOT EXISTS provider_latitude          DECIMAL(9,6),
  ADD COLUMN IF NOT EXISTS provider_longitude         DECIMAL(9,6),
  ADD COLUMN IF NOT EXISTS provider_phone             TEXT,
  ADD COLUMN IF NOT EXISTS provider_website           TEXT,
  ADD COLUMN IF NOT EXISTS provider_opening_hours     JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS provider_photos            JSONB DEFAULT '[]';

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_hotels_slug            ON hotels(slug);
CREATE INDEX IF NOT EXISTS idx_hotels_active          ON hotels(is_active);
CREATE INDEX IF NOT EXISTS idx_hotel_providers_hotel  ON hotel_providers(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_providers_org    ON hotel_providers(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_hotel_time   ON analytics_events(hotel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type   ON analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_hotel_id      ON bookings(hotel_id);
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_pi     ON bookings(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_source        ON bookings(booking_source);
CREATE INDEX IF NOT EXISTS idx_orgs_platform_provider ON organizations(is_platform_provider);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE hotels           ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_providers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- hotels: anyone (incl. anon) can read active hotels
CREATE POLICY "hotels_public_select"
  ON hotels FOR SELECT
  USING (is_active = true);

CREATE POLICY "hotels_admin_all"
  ON hotels FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- hotel_providers: anyone can read active links
CREATE POLICY "hotel_providers_public_select"
  ON hotel_providers FOR SELECT
  USING (is_active = true);

CREATE POLICY "hotel_providers_admin_all"
  ON hotel_providers FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- regions: authenticated can read, admin can write
CREATE POLICY "regions_auth_select"
  ON regions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "regions_admin_all"
  ON regions FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- hotel_users: users see their own records; admin sees all
CREATE POLICY "hotel_users_own_select"
  ON hotel_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_platform_admin());

CREATE POLICY "hotel_users_admin_all"
  ON hotel_users FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- analytics_events: anyone can insert; hotel users/admin can read
CREATE POLICY "analytics_events_insert_all"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "analytics_events_select"
  ON analytics_events FOR SELECT
  TO authenticated
  USING (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM hotel_users hu
      WHERE hu.user_id = auth.uid() AND hu.hotel_id = analytics_events.hotel_id
    )
  );

CREATE POLICY "analytics_events_admin_delete"
  ON analytics_events FOR DELETE
  USING (is_platform_admin());

-- ============================================================
-- PUBLIC FUNCTION: get_hotel_with_providers
-- Returns hotel info + all active providers with their bikes
-- ============================================================

CREATE OR REPLACE FUNCTION get_hotel_with_providers(p_hotel_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_hotel         RECORD;
  v_providers     JSONB := '[]'::JSONB;
  v_provider_row  RECORD;
  v_bikes         JSONB;
  v_result        JSONB;
BEGIN
  SELECT id, name, slug, address, latitude, longitude, commission_pct
  INTO v_hotel
  FROM hotels
  WHERE slug = p_hotel_slug AND is_active = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  FOR v_provider_row IN
    SELECT
      o.id, o.name, o.provider_description, o.provider_address,
      o.provider_phone, o.provider_website, o.provider_opening_hours,
      o.provider_photos, hp.distance_km, o.is_platform_provider
    FROM hotel_providers hp
    JOIN organizations o ON o.id = hp.organization_id
    WHERE hp.hotel_id = v_hotel.id
      AND hp.is_active = true
      AND o.is_platform_provider = true
    ORDER BY hp.distance_km ASC NULLS LAST
  LOOP
    SELECT COALESCE(json_agg(
      json_build_object(
        'id',            b.id,
        'name',          b.name,
        'category',      b.category,
        'price_per_day', b.price_per_day,
        'deposit',       b.deposit,
        'image_url',     b.image_url,
        'status',        b.status,
        'description',   b.model
      ) ORDER BY b.name
    ), '[]'::JSON)
    INTO v_bikes
    FROM bikes b
    WHERE b.organization_id = v_provider_row.id
      AND b.status = 'available';

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
        'bikes',                  v_bikes
      )
    );
  END LOOP;

  v_result := jsonb_build_object(
    'hotel', jsonb_build_object(
      'id',             v_hotel.id,
      'name',           v_hotel.name,
      'slug',           v_hotel.slug,
      'address',        v_hotel.address,
      'latitude',       v_hotel.latitude,
      'longitude',      v_hotel.longitude,
      'commission_pct', v_hotel.commission_pct
    ),
    'providers', v_providers
  );

  RETURN v_result;
END;
$$;

-- ============================================================
-- PUBLIC FUNCTION: track_analytics_event
-- ============================================================

CREATE OR REPLACE FUNCTION track_analytics_event(
  p_hotel_id   UUID,
  p_event_type TEXT,
  p_session_id TEXT DEFAULT NULL,
  p_metadata   JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO analytics_events (hotel_id, event_type, session_id, metadata)
  VALUES (p_hotel_id, p_event_type, p_session_id, COALESCE(p_metadata, '{}'));
END;
$$;

-- ============================================================
-- PUBLIC FUNCTION: create_guest_booking
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
  v_bike           RECORD;
  v_total_days     INTEGER;
  v_total_price    DECIMAL(10,2);
  v_platform_comm  DECIMAL(10,2);
  v_hotel_comm     DECIMAL(10,2);
  v_hotel_comm_pct DECIMAL(5,2);
  v_booking_id     UUID;
  v_booking_number TEXT;
  v_conflict_count INTEGER;
BEGIN
  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION 'Start date must be before end date';
  END IF;
  IF p_start_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Start date cannot be in the past';
  END IF;

  SELECT id, name, price_per_day, deposit, status, organization_id
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

  -- Inclusive day count (matches codebase convention)
  v_total_days  := (p_end_date - p_start_date) + 1;
  v_total_price := v_total_days * v_bike.price_per_day;
  v_platform_comm := ROUND(v_total_price * 0.05, 2);

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
    first_name, last_name, email, phone
  ) VALUES (
    p_organization_id, p_bike_id, p_start_date, p_end_date,
    v_bike.price_per_day, v_total_days, v_total_price, v_total_price, v_bike.deposit,
    'reserved', 'website', p_hotel_id, 'hotel_qr',
    v_platform_comm, v_hotel_comm,
    p_guest_email, p_guest_phone, p_guest_name, p_language,
    'none',
    split_part(p_guest_name, ' ', 1),
    NULLIF(split_part(p_guest_name, ' ', 2), ''),
    p_guest_email, p_guest_phone
  )
  RETURNING id, booking_number INTO v_booking_id, v_booking_number;

  RETURN jsonb_build_object(
    'booking_id',          v_booking_id,
    'booking_number',      v_booking_number,
    'total_price',         v_total_price,
    'total_days',          v_total_days,
    'platform_commission', v_platform_comm,
    'hotel_commission',    v_hotel_comm,
    'deposit_amount',      v_bike.deposit
  );
END;
$$;

-- ============================================================
-- GRANTS
-- ============================================================

GRANT EXECUTE ON FUNCTION get_hotel_with_providers(TEXT)                             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION track_analytics_event(UUID, TEXT, TEXT, JSONB)             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_guest_booking(UUID, UUID, UUID, DATE, DATE, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_platform_admin()                                        TO authenticated;

-- ============================================================
-- UPDATED_AT TRIGGER for hotels
-- ============================================================

CREATE TRIGGER hotels_updated_at
  BEFORE UPDATE ON hotels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- DONE
-- Verify with:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_name IN ('hotels','hotel_providers','regions','hotel_users','analytics_events');
-- ============================================================
