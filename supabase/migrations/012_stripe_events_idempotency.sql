-- ============================================================
-- 012_stripe_events_idempotency.sql
-- Idempotency table for Stripe webhook events
--
-- Prevents duplicate processing when Stripe retries delivery.
-- The webhook handler inserts the event ID before processing;
-- if the row already exists the handler returns 200 early.
-- ============================================================

CREATE TABLE IF NOT EXISTS stripe_events (
  id          TEXT PRIMARY KEY,          -- Stripe event ID (evt_...)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS needed: only accessed via service role key in the webhook handler.
