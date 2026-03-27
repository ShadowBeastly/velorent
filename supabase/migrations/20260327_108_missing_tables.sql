-- =====================================================
-- Migration: 20260327_108_missing_tables
-- Creates all tables referenced in code but missing
-- from prior migrations.
--
-- Tables created:
--   1. invoices
--   2. maintenance_logs
--   3. add_ons
--   4. item_categories  (+ bike_categories view for compat)
--   5. vouchers
--   6. booking_history
--   7. booking_addons
--   8. booking_items
--   9. pricing_rules
--
-- All FKs to `bikes`  → rewritten to `items`
-- All FKs to `hotels` → rewritten to `venues`
-- All tables use IF NOT EXISTS (safe to re-run).
--
-- ROLLBACK (manual — no auto-rollback in Supabase):
--   DROP TABLE IF EXISTS pricing_rules CASCADE;
--   DROP TABLE IF EXISTS booking_items CASCADE;
--   DROP TABLE IF EXISTS booking_addons CASCADE;
--   DROP TABLE IF EXISTS booking_history CASCADE;
--   DROP TABLE IF EXISTS vouchers CASCADE;
--   DROP TABLE IF EXISTS item_categories CASCADE;
--   DROP VIEW  IF EXISTS bike_categories CASCADE;
--   DROP TABLE IF EXISTS add_ons CASCADE;
--   DROP TABLE IF EXISTS maintenance_logs CASCADE;
--   DROP TABLE IF EXISTS invoices CASCADE;
-- =====================================================

BEGIN;

-- =====================================================
-- Helper: get_user_org_ids (idempotent)
-- Required by all RLS policies below.
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Extend organizations with payment columns
-- =====================================================
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS iban TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bic  TEXT;

-- =====================================================
-- 1. invoices
-- =====================================================
CREATE TABLE IF NOT EXISTS invoices (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    booking_id      UUID REFERENCES bookings(id) ON DELETE SET NULL,
    customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
    invoice_number  TEXT NOT NULL,
    subtotal        DECIMAL(10,2) NOT NULL,
    tax_rate        DECIMAL(5,2)  DEFAULT 19,
    tax_amount      DECIMAL(10,2),
    total           DECIMAL(10,2) NOT NULL,
    status          TEXT DEFAULT 'draft',
    due_date        DATE,
    paid_at         TIMESTAMPTZ,
    items           JSONB NOT NULL DEFAULT '[]',
    notes           TEXT,
    pdf_url         TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view invoices"   ON invoices;
DROP POLICY IF EXISTS "Members can manage invoices" ON invoices;

CREATE POLICY "Members can view invoices" ON invoices
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Members can manage invoices" ON invoices
    FOR ALL USING (organization_id IN (SELECT get_user_org_ids()));

-- =====================================================
-- 2. maintenance_logs
--    bike_id → item_id (references items, not bikes view)
-- =====================================================
CREATE TABLE IF NOT EXISTS maintenance_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    item_id         UUID REFERENCES items(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    description     TEXT,
    cost            DECIMAL(10,2),
    performed_by    TEXT,
    performed_at    DATE,
    next_due        DATE,
    status          TEXT DEFAULT 'completed',
    attachments     JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- If table already existed with bike_id column, rename it to item_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='maintenance_logs' AND column_name='bike_id') THEN
    ALTER TABLE maintenance_logs RENAME COLUMN bike_id TO item_id;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_maintenance_item ON maintenance_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_org  ON maintenance_logs(organization_id);

ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view maintenance"   ON maintenance_logs;
DROP POLICY IF EXISTS "Members can manage maintenance" ON maintenance_logs;

CREATE POLICY "Members can view maintenance" ON maintenance_logs
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Members can manage maintenance" ON maintenance_logs
    FOR ALL USING (organization_id IN (SELECT get_user_org_ids()));

-- =====================================================
-- 3. add_ons
-- =====================================================
CREATE TABLE IF NOT EXISTS add_ons (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    price           DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_type      TEXT DEFAULT 'per_day',
    is_active       BOOLEAN DEFAULT TRUE,
    icon            TEXT,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_add_ons_org ON add_ons(organization_id);

ALTER TABLE add_ons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view add_ons"   ON add_ons;
DROP POLICY IF EXISTS "Members can manage add_ons" ON add_ons;

CREATE POLICY "Members can view add_ons" ON add_ons
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Members can manage add_ons" ON add_ons
    FOR ALL USING (organization_id IN (SELECT get_user_org_ids()));

-- =====================================================
-- 4. item_categories  (replaces bike_categories)
--    A bike_categories VIEW is created for backward compat.
-- =====================================================
CREATE TABLE IF NOT EXISTS item_categories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    color           TEXT DEFAULT '#6366f1',
    icon            TEXT,
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_item_categories_org ON item_categories(organization_id);

ALTER TABLE item_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view item_categories"   ON item_categories;
DROP POLICY IF EXISTS "Members can manage item_categories" ON item_categories;

CREATE POLICY "Members can view item_categories" ON item_categories
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Members can manage item_categories" ON item_categories
    FOR ALL USING (organization_id IN (SELECT get_user_org_ids()));

-- Backward-compat view so legacy code referencing bike_categories still works
CREATE OR REPLACE VIEW bike_categories AS
    SELECT * FROM item_categories;

-- =====================================================
-- 5. vouchers
-- =====================================================
CREATE TABLE IF NOT EXISTS vouchers (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    code                TEXT NOT NULL,
    description         TEXT,
    discount_type       TEXT DEFAULT 'percent',
    discount_value      DECIMAL(10,2) NOT NULL,
    min_booking_value   DECIMAL(10,2),
    max_uses            INTEGER,
    uses_count          INTEGER DEFAULT 0,
    valid_from          DATE,
    valid_until         DATE,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_vouchers_org  ON vouchers(organization_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(organization_id, code);

ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view vouchers"   ON vouchers;
DROP POLICY IF EXISTS "Members can manage vouchers" ON vouchers;

CREATE POLICY "Members can view vouchers" ON vouchers
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Members can manage vouchers" ON vouchers
    FOR ALL USING (organization_id IN (SELECT get_user_org_ids()));

-- =====================================================
-- 6. booking_history
-- =====================================================
CREATE TABLE IF NOT EXISTS booking_history (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id  UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
    action      TEXT NOT NULL,
    changed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    changes     JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_history_booking ON booking_history(booking_id);

ALTER TABLE booking_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view booking history"   ON booking_history;
DROP POLICY IF EXISTS "Members can insert booking history" ON booking_history;

CREATE POLICY "Members can view booking history" ON booking_history
    FOR SELECT USING (
        booking_id IN (
            SELECT id FROM bookings
            WHERE organization_id IN (SELECT get_user_org_ids())
        )
    );

CREATE POLICY "Members can insert booking history" ON booking_history
    FOR INSERT WITH CHECK (
        booking_id IN (
            SELECT id FROM bookings
            WHERE organization_id IN (SELECT get_user_org_ids())
        )
    );

-- =====================================================
-- 7. booking_addons
-- =====================================================
CREATE TABLE IF NOT EXISTS booking_addons (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id  UUID REFERENCES bookings(id)  ON DELETE CASCADE NOT NULL,
    addon_id    UUID REFERENCES add_ons(id)   ON DELETE SET NULL,
    addon_name  TEXT NOT NULL,
    price_type  TEXT DEFAULT 'per_day',         -- per_day | flat | per_booking
    unit_price  DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_addons_booking ON booking_addons(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_addons_addon   ON booking_addons(addon_id);

ALTER TABLE booking_addons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can manage booking_addons" ON booking_addons;

CREATE POLICY "Members can manage booking_addons" ON booking_addons
    FOR ALL USING (
        booking_id IN (
            SELECT id FROM bookings
            WHERE organization_id IN (SELECT get_user_org_ids())
        )
    );

-- =====================================================
-- 8. booking_items  (multi-item / group bookings)
--    bike_id → item_id (references items, not bikes view)
-- =====================================================
CREATE TABLE IF NOT EXISTS booking_items (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id    UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
    item_id       UUID REFERENCES items(id)    ON DELETE SET NULL,
    price_per_day DECIMAL(10,2),
    subtotal      DECIMAL(10,2),
    notes         TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- If table already existed with bike_id column, rename to item_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='booking_items' AND column_name='bike_id') THEN
    ALTER TABLE booking_items RENAME COLUMN bike_id TO item_id;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_item    ON booking_items(item_id);

ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can manage booking_items" ON booking_items;

CREATE POLICY "Members can manage booking_items" ON booking_items
    FOR ALL USING (
        booking_id IN (
            SELECT id FROM bookings
            WHERE organization_id IN (SELECT get_user_org_ids())
        )
    );

-- Extend bookings with group-booking metadata (idempotent)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_group_booking BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS bike_count       INTEGER DEFAULT 1;

-- =====================================================
-- 9. pricing_rules
--    bike_category_id → references item_categories
-- =====================================================
CREATE TABLE IF NOT EXISTS pricing_rules (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id  UUID REFERENCES organizations(id)    ON DELETE CASCADE NOT NULL,
    name             TEXT NOT NULL,
    type             TEXT NOT NULL,
    -- seasonal: date-range multiplier
    start_date       DATE,
    end_date         DATE,
    -- duration: book X+ days = discount
    min_days         INTEGER,
    max_days         INTEGER,
    -- weekend: Fri-Sun surcharge
    days_of_week     INTEGER[],                            -- 0=Sun … 6=Sat
    -- modifier
    modifier_type    TEXT NOT NULL DEFAULT 'multiplier',
    modifier_value   DECIMAL(10,2) NOT NULL DEFAULT 1,
    -- optional scope: NULL = applies to all categories
    item_category_id UUID REFERENCES item_categories(id)  ON DELETE SET NULL,
    -- legacy columns kept for backward compatibility
    bike_category    TEXT,
    discount_percent DECIMAL(5,2),
    discount_fixed   DECIMAL(10,2),
    price_override   DECIMAL(10,2),
    is_active        BOOLEAN DEFAULT TRUE,
    priority         INTEGER DEFAULT 0,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent column additions (in case table existed with old layout)
ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS modifier_type    TEXT          DEFAULT 'multiplier';
ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS modifier_value   DECIMAL(10,2) DEFAULT 1;
ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS item_category_id UUID REFERENCES item_categories(id) ON DELETE SET NULL;
-- If table already existed with bike_category_id, rename to item_category_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pricing_rules' AND column_name='bike_category_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pricing_rules' AND column_name='item_category_id') THEN
    ALTER TABLE pricing_rules RENAME COLUMN bike_category_id TO item_category_id;
  END IF;
END $$;
ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS min_days         INTEGER;
ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS max_days         INTEGER;
ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS days_of_week     INTEGER[];

-- Widen the type CHECK to cover all variants used in code
ALTER TABLE pricing_rules DROP CONSTRAINT IF EXISTS pricing_rules_type_check;
ALTER TABLE pricing_rules ADD  CONSTRAINT pricing_rules_type_check
    CHECK (type IN ('seasonal', 'duration', 'weekend', 'long_term', 'early_bird'));

CREATE INDEX IF NOT EXISTS idx_pricing_rules_org    ON pricing_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_active ON pricing_rules(organization_id, is_active);

ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view pricing_rules"   ON pricing_rules;
DROP POLICY IF EXISTS "Members can manage pricing_rules" ON pricing_rules;
-- also drop legacy policy names from older ad-hoc scripts
DROP POLICY IF EXISTS "Members can view pricing"  ON pricing_rules;
DROP POLICY IF EXISTS "Admins can manage pricing" ON pricing_rules;

CREATE POLICY "Members can view pricing_rules" ON pricing_rules
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Members can manage pricing_rules" ON pricing_rules
    FOR ALL USING (organization_id IN (SELECT get_user_org_ids()));

-- =====================================================
-- Backfill: ensure every auth.users row has a profile
-- (guards against 406 if the trigger was ever missing)
-- =====================================================
INSERT INTO profiles (id, email, full_name)
SELECT
    id,
    COALESCE(email, id::text || '@placeholder.local'),
    COALESCE(raw_user_meta_data->>'full_name', split_part(COALESCE(email, ''), '@', 1))
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- handle_new_user trigger (idempotent)
-- =====================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

COMMIT;

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
