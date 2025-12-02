-- =====================================================
-- VELORENT PRO - CLOUD SAAS DATABASE SCHEMA
-- Supabase PostgreSQL Schema mit Row Level Security
-- Multi-Tenant Architektur für Hotels, Verleiher etc.
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ORGANIZATIONS (Tenants - Hotels, Verleiher etc.)
-- =====================================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- z.B. "hotel-zur-post" für Subdomain
    address TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'DE',
    phone TEXT,
    email TEXT,
    website TEXT,
    tax_id TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}', -- Individuelle Einstellungen
    subscription_tier TEXT DEFAULT 'free', -- free, starter, pro, enterprise
    subscription_status TEXT DEFAULT 'active',
    trial_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. USERS & ORGANIZATION MEMBERSHIP
-- =====================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    role TEXT DEFAULT 'member', -- superadmin, owner, admin, member
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- owner, admin, member, viewer
    invited_by UUID REFERENCES profiles(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active', -- active, invited, suspended
    UNIQUE(organization_id, user_id)
);

-- =====================================================
-- 3. BIKES (Fahrräder/Mietobjekte)
-- =====================================================
CREATE TABLE bikes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'E-Bike', -- E-Bike, E-MTB, Lastenrad, Kinder, Bio, Scooter, etc.
    brand TEXT,
    model TEXT,
    size TEXT,
    color TEXT,
    frame_number TEXT,
    price_per_day DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_per_week DECIMAL(10,2), -- Optional: Wochenpreis
    price_per_hour DECIMAL(10,2), -- Optional: Stundenpreis
    deposit DECIMAL(10,2) DEFAULT 50,
    battery TEXT, -- z.B. "625Wh"
    motor TEXT,
    year INTEGER,
    purchase_price DECIMAL(10,2),
    image_url TEXT,
    status TEXT DEFAULT 'available', -- available, rented, maintenance, retired
    notes TEXT,
    accessories JSONB DEFAULT '[]', -- Verfügbares Zubehör
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bikes_org ON bikes(organization_id);
CREATE INDEX idx_bikes_status ON bikes(organization_id, status);

-- =====================================================
-- 4. CUSTOMERS (Kunden)
-- =====================================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'DE',
    id_type TEXT, -- passport, id_card, drivers_license
    id_number TEXT,
    date_of_birth DATE,
    notes TEXT,
    tags JSONB DEFAULT '[]',
    total_bookings INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    last_booking_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_org ON customers(organization_id);
CREATE INDEX idx_customers_email ON customers(organization_id, email);

-- =====================================================
-- 5. BOOKINGS (Buchungen)
-- =====================================================
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    booking_number TEXT, -- Human-readable: VR-2024-001
    bike_id UUID REFERENCES bikes(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    
    -- Kundendaten (auch ohne Customer-Datensatz)
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    customer_id_number TEXT,
    
    -- Zeitraum
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    
    -- Orte
    pickup_location TEXT,
    return_location TEXT,
    
    -- Preise
    price_per_day DECIMAL(10,2),
    total_days INTEGER,
    subtotal DECIMAL(10,2),
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 19,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL,
    deposit_amount DECIMAL(10,2) DEFAULT 0,
    deposit_paid BOOLEAN DEFAULT FALSE,
    deposit_returned BOOLEAN DEFAULT FALSE,
    
    -- Zahlung
    payment_status TEXT DEFAULT 'pending', -- pending, partial, paid, refunded
    payment_method TEXT, -- cash, card, transfer, paypal
    paid_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'reserved', -- reserved, confirmed, picked_up, returned, cancelled, no_show
    
    -- Zubehör
    accessories JSONB DEFAULT '{}', -- {lock: true, helmet: false, ...}
    
    -- Sonstiges
    notes TEXT,
    internal_notes TEXT,
    source TEXT DEFAULT 'manual', -- manual, website, booking.com, api
    created_by UUID REFERENCES profiles(id),
    confirmed_by UUID REFERENCES profiles(id),
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_org ON bookings(organization_id);
CREATE INDEX idx_bookings_dates ON bookings(organization_id, start_date, end_date);
CREATE INDEX idx_bookings_bike ON bookings(bike_id, start_date, end_date);
CREATE INDEX idx_bookings_status ON bookings(organization_id, status);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);

-- =====================================================
-- 6. BOOKING HISTORY / AUDIT LOG
-- =====================================================
CREATE TABLE booking_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- created, updated, status_changed, payment_received
    old_values JSONB,
    new_values JSONB,
    performed_by UUID REFERENCES profiles(id),
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX idx_booking_history ON booking_history(booking_id);

-- =====================================================
-- 7. INVOICES
-- =====================================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    
    -- Beträge
    subtotal DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 19,
    tax_amount DECIMAL(10,2),
    total DECIMAL(10,2) NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
    due_date DATE,
    paid_at TIMESTAMPTZ,
    
    -- Inhalte
    items JSONB NOT NULL DEFAULT '[]',
    notes TEXT,
    
    -- PDF
    pdf_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_org ON invoices(organization_id);

-- =====================================================
-- 8. MAINTENANCE LOGS
-- =====================================================
CREATE TABLE maintenance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    bike_id UUID REFERENCES bikes(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- inspection, repair, service, damage
    description TEXT,
    cost DECIMAL(10,2),
    performed_by TEXT,
    performed_at DATE,
    next_due DATE,
    status TEXT DEFAULT 'completed', -- scheduled, in_progress, completed
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_maintenance_bike ON maintenance_logs(bike_id);

-- =====================================================
-- 9. LOCATIONS (für Multi-Standort)
-- =====================================================
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    phone TEXT,
    email TEXT,
    opening_hours JSONB, -- {"mon": "09:00-18:00", ...}
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_locations_org ON locations(organization_id);

-- =====================================================
-- 10. PRICING RULES (Dynamische Preise)
-- =====================================================
CREATE TABLE pricing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- seasonal, weekend, long_term, early_bird
    bike_category TEXT, -- NULL = alle
    start_date DATE,
    end_date DATE,
    days_of_week INTEGER[], -- {0,6} = Sa+So
    min_days INTEGER,
    max_days INTEGER,
    discount_percent DECIMAL(5,2),
    discount_fixed DECIMAL(10,2),
    price_override DECIMAL(10,2),
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pricing_org ON pricing_rules(organization_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

-- Helper function: Get user's organizations
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Organizations: Members can view their orgs
CREATE POLICY "Members can view their organizations" ON organizations
    FOR SELECT USING (id IN (SELECT get_user_org_ids()));
CREATE POLICY "Owners can update their organizations" ON organizations
    FOR UPDATE USING (
        id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Organization Members
CREATE POLICY "Members can view org members" ON organization_members
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));
CREATE POLICY "Admins can manage org members" ON organization_members
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Bikes: Organization members can access
CREATE POLICY "Members can view bikes" ON bikes
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));
CREATE POLICY "Members can manage bikes" ON bikes
    FOR ALL USING (organization_id IN (SELECT get_user_org_ids()));

-- Customers
CREATE POLICY "Members can view customers" ON customers
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));
CREATE POLICY "Members can manage customers" ON customers
    FOR ALL USING (organization_id IN (SELECT get_user_org_ids()));

-- Bookings
CREATE POLICY "Members can view bookings" ON bookings
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));
CREATE POLICY "Members can manage bookings" ON bookings
    FOR ALL USING (organization_id IN (SELECT get_user_org_ids()));

-- Booking History
CREATE POLICY "Members can view booking history" ON booking_history
    FOR SELECT USING (
        booking_id IN (SELECT id FROM bookings WHERE organization_id IN (SELECT get_user_org_ids()))
    );

-- Invoices
CREATE POLICY "Members can view invoices" ON invoices
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));
CREATE POLICY "Members can manage invoices" ON invoices
    FOR ALL USING (organization_id IN (SELECT get_user_org_ids()));

-- Maintenance
CREATE POLICY "Members can view maintenance" ON maintenance_logs
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));
CREATE POLICY "Members can manage maintenance" ON maintenance_logs
    FOR ALL USING (organization_id IN (SELECT get_user_org_ids()));

-- Locations
CREATE POLICY "Members can view locations" ON locations
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));
CREATE POLICY "Admins can manage locations" ON locations
    FOR ALL USING (organization_id IN (SELECT get_user_org_ids()));

-- Pricing Rules
CREATE POLICY "Members can view pricing" ON pricing_rules
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));
CREATE POLICY "Admins can manage pricing" ON pricing_rules
    FOR ALL USING (organization_id IN (SELECT get_user_org_ids()));

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_bikes_updated_at BEFORE UPDATE ON bikes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Generate booking number
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
DECLARE
    year_str TEXT;
    seq_num INTEGER;
BEGIN
    year_str := TO_CHAR(NOW(), 'YYYY');
    
    SELECT COALESCE(MAX(
        CAST(SPLIT_PART(booking_number, '-', 3) AS INTEGER)
    ), 0) + 1
    INTO seq_num
    FROM bookings
    WHERE organization_id = NEW.organization_id
    AND booking_number LIKE 'VR-' || year_str || '-%';
    
    NEW.booking_number := 'VR-' || year_str || '-' || LPAD(seq_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_booking_number BEFORE INSERT ON bookings
    FOR EACH ROW WHEN (NEW.booking_number IS NULL)
    EXECUTE FUNCTION generate_booking_number();

-- Update customer stats after booking
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.customer_id IS NOT NULL THEN
        UPDATE customers SET
            total_bookings = (
                SELECT COUNT(*) FROM bookings 
                WHERE customer_id = NEW.customer_id AND status != 'cancelled'
            ),
            total_revenue = (
                SELECT COALESCE(SUM(total_price), 0) FROM bookings 
                WHERE customer_id = NEW.customer_id AND status IN ('picked_up', 'returned')
            ),
            last_booking_at = NOW()
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_stats_trigger AFTER INSERT OR UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

-- Create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- VIEWS
-- =====================================================

-- Dashboard Stats View
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT 
    o.id as organization_id,
    (SELECT COUNT(*) FROM bikes WHERE organization_id = o.id AND status = 'available') as available_bikes,
    (SELECT COUNT(*) FROM bikes WHERE organization_id = o.id AND status = 'rented') as rented_bikes,
    (SELECT COUNT(*) FROM bookings WHERE organization_id = o.id AND status IN ('reserved', 'confirmed')) as pending_bookings,
    (SELECT COUNT(*) FROM bookings WHERE organization_id = o.id AND status = 'picked_up') as active_rentals,
    (SELECT COALESCE(SUM(total_price), 0) FROM bookings WHERE organization_id = o.id 
        AND status IN ('picked_up', 'returned') 
        AND start_date >= DATE_TRUNC('month', CURRENT_DATE)) as month_revenue,
    (SELECT COUNT(*) FROM bookings WHERE organization_id = o.id 
        AND start_date = CURRENT_DATE 
        AND status IN ('reserved', 'confirmed')) as today_pickups,
    (SELECT COUNT(*) FROM bookings WHERE organization_id = o.id 
        AND end_date = CURRENT_DATE 
        AND status = 'picked_up') as today_returns
FROM organizations o;

-- =====================================================
-- SAMPLE DATA (Optional - für Demo)
-- =====================================================

-- Wird via App erstellt beim Onboarding
