-- ============================================================
-- 012: Bugfix — Add missing columns from base schema
-- Fixes: BUG-001 (customer_id_number), BUG-002 (add_ons.icon)
-- These columns are defined in supabase-schema.sql but were
-- never added via ALTER TABLE in prior migrations.
-- ============================================================

-- BUG-001: bookings.customer_id_number missing
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_id_number TEXT;

-- BUG-002: add_ons.icon missing (causes PostgREST join failure)
ALTER TABLE add_ons ADD COLUMN IF NOT EXISTS icon TEXT;

-- BUG-003: organization_members.invited_email missing (TeamManagement query fails)
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS invited_email TEXT;
