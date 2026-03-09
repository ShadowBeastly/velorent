-- =====================================================
-- VeloRent Pro — VIEWER ROLE RLS FIX
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
