-- ============================================================
-- 20260327_indexes_and_constraints.sql
--
-- Performance and correctness fixes identified in the
-- 2026-03-26 senior developer audit.
--
--   Fix #1 -- Missing index on bookings.stripe_checkout_session_id.
--             The /api/booking/by-session endpoint polls this column
--             on every request from the guest QR confirmation page.
--             Without the index, Postgres does a full table scan.
--
--   Fix #2 -- TOCTOU race condition in create_guest_booking.
--             The conflict check (SELECT COUNT + IF > 0 RAISE) is
--             non-atomic: two concurrent webhook calls for the same
--             bike and overlapping dates could both pass the check,
--             then both INSERT, creating a double-booking.
--
--             Fix: add a GiST exclusion constraint that enforces
--             at the DB level that no two non-cancelled bookings
--             can overlap for the same bike. Requires btree_gist.
--             The application-level check in create_guest_booking
--             remains as a fast pre-check with a user-readable error,
--             but the constraint is the authoritative guard.
--
-- Safe to re-run: uses IF NOT EXISTS / CREATE EXTENSION IF NOT EXISTS.
-- ============================================================

BEGIN;

-- ============================================================
-- Fix #1: Index on bookings.stripe_checkout_session_id
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_bookings_stripe_checkout_session_id
  ON bookings(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

-- ============================================================
-- Fix #2: Exclusion constraint to prevent double-bookings
--
-- Requires btree_gist. This extension ships with Supabase and
-- most managed Postgres installations.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- The constraint prevents two rows where:
--   bike_id is the same (=)
--   AND status is not 'cancelled' (using gist_text_ops)
--   AND date ranges overlap (&& on daterange)
--
-- 'cancelled' bookings are excluded so they don't block
-- re-booking of the same dates after a cancellation.
--
-- Note: this constraint is inherently partial (it cannot use
-- WHERE in an exclusion constraint directly). Instead we use
-- a gist_text_ops check on status: EXCLUDE only when the
-- expression (status != 'cancelled') is the same for both rows.
-- A simpler approach that works reliably: use a PARTIAL index
-- combined with the exclusion on active statuses.
--
-- We use the most portable form: exclude on (bike_id, daterange)
-- for all rows, but set status='cancelled' rows to a sentinel
-- range (empty range) so they never conflict.
-- Since we can't easily do conditional exclusion, we use a
-- simpler approach: a unique partial index won't help here, so
-- we add the full exclusion constraint scoped to non-cancelled rows
-- via a trigger-enforced approach that is already in the RPC.
--
-- SIMPLEST CORRECT FIX: Add a unique constraint-enforced approach
-- with an exclusion constraint on the btree_gist daterange:

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_no_overlap'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_no_overlap
      EXCLUDE USING GIST (
        bike_id WITH =,
        daterange(start_date, end_date, '[]') WITH &&
      )
      WHERE (status NOT IN ('cancelled'));
  END IF;
END;
$$;

COMMIT;
