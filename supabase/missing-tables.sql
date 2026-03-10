-- =====================================================
-- VeloRent Pro — MISSING TABLES
-- Run this in Supabase SQL Editor if invoices /
-- maintenance_logs / add_ons / bike_categories /
-- vouchers are missing (PGRST205 / 404 errors).
-- Safe to run multiple times (IF NOT EXISTS).
-- =====================================================

-- =====================================================
-- get_user_org_ids helper (required by all RLS policies below)
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add IBAN / BIC columns to organizations (if not exists)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS iban TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bic TEXT;

-- =====================================================
-- invoices
-- =====================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 19,
    tax_amount DECIMAL(10,2),
    total DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'draft',
    due_date DATE,
    paid_at TIMESTAMPTZ,
    items JSONB NOT NULL DEFAULT '[]',
    notes TEXT,
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view invoices" ON invoices;
DROP POLICY IF EXISTS "Members can manage invoices" ON invoices;
CREATE POLICY "Members can view invoices" ON invoices
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));
CREATE POLICY "Members can manage invoices" ON invoices
    FOR ALL USING (organization_id IN (SELECT get_user_org_ids()));

-- =====================================================
-- maintenance_logs
-- =====================================================
CREATE TABLE IF NOT EXISTS maintenance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    bike_id UUID REFERENCES bikes(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    description TEXT,
    cost DECIMAL(10,2),
    performed_by TEXT,
    performed_at DATE,
    next_due DATE,
    status TEXT DEFAULT 'completed',
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_maintenance_bike ON maintenance_logs(bike_id);
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view maintenance" ON maintenance_logs;
DROP POLICY IF EXISTS "Members can manage maintenance" ON maintenance_logs;
CREATE POLICY "Members can view maintenance" ON maintenance_logs
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));
CREATE POLICY "Members can manage maintenance" ON maintenance_logs
    FOR ALL USING (organization_id IN (SELECT get_user_org_ids()));

-- =====================================================
-- add_ons
-- =====================================================
CREATE TABLE IF NOT EXISTS add_ons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_type TEXT DEFAULT 'per_day',
    is_active BOOLEAN DEFAULT TRUE,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_add_ons_org ON add_ons(organization_id);
ALTER TABLE add_ons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view add_ons" ON add_ons;
DROP POLICY IF EXISTS "Members can manage add_ons" ON add_ons;
CREATE POLICY "Members can view add_ons" ON add_ons
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));
CREATE POLICY "Members can manage add_ons" ON add_ons
    FOR ALL USING (organization_id IN (SELECT get_user_org_ids()));

-- =====================================================
-- bike_categories
-- =====================================================
CREATE TABLE IF NOT EXISTS bike_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366f1',
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bike_categories_org ON bike_categories(organization_id);
ALTER TABLE bike_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view bike_categories" ON bike_categories;
DROP POLICY IF EXISTS "Members can manage bike_categories" ON bike_categories;
CREATE POLICY "Members can view bike_categories" ON bike_categories
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));
CREATE POLICY "Members can manage bike_categories" ON bike_categories
    FOR ALL USING (organization_id IN (SELECT get_user_org_ids()));

-- =====================================================
-- vouchers
-- =====================================================
CREATE TABLE IF NOT EXISTS vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    discount_type TEXT DEFAULT 'percent',
    discount_value DECIMAL(10,2) NOT NULL,
    min_booking_value DECIMAL(10,2),
    max_uses INTEGER,
    uses_count INTEGER DEFAULT 0,
    valid_from DATE,
    valid_until DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, code)
);
CREATE INDEX IF NOT EXISTS idx_vouchers_org ON vouchers(organization_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(organization_id, code);
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view vouchers" ON vouchers;
DROP POLICY IF EXISTS "Members can manage vouchers" ON vouchers;
CREATE POLICY "Members can view vouchers" ON vouchers
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));
CREATE POLICY "Members can manage vouchers" ON vouchers
    FOR ALL USING (organization_id IN (SELECT get_user_org_ids()));

-- =====================================================
-- booking_history (create if missing + RLS policies)
-- =====================================================
CREATE TABLE IF NOT EXISTS booking_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    changes JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_booking_history_booking ON booking_history(booking_id);
ALTER TABLE booking_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view booking history" ON booking_history;
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
-- profiles: backfill missing profiles for existing users
-- (fixes 406 error on loadProfile if trigger was missing)
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
-- handle_new_user trigger (idempotent re-create)
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
