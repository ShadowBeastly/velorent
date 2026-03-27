-- Migration: Fix missing table-level GRANTs for commission_rates and venue_registrations
-- Rollback: REVOKE SELECT ON commission_rates FROM anon, authenticated; REVOKE SELECT, INSERT ON venue_registrations FROM authenticated;
-- Dependencies: 20260327_100_commission_rates.sql, 20260327_106_venue_registrations.sql

BEGIN;

-- commission_rates: RLS policy exists but table-level GRANT was missing
-- Without this, PostgREST rejects queries before RLS is even evaluated
GRANT SELECT ON commission_rates TO anon;
GRANT SELECT ON commission_rates TO authenticated;
GRANT SELECT ON commission_rates TO service_role;

-- venue_registrations: RLS policies exist but table-level GRANTs were missing
-- The RPC runs SECURITY DEFINER (bypasses this), but direct REST queries need it
GRANT SELECT, INSERT ON venue_registrations TO authenticated;
GRANT ALL ON venue_registrations TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
