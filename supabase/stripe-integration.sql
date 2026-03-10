-- =====================================================
-- RENTCORE - STRIPE INTEGRATION
-- =====================================================
-- Fügt die notwendigen Felder für Stripe-Zahlungen hinzu
-- Ausführen NACH supabase-schema.sql
-- =====================================================

-- Stripe Felder zur organizations Tabelle hinzufügen
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Index für schnelle Stripe Lookups
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer 
ON organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_stripe_subscription 
ON organizations(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Subscription Status View
CREATE OR REPLACE VIEW subscription_status AS
SELECT 
  o.id AS organization_id,
  o.name AS organization_name,
  o.subscription_tier,
  o.subscription_status,
  o.stripe_subscription_status,
  o.stripe_current_period_end,
  o.trial_ends_at,
  CASE 
    WHEN o.subscription_tier = 'free' THEN true
    WHEN o.stripe_subscription_status = 'active' THEN true
    WHEN o.stripe_subscription_status = 'trialing' THEN true
    WHEN o.trial_ends_at > NOW() THEN true
    ELSE false
  END AS is_active,
  CASE
    WHEN o.subscription_tier = 'free' THEN 3
    WHEN o.subscription_tier = 'basic' THEN 15
    WHEN o.subscription_tier = 'pro' THEN 50
    WHEN o.subscription_tier = 'unlimited' THEN 999999
    ELSE 3
  END AS bike_limit,
  CASE
    WHEN o.subscription_tier = 'free' THEN 1
    WHEN o.subscription_tier = 'basic' THEN 2
    WHEN o.subscription_tier = 'pro' THEN 5
    WHEN o.subscription_tier = 'unlimited' THEN 999999
    ELSE 1
  END AS user_limit
FROM organizations o;

-- Function: Check if org can add more bikes
CREATE OR REPLACE FUNCTION check_bike_limit(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count 
  FROM bikes 
  WHERE organization_id = org_id AND status != 'retired';
  
  SELECT bike_limit INTO max_allowed 
  FROM subscription_status 
  WHERE organization_id = org_id;
  
  RETURN current_count < COALESCE(max_allowed, 3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if org can add more users
CREATE OR REPLACE FUNCTION check_user_limit(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count 
  FROM organization_members 
  WHERE organization_id = org_id AND status = 'active';
  
  SELECT user_limit INTO max_allowed 
  FROM subscription_status 
  WHERE organization_id = org_id;
  
  RETURN current_count < COALESCE(max_allowed, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Enforce bike limit on insert
CREATE OR REPLACE FUNCTION enforce_bike_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT check_bike_limit(NEW.organization_id) THEN
    RAISE EXCEPTION 'Bike limit reached. Please upgrade your plan.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_bike_limit_trigger ON bikes;
CREATE TRIGGER check_bike_limit_trigger
  BEFORE INSERT ON bikes
  FOR EACH ROW
  EXECUTE FUNCTION enforce_bike_limit();

-- Webhook Log für Debugging
CREATE TABLE IF NOT EXISTS stripe_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_event_id 
ON stripe_webhook_logs(event_id);

-- RLS für webhook logs (nur service role)
ALTER TABLE stripe_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Ausgabe
SELECT 'Stripe Integration erfolgreich eingerichtet!' AS status;
