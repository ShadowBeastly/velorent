-- 008_m11_booking_payments.sql
-- M11: Stripe payment integration columns
--
-- Run AFTER: 007_m8_maintenance.sql
-- Run BEFORE: 009_m13_widget.sql
--
-- Adds Stripe subscription billing columns to organizations.
-- Adds IBAN/BIC payout columns to organizations.
-- Corresponds to the stripe-integration.sql scratch file applied
-- to the live DB during Milestone 11.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. organizations: Stripe subscription billing
--    (RentCore SaaS billing — separate from Stripe Connect
--     which was added in 001_lociva_extension.sql)
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id           TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id       TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status   TEXT DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS stripe_price_id              TEXT,
  ADD COLUMN IF NOT EXISTS stripe_current_period_end    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at                TIMESTAMPTZ;

-- ============================================================
-- 2. organizations: Bank account for direct payout fallback
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS bic  TEXT;

-- ============================================================
-- 3. Indexes for Stripe lookups (partial — only non-null rows)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_orgs_stripe_customer
  ON organizations(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orgs_stripe_subscription
  ON organizations(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- ============================================================
-- 4. VIEW: subscription_status
--    Used by the app to gate features by plan tier.
-- ============================================================

CREATE OR REPLACE VIEW subscription_status AS
SELECT
  o.id                              AS organization_id,
  o.name                            AS organization_name,
  o.subscription_tier,
  o.subscription_status,
  o.stripe_subscription_status,
  o.stripe_current_period_end,
  o.trial_ends_at,
  CASE
    WHEN o.subscription_tier = 'free'       THEN true
    WHEN o.stripe_subscription_status IN ('active', 'trialing') THEN true
    WHEN o.trial_ends_at > now()            THEN true
    ELSE false
  END                                AS is_active,
  CASE
    WHEN o.subscription_tier = 'free'       THEN 3
    WHEN o.subscription_tier = 'basic'      THEN 15
    WHEN o.subscription_tier = 'pro'        THEN 50
    WHEN o.subscription_tier = 'unlimited'  THEN 999999
    ELSE 3
  END                                AS item_limit,
  CASE
    WHEN o.subscription_tier = 'free'       THEN 1
    WHEN o.subscription_tier = 'basic'      THEN 2
    WHEN o.subscription_tier = 'pro'        THEN 5
    WHEN o.subscription_tier = 'unlimited'  THEN 999999
    ELSE 1
  END                                AS user_limit
FROM organizations o;

-- Grant read to authenticated users (used by DataProvider)
GRANT SELECT ON subscription_status TO authenticated;

-- ============================================================
-- 5. FUNCTION: check_item_limit
--    Returns true if org has capacity to add another item/bike.
-- ============================================================

CREATE OR REPLACE FUNCTION check_item_limit(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current  INT;
  v_max      INT;
BEGIN
  -- Count non-retired items (table may be bikes or items depending on migration stage)
  SELECT COUNT(*) INTO v_current
  FROM items
  WHERE organization_id = p_org_id
    AND status != 'retired';

  SELECT item_limit INTO v_max
  FROM subscription_status
  WHERE organization_id = p_org_id;

  RETURN v_current < COALESCE(v_max, 3);
END;
$$;

-- Legacy alias used by older code that still references check_bike_limit
CREATE OR REPLACE FUNCTION check_bike_limit(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT check_item_limit(p_org_id);
$$;

-- ============================================================
-- 6. FUNCTION: check_user_limit
--    Returns true if org has capacity to add another member.
-- ============================================================

CREATE OR REPLACE FUNCTION check_user_limit(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current  INT;
  v_max      INT;
BEGIN
  SELECT COUNT(*) INTO v_current
  FROM organization_members
  WHERE organization_id = p_org_id
    AND status = 'active';

  SELECT user_limit INTO v_max
  FROM subscription_status
  WHERE organization_id = p_org_id;

  RETURN v_current < COALESCE(v_max, 1);
END;
$$;

GRANT EXECUTE ON FUNCTION check_item_limit(UUID)  TO authenticated;
GRANT EXECUTE ON FUNCTION check_bike_limit(UUID)  TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_limit(UUID)  TO authenticated;

COMMIT;

-- ============================================================
-- Verify with:
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'organizations'
--     AND column_name IN (
--       'stripe_customer_id','stripe_subscription_id',
--       'stripe_subscription_status','stripe_price_id',
--       'stripe_current_period_end','trial_ends_at','iban','bic'
--     )
--     ORDER BY column_name;
--   SELECT * FROM subscription_status LIMIT 1;
-- ============================================================
