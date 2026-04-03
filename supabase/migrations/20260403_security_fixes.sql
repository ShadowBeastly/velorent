-- SEC-01: REVOKE anon access from create_item_booking
-- This SECURITY DEFINER function writes directly to the bookings table,
-- bypassing all RLS. It was granted to anon in 20260327_105_v2_rpcs.sql
-- but never revoked (unlike create_guest_booking which was revoked in 003).
-- An anonymous caller could create bookings without going through Stripe payment.

REVOKE EXECUTE ON FUNCTION create_item_booking(UUID, UUID, UUID, DATE, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, DECIMAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_item_booking(UUID, UUID, UUID, DATE, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, DECIMAL) TO authenticated, service_role;
