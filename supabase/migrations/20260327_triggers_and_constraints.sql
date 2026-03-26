-- ============================================================
-- 20260327_triggers_and_constraints.sql
--
-- Bug #17 -- customers.total_revenue and customers.total_bookings
--            are never updated after bookings are created, updated,
--            or cancelled. A trigger recomputes both from live data.
--
-- Bug #29 -- Invoice number generation is not idempotency-safe:
--            two concurrent users can both read the same "last"
--            invoice number and derive the same next number, then
--            both insert successfully (no uniqueness guarantee).
--            Fix: add a UNIQUE constraint so the DB enforces it.
--            The client already shows a friendly error on save
--            failure; the constraint ensures the error is surfaced.
--
-- Safe to re-run: uses CREATE OR REPLACE, IF NOT EXISTS, DROP IF EXISTS.
-- ============================================================

BEGIN;

-- ============================================================
-- Bug #17: Trigger to keep customers.total_revenue and
--           customers.total_bookings in sync
-- ============================================================

CREATE OR REPLACE FUNCTION sync_customer_booking_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Works for INSERT, UPDATE, and DELETE
  v_customer_id := COALESCE(NEW.customer_id, OLD.customer_id);

  IF v_customer_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Recompute from all non-cancelled bookings for this customer
  -- scoped to the same organization for data integrity
  UPDATE customers
  SET
    total_bookings = (
      SELECT COUNT(*)
      FROM bookings b
      WHERE b.customer_id = v_customer_id
        AND b.organization_id = customers.organization_id
        AND b.status NOT IN ('cancelled')
    ),
    total_revenue = (
      SELECT COALESCE(SUM(b.total_price), 0)
      FROM bookings b
      WHERE b.customer_id = v_customer_id
        AND b.organization_id = customers.organization_id
        AND b.status NOT IN ('cancelled')
    )
  WHERE id = v_customer_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop and recreate so the trigger definition is always current
DROP TRIGGER IF EXISTS trg_sync_customer_booking_stats ON bookings;

CREATE TRIGGER trg_sync_customer_booking_stats
  AFTER INSERT OR UPDATE OF status, total_price, customer_id OR DELETE
  ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION sync_customer_booking_stats();

-- ============================================================
-- Bug #29: UNIQUE constraint on invoices(organization_id, invoice_number)
--
-- Prevents two simultaneous inserts from writing the same
-- invoice number for the same organization.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'invoices'
      AND constraint_name = 'invoices_org_number_unique'
  ) THEN
    ALTER TABLE invoices
      ADD CONSTRAINT invoices_org_number_unique
      UNIQUE (organization_id, invoice_number);
  END IF;
END;
$$;

COMMIT;
