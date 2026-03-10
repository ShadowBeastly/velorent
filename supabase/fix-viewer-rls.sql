-- =====================================================
-- RentCore — VIEWER ROLE RLS FIX
-- Run in Supabase SQL Editor.
-- Splits the FOR ALL policies on core tables so that
-- "viewer" role members can read data but cannot write.
-- Safe to run multiple times (DROP POLICY IF EXISTS).
-- =====================================================

-- =====================================================
-- Helper: get_user_write_org_ids()
-- Returns org IDs where the current user has a write
-- role (owner, admin, or member — NOT viewer).
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_write_org_ids()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
      AND status = 'active'
      AND role != 'viewer';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- bikes
-- =====================================================
DROP POLICY IF EXISTS "Members can view bikes" ON bikes;
DROP POLICY IF EXISTS "Members can manage bikes" ON bikes;
-- Legacy catch-all policy names (in case they exist)
DROP POLICY IF EXISTS "org_members_all" ON bikes;
DROP POLICY IF EXISTS "Members can do all on bikes" ON bikes;

CREATE POLICY "Members can view bikes" ON bikes
    FOR SELECT
    USING (organization_id IN (SELECT get_user_org_ids()));

DROP POLICY IF EXISTS "Members can write bikes" ON bikes;
CREATE POLICY "Members can write bikes" ON bikes
    FOR INSERT
    WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));

DROP POLICY IF EXISTS "Members can update bikes" ON bikes;
CREATE POLICY "Members can update bikes" ON bikes
    FOR UPDATE
    USING (organization_id IN (SELECT get_user_write_org_ids()))
    WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));

DROP POLICY IF EXISTS "Members can delete bikes" ON bikes;
CREATE POLICY "Members can delete bikes" ON bikes
    FOR DELETE
    USING (organization_id IN (SELECT get_user_write_org_ids()));

-- =====================================================
-- bookings
-- =====================================================
DROP POLICY IF EXISTS "Members can view bookings" ON bookings;
DROP POLICY IF EXISTS "Members can manage bookings" ON bookings;
DROP POLICY IF EXISTS "org_members_all" ON bookings;
DROP POLICY IF EXISTS "Members can do all on bookings" ON bookings;

CREATE POLICY "Members can view bookings" ON bookings
    FOR SELECT
    USING (organization_id IN (SELECT get_user_org_ids()));

DROP POLICY IF EXISTS "Members can write bookings" ON bookings;
CREATE POLICY "Members can write bookings" ON bookings
    FOR INSERT
    WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));

DROP POLICY IF EXISTS "Members can update bookings" ON bookings;
CREATE POLICY "Members can update bookings" ON bookings
    FOR UPDATE
    USING (organization_id IN (SELECT get_user_write_org_ids()))
    WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));

DROP POLICY IF EXISTS "Members can delete bookings" ON bookings;
CREATE POLICY "Members can delete bookings" ON bookings
    FOR DELETE
    USING (organization_id IN (SELECT get_user_write_org_ids()));

-- =====================================================
-- customers
-- =====================================================
DROP POLICY IF EXISTS "Members can view customers" ON customers;
DROP POLICY IF EXISTS "Members can manage customers" ON customers;
DROP POLICY IF EXISTS "org_members_all" ON customers;
DROP POLICY IF EXISTS "Members can do all on customers" ON customers;

CREATE POLICY "Members can view customers" ON customers
    FOR SELECT
    USING (organization_id IN (SELECT get_user_org_ids()));

DROP POLICY IF EXISTS "Members can write customers" ON customers;
CREATE POLICY "Members can write customers" ON customers
    FOR INSERT
    WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));

DROP POLICY IF EXISTS "Members can update customers" ON customers;
CREATE POLICY "Members can update customers" ON customers
    FOR UPDATE
    USING (organization_id IN (SELECT get_user_write_org_ids()))
    WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));

DROP POLICY IF EXISTS "Members can delete customers" ON customers;
CREATE POLICY "Members can delete customers" ON customers
    FOR DELETE
    USING (organization_id IN (SELECT get_user_write_org_ids()));

-- =====================================================
-- invoices
-- =====================================================
DROP POLICY IF EXISTS "Members can view invoices" ON invoices;
DROP POLICY IF EXISTS "Members can manage invoices" ON invoices;
DROP POLICY IF EXISTS "org_members_all" ON invoices;
DROP POLICY IF EXISTS "Members can do all on invoices" ON invoices;

CREATE POLICY "Members can view invoices" ON invoices
    FOR SELECT
    USING (organization_id IN (SELECT get_user_org_ids()));

DROP POLICY IF EXISTS "Members can write invoices" ON invoices;
CREATE POLICY "Members can write invoices" ON invoices
    FOR INSERT
    WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));

DROP POLICY IF EXISTS "Members can update invoices" ON invoices;
CREATE POLICY "Members can update invoices" ON invoices
    FOR UPDATE
    USING (organization_id IN (SELECT get_user_write_org_ids()))
    WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));

DROP POLICY IF EXISTS "Members can delete invoices" ON invoices;
CREATE POLICY "Members can delete invoices" ON invoices
    FOR DELETE
    USING (organization_id IN (SELECT get_user_write_org_ids()));

-- =====================================================
-- maintenance_logs
-- =====================================================
DROP POLICY IF EXISTS "Members can view maintenance" ON maintenance_logs;
DROP POLICY IF EXISTS "Members can manage maintenance" ON maintenance_logs;
CREATE POLICY "Members can view maintenance" ON maintenance_logs
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));
DROP POLICY IF EXISTS "Members can write maintenance" ON maintenance_logs;
CREATE POLICY "Members can write maintenance" ON maintenance_logs
    FOR INSERT WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));
DROP POLICY IF EXISTS "Members can update maintenance" ON maintenance_logs;
CREATE POLICY "Members can update maintenance" ON maintenance_logs
    FOR UPDATE
    USING (organization_id IN (SELECT get_user_write_org_ids()))
    WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));
DROP POLICY IF EXISTS "Members can delete maintenance" ON maintenance_logs;
CREATE POLICY "Members can delete maintenance" ON maintenance_logs
    FOR DELETE USING (organization_id IN (SELECT get_user_write_org_ids()));

-- =====================================================
-- add_ons
-- =====================================================
DROP POLICY IF EXISTS "Members can view add_ons" ON add_ons;
DROP POLICY IF EXISTS "Members can manage add_ons" ON add_ons;
CREATE POLICY "Members can view add_ons" ON add_ons
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));
DROP POLICY IF EXISTS "Members can write add_ons" ON add_ons;
CREATE POLICY "Members can write add_ons" ON add_ons
    FOR INSERT WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));
DROP POLICY IF EXISTS "Members can update add_ons" ON add_ons;
CREATE POLICY "Members can update add_ons" ON add_ons
    FOR UPDATE
    USING (organization_id IN (SELECT get_user_write_org_ids()))
    WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));
DROP POLICY IF EXISTS "Members can delete add_ons" ON add_ons;
CREATE POLICY "Members can delete add_ons" ON add_ons
    FOR DELETE USING (organization_id IN (SELECT get_user_write_org_ids()));

-- =====================================================
-- bike_categories
-- =====================================================
DROP POLICY IF EXISTS "Members can view bike_categories" ON bike_categories;
DROP POLICY IF EXISTS "Members can manage bike_categories" ON bike_categories;
CREATE POLICY "Members can view bike_categories" ON bike_categories
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));
DROP POLICY IF EXISTS "Members can write bike_categories" ON bike_categories;
CREATE POLICY "Members can write bike_categories" ON bike_categories
    FOR INSERT WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));
DROP POLICY IF EXISTS "Members can update bike_categories" ON bike_categories;
CREATE POLICY "Members can update bike_categories" ON bike_categories
    FOR UPDATE
    USING (organization_id IN (SELECT get_user_write_org_ids()))
    WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));
DROP POLICY IF EXISTS "Members can delete bike_categories" ON bike_categories;
CREATE POLICY "Members can delete bike_categories" ON bike_categories
    FOR DELETE USING (organization_id IN (SELECT get_user_write_org_ids()));

-- =====================================================
-- vouchers
-- =====================================================
DROP POLICY IF EXISTS "Members can view vouchers" ON vouchers;
DROP POLICY IF EXISTS "Members can manage vouchers" ON vouchers;
CREATE POLICY "Members can view vouchers" ON vouchers
    FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));
DROP POLICY IF EXISTS "Members can write vouchers" ON vouchers;
CREATE POLICY "Members can write vouchers" ON vouchers
    FOR INSERT WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));
DROP POLICY IF EXISTS "Members can update vouchers" ON vouchers;
CREATE POLICY "Members can update vouchers" ON vouchers
    FOR UPDATE
    USING (organization_id IN (SELECT get_user_write_org_ids()))
    WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));
DROP POLICY IF EXISTS "Members can delete vouchers" ON vouchers;
CREATE POLICY "Members can delete vouchers" ON vouchers
    FOR DELETE USING (organization_id IN (SELECT get_user_write_org_ids()));

-- =====================================================
-- booking_items (scoped via bookings)
-- Only applied if the table exists (created by group-bookings.sql)
-- =====================================================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'booking_items') THEN
        DROP POLICY IF EXISTS "Members can manage booking_items" ON booking_items;
        DROP POLICY IF EXISTS "Members can view booking_items" ON booking_items;
        CREATE POLICY "Members can view booking_items" ON booking_items
            FOR SELECT USING (
                booking_id IN (SELECT id FROM bookings WHERE organization_id IN (SELECT get_user_org_ids()))
            );
        DROP POLICY IF EXISTS "Members can write booking_items" ON booking_items;
        CREATE POLICY "Members can write booking_items" ON booking_items
            FOR INSERT WITH CHECK (
                booking_id IN (SELECT id FROM bookings WHERE organization_id IN (SELECT get_user_write_org_ids()))
            );
        DROP POLICY IF EXISTS "Members can delete booking_items" ON booking_items;
        CREATE POLICY "Members can delete booking_items" ON booking_items
            FOR DELETE USING (
                booking_id IN (SELECT id FROM bookings WHERE organization_id IN (SELECT get_user_write_org_ids()))
            );
    ELSE
        RAISE NOTICE 'booking_items table not found — run group-bookings.sql first, then re-run this file.';
    END IF;
END $$;

-- =====================================================
-- booking_addons (scoped via bookings)
-- Only applied if the table exists (created by booking-addons.sql)
-- =====================================================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'booking_addons') THEN
        DROP POLICY IF EXISTS "Members can manage booking_addons" ON booking_addons;
        DROP POLICY IF EXISTS "Members can view booking_addons" ON booking_addons;
        CREATE POLICY "Members can view booking_addons" ON booking_addons
            FOR SELECT USING (
                booking_id IN (SELECT id FROM bookings WHERE organization_id IN (SELECT get_user_org_ids()))
            );
        DROP POLICY IF EXISTS "Members can write booking_addons" ON booking_addons;
        CREATE POLICY "Members can write booking_addons" ON booking_addons
            FOR INSERT WITH CHECK (
                booking_id IN (SELECT id FROM bookings WHERE organization_id IN (SELECT get_user_write_org_ids()))
            );
        DROP POLICY IF EXISTS "Members can delete booking_addons" ON booking_addons;
        CREATE POLICY "Members can delete booking_addons" ON booking_addons
            FOR DELETE USING (
                booking_id IN (SELECT id FROM bookings WHERE organization_id IN (SELECT get_user_write_org_ids()))
            );
    ELSE
        RAISE NOTICE 'booking_addons table not found — run booking-addons.sql first, then re-run this file.';
    END IF;
END $$;
