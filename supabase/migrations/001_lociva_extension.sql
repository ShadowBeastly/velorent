-- ============================================================
-- 001_lociva_extension.sql
-- Lociva Marketplace Extension. Consolidated Migration
-- Run AFTER: supabase-schema.sql
--
-- Creates: regions, hotels, hotel_providers, hotel_users,
--          analytics_events
-- Alters:  organizations (Stripe + provider fields),
--          bookings (marketplace fields)
-- RLS:     All new tables
-- RPCs:    get_hotel_with_providers, create_guest_booking,
--          get_hotel_analytics, track_analytics_event
-- ============================================================

BEGIN;

-- ============================================================
-- FIX: profiles table is missing columns from supabase-schema.sql
-- The live DB only has: id, full_name, avatar_url, created_at
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email      TEXT,
  ADD COLUMN IF NOT EXISTS phone      TEXT,
  ADD COLUMN IF NOT EXISTS role       TEXT DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Backfill email from auth.users for existing profiles
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- Add unique constraint on email if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_key'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
  END IF;
END $$;

-- ============================================================
-- HELPER FUNCTION: Platform Admin Check
-- ============================================================

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  );
$$;

-- ============================================================
-- HELPER FUNCTION: update_updated_at trigger
-- (defined in supabase-schema.sql but missing from live DB)
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLE: regions
-- ============================================================

CREATE TABLE IF NOT EXISTS regions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  scout_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: hotels
-- ============================================================

CREATE TABLE IF NOT EXISTS hotels (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  slug           TEXT UNIQUE NOT NULL,
  address        TEXT,
  latitude       DECIMAL(9,6),
  longitude      DECIMAL(9,6),
  contact_email  TEXT,
  contact_phone  TEXT,
  commission_pct DECIMAL(5,2) DEFAULT 0,
  qr_code_url    TEXT,
  region_id      UUID REFERENCES regions(id) ON DELETE SET NULL,
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: hotel_providers (junction: hotel <-> organization)
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
-- TABLE: hotel_users (links auth users to hotels for dashboard)
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
  event_type  TEXT NOT NULL CHECK (event_type IN (
    'qr_scan', 'page_view', 'booking_start',
    'booking_complete', 'booking_cancelled'
  )),
  session_id  TEXT,
  provider_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  bike_id     UUID REFERENCES bikes(id) ON DELETE SET NULL,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ALTER: organizations. Stripe Connect + provider fields
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_account_id          TEXT,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_verified            BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS agb_accepted_at            TIMESTAMPTZ,
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
-- ALTER: bookings. Marketplace fields
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS hotel_id                   UUID REFERENCES hotels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id   TEXT,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id         TEXT,
  ADD COLUMN IF NOT EXISTS stripe_provider_account_id TEXT,
  ADD COLUMN IF NOT EXISTS platform_commission        DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hotel_commission           DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS booking_source             TEXT DEFAULT 'direct'
    CHECK (booking_source IN ('hotel_qr', 'direct', 'widget', 'admin')),
  ADD COLUMN IF NOT EXISTS guest_email                TEXT,
  ADD COLUMN IF NOT EXISTS guest_phone                TEXT,
  ADD COLUMN IF NOT EXISTS guest_name                 TEXT,
  ADD COLUMN IF NOT EXISTS guest_language             TEXT DEFAULT 'de',
  ADD COLUMN IF NOT EXISTS cancellation_status        TEXT DEFAULT 'none'
    CHECK (cancellation_status IN ('none', 'free', 'partial', 'no_show'));

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_hotels_slug             ON hotels(slug);
CREATE INDEX IF NOT EXISTS idx_hotels_active           ON hotels(is_active);
CREATE INDEX IF NOT EXISTS idx_hotels_region_id        ON hotels(region_id);
CREATE INDEX IF NOT EXISTS idx_hotel_providers_hotel   ON hotel_providers(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_providers_org     ON hotel_providers(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_hotel_time    ON analytics_events(hotel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type    ON analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_session       ON analytics_events(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_hotel_id       ON bookings(hotel_id);
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_pi      ON bookings(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_source         ON bookings(booking_source);
CREATE INDEX IF NOT EXISTS idx_orgs_platform_provider  ON organizations(is_platform_provider);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE hotels           ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_providers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- hotels: anyone (incl. anon) can read active hotels; admin full access
DROP POLICY IF EXISTS "hotels_public_select" ON hotels;
CREATE POLICY "hotels_public_select"
  ON hotels FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "hotels_admin_all" ON hotels;
CREATE POLICY "hotels_admin_all"
  ON hotels FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- hotel_providers: anyone can read active links; admin full access
DROP POLICY IF EXISTS "hotel_providers_public_select" ON hotel_providers;
CREATE POLICY "hotel_providers_public_select"
  ON hotel_providers FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "hotel_providers_admin_all" ON hotel_providers;
CREATE POLICY "hotel_providers_admin_all"
  ON hotel_providers FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- regions: authenticated can read; admin full access
DROP POLICY IF EXISTS "regions_auth_select" ON regions;
CREATE POLICY "regions_auth_select"
  ON regions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "regions_admin_all" ON regions;
CREATE POLICY "regions_admin_all"
  ON regions FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- hotel_users: users see own records; admin sees all
DROP POLICY IF EXISTS "hotel_users_own_select" ON hotel_users;
CREATE POLICY "hotel_users_own_select"
  ON hotel_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_platform_admin());

DROP POLICY IF EXISTS "hotel_users_admin_all" ON hotel_users;
CREATE POLICY "hotel_users_admin_all"
  ON hotel_users FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- analytics_events: anyone can insert; hotel users + admin can read; admin can delete
DROP POLICY IF EXISTS "analytics_events_insert_all" ON analytics_events;
CREATE POLICY "analytics_events_insert_all"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "analytics_events_select" ON analytics_events;
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

DROP POLICY IF EXISTS "analytics_events_admin_delete" ON analytics_events;
CREATE POLICY "analytics_events_admin_delete"
  ON analytics_events FOR DELETE
  USING (is_platform_admin());

-- ============================================================
-- TRIGGER: hotels updated_at
-- ============================================================

DROP TRIGGER IF EXISTS hotels_updated_at ON hotels;
CREATE TRIGGER hotels_updated_at
  BEFORE UPDATE ON hotels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RPC: get_hotel_with_providers(slug)
-- Returns hotel info + all active providers with their bikes
-- Callable by anon (guest booking flow)
-- ============================================================

CREATE OR REPLACE FUNCTION get_hotel_with_providers(p_hotel_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_hotel         RECORD;
  v_providers     JSONB := '[]'::JSONB;
  v_provider_row  RECORD;
  v_bikes         JSONB;
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
      o.provider_photos, hp.distance_km
    FROM hotel_providers hp
    JOIN organizations o ON o.id = hp.organization_id
    WHERE hp.hotel_id = v_hotel.id
      AND hp.is_active = true
      AND o.is_platform_provider = true
    ORDER BY hp.distance_km ASC NULLS LAST
  LOOP
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id',            b.id,
        'name',          b.name,
        'category',      b.category,
        'price_per_day', b.price_per_day,
        'price_per_hour', b.price_per_hour,
        'deposit',       b.deposit,
        'image_url',     b.image_url,
        'status',        b.status,
        'description',   b.model
      ) ORDER BY b.name
    ), '[]'::JSONB)
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

  RETURN jsonb_build_object(
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
END;
$$;

-- ============================================================
-- RPC: create_guest_booking(...)
-- Creates a booking from the public guest flow (no auth required)
-- Category-based commission rates per CLAUDE.md
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
  p_language        TEXT DEFAULT 'de',
  p_rental_type     TEXT DEFAULT 'daily',
  p_total_hours     INTEGER DEFAULT NULL,
  p_start_time      TEXT DEFAULT NULL,
  p_end_time        TEXT DEFAULT NULL
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
  v_price_per_unit   DECIMAL(10,2);
BEGIN
  -- Validation
  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION 'Start date must be before end date';
  END IF;
  IF p_start_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Start date cannot be in the past';
  END IF;

  -- Fetch bike (must belong to org and be available)
  SELECT id, name, price_per_day, price_per_hour, deposit, status, category, organization_id
  INTO v_bike
  FROM bikes
  WHERE id = p_bike_id
    AND organization_id = p_organization_id
    AND status = 'available';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bike not available';
  END IF;

  -- Conflict check (daterange overlap)
  SELECT COUNT(*) INTO v_conflict_count
  FROM bookings
  WHERE bike_id = p_bike_id
    AND status NOT IN ('cancelled')
    AND daterange(start_date, end_date, '[]') && daterange(p_start_date, p_end_date, '[]');

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Bike not available for selected dates';
  END IF;

  -- Calculate price based on rental type
  IF p_rental_type = 'hourly' THEN
    IF v_bike.price_per_hour IS NULL OR v_bike.price_per_hour <= 0 THEN
      RAISE EXCEPTION 'Bike does not support hourly rentals';
    END IF;
    IF p_total_hours IS NULL OR p_total_hours < 1 THEN
      RAISE EXCEPTION 'Minimum 1 hour required';
    END IF;
    v_total_days  := p_total_hours; -- store hours in total_days for hourly bookings
    v_price_per_unit := v_bike.price_per_hour;
    v_total_price := p_total_hours * v_bike.price_per_hour;
  ELSE
    -- Daily pricing: inclusive day count (matches codebase daysDiff convention)
    v_total_days  := (p_end_date - p_start_date) + 1;
    v_price_per_unit := v_bike.price_per_day;
    v_total_price := v_total_days * v_bike.price_per_day;
  END IF;

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

  -- Hotel commission (0 for MVP, configurable per hotel)
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
    v_price_per_unit, v_total_days, v_total_price, v_total_price, v_bike.deposit,
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
-- RPC: get_hotel_analytics(hotel_id, since)
-- Hotel dashboard KPIs: scans, conversion, volume, commission
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
  -- QR scan sessions
  SELECT COUNT(DISTINCT session_id) INTO v_scans
  FROM analytics_events
  WHERE hotel_id = p_hotel_id
    AND event_type = 'qr_scan'
    AND (p_since IS NULL OR created_at >= p_since);

  -- Booking complete sessions
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
    'qr_scans',           v_scans,
    'booking_sessions',   v_completed_sessions,
    'conversion_rate',    v_conversion_rate,
    'bookings_count',     v_bookings_count,
    'cancellation_count', v_cancellation_count,
    'total_volume',       v_total_volume,
    'total_commission',   v_total_commission
  );
END;
$$;

-- ============================================================
-- RPC: track_analytics_event(...)
-- Lightweight event tracking, callable by anon
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
-- GRANTS. Allow anon + authenticated to call public RPCs
-- ============================================================

GRANT EXECUTE ON FUNCTION is_platform_admin()
  TO authenticated;

GRANT EXECUTE ON FUNCTION get_hotel_with_providers(TEXT)
  TO anon, authenticated;

GRANT EXECUTE ON FUNCTION create_guest_booking(UUID, UUID, UUID, DATE, DATE, TEXT, TEXT, TEXT, TEXT)
  TO anon, authenticated;

GRANT EXECUTE ON FUNCTION get_hotel_analytics(UUID, TIMESTAMPTZ)
  TO authenticated;

GRANT EXECUTE ON FUNCTION track_analytics_event(UUID, TEXT, TEXT, JSONB)
  TO anon, authenticated;

COMMIT;

-- ============================================================
-- Verify with:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--   AND table_name IN ('regions','hotels','hotel_providers','hotel_users','analytics_events');
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'bookings' AND column_name = 'hotel_id';
--
--   SELECT proname FROM pg_proc
--   WHERE proname IN ('get_hotel_with_providers','create_guest_booking','get_hotel_analytics','track_analytics_event');
-- ============================================================
