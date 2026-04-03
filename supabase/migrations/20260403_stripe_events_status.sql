-- Migration: Add status model to stripe_events for reliable idempotency
-- Rollback: ALTER TABLE stripe_events DROP COLUMN IF EXISTS status; ALTER TABLE stripe_events DROP COLUMN IF EXISTS event_type;
-- Dependencies: 012_stripe_events_idempotency.sql

BEGIN;

-- Add status column: pending → processed | failed
-- Existing rows (all previously processed successfully) are backfilled as 'processed'
ALTER TABLE stripe_events
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS event_type text;

-- Backfill existing rows as 'processed' (they were all successful before this migration)
UPDATE stripe_events SET status = 'processed' WHERE status = 'pending';

-- Index for the guard query: find events that are NOT yet processed
CREATE INDEX IF NOT EXISTS idx_stripe_events_status ON stripe_events (id, status);

NOTIFY pgrst, 'reload schema';

COMMIT;
