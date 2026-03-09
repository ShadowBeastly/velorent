-- =====================================================
-- VeloRent Pro — PRICING RULES MIGRATION
-- Run this in Supabase SQL Editor to add the
-- dynamic/seasonal pricing table.
-- Safe to run multiple times (IF NOT EXISTS).
-- =====================================================

-- The pricing_rules table already exists in supabase-schema.sql
-- but uses an older column layout. This migration extends it with
-- the modifier_type / modifier_value approach while remaining
-- backward-compatible with existing rows (all new columns are nullable
-- or have defaults).

-- 1. Ensure the table exists (matches the schema.sql definition)
CREATE TABLE IF NOT EXISTS pricing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('seasonal', 'duration', 'weekend')),
    -- seasonal: date-range based multiplier
    start_date DATE,
    end_date DATE,
    -- duration: book X+ days = discount
    min_days INTEGER,
    -- weekend: Fri–Sun surcharge
    days_of_week INTEGER[],         -- 0=Sun, 1=Mon … 5=Fri, 6=Sat
    -- the modifier
    modifier_type TEXT NOT NULL DEFAULT 'multiplier'
        CHECK (modifier_type IN ('multiplier', 'fixed_override', 'discount_percent')),
    modifier_value DECIMAL(10,2) NOT NULL DEFAULT 1,
    -- optional scope: applies only to this category (NULL = all)
    bike_category_id UUID REFERENCES bike_categories(id) ON DELETE SET NULL,
    -- legacy columns kept for backward compatibility
    bike_category TEXT,
    discount_percent DECIMAL(5,2),
    discount_fixed DECIMAL(10,2),
    price_override DECIMAL(10,2),
    max_days INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add new columns if the table already exists (idempotent)
ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS modifier_type TEXT DEFAULT 'multiplier';
ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS modifier_value DECIMAL(10,2) DEFAULT 1;
ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS bike_category_id UUID REFERENCES bike_categories(id) ON DELETE SET NULL;
ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS min_days INTEGER;
ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS days_of_week INTEGER[];

-- 3. Update type CHECK to allow 'duration' (previous schema used 'long_term')
--    Cannot ALTER CHECK inline; use a separate constraint with a safe name.
ALTER TABLE pricing_rules DROP CONSTRAINT IF EXISTS pricing_rules_type_check;
ALTER TABLE pricing_rules ADD CONSTRAINT pricing_rules_type_check
    CHECK (type IN ('seasonal', 'duration', 'weekend', 'long_term', 'early_bird'));

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_pricing_rules_org ON pricing_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_active ON pricing_rules(organization_id, is_active);

-- 5. RLS
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view pricing_rules" ON pricing_rules;
DROP POLICY IF EXISTS "Members can manage pricing_rules" ON pricing_rules;
DROP POLICY IF EXISTS "Members can view pricing" ON pricing_rules;
DROP POLICY IF EXISTS "Admins can manage pricing" ON pricing_rules;

CREATE POLICY "Members can view pricing_rules" ON pricing_rules
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Members can manage pricing_rules" ON pricing_rules
    FOR ALL USING (organization_id IN (SELECT get_user_org_ids()));
