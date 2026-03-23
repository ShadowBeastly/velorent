-- ============================================================
-- 20260323_audit_fixes.sql
-- Lociva Audit Bug Fixes - 2026-03-23
--
-- Addresses:
--   BUG-001: Add missing customer_id_number column to bookings
--   BUG-003: RLS policy for org members to read co-member profiles
--   BUG-008: Create stripe_events table for webhook idempotency
--
-- Run AFTER: 011_lociva_hotel_dashboard.sql
-- ============================================================


-- ── BUG-001: bookings.customer_id_number ───────────────────
-- The bookings table was missing this column, causing guest ID
-- capture to silently fail during checkout.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_id_number TEXT;


-- ── BUG-003: profiles RLS for org member joins ──────────────
-- Without this policy, authenticated queries that join profiles
-- to organization_members return empty rows for co-members,
-- breaking member directory and assignment UIs.

CREATE POLICY IF NOT EXISTS "org_members_read_profiles" ON profiles
  FOR SELECT USING (
    id IN (
      SELECT user_id FROM organization_members
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );


-- ── BUG-008: stripe_events idempotency table ────────────────
-- Stripe can deliver the same webhook event more than once.
-- Recording processed event IDs prevents double-processing
-- of payments, refunds, and other financial operations.

CREATE TABLE IF NOT EXISTS stripe_events (
  event_id     TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- Only the service role (Edge Functions / server) may read or write.
-- No authenticated or anon access is permitted.
CREATE POLICY "service_role_stripe_events" ON stripe_events
  FOR ALL USING (auth.role() = 'service_role');


-- ── Verify ──────────────────────────────────────────────────
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'bookings' AND column_name = 'customer_id_number';
-- SELECT policyname FROM pg_policies
--   WHERE tablename = 'profiles' AND policyname = 'org_members_read_profiles';
-- SELECT tablename FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name = 'stripe_events';
