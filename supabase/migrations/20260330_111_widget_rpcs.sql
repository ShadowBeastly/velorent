-- ============================================================
-- Migration: 20260330_111_widget_rpcs.sql
--
-- Creates the coupons/coupon_usages tables (missing from live DB
-- despite migration 005 defining them — applied before tracking).
-- Adds the increment_coupon_usage RPC.
-- Adds _get_org_id_for_widget helper for widget RPCs.
--
-- Column naming note:
--   App code (VouchersPage, useCoupons) uses `type` + `value`.
--   stripe-checkout edge function uses `discount_type` + `discount_value`.
--   We create with `type`/`value` (app-code wins) AND add
--   `discount_type`/`discount_value` as generated columns so the
--   edge function keeps working without a code change.
--
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. coupons table
-- ============================================================

CREATE TABLE IF NOT EXISTS coupons (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code              VARCHAR     NOT NULL,
  type              TEXT,                        -- 'percentage' | 'fixed'
  value             DECIMAL(10,2),
  -- Aliases for stripe-checkout edge function (reads discount_type/discount_value)
  discount_type     TEXT        GENERATED ALWAYS AS (type)  STORED,
  discount_value    DECIMAL(10,2) GENERATED ALWAYS AS (value) STORED,
  min_order_value   DECIMAL(10,2) DEFAULT 0,
  min_duration_days INT           DEFAULT 0,
  min_quantity      INT           DEFAULT 0,
  max_uses          INT,
  used_count        INT           DEFAULT 0,
  valid_from        TIMESTAMPTZ,
  valid_until       TIMESTAMPTZ,
  applies_to        TEXT          DEFAULT 'all',  -- 'all' | 'category' | 'specific_bike'
  bike_category_id  UUID,                         -- filter by category UUID
  bike_id           UUID,                         -- filter by specific item UUID
  is_active         BOOLEAN       DEFAULT true,
  created_at        TIMESTAMPTZ   DEFAULT now(),
  UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_coupons_org  ON coupons(organization_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'coupons' AND policyname = 'Coupons view'
  ) THEN
    CREATE POLICY "Coupons view" ON coupons
      FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'coupons' AND policyname = 'Coupons insert'
  ) THEN
    CREATE POLICY "Coupons insert" ON coupons
      FOR INSERT WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'coupons' AND policyname = 'Coupons update'
  ) THEN
    CREATE POLICY "Coupons update" ON coupons
      FOR UPDATE USING (organization_id IN (SELECT get_user_write_org_ids()));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'coupons' AND policyname = 'Coupons delete'
  ) THEN
    CREATE POLICY "Coupons delete" ON coupons
      FOR DELETE USING (organization_id IN (SELECT get_user_write_org_ids()));
  END IF;
END;
$$;

-- ============================================================
-- 2. coupon_usages table
-- ============================================================

CREATE TABLE IF NOT EXISTS coupon_usages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id       UUID        NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  booking_id      UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  discount_amount DECIMAL(10,2),
  used_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon  ON coupon_usages(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_booking ON coupon_usages(booking_id);

ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'coupon_usages' AND policyname = 'CouponUsages view'
  ) THEN
    CREATE POLICY "CouponUsages view" ON coupon_usages
      FOR SELECT USING (
        coupon_id IN (
          SELECT id FROM coupons WHERE organization_id IN (SELECT get_user_org_ids())
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'coupon_usages' AND policyname = 'CouponUsages insert'
  ) THEN
    CREATE POLICY "CouponUsages insert" ON coupon_usages
      FOR INSERT WITH CHECK (
        coupon_id IN (
          SELECT id FROM coupons WHERE organization_id IN (SELECT get_user_org_ids())
        )
      );
  END IF;
END;
$$;

-- ============================================================
-- 3. _get_org_id_for_widget — shared helper for widget RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION _get_org_id_for_widget(p_api_key TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id
  FROM public_booking_settings
  WHERE public_api_key = p_api_key
    AND is_enabled = true
  LIMIT 1;
$$;

-- ============================================================
-- 4. increment_coupon_usage
--    Atomically increments used_count.
--    Guards against exceeding max_uses (race-condition safe).
-- ============================================================

DROP FUNCTION IF EXISTS increment_coupon_usage(UUID);

CREATE FUNCTION increment_coupon_usage(p_coupon_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE coupons
  SET used_count = used_count + 1
  WHERE id = p_coupon_id
    AND (max_uses IS NULL OR used_count < max_uses);
$$;

GRANT EXECUTE ON FUNCTION increment_coupon_usage(UUID) TO authenticated;

COMMIT;
