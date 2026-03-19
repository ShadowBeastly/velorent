-- ============================================================
-- 007_m13_widget.sql
-- M13: Embeddable Booking Widget
-- Run AFTER: 006_m5_email_qr.sql
--
-- Adds widget configuration columns to organizations.
-- The widget uses data-rentcore-tenant="org_id" for auth-free embedding.
-- CORS is controlled per-org via widget_allowed_domains.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. EXTEND organizations TABLE
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS widget_enabled         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS widget_allowed_domains TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS widget_primary_color   TEXT    DEFAULT '#1A7D5A',
  ADD COLUMN IF NOT EXISTS widget_theme           TEXT    DEFAULT 'light';

-- ============================================================
-- 2. HELPER FUNCTION: validate tenant + CORS origin
-- ============================================================

CREATE OR REPLACE FUNCTION get_widget_org(p_tenant UUID, p_origin TEXT)
RETURNS TABLE (
  id                    UUID,
  name                  TEXT,
  widget_enabled        BOOLEAN,
  widget_allowed_domains TEXT[],
  widget_primary_color  TEXT,
  widget_theme          TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.name,
    o.widget_enabled,
    o.widget_allowed_domains,
    o.widget_primary_color,
    o.widget_theme
  FROM organizations o
  WHERE o.id = p_tenant
    AND o.widget_enabled = true
    AND (
      o.widget_allowed_domains = '{}'::text[]   -- empty = allow all (dev mode)
      OR p_origin = ANY(o.widget_allowed_domains)
      OR p_origin IS NULL
    );
$$;

GRANT EXECUTE ON FUNCTION get_widget_org(UUID, TEXT) TO anon, authenticated;

-- ============================================================
-- 3. RPC: get_public_bikes. Active bikes for a tenant (no auth)
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
    b.id,
    b.name,
    b.description,
    c.name AS category_name,
    b.price_per_day,
    b.price_per_hour,
    b.image_url,
    b.deposit_amount,
    b.status
  FROM bikes b
  LEFT JOIN categories c ON c.id = b.category_id
  WHERE b.organization_id = p_tenant
    AND b.status = 'available'
    AND EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = p_tenant AND o.widget_enabled = true
    )
  ORDER BY c.name, b.name;
$$;

GRANT EXECUTE ON FUNCTION get_public_bikes(UUID) TO anon, authenticated;

-- ============================================================
-- 4. RPC: check_public_availability. Is a bike bookable for given dates?
-- ============================================================

CREATE OR REPLACE FUNCTION check_public_availability(
  p_tenant  UUID,
  p_bike_id UUID,
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
  -- Verify bike belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM bikes WHERE id = p_bike_id AND organization_id = p_tenant
  ) THEN
    RAISE EXCEPTION 'Bike not found for tenant';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*) = 0 AS available,
    COUNT(*)::INT AS conflict_count
  FROM bookings bk
  JOIN bikes b ON b.id = bk.bike_id
  WHERE b.organization_id = p_tenant
    AND bk.bike_id = p_bike_id
    AND bk.status NOT IN ('cancelled', 'completed')
    AND NOT (
      bk.end_date < p_start
      OR bk.start_date > p_end
    );
END;
$$;

GRANT EXECUTE ON FUNCTION check_public_availability(UUID, UUID, DATE, DATE) TO anon, authenticated;

COMMIT;
